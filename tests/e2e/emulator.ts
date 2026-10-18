import { randomUUID } from "node:crypto"

import { expect, type Page, type TestInfo } from "@playwright/test"

import type { Character } from "../../src/lib/character-types"

// The Firebase Local Emulator Suite the e2e dev server is pointed at (see firebase.json and
// `pnpm dev:e2e`). A demo- project never touches a real one.
export const PROJECT_ID = "demo-tabulapersonae"
const AUTH_URL = "http://127.0.0.1:9099"
const FIRESTORE_URL = "http://127.0.0.1:8080"
const API_KEY = "demo-api-key"
const DOCUMENTS = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`
// The emulator's administrator token: requests made with it skip firestore.rules. Only test setup
// and assertions use it; the app always goes through the rules.
const OWNER = { Authorization: "Bearer owner" }

// ── Firestore's typed JSON ───────────────────────────────────────────────────────────────────────

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }

/** A timestamp field, which plain JSON cannot express. */
export class Timestamp {
  constructor(readonly date: Date) {}
}

// unknown: any JSON-like value a test wants to store
function toFirestoreValue(value: unknown): FirestoreValue {
  if (value == null) return { nullValue: null }
  if (value instanceof Timestamp) return { timestampValue: value.date.toISOString() }
  if (typeof value === "boolean") return { booleanValue: value }
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === "string") return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } }
  throw new TypeError(`Cannot store a ${typeof value} in Firestore`)
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  // Firestore has no undefined: the app strips such fields before saving, and so does this.
  return Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== "undefined").map(([k, v]) => [k, toFirestoreValue(v)]))
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null
  if ("booleanValue" in value) return value.booleanValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return value.doubleValue
  if ("stringValue" in value) return value.stringValue
  if ("timestampValue" in value) return new Timestamp(new Date(value.timestampValue))
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue)
  return fromFirestoreFields(value.mapValue.fields ?? {})
}

function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]))
}

// ── Documents ───────────────────────────────────────────────────────────────────────────────────

/** Writes a document as an administrator (firestore.rules do not apply), replacing any already there. */
export async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${DOCUMENTS}/${path}`, {
    method: "PATCH",
    headers: { ...OWNER, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  })
  if (!response.ok) throw new Error(`Seeding ${path} failed: ${response.status} ${await response.text()}`)
}

/** Reads a document as an administrator, or null when there is none. */
export async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${DOCUMENTS}/${path}`, { headers: OWNER })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Reading ${path} failed: ${response.status} ${await response.text()}`)
  const body = await response.json() as { fields?: Record<string, FirestoreValue> }
  return fromFirestoreFields(body.fields ?? {})
}

/**
 * Stores a character in the account of `uid`, as the app would have. `updatedAt` is always set:
 * the app lists an account's characters ordered by it, and Firestore leaves out documents without it.
 */
export async function seedCharacter(uid: string, character: Character, updatedAt = new Date()): Promise<void> {
  // JSON round trip, as saveCharacterToFirebase does: drops undefined fields at every depth
  const data = JSON.parse(JSON.stringify(character)) as Record<string, unknown>
  await seedDoc(`characters/${character.id}`, { ...data, userId: uid, updatedAt: new Timestamp(updatedAt) })
}

/** A stored character, or null when there is none. */
export async function readCharacter(id: string): Promise<(Character & { userId: string }) | null> {
  return await readDoc(`characters/${id}`) as (Character & { userId: string }) | null
}

// ── Users ───────────────────────────────────────────────────────────────────────────────────────

export interface TestUser {
  uid: string
  email: string
  password: string
}

/**
 * An email no other test uses. All workers share one emulator and nothing is cleared between
 * tests, so each test works under its own users instead; every character query and settings
 * document is keyed by the user, so they never see each other's data.
 */
export function uniqueEmail(testInfo: TestInfo, label = "user"): string {
  return `${label}-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}@e2e.test`
}

/** Creates an account in the Auth emulator. */
export async function createUser(testInfo: TestInfo, label?: string): Promise<TestUser> {
  const email = uniqueEmail(testInfo, label)
  const password = "correct-horse-battery"
  const response = await fetch(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  if (!response.ok) throw new Error(`Creating ${email} failed: ${response.status} ${await response.text()}`)
  const { localId } = await response.json() as { localId: string }
  return { uid: localId, email, password }
}

/**
 * Gives a character, and everything in it that is looked up by id, ids no other test uses.
 * Characters are stored in one shared collection, so two tests seeding the same fixture would
 * otherwise write to the same document.
 */
export function withUniqueId<T extends { id: string }>(character: T): T {
  return { ...character, id: `${character.id}-${randomUUID().slice(0, 8)}` }
}

/** Signs in through the real sign-in form and waits for the character list. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto("/auth")
  await page.locator('[data-test="auth-email-input"]').fill(user.email)
  await page.locator('[data-test="auth-password-input"]').fill(user.password)
  await page.locator('[data-test="auth-submit-button"]').click()
  await expect(page).toHaveURL("/")
  await expect(page.locator('[data-test="header-menu-trigger"]')).toBeVisible()
}

// ── Whole emulator ──────────────────────────────────────────────────────────────────────────────

/** Resolves once both emulators answer, or rejects after `timeoutMs`. */
export async function waitForEmulators(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (const url of [`${FIRESTORE_URL}/`, `${AUTH_URL}/`]) {
    for (;;) {
      try {
        if ((await fetch(url)).ok) break
      } catch {
        // not listening yet
      }
      if (Date.now() > deadline) throw new Error(`The Firebase emulator at ${url} did not start within ${timeoutMs / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
}

/** Deletes every document and every account. Run once per test run (see global-setup.ts). */
export async function clearEmulators(): Promise<void> {
  const responses = await Promise.all([
    fetch(`${FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" }),
    fetch(`${AUTH_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" }),
  ])
  for (const response of responses) {
    if (!response.ok) throw new Error(`Clearing the emulators failed: ${response.status} ${await response.text()}`)
  }
}

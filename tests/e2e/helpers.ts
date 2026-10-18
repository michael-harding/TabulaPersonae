import { expect, type Locator, type Page } from "@playwright/test"

import { CONFIRM_GUARD_MS } from "../../src/components/ui/confirm-button"
import type { Character } from "../../src/lib/character-types"
import type { UserTabConfig } from "../../src/lib/tab-config-types"

// Marks that a test's localStorage has been seeded. Not under the app's `dnd-` prefix, so signing
// out (which clears every `dnd-` key) does not make the next page load seed it all over again.
const SEEDED_KEY = "e2e-seeded"

interface SeedOptions {
  /** A tab layout, as the Tab settings page would have stored it. */
  tabConfig?: UserTabConfig
  theme?: "light" | "dark"
  /** Opens every collapsible section on these characters' sheets. */
  expandSections?: boolean
  /** False seeds a visitor who has not chosen to continue without an account. */
  guest?: boolean
  /** Whether the Terms of Use have already been accepted on this device. */
  termsAccepted?: boolean
}

/**
 * Seeds this device's storage before the app first loads — once. An init script runs again on
 * every navigation and reload, so a plain one would put back whatever the test just changed or
 * deleted, and a reload could never show that a change was really saved.
 */
export async function seedDevice(page: Page, characters: Character[], options: SeedOptions = {}): Promise<void> {
  await page.addInitScript(({ characters, options, seededKey }) => {
    if (localStorage.getItem(seededKey) != null) return
    localStorage.setItem(seededKey, "true")
    localStorage.setItem("dnd-characters", JSON.stringify(characters))
    if (options.guest !== false) localStorage.setItem("dnd-skip-auth", "true")
    if (options.termsAccepted) localStorage.setItem("dnd-terms-accepted", "true")
    if (options.tabConfig != null) localStorage.setItem("dnd-tab-config", JSON.stringify(options.tabConfig))
    if (options.theme != null) localStorage.setItem("theme", options.theme)
    if (options.expandSections) {
      for (const { id } of characters) {
        localStorage.setItem(`dnd-collapsible-actions-${id}`, JSON.stringify(["actions", "bonus-actions", "reactions", "other"]))
        localStorage.setItem(`dnd-collapsible-spells-${id}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
        localStorage.setItem(`dnd-collapsible-features-${id}`, JSON.stringify(["class-feature", "species-trait", "feat"]))
      }
    }
  }, { characters, options, seededKey: SEEDED_KEY })
}

/** Seeds characters for a visitor using the app without an account. */
export function seedGuest(page: Page, characters: Character | Character[], options: Omit<SeedOptions, "guest"> = {}): Promise<void> {
  return seedDevice(page, Array.isArray(characters) ? characters : [characters], options)
}

// Pages are waited for by their content, never by "networkidle": signed in, Firestore keeps a
// connection open for as long as the page is, so the network is never idle.

/** Opens a character's sheet once it has loaded, optionally on a given tab. */
export async function openSheet(page: Page, id: string, tab?: string): Promise<void> {
  await page.goto(`/character/${id}`)
  await expect(page.getByRole("tab").first()).toBeVisible()
  if (tab != null) await page.getByRole("tab", { name: tab }).click()
}

/** Reloads the page and waits for it to load, optionally returning to a tab of the sheet. */
export async function reload(page: Page, tab?: string): Promise<void> {
  await page.reload()
  // Every page has its level-one heading once it has loaded, and not while it is loading
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
  if (tab != null) await page.getByRole("tab", { name: tab }).click()
}

/** The characters stored on this device. */
export function storedCharacters(page: Page): Promise<Character[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("dnd-characters") ?? "[]") as Character[])
}

/** One character stored on this device. */
export async function storedCharacter(page: Page, id: string): Promise<Character> {
  const character = (await storedCharacters(page)).find((c) => c.id === id)
  if (character == null) throw new Error(`Character ${id} is not stored on this device`)
  return character
}

/**
 * Confirms a destructive action guarded by a ConfirmButton: the first click arms it, and only a
 * deliberate second click — one that comes after the double-click guard — confirms.
 */
export async function confirmClick(button: Locator): Promise<void> {
  await button.click()
  await expect(button).toHaveAttribute("data-armed", "")
  await button.page().waitForTimeout(CONFIRM_GUARD_MS)
  await button.click()
}

/**
 * The account the header menu names as its first entry — the signed-in email, or "Not Logged In"
 * for characters kept only on this device. Opens the menu to read it and closes it again.
 */
export async function expectAccount(page: Page, account: string): Promise<void> {
  await page.locator('[data-test="header-menu-trigger"]').click()
  await expect(page.locator('[data-test="header-menu-account"]')).toHaveText(account)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toHaveCount(0)
}

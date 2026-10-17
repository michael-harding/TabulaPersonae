import { readFile } from "node:fs/promises"
import path from "node:path"

import { type Download, type Page } from "@playwright/test"

import { testCharacter, secondCharacter } from "../visual/fixtures"
import type { Character } from "../../src/lib/character-types"
import { openSheet, seedGuest, storedCharacters } from "./helpers"
import { test, expect } from "./test"

// Exporting characters to a file and importing them back — JSON, and a D&D Beyond PDF — through
// the header menu, as the browser's file chooser and downloads do it. Without an account.

const PDF = path.resolve(__dirname, "../../src/tests/test-for-import.pdf")

async function openMenuItem(page: Page, name: string | RegExp) {
  await page.locator('[data-test="header-menu-trigger"]').click()
  await page.getByRole("menuitem", { name }).click()
}

async function exportFrom(page: Page, item: string | RegExp): Promise<{ download: Download; json: unknown }> {
  const downloading = page.waitForEvent("download")
  await openMenuItem(page, item)
  const download = await downloading
  const json = JSON.parse(await readFile(await download.path(), "utf8")) as unknown
  return { download, json }
}

/** Opens the import dialog and hands it a file, as choosing one in the file chooser would. */
async function importFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await openMenuItem(page, "Import")
  await expect(page.locator('[data-test="import-dialog"]')).toBeVisible()
  const input = path.extname(typeof file === "string" ? file : file.name) === ".pdf" ? "#header-character-pdf-import" : "#header-character-import"
  await page.locator(input).setInputFiles(file)
}

const jsonFile = (name: string, data: unknown) => ({ name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) })

test.describe("Exporting", () => {
  test("from a sheet downloads that character", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await openSheet(page, testCharacter.id)
    const { download, json } = await exportFrom(page, `Export ${testCharacter.name}`)

    expect(download.suggestedFilename()).toMatch(new RegExp(`^${testCharacter.name}-.*\\.json$`))
    expect(json).toMatchObject({ id: testCharacter.id, name: testCharacter.name, abilityScores: testCharacter.abilityScores })
    await expect(page.getByText("Export Successful", { exact: true })).toBeVisible()
  })

  test("from the character list downloads every character", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await page.goto("/")
    const { download, json } = await exportFrom(page, "Export All Characters")

    expect(download.suggestedFilename()).toMatch(/^all-characters-.*\.json$/)
    expect((json as Character[]).map((c) => c.name)).toEqual([testCharacter.name, secondCharacter.name])
  })
})

test.describe("Importing JSON", () => {
  test("@mobile one character is saved under a new id and opened", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await importFile(page, jsonFile("aria.json", testCharacter))

    await expect(page.getByText("Import Successful", { exact: true })).toBeVisible()
    const [imported] = await storedCharacters(page)
    expect(imported.name).toBe(testCharacter.name)
    // A new id, so importing a file twice (or onto the device it came from) never overwrites
    expect(imported.id).not.toBe(testCharacter.id)
    await expect(page).toHaveURL(`/character/${imported.id}`)
    await expect(page.getByRole("heading", { name: testCharacter.name })).toBeVisible()
  })

  test("several characters are all saved, and the first one is opened", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await importFile(page, jsonFile("party.json", [testCharacter, secondCharacter]))

    await expect(page.getByText("Imported 2 characters successfully!")).toBeVisible()
    const stored = await storedCharacters(page)
    expect(stored.map((c) => c.name).sort()).toEqual([testCharacter.name, secondCharacter.name].sort())
    const first = stored.find((c) => c.name === testCharacter.name)!
    await expect(page).toHaveURL(`/character/${first.id}`)
    await expect(page.getByRole("heading", { name: testCharacter.name })).toBeVisible()
  })

  test("a file that is not a character is refused and changes nothing", async ({ page }) => {
    await seedGuest(page, [testCharacter])
    await page.goto("/")
    await importFile(page, jsonFile("notes.json", { title: "Shopping list" }))

    await expect(page.getByText("Import Failed", { exact: true })).toBeVisible()
    await expect(page.getByText("Invalid character file format")).toBeVisible()
    expect((await storedCharacters(page)).map((c) => c.id)).toEqual([testCharacter.id])
  })

  test("a file that is not JSON is refused", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await importFile(page, { name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{ not json") })

    await expect(page.getByText("Failed to parse character file")).toBeVisible()
    expect(await storedCharacters(page)).toEqual([])
  })

  test("a character exported and imported again comes back the same, under a new id", async ({ page }) => {
    await seedGuest(page, [testCharacter])
    await openSheet(page, testCharacter.id)
    // testCharacter predates Feature-based spellcasting, so loading it adds a generated feature
    // with a random id — stored only once the character is first saved. One edit stores it, so
    // the export and the original agree on it.
    await page.locator('[data-test="hp-increase-button"]').click()
    await expect.poll(async () => (await storedCharacters(page))[0].hitPoints.current).toBe(39)
    const { download } = await exportFrom(page, `Export ${testCharacter.name}`)
    await importFile(page, await download.path())

    await expect(page.getByText("Import Successful", { exact: true })).toBeVisible()
    const stored = await storedCharacters(page)
    expect(stored).toHaveLength(2)
    const copy = stored.find((c) => c.id !== testCharacter.id)!
    const original = stored.find((c) => c.id === testCharacter.id)!
    // The export also carries the calculated values of the moment (e.g. passive Perception) for
    // other tools to read, so the copy may hold more fields — but every field of the original
    // comes back unchanged.
    expect(copy).toMatchObject({ ...original, id: copy.id })
  })
})

test.describe("Importing a D&D Beyond PDF", () => {
  test("creates the character the sheet describes", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await importFile(page, PDF)

    await expect(page.getByText("PDF Import Successful", { exact: true })).toBeVisible()
    const [imported] = await storedCharacters(page)
    expect(imported).toMatchObject({ name: "Urush Greenshield", class: "Paladin", level: 2 })
    await expect(page).toHaveURL(`/character/${imported.id}`)
    await expect(page.getByRole("heading", { name: "Urush Greenshield" })).toBeVisible()
  })

  test("a PDF that is not a character sheet is refused", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await importFile(page, { name: "menu.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 not really") })

    await expect(page.getByText("PDF Import Failed", { exact: true })).toBeVisible()
    expect(await storedCharacters(page)).toEqual([])
  })
})

import { testCharacter, secondCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { test, expect } from "./test"

// Moving around the sheet, and the parts of it that only some characters show. Changes and that
// they are saved are covered by editing.spec.ts. Each scenario's final state is scanned with axe
// by the shared `test` (see ./test.ts).

test.describe("Tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
  })

  const panel = (page: import("@playwright/test").Page) => page.getByRole("tabpanel")

  test("@mobile Combat (the default tab) shows ability scores and combat stats", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Combat" })).toHaveAttribute("aria-selected", "true")
    await expect(panel(page).locator('[data-test="ability-scores-module"]')).toBeVisible()
    await expect(panel(page).locator('[data-test="combat-stats-module"]')).toBeVisible()
  })

  test("@mobile Spells shows the spells", async ({ page }) => {
    await page.getByRole("tab", { name: "Spells" }).click()
    await expect(panel(page).locator('[data-test="add-spell-button"]')).toBeVisible()
  })

  test("Features shows the features", async ({ page }) => {
    await page.getByRole("tab", { name: "Features" }).click()
    await expect(panel(page).locator('[data-test="add-feature-class-feature"]')).toBeVisible()
  })

  test("@mobile Inventory shows the equipment", async ({ page }) => {
    await page.getByRole("tab", { name: "Inventory" }).click()
    await expect(panel(page).locator('[data-test="add-equipment-button"]')).toBeVisible()
  })

  test("Character shows the basic information and notes", async ({ page }) => {
    await page.getByRole("tab", { name: "Character" }).click()
    await expect(panel(page).locator('[data-test="character-basic-info-module"]')).toBeVisible()
    await expect(panel(page).locator('[data-test="character-notes-module"]')).toBeVisible()
  })
})

test.describe("Death saves", () => {
  test("are shown only at 0 HP", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await openSheet(page, testCharacter.id)
    await expect(page.getByLabel("Click to add success")).toHaveCount(0)

    await openSheet(page, secondCharacter.id)
    await expect(page.getByText("Death Saves")).toBeVisible()
  })

  test("clicking a success circle fills it", async ({ page }) => {
    await seedGuest(page, secondCharacter)
    await openSheet(page, secondCharacter.id)
    // secondCharacter starts with 1 success already filled; clicking adds a second
    await page.getByLabel("Click to add success").first().click()
    await expect(page.getByLabel("Success (click to remove)")).toHaveCount(2)
  })
})

test.describe("Rest dialog", () => {
  test("@mobile Cancel closes it without resting", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
    await page.locator('[data-test="take-a-rest-button"]').click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await page.locator('[data-test="rest-cancel-button"]').click()

    await expect(page.getByRole("dialog")).toBeHidden()
    // HP unchanged: a long or short rest would have changed it or the temporary HP
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("38")
    await expect(page.locator('[data-test="temp-hp"]')).toHaveText("+5")
  })
})

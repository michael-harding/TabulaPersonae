import type { Locator } from "@playwright/test"

import { testCharacter, secondCharacter } from "../visual/fixtures"
import { byName, FEATURE_TYPES } from "../popup-cases"
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

test.describe("Action card expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await seedGuest(page, testCharacter, { expandSections: true })
    await openSheet(page, testCharacter.id)
  })

  test("@mobile opens over the card from its top edge, centered on it, inside the viewport", async ({ page }) => {
    const card = page.locator('[data-test="action-card-attack-atk1"]')
    // Mid-screen, with room below: near the bottom it opens upward instead (tested below)
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }))
    await card.getByRole("button", { name: "Longbow Strike" }).click()
    const view = page.getByRole("dialog", { name: "Longbow Strike" })
    await expect(view).toBeVisible()
    // Measured once open: the click may have scrolled the card into view
    const before = (await card.boundingBox())!
    const after = (await view.boundingBox())!
    const viewport = page.viewportSize()!

    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.x).toBeGreaterThanOrEqual(0)
    expect(after.x + after.width).toBeLessThanOrEqual(viewport.width)
    // Centered on the card unless that would cross the viewport's edge
    const centeredX = before.x + before.width / 2 - after.width / 2
    if (centeredX >= 16 && centeredX + after.width <= viewport.width - 16) {
      expect(Math.abs(after.x - centeredX)).toBeLessThanOrEqual(1)
    }
  })

  test("@mobile near the bottom of the screen, opens upward from the card's top edge", async ({ page }) => {
    const card = page.locator('[data-test="action-card-attack-atk1"]')
    const viewport = page.viewportSize()!
    // Leave only the card's header showing at the bottom of the screen
    const top = (await card.boundingBox())!.y
    await page.evaluate((by) => window.scrollBy(0, by), top - (viewport.height - 80))
    await card.getByRole("button", { name: "Longbow Strike" }).click()
    const view = page.getByRole("dialog", { name: "Longbow Strike" })
    await expect(view).toBeVisible()
    const cardBox = (await card.boundingBox())!
    const viewBox = (await view.boundingBox())!

    expect(Math.abs(viewBox.y + viewBox.height - cardBox.y)).toBeLessThanOrEqual(1)
    expect(viewBox.y).toBeGreaterThanOrEqual(0)
  })

  test("@mobile a click outside closes it, without opening the card the click lands on", async ({ page }) => {
    const card = page.locator('[data-test="action-card-attack-atk1"]')
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }))
    await card.getByRole("button", { name: "Longbow Strike" }).click()
    await expect(page.getByRole("dialog", { name: "Longbow Strike" })).toBeVisible()

    // Pass without Trace's card sits above Longbow Strike's, clear of its expanded view. A
    // coordinate click, as the user's would be: the open view blocks the page underneath, which
    // a locator click would refuse to click through.
    const other = (await page.getByText("A veil of shadows").boundingBox())!
    await page.mouse.click(other.x + other.width / 2, other.y + other.height / 2)

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByRole("dialog", { name: "Pass without Trace" })).toBeHidden()
  })

  test("@mobile closing returns focus to the card's name", async ({ page }) => {
    const name = page.locator('[data-test="action-card-attack-atk1"]').getByRole("button", { name: "Longbow Strike" })
    await name.click()
    await page.getByRole("button", { name: "Close Longbow Strike" }).click()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(name).toBeFocused()
  })

  test("opens from the keyboard and closes on Escape", async ({ page }) => {
    const name = page.locator('[data-test="action-card-attack-atk1"]').getByRole("button", { name: "Longbow Strike" })
    await name.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("dialog", { name: "Longbow Strike" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(name).toBeFocused()
  })
})

// The sheet colour is on <body>, so popups portaled outside the sheet's own root show it too
test.describe("Sheet colour in popups", () => {
  test("the expanded action card's border is the sheet colour", async ({ page }) => {
    await seedGuest(page, { ...testCharacter, sheetColor: "#22c55e" }, { expandSections: true })
    await openSheet(page, testCharacter.id)
    const borderColor = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).borderTopColor)
    // A module's card is always outlined in the sheet's primary colour
    const sheetPrimary = await borderColor(page.locator('[data-test="actions-module"]'))

    await page.locator('[data-test="action-card-attack-atk1"]').getByRole("button", { name: "Longbow Strike" }).click()
    const view = page.getByRole("dialog", { name: "Longbow Strike" })
    await expect(view).toBeVisible()
    expect(await borderColor(view)).toBe(sheetPrimary)
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

test.describe("Add Feature dialog", () => {
  // tests/popup-cases.ts lists the feature types so that the visual and accessibility suites cover
  // each one's form. This fails when that list and the dialog's drift apart.
  test("lists every feature type", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id, "Features")
    await byName("feature-add-type-open").open(page)
    await expect(page.getByRole("dialog").getByRole("option")).toHaveText(["None", ...FEATURE_TYPES])
  })
})

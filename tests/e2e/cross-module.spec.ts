import { testCharacter } from "../visual/fixtures"
import { openSheet, reload, seedGuest } from "./helpers"
import { test, expect } from "./test"

// A change in one module showing up in the others that are calculated from it. The unit tests
// check each calculation on its own; these check the wiring between modules in the running app.

test.describe("Effects that cross modules", () => {
  test("taking off armour lowers the AC on the sheet and on the character list", async ({ page }) => {
    // testCharacter's stored AC (16) differs from the calculated one, so it loads as a custom
    // value that equipment never changes; this character uses the calculated AC.
    await seedGuest(page, { ...testCharacter, useCalculatedArmorClass: true })
    await openSheet(page, testCharacter.id)
    const ac = page.locator('[data-test="armor-class"]')
    // Leather armour (11) + Dexterity (+4)
    await expect(ac).toHaveText(/\D15$/)

    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.locator('[data-test="equipment-toggle-equipped-eq2"]').click()
    await page.getByRole("tab", { name: "Combat" }).click()
    // Unarmoured: 10 + Dexterity (+4)
    await expect(ac).toHaveText(/\D14$/)

    await page.goto("/")
    await expect(page.getByRole("link", { name: new RegExp(`^${testCharacter.name}`) })).toContainText("AC: 14")
  })

  test("a feature granting a skill proficiency shows on the Skills module", async ({ page }) => {
    await seedGuest(page, testCharacter, { expandSections: true })
    await openSheet(page, testCharacter.id)
    const arcana = page.locator('[data-test="skill-modifier-arcana"]')
    // Intelligence 10 (+0), not proficient
    await expect(arcana).toHaveText("+0")

    await page.getByRole("tab", { name: "Features" }).click()
    await page.locator('[data-test="add-feature-class-feature"]').click()
    const modal = page.getByRole("dialog")
    await page.locator('[data-test="feature-type-select"]').click()
    await page.getByRole("option", { name: "Skill Proficiency" }).click()
    await page.locator('[data-test="feature-name-input"]').fill("Arcane Studies")
    await modal.getByRole("button", { name: "Add skill proficiency" }).click()
    await page.getByRole("menuitem", { name: "Arcana" }).click()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toHaveCount(0)
    await modal.getByRole("button", { name: "Save" }).click()
    await expect(modal).toBeHidden()

    await page.getByRole("tab", { name: "Combat" }).click()
    // Proficiency bonus +3
    await expect(arcana).toHaveText("+3")
    await reload(page)
    await expect(arcana).toHaveText("+3")
  })

  test("raising Wisdom raises passive Perception on Combat Stats", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
    const passive = page.locator('[data-test="passive-perception"]')
    // 10 + Wisdom (+3) + expertise in Perception (+6)
    await expect(passive).toHaveText(/\D19$/)

    await page.locator('[data-test="ability-scores-module-edit"]').click()
    await page.locator('[data-test="wisdom-score-input"]').fill("18")
    await page.locator('[data-test="ability-scores-module-save"]').click()

    await expect(passive).toHaveText(/\D20$/)
  })
})

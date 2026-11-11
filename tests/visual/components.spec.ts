import { test, expect } from "@playwright/test"

import { testCharacter } from "./fixtures"
import { openSheet, parkPointer } from "./helpers"

// Each screenshot is scoped to one element of the character sheet, in a state the full-page
// baselines in pages.spec.ts don't show: edit mode, an empty module, or a character state other
// than the fixtures' (TESTING.md "Visual Regression Coverage"). A module in view mode with the
// fixture character is in those full-page baselines, so it has no crop here.

// Tall enough that each module fits without scrolling. Scrolled, its title would slide under the
// sticky stats bar, which would then cover the top of the screenshot.
test.use({ viewport: { width: 1280, height: 2000 } })

test.describe("CombatStatsModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter)
    const card = page.locator('[data-test="combat-stats-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("combat-stats-edit.png")
  })
})

test.describe("AbilityScoresModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter)
    const card = page.locator('[data-test="ability-scores-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await parkPointer(page)
    await expect(card).toHaveScreenshot("ability-scores-edit.png")
  })
})

// The stats bar's HP bar. The fixture characters are at 38/44 and 0 HP, which the full-page
// baselines show.
test.describe("HpProgressBar component", () => {
  for (const [name, current] of [["full", 44], ["half", 22]] as const) {
    test(`${name} HP`, async ({ page }) => {
      await openSheet(page, { ...testCharacter, hitPoints: { current, maximum: 44, temporary: 0 } })
      await expect(page.locator(".sticky.top-0")).toHaveScreenshot(`hp-bar-${name}.png`)
    })
  }
})

test.describe("SkillsProficienciesModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter)
    const card = page.locator('[data-test="skills-proficiencies-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("skills-proficiencies-edit.png")
  })
})

test.describe("CharacterNotesModule component", () => {
  test("empty notes", async ({ page }) => {
    const emptyChar = {
      ...testCharacter,
      id: "empty-notes-char",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
    }
    await openSheet(page, emptyChar, { tab: "Character" })
    await expect(page.locator('[data-test="character-notes-module"]')).toHaveScreenshot("character-notes-empty.png")
  })

  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter, { tab: "Character" })
    const card = page.locator('[data-test="character-notes-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("character-notes-edit.png")
  })
})

test.describe("CharacterBasicInfoModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter, { tab: "Character" })
    const card = page.locator('[data-test="character-basic-info-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("character-basic-info-edit.png")
  })
})

// Concentrating on Ensnaring Strike, with Pass without Trace as a spell lasting without concentration
const spellsInEffect = {
  ...testCharacter,
  spells: testCharacter.spells.map((spell) => (spell.id === "sp3" ? { ...spell, concentration: false } : spell)),
  activeSpellIds: ["sp2", "sp3"],
}

test.describe("Spells in effect", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`stats bar pills — ${theme}`, async ({ page }) => {
      await openSheet(page, spellsInEffect, { theme })
      await expect(page.locator('[data-sem="stats-bar"]')).toHaveScreenshot(`stats-bar-spells-in-effect-${theme}.png`)
    })
  }

  test("action card with its end button", async ({ page }) => {
    await openSheet(page, spellsInEffect, { tab: "Combat" })
    await expect(page.locator('[data-test="action-card-bonus-spell-sp2"]')).toHaveScreenshot("action-card-spell-in-effect.png")
  })
})

test.describe("ActionsModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter, { tab: "Combat" })
    const card = page.locator('[data-test="actions-module"]')
    await card.locator('[data-test="actions-module-edit"]').click()
    await parkPointer(page)
    await expect(card).toHaveScreenshot("actions-module-edit.png")
  })
})

test.describe("SpellsModule component", () => {
  test("edit mode", async ({ page }) => {
    await openSheet(page, testCharacter, { tab: "Spells" })
    const card = page.locator('[data-test="spells-module"]')
    await card.locator('[data-test="spells-module-edit"]').click()
    await parkPointer(page)
    await expect(card).toHaveScreenshot("spells-module-edit.png")
  })
})

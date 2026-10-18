import { type Locator, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { SHEET_COLOR_PRESETS } from "../../src/lib/sheet-color"
import { confirmClick, openSheet, reload, seedGuest, storedCharacter } from "./helpers"
import { axeBuilder, finishAnimations, test, expect } from "./test"

// Every change made on the sheet must still be there after a reload. Each scenario changes one
// thing, reloads, and checks both what the sheet shows and what was stored on the device. The
// seed is written once (see seedGuest), so a reload shows only what the app itself saved.

const id = testCharacter.id

async function open(page: Page, tab?: string) {
  await seedGuest(page, testCharacter, { expandSections: true })
  await openSheet(page, id, tab)
}

/** An action's card: action-card-<kind>-<id> (see actions-module.tsx). */
const actionCard = (page: Page, hook: string): Locator => page.locator(`[data-test="action-card-${hook}"]`)

/** The Edit button of a module, then its Save button once the edits are made. */
const edit = (page: Page, module: string) => page.locator(`[data-test="${module}-edit"]`).click()
const save = (page: Page, module: string) => page.locator(`[data-test="${module}-save"]`).click()

test.describe("Combat tab", () => {
  test("@mobile current HP", async ({ page }) => {
    await open(page)
    // testCharacter starts at 38/44
    await page.locator('[data-test="hp-increase-button"]').click()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")

    await reload(page)
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
    expect((await storedCharacter(page, id)).hitPoints.current).toBe(39)
  })

  test("temporary HP is used up before current HP", async ({ page }) => {
    await open(page)
    // testCharacter has 5 temporary HP, which the first point of damage comes off
    await page.locator('[data-test="hp-decrease-button"]').click()
    await expect(page.locator('[data-test="temp-hp"]')).toHaveText("+4")

    await reload(page)
    await expect(page.locator('[data-test="temp-hp"]')).toHaveText("+4")
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("38")
    expect((await storedCharacter(page, id)).hitPoints).toMatchObject({ current: 38, temporary: 4 })
  })

  test("@mobile adding and removing a condition", async ({ page }) => {
    await open(page)
    await page.locator('[data-test="condition-add"]').click()
    await page.getByRole("menuitem", { name: "Poisoned" }).click()
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).toBeVisible()

    await reload(page)
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).toBeVisible()
    expect((await storedCharacter(page, id)).conditions).toContain("Poisoned")

    await page.locator('[data-test="condition-remove-Poisoned"]').click()
    await reload(page)
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).toHaveCount(0)
    expect((await storedCharacter(page, id)).conditions ?? []).not.toContain("Poisoned")
  })

  test("@mobile exhaustion and its level", async ({ page }) => {
    await open(page)
    await page.locator('[data-test="condition-add"]').click()
    await page.getByRole("menuitem", { name: "Exhaustion" }).click()
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-test="condition-remove-Exhaustion"]')).toHaveText(/Exhaustion 1/)
    await page.locator('[data-test="exhaustion-level-increase"]').click()
    await page.locator('[data-test="exhaustion-level-increase"]').click()

    await reload(page)
    await expect(page.locator('[data-test="condition-remove-Exhaustion"]')).toHaveText(/Exhaustion 3/)
    // testCharacter is a 2024 character
    await expect(page.locator('[data-test="exhaustion-effects"]')).toContainText("d20 Tests −6")
    const stored = await storedCharacter(page, id)
    expect(stored.exhaustionLevel).toBe(3)
    expect(stored.conditions ?? []).not.toContain("Exhaustion")
  })

  test("Heroic Inspiration", async ({ page }) => {
    await open(page)
    const toggle = page.locator('[data-test="toggle-heroic-inspiration"]')
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    await toggle.click()

    await reload(page)
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect((await storedCharacter(page, id)).heroicInspiration).toBe(true)
  })

  test("an ability score, and the save and skills that depend on it", async ({ page }) => {
    await open(page)
    const wisdomSave = page.locator('[data-test="saving-throw-modifier-wisdom"]')
    const insight = page.locator('[data-test="skill-modifier-insight"]')
    // Wisdom 16 (+3); proficient Wisdom save at proficiency bonus +3; Insight not proficient
    await expect(wisdomSave).toHaveText("+6")
    await expect(insight).toHaveText("+3")

    await edit(page, "ability-scores-module")
    await page.locator('[data-test="wisdom-score-input"]').fill("18")
    await save(page, "ability-scores-module")
    // The value is shown with its modifier, e.g. "18+4"
    await expect(page.locator('[data-test="wisdom-score-value"]')).toHaveText(/^18/)

    await reload(page)
    await expect(page.locator('[data-test="wisdom-score-value"]')).toHaveText(/^18/)
    await expect(wisdomSave).toHaveText("+7")
    await expect(insight).toHaveText("+4")
    expect((await storedCharacter(page, id)).abilityScores.wisdom).toBe(18)
  })

  test("skill proficiency and expertise", async ({ page }) => {
    await open(page)
    const arcana = page.locator('[data-test="skill-modifier-arcana"]')
    // Intelligence 10 (+0), not proficient
    await expect(arcana).toHaveText("+0")

    await edit(page, "skills-proficiencies-module")
    await page.locator('[data-test="skill-proficient-arcana"]').click()
    await page.locator('[data-test="skill-expertise-arcana"]').click()
    await save(page, "skills-proficiencies-module")

    await reload(page)
    // Expertise doubles the proficiency bonus of +3
    await expect(arcana).toHaveText("+6")
    expect((await storedCharacter(page, id)).skills.arcana).toEqual({ proficient: true, expertise: true })
  })

  test("adding, renaming and deleting an action", async ({ page }) => {
    await open(page)
    await page.locator('[data-test="add-action-button"]').click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Action Name").fill("Shove")
    await dialog.getByRole("button", { name: /^(add|save)/i }).click()
    await expect(dialog).toBeHidden()

    await reload(page)
    const shove = (await storedCharacter(page, id)).attacks.find((a) => a.name === "Shove")
    expect(shove).toBeDefined()
    const card = actionCard(page, `attack-${shove!.id}`)
    await expect(card).toContainText("Shove")

    await card.getByRole("button", { name: "Edit Shove" }).click()
    await dialog.getByLabel("Action Name").fill("Grapple")
    await dialog.getByRole("button", { name: /^(add|save)/i }).click()
    await reload(page)
    await expect(card).toContainText("Grapple")
    await expect(card).not.toContainText("Shove")

    await card.getByRole("button", { name: "Edit Grapple" }).click()
    await confirmClick(dialog.locator('[data-test="action-form-delete"]'))
    await reload(page)
    await expect(card).toHaveCount(0)
    expect((await storedCharacter(page, id)).attacks.map((a) => a.name)).not.toContain("Grapple")
  })

  test("restoring a use of a limited-use action", async ({ page }) => {
    await open(page)
    // Speak with Animals: all 3 uses spent (`uses` counts the spent ones)
    await actionCard(page, "other-oa1").getByRole("button", { name: "Charge spent (click to restore)" }).first().click()

    await reload(page)
    await expect(actionCard(page, "other-oa1").getByRole("button", { name: "Charge available (click to use)" })).toHaveCount(1)
    expect((await storedCharacter(page, id)).otherActions.find((a) => a.name === "Speak with Animals")?.uses).toBe(2)
  })
})

test.describe("Spells tab", () => {
  test("adding, editing and deleting a spell", async ({ page }) => {
    await open(page, "Spells")
    await page.locator('[data-test="add-spell-button"]').click()
    await page.locator('[data-test="spell-name"]').fill("Cure Wounds")
    await page.locator('[data-test="spell-form-submit"]').click()

    await reload(page, "Spells")
    const added = (await storedCharacter(page, id)).spells.find((s) => s.name === "Cure Wounds")
    expect(added).toBeDefined()
    await expect(page.locator(`[data-test="spell-name-${added!.id}"]`)).toBeVisible()

    await page.locator(`[data-test="edit-spell-${added!.id}"]`).click()
    await page.locator('[data-test="spell-name"]').fill("Healing Word")
    await page.locator('[data-test="spell-form-submit"]').click()
    await reload(page, "Spells")
    await expect(page.locator(`[data-test="spell-name-${added!.id}"]`)).toHaveText("Healing Word")

    await confirmClick(page.locator(`[data-test="delete-spell-${added!.id}"]`))
    await reload(page, "Spells")
    await expect(page.locator(`[data-test="spell-name-${added!.id}"]`)).toHaveCount(0)
    expect((await storedCharacter(page, id)).spells.map((s) => s.id)).not.toContain(added!.id)
  })

  test("using a spell slot", async ({ page }) => {
    await open(page, "Spells")
    // Level 1: 4 slots, 1 already used
    await page.getByLabel("Available slot (click to use)").first().click()

    await reload(page, "Spells")
    await expect(page.getByLabel("Used slot (click to restore)")).toHaveCount(2)
    expect((await storedCharacter(page, id)).spellSlots[1]).toEqual({ total: 4, used: 2 })
  })

  test("changing the number of spell slots", async ({ page }) => {
    await open(page, "Spells")
    await page.locator('[data-test="edit-spell-slots-button"]').click()
    // Each change applies at once; the dialog has no Save button
    await page.locator('[data-test="spell-slot-level-3-total-increase"]').click()
    await page.locator('[data-test="spell-slot-level-3-total-increase"]').click()
    await page.keyboard.press("Escape")

    await reload(page, "Spells")
    expect((await storedCharacter(page, id)).spellSlots[3]).toMatchObject({ total: 2 })
  })
})

test.describe("Features tab", () => {
  test("adding and deleting a class feature", async ({ page }) => {
    await open(page, "Features")
    await page.locator('[data-test="add-feature-class-feature"]').click()
    // The Name field appears once a type is picked
    await page.locator('[data-test="feature-type-select"]').click()
    await page.getByRole("option", { name: "Skill Proficiency" }).click()
    await page.locator('[data-test="feature-name-input"]').fill("Primeval Awareness")
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()

    await reload(page, "Features")
    const added = (await storedCharacter(page, id)).classFeatures?.find((f) => f.name === "Primeval Awareness")
    expect(added).toBeDefined()
    await expect(page.getByText("Primeval Awareness")).toBeVisible()

    await confirmClick(page.locator(`[data-test="feature-delete-${added!.id}"]`))
    await reload(page, "Features")
    await expect(page.getByText("Primeval Awareness")).toHaveCount(0)
    expect((await storedCharacter(page, id)).classFeatures?.map((f) => f.id)).not.toContain(added!.id)
  })
})

test.describe("Inventory tab", () => {
  test("adding, editing and deleting an item", async ({ page }) => {
    await open(page, "Inventory")
    await page.locator('[data-test="add-equipment-button"]').click()
    await page.locator('[data-test="item-name"]').fill("Rope (50 ft)")
    await page.locator('[data-test="equipment-modal-submit"]').click()

    await reload(page, "Inventory")
    const added = (await storedCharacter(page, id)).equipment.find((e) => e.name === "Rope (50 ft)")
    expect(added).toBeDefined()
    await expect(page.locator(`[data-test="equipment-item-name-${added!.id}"]`)).toBeVisible()

    await page.locator(`[data-test="equipment-edit-${added!.id}"]`).click()
    await page.locator('[data-test="item-name"]').fill("Silk Rope (50 ft)")
    await page.locator('[data-test="equipment-modal-submit"]').click()
    await reload(page, "Inventory")
    await expect(page.locator(`[data-test="equipment-item-name-${added!.id}"]`)).toHaveText("Silk Rope (50 ft)")

    await confirmClick(page.locator(`[data-test="equipment-delete-${added!.id}"]`))
    await reload(page, "Inventory")
    await expect(page.locator(`[data-test="equipment-item-name-${added!.id}"]`)).toHaveCount(0)
    expect((await storedCharacter(page, id)).equipment.map((e) => e.id)).not.toContain(added!.id)
  })

  test("equipping and attuning", async ({ page }) => {
    await open(page, "Inventory")
    // The Shortsword starts equipped; the Ring of Protection starts attuned
    await page.locator('[data-test="equipment-toggle-equipped-eq4"]').click()
    await page.locator('[data-test="magic-item-toggle-attuned-mi1"]').click()

    await reload(page, "Inventory")
    const { equipment } = await storedCharacter(page, id)
    expect(equipment.find((e) => e.id === "eq4")?.equipped).toBe(false)
    expect(equipment.find((e) => e.id === "mi1")?.attuned).toBe(false)
  })

  test("currency", async ({ page }) => {
    await open(page, "Inventory")
    const gold = page.getByRole("spinbutton", { name: "GP currency" })
    await gold.fill("123")
    await gold.blur()

    await reload(page, "Inventory")
    await expect(gold).toHaveValue("123")
    expect((await storedCharacter(page, id)).coins?.gp).toBe(123)
  })
})

test.describe("Character tab", () => {
  test("@mobile the character's name", async ({ page }) => {
    await open(page, "Character")
    await edit(page, "character-basic-info-module")
    await page.getByLabel(/character name/i).fill("Zara Brightbow")
    await save(page, "character-basic-info-module")
    await expect(page.getByRole("heading", { name: "Zara Brightbow" })).toBeVisible()

    await reload(page)
    await expect(page.getByRole("heading", { name: "Zara Brightbow" })).toBeVisible()
    expect((await storedCharacter(page, id)).name).toBe("Zara Brightbow")
  })

  test("notes", async ({ page }) => {
    await open(page, "Character")
    await edit(page, "character-notes-module")
    await page.getByLabel("Additional Notes").fill("Owes the ferryman two silver.")
    await save(page, "character-notes-module")

    await reload(page, "Character")
    await expect(page.getByText("Owes the ferryman two silver.")).toBeVisible()
    expect((await storedCharacter(page, id)).notes).toBe("Owes the ferryman two silver.")
  })

  test("sheet colour and edition", async ({ page }) => {
    await open(page, "Character")
    await page.locator('[data-test="sheet-color-preset-purple"]').click()
    // The edition switch is a checkbox labelled by both editions; 2024 is the checked side
    await page.locator('[data-test="switch-button-sheet-settings-edition-switch"]').uncheck({ force: true })

    await reload(page, "Character")
    const stored = await storedCharacter(page, id)
    expect(stored.sheetColor).toBe("#8b5cf6")
    expect(stored.edition).toBe("2014")

    // Reset returns the sheet to the theme's own colour
    await page.locator('[data-test="sheet-color-reset-button"]').click()
    await reload(page, "Character")
    expect((await storedCharacter(page, id)).sheetColor).toBeUndefined()
  })

  // Any sheet colour is shown as a shade readable on the theme (src/lib/sheet-color.ts). Checked
  // in both themes by the chromium and chromium-dark projects, on the tabs with the most text in
  // the sheet colour, for every preset and for custom colours at both extremes.
  const sheetColours = [
    ...SHEET_COLOR_PRESETS.map(({ name }) => ({ name, choose: (page: Page) => page.locator(`[data-test="sheet-color-preset-${name.toLowerCase()}"]`).click() })),
    ...["#ffff00", "#f2f2f2", "#141414"].map((hex) => ({ name: `custom ${hex}`, choose: (page: Page) => page.locator('[data-test="sheet-color-custom-input"]').fill(hex) })),
  ]
  for (const { name, choose } of sheetColours) {
    test(`sheet colour ${name} keeps the sheet's text readable`, async ({ page }) => {
      await open(page, "Character")
      await choose(page)
      await expect(page.locator("[data-sheet-color]")).toHaveCount(1)
      for (const tab of ["Character", "Combat", "Spells"]) {
        await page.getByRole("tab", { name: tab }).click()
        await finishAnimations(page)
        const results = await axeBuilder(page).withRules(["color-contrast"]).analyze()
        expect(results.violations, `${tab} tab`).toEqual([])
      }
    })
  }
})

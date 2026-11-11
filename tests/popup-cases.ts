import { expect, type Locator, type Page } from "@playwright/test"

import type { Character } from "../src/lib/character-types"
import { testCharacter } from "./visual/fixtures"

// Every modal and every popup above the page, and how to open it. The test suites share this one
// list, so that none of them can miss one.

const click = (page: Page, dataTest: string) => page.locator(`[data-test="${dataTest}"]`).click()
const dialog = (page: Page) => page.getByRole("dialog")

async function openFeatureType(page: Page) {
  await click(page, "add-feature-class-feature")
  await dialog(page).locator('[data-test="feature-type-select"]').click()
}

export interface ModalCase {
  name: string
  tab?: string
  open: (page: Page) => Promise<void>
  /**
   * The modal whose visual baseline also shows this one, because the two have the same layout
   * (TESTING.md §9). The visual suite takes no screenshot of a covered modal; the other suites
   * still check it.
   */
  coveredBy?: string
}

export const MODALS: ModalCase[] = [
  { name: "action-add", tab: "Combat", open: (page) => click(page, "add-action-button") },
  { name: "bonus-action-add", tab: "Combat", open: (page) => click(page, "add-bonus-action-button"), coveredBy: "action-add" },
  { name: "reaction-add", tab: "Combat", open: (page) => click(page, "add-reaction-button") },
  { name: "other-add", tab: "Combat", open: (page) => click(page, "add-other-button"), coveredBy: "action-add" },
  {
    // Edit is in the card's expanded view
    name: "action-edit", tab: "Combat", open: async (page) => {
      await click(page, "action-card-attack-atk1-name")
      await click(page, "action-card-attack-atk1-expanded-edit-button")
    },
  },
  { name: "feature-add", tab: "Features", open: (page) => click(page, "add-feature-class-feature") },
  // Regression: the Feature Type list opens in place, inside the modal's scroll container, and was
  // clipped by it (e001998). Only a screenshot with the list open can catch that.
  { name: "feature-add-type-open", tab: "Features", open: openFeatureType },
  { name: "feature-edit", tab: "Features", open: (page) => click(page, "feature-edit-cf3") },
  { name: "spell-add", tab: "Spells", open: (page) => click(page, "add-spell-button") },
  { name: "spell-edit", tab: "Spells", open: (page) => click(page, "edit-spell-sp3") },
  { name: "spell-slots", tab: "Spells", open: (page) => click(page, "edit-spell-slots-button") },
  { name: "item-add", tab: "Inventory", open: (page) => click(page, "add-equipment-button") },
  {
    name: "item-add-consumable", tab: "Inventory", open: async (page) => {
      await click(page, "add-equipment-button")
      await dialog(page).locator('[data-test="item-type"]').click()
      await page.getByRole("option", { name: "Consumable", exact: true }).click()
    },
    coveredBy: "item-add",
  },
  { name: "item-edit-weapon", tab: "Inventory", open: (page) => click(page, "equipment-edit-eq1") },
  { name: "item-edit-armor", tab: "Inventory", open: (page) => click(page, "equipment-edit-eq2") },
  { name: "item-edit-magic", tab: "Inventory", open: (page) => click(page, "magic-item-edit-mi1") },
  // The weapon-only Attack & Damage Bonus sits inside the magic section's Combat Bonuses group.
  // Opening the group scrolls the modal, so it is scrolled back to the top: a scroll edge cutting
  // across text is something axe cannot judge.
  {
    name: "item-edit-weapon-magic-combat-bonuses", tab: "Inventory", open: async (page) => {
      await click(page, "equipment-edit-eq1")
      await dialog(page).getByText("This is a Magic Item").click()
      await click(page, "modifier-group-combat-bonuses")
      await dialog(page).evaluate((el) => el.scrollTo(0, 0))
    },
  },
  { name: "rest-short", open: (page) => click(page, "take-a-rest-button") },
  {
    name: "rest-long", open: async (page) => {
      await click(page, "take-a-rest-button")
      await click(page, "rest-type-long-button")
    },
  },
  {
    name: "import", open: async (page) => {
      await click(page, "header-menu-trigger")
      await page.getByRole("menuitem", { name: "Import Character" }).click()
    },
  },
]

export const byName = (name: string) => MODALS.find((m) => m.name === name)!

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** The name of the visual baseline (and of the screenshot) for a feature type's form. */
export const featureTypeBaseline = (type: string) => `feature-add-type-${slug(type)}`

// Every feature type, in the order of FEATURE_TYPES in src/components/features-module.tsx, mapped to
// the baseline that shows its form: null for a form with a layout of its own, which gets its own
// baseline, or the name of a baseline that already shows the same layout (TESTING.md §9). The
// "lists every feature type" test (tests/e2e/character-sheet.spec.ts) fails when this and the app's
// list drift, so a new type can't ship until it is given a baseline or mapped to one.
const FEATURE_TYPE_COVERED_BY: Record<string, string | null> = {
  "Action": "feature-edit", // the edit case opens an Action feature
  "Spellcasting Ability": featureTypeBaseline("Size"), // one select
  "Hit Points": null,
  "Size": null,
  "Max HP Bonus": null,
  "Saving Throw Proficiency": null,
  "Skill Proficiency": featureTypeBaseline("Damage Resistance/Immunity/Vulnerability"), // a chip-list row per level
  "Other Proficiency": featureTypeBaseline("Language"), // a text input and Add per level
  "Speed": null,
  "Senses": featureTypeBaseline("Speed"), // a grid of number inputs per level
  "Damage Resistance/Immunity/Vulnerability": null,
  "Condition Immunity": featureTypeBaseline("Damage Resistance/Immunity/Vulnerability"),
  "Language": null,
  "Carrying Capacity": featureTypeBaseline("Speed"),
  "Ability Scores": null,
}

export const FEATURE_TYPES = Object.keys(FEATURE_TYPE_COVERED_BY)
/** The feature types with a baseline of their own. */
export const FEATURE_TYPES_WITH_BASELINE = FEATURE_TYPES.filter((type) => FEATURE_TYPE_COVERED_BY[type] == null)

// A case covered by something with no baseline of its own would be shown by none, so any suite
// importing this file refuses to load until the mapping is fixed.
const ownBaselines = new Set([
  ...MODALS.filter((modal) => modal.coveredBy == null).map((modal) => modal.name),
  ...FEATURE_TYPES_WITH_BASELINE.map(featureTypeBaseline),
])
const coverage = [
  ...MODALS.map((modal) => [modal.name, modal.coveredBy] as const),
  ...FEATURE_TYPES.map((type) => [type, FEATURE_TYPE_COVERED_BY[type]] as const),
]
for (const [name, coveredBy] of coverage) {
  if (coveredBy != null && !ownBaselines.has(coveredBy)) {
    throw new Error(`"${name}" is covered by "${coveredBy}", which has no visual baseline of its own`)
  }
}

/** The modals also checked at phone width. The visual suite's modal shell baselines show rest-short. */
export const PHONE_MODALS = ["feature-add", "feature-add-type-open", "item-edit-weapon", "spell-add", "rest-short", "import"]

const byTest = (page: Page, dataTest: string) => page.locator(`[data-test="${dataTest}"]`)

export interface OverlayCase {
  name: string
  tab?: string
  /** Defaults to testCharacter. */
  character?: Character
  /** Opens the popup and returns it. */
  open: (page: Page) => Promise<Locator>
}

export const OVERLAYS: OverlayCase[] = [
  {
    name: "header-menu", open: async (page) => {
      await byTest(page, "header-menu-trigger").click()
      return page.getByRole("menu")
    },
  },
  {
    name: "select-list", tab: "Character", open: async (page) => {
      await byTest(page, "character-basic-info-module-edit").click()
      await byTest(page, "alignment-select").click()
      return page.getByRole("listbox")
    },
  },
  {
    name: "combobox-list", tab: "Character", open: async (page) => {
      await byTest(page, "character-basic-info-module-edit").click()
      await byTest(page, "class-combobox").click()
      return page.getByRole("listbox")
    },
  },
  {
    name: "chip-list-add-menu", open: async (page) => {
      await byTest(page, "skills-proficiencies-module-edit").click()
      await byTest(page, "damage-resistances-add").click()
      return page.getByRole("menu")
    },
  },
  {
    name: "action-card-expanded", tab: "Combat", open: async (page) => {
      await byTest(page, "action-card-attack-atk1-name").click()
      return page.getByRole("dialog")
    },
  },
  {
    // Ensnaring Strike scales with slot level, and the fixture has 2nd-level slots
    name: "action-card-slot-select", tab: "Combat", open: async (page) => {
      await byTest(page, "action-card-bonus-spell-sp2-slot-select").click()
      return page.getByRole("listbox")
    },
  },
  {
    // Pinned open by a click (how a touch user sees it), so it doesn't close mid-screenshot the way
    // a focus- or hover-opened tooltip can. The fixture's stored AC differs from its calculated AC,
    // which migrates to a custom value whose tooltip is just "Custom"; this shows the breakdown.
    name: "calculated-value-tooltip", character: { ...testCharacter, useCalculatedArmorClass: true }, open: async (page) => {
      await byTest(page, "armor-class-display").click()
      return page.getByRole("tooltip")
    },
  },
  {
    // An armed ConfirmButton reverts after CONFIRM_TIMEOUT_MS (4s); the screenshot is taken well within it.
    name: "confirm-button-armed", tab: "Spells", open: async (page) => {
      const button = byTest(page, "delete-spell-sp1")
      await button.click()
      await expect(button).toHaveAttribute("data-armed", "")
      return button
    },
  },
  {
    // A toast dismisses itself after 5s; the screenshot is taken well within it.
    name: "toast", open: async (page) => {
      await byTest(page, "header-menu-trigger").click()
      await page.getByRole("menuitem", { name: `Export ${testCharacter.name}` }).click()
      return page.locator('[data-sem="toast"]')
    },
  },
]

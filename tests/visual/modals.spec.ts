import { test, expect, type Page } from "@playwright/test"

import { testCharacter } from "./fixtures"
import { openSheet, dialog, expectAxeClean, parkPointer, TALL, PHONE, type Theme } from "./helpers"

// Every modal is screenshotted open (TESTING.md "Visual Regression Coverage"). The default
// screenshot is the dialog element alone, so a change to the page behind the overlay doesn't churn
// these baselines; the "Modal shell" block screenshots the whole viewport instead, to guard the
// overlay, centring and corners that every modal shares.
//
// Not covered: the sign-out dialog. It needs a signed-in Firebase user — guest mode shows
// "Back to Login" in its place — and tests may not make real network calls (TESTING.md §5).
// src/tests/components/header-menu.test.tsx covers it.

const click = (page: Page, dataTest: string) => page.locator(`[data-test="${dataTest}"]`).click()

async function openFeatureType(page: Page) {
  await click(page, "add-feature-class-feature")
  await dialog(page).locator('[data-test="feature-type-select"]').click()
}

interface ModalCase {
  name: string
  tab?: string
  open: (page: Page) => Promise<void>
}

const MODALS: ModalCase[] = [
  { name: "action-add", tab: "Combat", open: (page) => click(page, "add-action-button") },
  { name: "bonus-action-add", tab: "Combat", open: (page) => click(page, "add-bonus-action-button") },
  { name: "reaction-add", tab: "Combat", open: (page) => click(page, "add-reaction-button") },
  { name: "other-add", tab: "Combat", open: (page) => click(page, "add-other-button") },
  { name: "action-edit", tab: "Combat", open: (page) => click(page, "action-card-attack-atk1-edit-button") },
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
  },
  { name: "item-edit-weapon", tab: "Inventory", open: (page) => click(page, "equipment-edit-eq1") },
  { name: "item-edit-armor", tab: "Inventory", open: (page) => click(page, "equipment-edit-eq2") },
  { name: "item-edit-magic", tab: "Inventory", open: (page) => click(page, "magic-item-edit-mi1") },
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

const byName = (name: string) => MODALS.find((m) => m.name === name)!

// Mirrors FEATURE_TYPES in src/components/features-module.tsx — the Feature form's fields differ
// per type. The "lists every feature type" test fails when the two drift, so a new type can't
// ship without a baseline.
const FEATURE_TYPES = [
  "Action", "Spellcasting Ability", "Hit Points", "Size", "Max HP Bonus",
  "Saving Throw Proficiency", "Skill Proficiency", "Other Proficiency", "Speed", "Senses",
  "Damage Resistance/Immunity/Vulnerability", "Condition Immunity", "Language", "Carrying Capacity",
  "Ability Scores",
]
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

async function openModal(page: Page, modal: ModalCase, theme?: Theme) {
  await openSheet(page, testCharacter, { tab: modal.tab, theme })
  await modal.open(page)
  await expect(dialog(page)).toBeVisible()
  await parkPointer(page)
}

test.describe("Modals — desktop", () => {
  test.use({ viewport: TALL })

  for (const modal of MODALS) {
    test(modal.name, async ({ page }) => {
      await openModal(page, modal)
      await expect(dialog(page)).toHaveScreenshot(`modal-${modal.name}.png`)
      await expectAxeClean(page)
    })
  }

  test("Add Feature lists every feature type", async ({ page }) => {
    await openModal(page, byName("feature-add-type-open"))
    await expect(dialog(page).getByRole("option")).toHaveText(["None", ...FEATURE_TYPES])
  })

  for (const type of FEATURE_TYPES) {
    test(`feature-add-type ${type}`, async ({ page }) => {
      await openModal(page, byName("feature-add-type-open"))
      await dialog(page).getByRole("option", { name: type, exact: true }).click()
      await expect(dialog(page).getByRole("listbox")).toHaveCount(0)
      await parkPointer(page)
      await expect(dialog(page)).toHaveScreenshot(`modal-feature-add-type-${slug(type)}.png`)
      await expectAxeClean(page)
    })
  }
})

test.describe("Modals — desktop, dark", () => {
  test.use({ viewport: TALL })

  for (const name of ["feature-add", "item-edit-weapon", "spell-edit", "rest-short"]) {
    test(name, async ({ page }) => {
      await openModal(page, byName(name), "dark")
      await expect(dialog(page)).toHaveScreenshot(`modal-${name}-dark.png`)
      await expectAxeClean(page)
    })
  }
})

test.describe("Modals — phone", () => {
  test.use({ viewport: PHONE })

  for (const name of ["feature-add", "feature-add-type-open", "item-edit-weapon", "spell-add", "rest-short", "import"]) {
    test(name, async ({ page }) => {
      await openModal(page, byName(name))
      await expect(dialog(page)).toHaveScreenshot(`modal-${name}-phone.png`)
      await expectAxeClean(page)
    })
  }

  // A phone can't fit the item form, so the modal scrolls; this guards the stacked footer at its end.
  test("item-edit-weapon scrolled to the footer", async ({ page }) => {
    await openModal(page, byName("item-edit-weapon"))
    await dialog(page).evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect(dialog(page)).toHaveScreenshot("modal-item-edit-weapon-phone-footer.png")
    await expectAxeClean(page)
  })
})

test.describe("Modal shell", () => {
  for (const [size, viewport] of [["desktop", undefined], ["phone", PHONE]] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${size} — ${theme}`, async ({ page }) => {
        if (viewport != null) await page.setViewportSize(viewport)
        await openModal(page, byName("rest-short"), theme)
        await expect(page).toHaveScreenshot(`modal-shell-${size}-${theme}.png`)
        await expectAxeClean(page)
      })
    }
  }
})

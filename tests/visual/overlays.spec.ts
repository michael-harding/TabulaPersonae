import { test, expect, type Locator, type Page } from "@playwright/test"

import type { Character } from "../../src/lib/character-types"
import { testCharacter } from "./fixtures"
import { openSheet, expectAxeClean, parkPointer, PHONE, type Theme } from "./helpers"

// Every popup that renders above the page is screenshotted open (TESTING.md "Visual Regression
// Coverage"), scoped to the popup itself so the page around it doesn't churn the baseline.
// Popups opened from inside a modal are covered in modals.spec.ts, inside that modal.

const byTest = (page: Page, dataTest: string) => page.locator(`[data-test="${dataTest}"]`)

interface OverlayCase {
  name: string
  tab?: string
  /** Defaults to testCharacter. */
  character?: Character
  /** Opens the popup and returns it. */
  open: (page: Page) => Promise<Locator>
}

const OVERLAYS: OverlayCase[] = [
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
    name: "action-details-popover", tab: "Combat", open: async (page) => {
      await byTest(page, "action-card-attack-atk1-details-trigger").click()
      return page.getByRole("dialog")
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

async function openOverlay(page: Page, overlay: OverlayCase, theme?: Theme) {
  await openSheet(page, overlay.character ?? testCharacter, { tab: overlay.tab, theme })
  const popup = await overlay.open(page)
  await expect(popup).toBeVisible()
  await parkPointer(page)
  return popup
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Overlays — ${theme}`, () => {
    for (const overlay of OVERLAYS) {
      test(overlay.name, async ({ page }) => {
        const popup = await openOverlay(page, overlay, theme)
        await expect(popup).toHaveScreenshot(`overlay-${overlay.name}-${theme}.png`)
        await expectAxeClean(page)
      })
    }
  })
}

test.describe("Overlays — phone", () => {
  test.use({ viewport: PHONE })

  test("header-menu", async ({ page }) => {
    const popup = await openOverlay(page, OVERLAYS.find((o) => o.name === "header-menu")!)
    await expect(popup).toHaveScreenshot("overlay-header-menu-phone.png")
    await expectAxeClean(page)
  })
})

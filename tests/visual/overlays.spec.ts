import { test, expect, type Page } from "@playwright/test"

import { testCharacter } from "./fixtures"
import { openSheet, parkPointer, PHONE, type Theme } from "./helpers"
import { OVERLAYS, type OverlayCase } from "../popup-cases"

// Every popup that renders above the page is screenshotted open (TESTING.md "Visual Regression
// Coverage"), scoped to the popup itself so the page around it doesn't churn the baseline.
// Popups opened from inside a modal are covered in modals.spec.ts, inside that modal.

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
      })
    }
  })
}

test.describe("Overlays — phone", () => {
  test.use({ viewport: PHONE })

  for (const name of ["header-menu", "action-card-expanded"]) {
    test(name, async ({ page }) => {
      const popup = await openOverlay(page, OVERLAYS.find((o) => o.name === name)!)
      await expect(popup).toHaveScreenshot(`overlay-${name}-phone.png`)
    })
  }
})

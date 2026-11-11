import { test, expect } from "@playwright/test"

import { openModal, PHONE } from "./helpers"
import { byName } from "../popup-cases"

// The whole viewport with a modal open, to guard the overlay, centring and corners that every modal
// shares. Its own file so that Firefox runs it (playwright.visual.config.ts); modals.spec.ts, which
// screenshots each modal's contents, runs in Chromium only.

test.describe("Modal shell", () => {
  for (const [size, viewport] of [["desktop", undefined], ["phone", PHONE]] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${size} — ${theme}`, async ({ page }) => {
        if (viewport != null) await page.setViewportSize(viewport)
        await openModal(page, byName("rest-short"), theme)
        await expect(page).toHaveScreenshot(`modal-shell-${size}-${theme}.png`)
      })
    }
  }
})

import { test, expect } from "@playwright/test"
import { testCharacter } from "./fixtures"

// next-themes persists the chosen theme in localStorage under the key "theme".
// Setting it before page load is the simplest way to force a theme without
// interacting with the UI toggle.

for (const theme of ["light", "dark"] as const) {
  test.describe(`Theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        ({ char, t }) => {
          localStorage.setItem("dnd-characters", JSON.stringify([char]))
          localStorage.setItem("dnd-skip-auth", "true")
          localStorage.setItem("theme", t)
        },
        { char: testCharacter, t: theme }
      )
    })

    test(`home page — ${theme}`, async ({ page }) => {
      await page.goto("/")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`home-${theme}.png`, { fullPage: true })
    })

    test(`character sheet — ${theme}`, async ({ page }) => {
      await page.goto(`/character/${testCharacter.id}`)
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`character-sheet-${theme}.png`, { fullPage: true })
    })
  })
}

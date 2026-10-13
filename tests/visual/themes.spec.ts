import { test, expect } from "@playwright/test"
// Scoped to WCAG 2.1 A/AA tags, matching ACCESSIBILITY.md's stated target conformance level —
// excludes axe's "best-practice" extras (e.g. the no-WCAG-tag "region" rule flagging
// Kobalte portal content rendered outside <main>) that aren't part of that target.
import AxeBuilder from "@axe-core/playwright"

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
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test(`character sheet — ${theme}`, async ({ page }) => {
      await page.goto(`/character/${testCharacter.id}`)
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`character-sheet-${theme}.png`, { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test(`tab settings — ${theme}`, async ({ page }) => {
      await page.goto("/settings/tabs")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`tab-settings-${theme}.png`, { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })
  })
}

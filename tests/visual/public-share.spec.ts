import { test, expect } from "@playwright/test"
// Scoped to WCAG 2.1 A/AA tags, matching ACCESSIBILITY.md's stated target conformance level —
// excludes axe's "best-practice" extras (e.g. the no-WCAG-tag "region" rule flagging
// Kobalte portal content rendered outside <main>) that aren't part of that target.
import AxeBuilder from "@axe-core/playwright"
import { publicCharacter } from "./fixtures"

// Seeds the public character via the dev localStorage bypass in getPublicCharacterFromFirebase.
// The key "dnd-public-char-{id}" is checked first when import.meta.env.DEV is true.
function seedPublicChar(char: typeof publicCharacter) {
  return async ({ page }: { page: import("@playwright/test").Page }) => {
    await page.addInitScript(({ id, data }) => {
      localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(data))
    }, { id: char.id, data: char })
  }
}

test.describe("Public share page", () => {
  test.describe("character found", () => {
    test.beforeEach(async ({ page }) => {
      await seedPublicChar(publicCharacter)({ page })
      await page.goto(`/share/${publicCharacter.id}`)
      await page.waitForLoadState("networkidle")
    })

    test("full page — default tab", async ({ page }) => {
      await expect(page).toHaveScreenshot("public-share-default-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("combat tab — actions with uses trackers (read-only)", async ({ page }) => {
      await page.getByRole("tab", { name: "Combat" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-combat-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("spells tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Spells" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-spells-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("features tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Features" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-features-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("inventory tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Inventory" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-inventory-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("character tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Character" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-character-tab.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("action card uses tracker pip — read-only rendering", async ({ page }) => {
      await page.getByRole("tab", { name: "Combat" }).click()
      await page.waitForLoadState("networkidle")
      // Scope to the "Dark One's Blessing" card (pip tracker, ≤5 uses)
      const card = page.locator(`[data-sem="action-card"]`).filter({ hasText: "Dark One's Blessing" })
      await expect(card).toHaveScreenshot("public-share-action-card-pip-readonly.png")
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })

    test("action card uses tracker stepper — read-only rendering", async ({ page }) => {
      await page.getByRole("tab", { name: "Combat" }).click()
      await page.waitForLoadState("networkidle")
      // Scope to "Fiendish Resilience" card (stepper, >5 uses)
      const card = page.locator(`[data-sem="action-card"]`).filter({ hasText: "Fiendish Resilience" })
      await expect(card).toHaveScreenshot("public-share-action-card-stepper-readonly.png")
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })
  })

  test.describe("character not found", () => {
    test("not-found state", async ({ page }) => {
      // Seed "null" so the dev bypass immediately returns null without a Firebase round-trip
      await page.addInitScript(() => {
        localStorage.setItem("dnd-public-char-nonexistent-char-id", "null")
      })
      await page.goto("/share/nonexistent-char-id")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-not-found.png", { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })
  })
})

test.describe("Public share page — theme variants", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`full page — ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ({ id, data, t }) => {
          localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(data))
          localStorage.setItem("theme", t)
        },
        { id: publicCharacter.id, data: publicCharacter, t: theme }
      )
      await page.goto(`/share/${publicCharacter.id}`)
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`public-share-${theme}.png`, { fullPage: true })
      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      expect(axeResults.violations).toEqual([])
    })
  }
})

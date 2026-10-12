import { type Locator, type Page } from "@playwright/test"

import { testCharacter, secondCharacter } from "../visual/fixtures"
import { axeBuilder, finishAnimations, test, expect } from "./test"

// Every test here is itself an axe scan of the state it sets up.
test.use({ axeAfterEach: false })

function setup(page: Page, chars: unknown | unknown[]) {
  const list = Array.isArray(chars) ? chars : [chars]
  return page.addInitScript((data: unknown[]) => {
    localStorage.setItem("dnd-characters", JSON.stringify(data))
    localStorage.setItem("dnd-skip-auth", "true")
  }, list)
}

test.describe("Home page", () => {
  test("empty state has no accessibility violations", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("dnd-characters", "[]")
      localStorage.setItem("dnd-skip-auth", "true")
    })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("with characters has no accessibility violations", async ({ page }) => {
    await setup(page, [testCharacter, secondCharacter])
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Auth page", () => {
  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/auth")
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Character sheet page", () => {
  test("full character sheet has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("unconscious character has no accessibility violations", async ({ page }) => {
    await setup(page, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("character tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("spells tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Spells" }).click()
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("inventory tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
})

// The hover highlight uses the accent colour, a strong red in the light theme; text that kept its
// normal colour on it had a contrast ratio of 2.24:1.
test.describe("Hovered section headers", () => {
  const sectionHeaders: { tab: string; header: (page: Page) => Locator }[] = [
    { tab: "Combat", header: (page) => page.getByRole("tabpanel").getByRole("button", { name: /^Actions/ }).first() },
    { tab: "Spells", header: (page) => page.locator('[data-test^="spell-level-"][data-test$="-toggle"]').first() },
    { tab: "Features", header: (page) => page.getByRole("tabpanel").getByRole("button", { name: /^Species Traits/ }).first() },
  ]
  for (const { tab, header } of sectionHeaders) {
    test(`${tab} tab: a hovered section header has no accessibility violations`, async ({ page }) => {
      await setup(page, testCharacter)
      await page.goto(`/character/${testCharacter.id}`)
      await page.waitForLoadState("networkidle")
      await page.getByRole("tab", { name: tab }).click()
      await header(page).hover()
      // The highlight fades in (transition-colors); scan the settled colours
      await page.waitForTimeout(300)
      const results = await axeBuilder(page).analyze()
      expect(results.violations).toEqual([])
    })
  }
})

// Menus are non-modal and rendered at the end of <body>. Opened from inside a modal dialog, a
// menu must stay exposed to assistive tech even though the dialog hides everything else outside it.
test.describe("A menu opened inside a dialog", () => {
  test("is reachable by role and has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.locator('[data-test^="equipment-edit-"]').first().click()
    const modal = page.getByRole("dialog")
    await modal.locator('[data-test="modifier-group-skill-effects"]').click()
    await modal.getByRole("button", { name: "Add skill advantage" }).click()

    await expect(page.getByRole("menuitem").first()).toBeVisible()
    await finishAnimations(page)
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Static pages", () => {
  test("418 page has no accessibility violations", async ({ page }) => {
    await page.goto("/418")
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test("404 page has no accessibility violations", async ({ page }) => {
    await page.goto("/nonexistent-route-xyz")
    await page.waitForLoadState("networkidle")
    const results = await axeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
})

import { type Locator, type Page } from "@playwright/test"

import { testCharacter, secondCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { axeBuilder, finishAnimations, test, expect } from "./test"

// Every test here is itself an axe scan of the state it sets up.
test.use({ axeAfterEach: false })

async function expectNoViolations(page: Page) {
  await finishAnimations(page)
  const results = await axeBuilder(page).analyze()
  expect(results.violations).toEqual([])
}

/** Opens a page and waits for its main heading, so the scan sees it loaded. */
async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
}

test.describe("Home page", () => {
  test("empty state has no accessibility violations", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await expect(page.locator('[data-test="create-first-character-button"]')).toBeVisible()
    await expectNoViolations(page)
  })

  test("with characters has no accessibility violations", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await page.goto("/")
    await expect(page.locator('[data-test="create-new-character-button"]')).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Auth page", () => {
  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/auth")
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Character sheet page", () => {
  test("full character sheet has no accessibility violations", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
    await expectNoViolations(page)
  })

  test("unconscious character has no accessibility violations", async ({ page }) => {
    await seedGuest(page, secondCharacter)
    await openSheet(page, secondCharacter.id)
    await expect(page.getByText("Death Saves")).toBeVisible()
    await expectNoViolations(page)
  })

  for (const tab of ["Character", "Spells", "Inventory"]) {
    test(`${tab.toLowerCase()} tab has no accessibility violations`, async ({ page }) => {
      await seedGuest(page, testCharacter)
      await openSheet(page, testCharacter.id, tab)
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true")
      await expectNoViolations(page)
    })
  }
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
      await seedGuest(page, testCharacter)
      await openSheet(page, testCharacter.id, tab)
      await header(page).hover()
      // The highlight fades in (transition-colors); finishAnimations waits for the settled colours
      await expectNoViolations(page)
    })
  }
})

// Menus are non-modal and rendered at the end of <body>. Opened from inside a modal dialog, a
// menu must stay exposed to assistive tech even though the dialog hides everything else outside it.
test.describe("A menu opened inside a dialog", () => {
  test("is reachable by role and has no accessibility violations", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id, "Inventory")
    await page.locator('[data-test^="equipment-edit-"]').first().click()
    const modal = page.getByRole("dialog")
    await modal.locator('[data-test="modifier-group-skill-effects"]').click()
    await modal.getByRole("button", { name: "Add skill advantage" }).click()

    await expect(page.getByRole("menuitem").first()).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Static pages", () => {
  for (const { path, heading } of [
    { path: "/418", heading: "418" },
    { path: "/nonexistent-route-xyz", heading: "404 - Not Found" },
    { path: "/terms", heading: "Terms of Use" },
    { path: "/privacy", heading: "Privacy Policy" },
  ]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await openPage(page, path, heading)
      await expectNoViolations(page)
    })
  }
})

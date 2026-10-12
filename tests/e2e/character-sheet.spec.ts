import { type Page } from "@playwright/test"

import { testCharacter, secondCharacter } from "../visual/fixtures"
import { test, expect } from "./test"

// Each scenario's final state is scanned with axe by the shared `test` (see ./test.ts), so there
// are no separate accessibility tests here.
function setup(page: Page, chars: unknown | unknown[]) {
  const list = Array.isArray(chars) ? chars : [chars]
  return page.addInitScript((data: unknown[]) => {
    localStorage.setItem("dnd-characters", JSON.stringify(data))
    localStorage.setItem("dnd-skip-auth", "true")
  }, list)
}

test.describe("Tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("Combat tab (default) shows ability scores and combat stats", async ({ page }) => {
    await expect(page.getByText("Ability Scores")).toBeVisible()
    await expect(page.getByText("Combat Stats")).toBeVisible()
  })

  test("Spells tab shows spells section", async ({ page }) => {
    await page.getByRole("tab", { name: "Spells" }).click()
    // "Spells" text appears in multiple places (tab, heading, "Prepared Spells");
    // "Spell Slots" is unique to the spells section content
    await expect(page.getByText("Spell Slots")).toBeVisible()
  })

  test("Inventory tab shows equipment section", async ({ page }) => {
    await page.getByRole("tab", { name: "Inventory" }).click()
    await expect(page.getByText("Equipment & Inventory")).toBeVisible()
  })

  test("Character tab shows basic info and notes", async ({ page }) => {
    await page.getByRole("tab", { name: "Character" }).click()
    await expect(page.getByText("Character Information")).toBeVisible()
  })
})

test.describe("HP quick-adjust buttons", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("clicking Increase HP increments the displayed HP", async ({ page }) => {
    // testCharacter starts at 38/44; clicking + raises current to 39
    await page.getByRole("button", { name: "Increase HP" }).click()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
  })

  test("clicking Decrease HP decrements temp HP first", async ({ page }) => {
    // testCharacter has 5 temp HP; first click absorbs into temp HP → temp HP drops to 4
    await page.getByRole("button", { name: "Decrease HP" }).click()
    await expect(page.getByText("+5")).not.toBeVisible()
    // Target the temp HP span specifically — "+4" also matches initiative/spell-attack spans
    await expect(page.locator('[data-sem="stats-bar"] span.text-secondary')).toHaveText('+4')
  })
})

test.describe("Death saves", () => {
  test("death saves section is visible when HP is 0", async ({ page }) => {
    await setup(page, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Death Saves")).toBeVisible()
    await expect(page.getByText("Successes")).toBeVisible()
    await expect(page.getByText("Failures")).toBeVisible()
  })

  test("clicking a death save success circle fills it", async ({ page }) => {
    await setup(page, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")
    // secondCharacter starts with 1 success already filled; clicking adds a second
    await page.getByLabel("Click to add success").first().click()
    // Now 2 success slots are filled — assert count rather than strict single-match
    await expect(page.getByLabel("Success (click to remove)")).toHaveCount(2)
  })
})

test.describe("Conditions", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("adding Poisoned condition shows badge", async ({ page }) => {
    await page.locator('[data-test="condition-add"]').click()
    await page.getByRole("menuitem", { name: "Poisoned" }).click()
    // Use data-test attr to target the badge specifically (avoids matching the still-open menu)
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).toBeVisible()
  })

  test("removing a condition hides the badge", async ({ page }) => {
    await page.locator('[data-test="condition-add"]').click()
    await page.getByRole("menuitem", { name: "Poisoned" }).click()
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).toBeVisible()
    await page.locator('[data-test="condition-remove-Poisoned"]').click()
    await expect(page.locator('[data-test="condition-remove-Poisoned"]')).not.toBeVisible()
  })
})

test.describe("Spell slot usage", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Spells" }).click()
  })

  test("clicking an available slot marks it as used", async ({ page }) => {
    // testCharacter level-1 slots: 4 total, 1 pre-used → 3 available
    // After clicking one: 2 used slots total
    await page.getByLabel("Available slot (click to use)").first().click()
    await expect(page.getByLabel("Used slot (click to restore)")).toHaveCount(2)
  })
})

test.describe("Rest modal", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("clicking Take a Rest opens the rest dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Take a Rest" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("clicking Cancel closes the rest dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Take a Rest" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: /cancel/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})

test.describe("Edit basic info workflow", () => {
  test("changing character name and saving reflects updated name in view mode", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Character" }).click()
    // Find and click the Edit button in the Basic Information section
    await page.getByRole("button", { name: /^edit$/i }).first().click()
    const nameInput = page.getByLabel(/character name/i)
    await nameInput.fill("Zara Brightbow")
    await page.getByRole("button", { name: /save changes/i }).click()
    // Use heading role to avoid strict-mode match with the paragraph that also shows the name
    await expect(page.getByRole("heading", { name: "Zara Brightbow" })).toBeVisible()
  })
})

test.describe("Guest mode", () => {
  test("Back to Login keeps the guest's characters on this device", async ({ page }) => {
    // Seeded once, not with an init script: an init script would run again on the reload that
    // Back to Login triggers and put the characters back whether or not the app had kept them.
    await page.goto("/auth")
    await page.evaluate((character: unknown) => {
      localStorage.setItem("dnd-characters", JSON.stringify([character]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto("/")
    await expect(page.getByText(testCharacter.name)).toBeVisible()

    await page.locator('[data-test="header-menu-trigger"]').click()
    await page.getByRole("menuitem", { name: "Back to Login" }).click()

    // Leaving guest mode lands on the sign-in page
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    // Without an account these characters exist nowhere else, so they must still be here
    const stored = await page.evaluate(() => ({
      characters: JSON.parse(localStorage.getItem("dnd-characters") ?? "[]").length,
      skipAuth: localStorage.getItem("dnd-skip-auth"),
    }))
    expect(stored).toEqual({ characters: 1, skipAuth: null })
  })
})

import { test, expect, type Page } from "@playwright/test"
import { testCharacter } from "../visual/fixtures"

function setup(page: Page) {
  return page.addInitScript((char: unknown) => {
    localStorage.setItem("dnd-characters", JSON.stringify([char]))
    localStorage.setItem("dnd-skip-auth", "true")
  }, testCharacter)
}

test.describe("Interaction performance", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("HP adjustment reflects in DOM", async ({ page }) => {
    // testCharacter starts at 38/44 — after one Increase HP click it should show 39
    await page.getByRole("button", { name: "Increase HP" }).click()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
  })

  test("tab switch to Spells shows content", async ({ page }) => {
    await page.getByRole("tab", { name: "Spells" }).click()
    await expect(page.getByText("Spell Slots")).toBeVisible()
  })

  test("tab switch to Features shows content", async ({ page }) => {
    await page.getByRole("tab", { name: "Features" }).click()
    await expect(page.getByText("Class Features, Species Traits & Feats")).toBeVisible()
  })

  test("tab switch to Inventory shows content", async ({ page }) => {
    await page.getByRole("tab", { name: "Inventory" }).click()
    await expect(page.getByText("Equipment & Inventory")).toBeVisible()
  })
})

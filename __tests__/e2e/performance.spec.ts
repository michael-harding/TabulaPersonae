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
    await expect(page.locator("text=39").first()).toBeVisible()
  })

  test("tab switch to Spells visible within 300ms", async ({ page }) => {
    await page.getByRole("tab", { name: "Spells" }).click()
    await page.getByText("Spell Slots").waitFor({ timeout: 300 })
  })

  test("tab switch to Features visible within 300ms", async ({ page }) => {
    await page.getByRole("tab", { name: "Features" }).click()
    await page.getByText("Class Features, Species Traits & Feats").waitFor({ timeout: 300 })
  })

  test("tab switch to Inventory visible within 300ms", async ({ page }) => {
    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.getByText("Equipment & Inventory").waitFor({ timeout: 300 })
  })
})

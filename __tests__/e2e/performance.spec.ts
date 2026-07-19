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

  test("HP adjustment DOM update completes within 200ms", async ({ page }) => {
    const duration = await page.evaluate(async () => {
      const btn = document.querySelector('[aria-label="Increase HP"]') as HTMLElement
      const start = performance.now()
      btn.click()
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return performance.now() - start
    })
    expect(duration).toBeLessThan(200)
  })

  test("tab switch to Spells visible within 300ms", async ({ page }) => {
    const start = Date.now()
    await page.getByRole("tab", { name: "Spells" }).click()
    await page.getByText("Spell Slots").waitFor({ timeout: 300 })
    expect(Date.now() - start).toBeLessThan(300)
  })

  test("tab switch to Features visible within 300ms", async ({ page }) => {
    const start = Date.now()
    await page.getByRole("tab", { name: "Features" }).click()
    await page.getByText("Class Features, Species Traits & Feats").waitFor({ timeout: 300 })
    expect(Date.now() - start).toBeLessThan(300)
  })

  test("tab switch to Inventory visible within 300ms", async ({ page }) => {
    const start = Date.now()
    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.getByText("Equipment & Inventory").waitFor({ timeout: 300 })
    expect(Date.now() - start).toBeLessThan(300)
  })
})

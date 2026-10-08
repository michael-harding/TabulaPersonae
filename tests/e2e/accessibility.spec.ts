import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { testCharacter, secondCharacter } from "../visual/fixtures"

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
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("with characters has no accessibility violations", async ({ page }) => {
    await setup(page, [testCharacter, secondCharacter])
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Auth page", () => {
  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/auth")
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Character sheet page", () => {
  test("full character sheet has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("unconscious character has no accessibility violations", async ({ page }) => {
    await setup(page, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("character tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("spells tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Spells" }).click()
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("inventory tab has no accessibility violations", async ({ page }) => {
    await setup(page, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Inventory" }).click()
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("Static pages", () => {
  test("418 page has no accessibility violations", async ({ page }) => {
    await page.goto("/418")
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test("404 page has no accessibility violations", async ({ page }) => {
    await page.goto("/nonexistent-route-xyz")
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

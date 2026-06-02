import { test, expect } from "@playwright/test"
import { testCharacter, secondCharacter } from "./fixtures"

test.describe("Home page", () => {
  test("empty state", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("dnd-characters", "[]")
      localStorage.setItem("dnd-skip-auth", "true")
    })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("home-empty.png", { fullPage: true })
  })

  test("with characters", async ({ page }) => {
    const chars = [testCharacter, secondCharacter]
    await page.addInitScript((data) => {
      localStorage.setItem("dnd-characters", JSON.stringify(data))
      localStorage.setItem("dnd-skip-auth", "true")
    }, chars)
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("home-with-characters.png", { fullPage: true })
  })
})

test.describe("Auth page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/auth")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("auth.png", { fullPage: true })
  })
})

test.describe("Character sheet page", () => {
  test("full character sheet", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("character-sheet.png", { fullPage: true })
  })

  test("unconscious character with death saves", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("character-sheet-death-saves.png", { fullPage: true })
  })
})

test.describe("418 page", () => {
  test("renders teapot page", async ({ page }) => {
    await page.goto("/418")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("418.png", { fullPage: true })
  })
})

test.describe("404 page", () => {
  test("renders not found", async ({ page }) => {
    await page.goto("/nonexistent-route-xyz")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("not-found.png", { fullPage: true })
  })
})

import { test, expect } from "@playwright/test"

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

    // The page opens on the Combat tab, so this is also the page as it first opens. It shows the
    // read-only uses trackers: pips on "Dark One's Blessing", a stepper on "Fiendish Resilience".
    test("combat tab — actions with uses trackers (read-only)", async ({ page }) => {
      await page.getByRole("tab", { name: "Combat" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-combat-tab.png", { fullPage: true })
    })

    test("spells tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Spells" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-spells-tab.png", { fullPage: true })
    })

    test("features tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Features" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-features-tab.png", { fullPage: true })
    })

    test("inventory tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Inventory" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-inventory-tab.png", { fullPage: true })
    })

    test("character tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Character" }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot("public-share-character-tab.png", { fullPage: true })
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
    })
  })
})

// Only dark: light is the default theme, which the combat tab baseline above already shows.
test.describe("Public share page — dark theme", () => {
  test("full page — dark", async ({ page }) => {
    await page.addInitScript(
      ({ id, data }) => {
        localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(data))
        localStorage.setItem("theme", "dark")
      },
      { id: publicCharacter.id, data: publicCharacter }
    )
    await page.goto(`/share/${publicCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("public-share-dark.png", { fullPage: true })
  })
})

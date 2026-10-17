import { testCharacter, secondCharacter } from "../visual/fixtures"
import { confirmClick, reload, seedGuest, storedCharacters } from "./helpers"
import { test, expect } from "./test"

// Creating, opening and deleting characters on the character list, without an account. Each
// final state is scanned with axe by the shared `test`.

const card = (page: import("@playwright/test").Page, name: string) => page.getByRole("link", { name: new RegExp(`^${name}`) })

test.describe("Creating characters", () => {
  test("@mobile the first character opens its sheet and is listed afterwards", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await page.locator('[data-test="create-first-character-button"]').click()

    await expect(page).toHaveURL(/\/character\/[^/]+$/)
    await expect(page.getByRole("tab").first()).toBeVisible()
    const id = page.url().split("/").at(-1)!

    await page.locator('[data-test="header-menu-trigger"]').click()
    await page.getByRole("menuitem", { name: "All Characters" }).click()
    await expect(page).toHaveURL("/")
    await expect(card(page, "Unnamed Character")).toHaveAttribute("href", `/character/${id}`)

    await reload(page)
    await expect(card(page, "Unnamed Character")).toBeVisible()
    expect((await storedCharacters(page)).map((c) => c.id)).toEqual([id])
  })

  test("another character is added alongside the existing ones", async ({ page }) => {
    await seedGuest(page, [testCharacter])
    await page.goto("/")
    await page.locator('[data-test="create-new-character-button"]').click()
    await expect(page).toHaveURL(/\/character\/[^/]+$/)

    await page.goto("/")
    await expect(card(page, testCharacter.name)).toBeVisible()
    await expect(card(page, "Unnamed Character")).toBeVisible()
    expect(await storedCharacters(page)).toHaveLength(2)
  })
})

test.describe("Deleting a character", () => {
  test("@mobile one click only asks to confirm; the second removes it for good", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await page.goto("/")
    const remove = page.locator(`[data-test="delete-character-button-${testCharacter.id}"]`)

    await remove.click()
    await expect(remove).toHaveAccessibleName(`Confirm Delete ${testCharacter.name}`)
    await expect(card(page, testCharacter.name)).toBeVisible()
    // Escape disarms it, deleting nothing
    await page.keyboard.press("Escape")
    await expect(remove).toHaveAccessibleName(`Delete ${testCharacter.name}`)

    await confirmClick(remove)
    await expect(card(page, testCharacter.name)).toHaveCount(0)

    await reload(page)
    await expect(card(page, testCharacter.name)).toHaveCount(0)
    await expect(card(page, secondCharacter.name)).toBeVisible()
    expect((await storedCharacters(page)).map((c) => c.id)).toEqual([secondCharacter.id])
  })
})

test.describe("Opening a character", () => {
  test("a character that does not exist goes to the not-found page", async ({ page }) => {
    await seedGuest(page, [testCharacter])
    await page.goto("/character/does-not-exist")

    await expect(page).toHaveURL("/404")
    await expect(page.getByRole("heading", { name: "404 - Not Found" })).toBeVisible()
  })
})

test.describe("Leaving guest mode", () => {
  test("Back to Login keeps the guest's characters on this device", async ({ page }) => {
    await seedGuest(page, [testCharacter])
    await page.goto("/")
    await expect(card(page, testCharacter.name)).toBeVisible()

    await page.locator('[data-test="header-menu-trigger"]').click()
    await page.getByRole("menuitem", { name: "Back to Login" }).click()

    // Leaving guest mode lands on the sign-in page
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    // Without an account these characters exist nowhere else, so they must still be here
    expect((await storedCharacters(page)).map((c) => c.id)).toEqual([testCharacter.id])
    expect(await page.evaluate(() => localStorage.getItem("dnd-skip-auth"))).toBeNull()
  })
})

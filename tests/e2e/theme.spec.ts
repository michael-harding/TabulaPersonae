import { testCharacter } from "../visual/fixtures"
import { reload, seedGuest } from "./helpers"
import { test, expect } from "./test"

// The theme chosen in the sidebar menu applies at once and is remembered on this device.

test("Toggle Theme switches between light and dark, and the choice survives a reload", async ({ page }) => {
  await seedGuest(page, testCharacter, { theme: "light" })
  await page.goto("/")
  const html = page.locator("html")
  await expect(html).not.toHaveClass(/\bdark\b/)

  await page.locator('[data-test="sidebar-menu-trigger"]').click()
  await page.locator('[data-test="sidebar-menu"]').getByRole("button", { name: "Toggle Theme" }).click()
  await expect(html).toHaveClass(/\bdark\b/)

  await reload(page)
  await expect(html).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark")

  await page.locator('[data-test="sidebar-menu-trigger"]').click()
  await page.locator('[data-test="sidebar-menu"]').getByRole("button", { name: "Toggle Theme" }).click()
  await expect(html).not.toHaveClass(/\bdark\b/)
})

import { testCharacter } from "../visual/fixtures"
import { createUser, readCharacter, seedCharacter, signIn, withUniqueId } from "./emulator"
import { openSheet } from "./helpers"
import { test, expect } from "./test"

// Working without a connection while signed in: changes wait on the device, the offline
// indicator says so, and everything reaches the account once the connection is back. Against the
// Firebase emulators.

test.describe("Without a connection", () => {
  test("@mobile changes wait on the device and reach the account when the connection returns", async ({ page, context }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    await signIn(page, user)
    await openSheet(page, character.id)
    const indicator = page.locator('[data-test="offline-indicator"]')
    await expect(indicator).toHaveCount(0)

    // Taken offline only now: the dev server cannot serve the app without a connection
    await context.setOffline(true)
    await expect(indicator).toContainText("Offline")
    await page.locator('[data-test="hp-increase-button"]').click()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
    expect((await readCharacter(character.id))?.hitPoints.current).toBe(38)

    await context.setOffline(false)
    await expect(indicator).toContainText("Synced")
    await expect.poll(async () => (await readCharacter(character.id))?.hitPoints.current).toBe(39)
    // The indicator goes away once things are back to normal
    await expect(indicator).toHaveCount(0, { timeout: 10_000 })
  })

  test("the account's characters still open from this device's copy", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    // The browser reports no connection once the test says so. The dev server has no service
    // worker, so the app itself still has to load; only Firestore is cut off (below).
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "onLine", { get: () => sessionStorage.getItem("e2e-offline") == null })
    })
    await signIn(page, user)
    await openSheet(page, character.id)

    await page.evaluate(() => sessionStorage.setItem("e2e-offline", "true"))
    await page.route(/^http:\/\/127\.0\.0\.1:8080\//, (route) => route.abort("internetdisconnected"))
    await page.goto("/")
    await expect(page.getByRole("link", { name: new RegExp(`^${character.name}`) })).toBeVisible()
    await openSheet(page, character.id)
    await expect(page.getByRole("heading", { name: character.name })).toBeVisible()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("38")
  })
})

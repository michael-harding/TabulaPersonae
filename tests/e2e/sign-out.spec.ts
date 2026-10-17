import { type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { createUser, readCharacter, seedCharacter, signIn, withUniqueId } from "./emulator"
import { openSheet, seedDevice } from "./helpers"
import { test, expect } from "./test"

// Signing out removes all of the user's data from the device, so it must never silently take
// changes the account has not received. Against the Firebase emulators.

async function signOut(page: Page) {
  await page.locator('[data-test="header-menu-trigger"]').click()
  await page.getByRole("menuitem", { name: "Sign Out" }).click()
}

const appKeys = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("dnd-")).sort())

/**
 * Cuts the page off from Firestore only. Writes then wait on this device, as they would with no
 * connection, while the app itself — and the reload that follows signing out — still loads.
 */
const blockFirestore = (page: Page) => page.route(/^http:\/\/127\.0\.0\.1:8080\//, (route) => route.abort("internetdisconnected"))

test.describe("Signing out", () => {
  test("@mobile removes the user's data from the device, which signing in again brings back", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    // A device setting, which outlives the sign-out
    await seedDevice(page, [], { guest: false, termsAccepted: true })
    await signIn(page, user)
    await openSheet(page, character.id)
    expect((await appKeys(page)).length).toBeGreaterThan(1)

    await signOut(page)

    await expect(page).toHaveURL("/auth")
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    expect(await appKeys(page)).toEqual(["dnd-terms-accepted"])

    await signIn(page, user)
    await expect(page.getByRole("link", { name: new RegExp(`^${character.name}`) })).toBeVisible()
  })

  test("with changes the account has not received, asks first; Cancel keeps everything", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    await signIn(page, user)
    await openSheet(page, character.id)
    await blockFirestore(page)
    await page.locator('[data-test="hp-increase-button"]').click()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")

    await signOut(page)
    const dialog = page.locator('[data-test="sign-out-dialog"]')
    await expect(dialog.getByRole("heading", { name: "Sign out and lose unsynced changes?" })).toBeVisible()
    await page.locator('[data-test="sign-out-cancel"]').click()

    await expect(dialog).toBeHidden()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
    await expect(page.getByText(user.email)).toBeVisible()
    // The change is still waiting to be sent, and reaches the account once it can
    await page.unrouteAll()
    await expect.poll(async () => (await readCharacter(character.id))?.hitPoints.current).toBe(39)
  })

  test("with changes the account has not received, signs out once the user accepts losing them", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    await signIn(page, user)
    await openSheet(page, character.id)
    await blockFirestore(page)
    await page.locator('[data-test="hp-increase-button"]').click()

    await signOut(page)
    await page.locator('[data-test="sign-out-discard"]').click()

    await expect(page).toHaveURL("/auth")
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    expect(await appKeys(page)).toEqual([])
    // The change never reached the account
    expect((await readCharacter(character.id))?.hitPoints.current).toBe(38)
  })

  test("that cannot remove the offline data keeps the user signed in and says to reload", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    // Deleting Firestore's offline database fails, as it can when the browser refuses
    await page.addInitScript(() => {
      IDBFactory.prototype.deleteDatabase = function () {
        const request = { error: new DOMException("The database could not be deleted", "UnknownError") } as unknown as IDBOpenDBRequest
        setTimeout(() => request.onerror?.call(request, { target: request } as unknown as Event))
        return request
      }
    })
    await signIn(page, user)

    await signOut(page)

    const dialog = page.locator('[data-test="sign-out-dialog"]')
    await expect(dialog.getByRole("heading", { name: "Sign-out did not finish" })).toBeVisible()
    await page.locator('[data-test="sign-out-reload"]').click()
    // Still signed in after the reload
    await expect(page).toHaveURL("/")
    await expect(page.getByText(user.email)).toBeVisible()
  })
})

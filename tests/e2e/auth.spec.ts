import { testCharacter, secondCharacter } from "../visual/fixtures"
import { DEFAULT_TAB_CONFIG } from "../../src/lib/tab-config-types"
import { createUser, readCharacter, readDoc, seedCharacter, signIn, uniqueEmail, withUniqueId } from "./emulator"
import { seedDevice, storedCharacters } from "./helpers"
import { test, expect } from "./test"

// Signing in, signing up and the move of a guest's data into the account, against the Firebase
// Auth and Firestore emulators. Each final state is scanned with axe by the shared `test`.

test.describe("Signing in", () => {
  test("@mobile shows the characters already in the account", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)

    await signIn(page, user)

    await expect(page.getByText(character.name)).toBeVisible()
    // The header names the account, on screens wider than a phone
    if (!testInfo.project.use.isMobile) await expect(page.getByText(user.email)).toBeVisible()
  })

  test("with the wrong password shows an error and stays on the sign-in page", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    await page.goto("/auth")
    await page.locator('[data-test="auth-email-input"]').fill(user.email)
    await page.locator('[data-test="auth-password-input"]').fill("not-the-password")
    await page.locator('[data-test="auth-submit-button"]').click()

    await expect(page.getByRole("alert")).toHaveText("Incorrect password.")
    await expect(page).toHaveURL("/auth")
  })

  test("Forgot password confirms that a reset email was sent", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    await page.goto("/auth")
    await page.locator('[data-test="auth-email-input"]').fill(user.email)
    await page.locator('[data-test="auth-reset-password-button"]').click()

    await expect(page.getByRole("status")).toHaveText("Password reset email sent! Check your inbox.")
  })
})

test.describe("Signing up", () => {
  async function fillSignUp(page: import("@playwright/test").Page, email: string) {
    await page.goto("/auth")
    await page.locator('[data-test="auth-signup-tab"]').click()
    await page.locator('[data-test="auth-email-input"]').fill(email)
    await page.locator('[data-test="auth-password-input"]').fill("correct-horse-battery")
    await page.locator('[data-test="auth-confirm-password-input"]').fill("correct-horse-battery")
    await page.locator('[data-test="auth-submit-button"]').click()
  }

  test("asks to accept the terms first; declining creates nothing, agreeing creates the account", async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo)
    await fillSignUp(page, email)

    const consent = page.getByRole("dialog", { name: "Terms of Use & Privacy Policy" })
    await expect(consent).toBeVisible()
    await consent.getByRole("button", { name: "Decline" }).click()
    await expect(consent).toBeHidden()
    await expect(page).toHaveURL("/auth")

    await page.locator('[data-test="auth-submit-button"]').click()
    await consent.getByRole("button", { name: "I Agree" }).click()

    await expect(page).toHaveURL("/")
    await expect(page.getByText(email)).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem("dnd-terms-accepted"))).toBe("true")
  })

  test("with an email that already has an account shows an error", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    await page.addInitScript(() => localStorage.setItem("dnd-terms-accepted", "true"))
    await fillSignUp(page, user.email)
    await page.getByRole("dialog").getByRole("button", { name: "I Agree" }).click()

    await expect(page.getByRole("alert")).toHaveText("An account with this email already exists.")
    await expect(page).toHaveURL("/auth")
  })
})

test.describe("Signing in after using the app without an account", () => {
  test("moves this device's characters and tab layout into the account", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const guestCharacters = [withUniqueId(testCharacter), withUniqueId(secondCharacter)]
    const tabConfig = { tabs: [...DEFAULT_TAB_CONFIG.tabs].reverse() }
    // As the device is left after "Back to Login": the guest's data, without the guest flag
    await seedDevice(page, guestCharacters, { guest: false, tabConfig })

    await signIn(page, user)

    for (const character of guestCharacters) {
      await expect(page.getByText(character.name)).toBeVisible()
      await expect.poll(async () => (await readCharacter(character.id))?.userId).toBe(user.uid)
    }
    await expect.poll(async () => (await readDoc(`userSettings/${user.uid}`))?.tabConfig).toEqual(tabConfig)
    // Once the account has them they are removed from the device
    await expect.poll(() => storedCharacters(page)).toEqual([])
    expect(await page.evaluate(() => localStorage.getItem("dnd-tab-config"))).toBeNull()
  })

  test("keeps a character on the device, and says so, when the account cannot take it", async ({ page }, testInfo) => {
    const owner = await createUser(testInfo, "owner")
    const user = await createUser(testInfo)
    // A character with the id of one in someone else's account: firestore.rules refuse the write
    const taken = withUniqueId(testCharacter)
    await seedCharacter(owner.uid, taken)
    await seedDevice(page, [taken], { guest: false })

    await signIn(page, user)

    await expect(page.getByText("Characters not uploaded", { exact: true })).toBeVisible()
    expect((await storedCharacters(page)).map((c) => c.id)).toEqual([taken.id])
    expect((await readCharacter(taken.id))?.userId).toBe(owner.uid)
  })
})

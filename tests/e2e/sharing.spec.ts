import { type Browser, type Page, type TestInfo } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { createUser, readCharacter, seedCharacter, signIn, withUniqueId } from "./emulator"
import { openSheet, reload } from "./helpers"
import { axeBuilder, finishAnimations, guardAgainstFirebase, test, expect } from "./test"

// Sharing a character publicly, and who can see what. Against the Firebase emulators, so
// firestore.rules decide every read here, as they do in production.

const shareSwitch = (page: Page) => page.locator('[data-test="switch-button-sheet-settings-share-switch"]')

/** A visitor who is not signed in, in a browser of their own. */
async function openAsVisitor(browser: Browser, testInfo: TestInfo, path: string) {
  const context = await browser.newContext({ ...testInfo.project.use, baseURL: testInfo.project.use.baseURL })
  const reached = await guardAgainstFirebase(context)
  const page = await context.newPage()
  await page.goto(path)
  return { page, reached, close: () => context.close() }
}

async function expectNoViolations(page: Page) {
  await finishAnimations(page)
  expect((await axeBuilder(page).analyze()).violations).toEqual([])
}

test.describe("Sharing a character", () => {
  test("@mobile shared, anyone with the link can view it; unshared, no one can", async ({ page, context, browser }, testInfo) => {
    const owner = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(owner.uid, character)
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await signIn(page, owner)
    await openSheet(page, character.id, "Character")

    await shareSwitch(page).check({ force: true })
    const shareUrl = `${new URL(page.url()).origin}/share/${character.id}`
    await expect(page.locator('[data-test="share-url-input"]')).toHaveValue(shareUrl)
    await expect(page.getByRole("img", { name: "QR code for share link" })).toBeVisible()
    await page.locator('[data-test="share-url-copy-button"]').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shareUrl)
    await expect.poll(async () => (await readCharacter(character.id))?.isPublic).toBe(true)

    const visitor = await openAsVisitor(browser, testInfo, `/share/${character.id}`)
    await expect(visitor.page.getByRole("heading", { level: 1, name: character.name })).toBeVisible()
    // Read-only: nothing on the shared sheet can be edited
    await expect(visitor.page.locator('[data-test$="-module-edit"]')).toHaveCount(0)
    await expect(visitor.page.locator('[data-test="hp-increase-button"]')).toHaveCount(0)
    // Nothing on it tells a screen reader to click what cannot be clicked: read-only trackers are
    // named by their state alone
    for (const tab of await visitor.page.getByRole("tab").all()) {
      await tab.click()
      const names = await visitor.page.getByRole("img").evaluateAll((images) => images.map((image) => image.getAttribute("aria-label") ?? ""))
      expect(names.filter((name) => /click/i.test(name))).toEqual([])
    }
    await expectNoViolations(visitor.page)

    await shareSwitch(page).uncheck({ force: true })
    await expect(page.locator('[data-test="share-url-input"]')).toHaveCount(0)
    await expect.poll(async () => (await readCharacter(character.id))?.isPublic).toBe(false)

    await reload(visitor.page)
    await expect(visitor.page.getByRole("heading", { name: "Character not found or not shared publicly." })).toBeVisible()
    await expectNoViolations(visitor.page)
    expect(visitor.reached).toEqual([])
    await visitor.close()
  })

  test.describe(() => {
    // Only the visitor's page is used, and scanned below; the automatic scan would scan a blank one
    test.use({ axeAfterEach: false })

    test("a character that was never shared cannot be viewed by its link", async ({ browser }, testInfo) => {
      const owner = await createUser(testInfo)
      const character = withUniqueId(testCharacter)
      await seedCharacter(owner.uid, character)

      const visitor = await openAsVisitor(browser, testInfo, `/share/${character.id}`)
      await expect(visitor.page.getByRole("heading", { name: "Character not found or not shared publicly." })).toBeVisible()
      await expect(visitor.page.getByText(character.name)).toHaveCount(0)
      await expectNoViolations(visitor.page)
      expect(visitor.reached).toEqual([])
      await visitor.close()
    })
  })
})

test.describe("Another user's character", () => {
  test("cannot be opened, even by someone signed in", async ({ page }, testInfo) => {
    const owner = await createUser(testInfo, "owner")
    const other = await createUser(testInfo, "other")
    const character = withUniqueId(testCharacter)
    await seedCharacter(owner.uid, character)
    await signIn(page, other)

    await page.goto(`/character/${character.id}`)

    await expect(page).toHaveURL("/404")
    await expect(page.getByRole("heading", { name: "404 - Not Found" })).toBeVisible()
    // Nor does it appear in their list
    await page.goto("/")
    await expect(page.locator('[data-test="create-first-character-button"]')).toBeVisible()
  })
})

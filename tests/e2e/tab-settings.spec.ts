import { type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { DEFAULT_TAB_CONFIG, type UserTabConfig } from "../../src/lib/tab-config-types"
import { createUser, readDoc, signIn } from "./emulator"
import { confirmClick, openSheet, reload, seedGuest } from "./helpers"
import { test, expect } from "./test"

// Configuring the character sheet's tabs, and the sheet following that configuration.

const tabOrder = (page: Page) =>
  page.locator('[data-test^="tab-drag-handle-"]').evaluateAll((handles) => handles.map((handle) => handle.getAttribute("data-test")))

const storedTabs = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem("dnd-tab-config") ?? "null") as UserTabConfig | null)?.tabs ?? null)

async function openTabSettings(page: Page) {
  await page.goto("/settings/tabs")
  await expect(page.locator('[data-test^="tab-drag-handle-"]').first()).toBeVisible()
}

test.describe("Tab settings", () => {
  // The unit tests replace the drag library, so this is the one place a real pointer drag is checked.
  test("dragging a tab below the next one reorders them, and the order survives a reload", async ({ page }) => {
    await seedGuest(page, [])
    await openTabSettings(page)
    const before = await tabOrder(page)
    expect(before.length).toBeGreaterThan(1)
    // The first tab starts expanded; collapsed, the two rows being swapped are both on screen
    await page.getByRole("button", { name: "Collapse tab" }).click()
    await expect(page.getByRole("button", { name: "Collapse tab" })).toHaveCount(0)
    const handles = page.locator('[data-test^="tab-drag-handle-"]')
    const from = (await handles.nth(0).boundingBox())!
    const to = (await handles.nth(1).boundingBox())!

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    // Moved in steps: the drag library only starts a drag once the pointer has travelled
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 4, { steps: 12 })
    await page.mouse.up()

    const reordered = [before[1], before[0], ...before.slice(2)]
    await expect.poll(() => tabOrder(page)).toEqual(reordered)

    await reload(page)
    await expect.poll(() => tabOrder(page)).toEqual(reordered)
  })

  test("a new tab, renamed and given a module, appears on the character sheet", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openTabSettings(page)
    await page.locator('[data-test="add-tab-button"]').click()
    await page.locator('[data-test="new-tab-name-input"]').fill("Downtime")
    await page.locator('[data-test="add-tab-submit"]').click()
    await expect.poll(async () => (await storedTabs(page))?.map((t) => t.label)).toContain("Downtime")
    const { id } = (await storedTabs(page))!.find((t) => t.label === "Downtime")!

    await page.locator(`[data-test="tab-rename-${id}"]`).click()
    await page.locator(`[data-test="tab-rename-input-${id}"]`).fill("Downtime & Crafting")
    await page.locator(`[data-test="tab-rename-save-${id}"]`).click()
    await page.locator(`[data-test="add-module-${id}-notes"]`).click()

    await openSheet(page, testCharacter.id)
    await page.locator(`[data-test="tab-trigger-${id}"]`).click()
    await expect(page.locator(`[data-test="tab-trigger-${id}"]`)).toHaveText("Downtime & Crafting")
    await expect(page.getByRole("tabpanel").locator('[data-test="character-notes-module"]')).toBeVisible()

    await reload(page)
    await page.locator(`[data-test="tab-trigger-${id}"]`).click()
    await expect(page.getByRole("tabpanel").locator('[data-test="character-notes-module"]')).toBeVisible()
  })

  test("removing a tab's module and then deleting the tab takes them off the sheet", async ({ page }) => {
    const downtime = { id: "tab-downtime", label: "Downtime", modules: ["notes" as const] }
    await seedGuest(page, testCharacter, { tabConfig: { tabs: [...DEFAULT_TAB_CONFIG.tabs, downtime] } })
    await openTabSettings(page)
    const row = page.locator(`[data-test="tab-row-${downtime.id}"]`)
    await page.locator(`[data-test="tab-toggle-${downtime.id}"]`).click()

    await confirmClick(row.locator('[data-test="remove-module-notes"]'))
    await expect(row.locator('[data-test="remove-module-notes"]')).toHaveCount(0)
    await openSheet(page, testCharacter.id)
    await page.locator(`[data-test="tab-trigger-${downtime.id}"]`).click()
    await expect(page.getByRole("tabpanel").locator('[data-test="character-notes-module"]')).toHaveCount(0)

    await openTabSettings(page)
    await confirmClick(page.locator(`[data-test="tab-delete-${downtime.id}"]`))
    await expect(row).toHaveCount(0)
    await openSheet(page, testCharacter.id)
    await expect(page.locator(`[data-test="tab-trigger-${downtime.id}"]`)).toHaveCount(0)
    await reload(page)
    await expect(page.getByRole("tab").first()).toBeVisible()
    await expect(page.locator(`[data-test="tab-trigger-${downtime.id}"]`)).toHaveCount(0)
  })

  test("signed in, the layout is saved to the account", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    await signIn(page, user)
    await openTabSettings(page)
    await page.locator('[data-test="add-tab-button"]').click()
    await page.locator('[data-test="new-tab-name-input"]').fill("Downtime")
    await page.locator('[data-test="add-tab-submit"]').click()

    await expect.poll(async () => {
      const settings = await readDoc(`userSettings/${user.uid}`)
      return (settings?.tabConfig as UserTabConfig | undefined)?.tabs.map((t) => t.label)
    }).toEqual([...DEFAULT_TAB_CONFIG.tabs.map((t) => t.label), "Downtime"])
    // Kept in the account only: nothing is left on the device
    expect(await storedTabs(page)).toBeNull()
  })
})

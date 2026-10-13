import { type Page } from "@playwright/test"

import { test, expect } from "./test"

// The unit tests replace the drag library, so this is the one place a real pointer drag is checked.

const tabOrder = (page: Page) =>
  page.locator('[data-test^="tab-drag-handle-"]').evaluateAll((handles) => handles.map((handle) => handle.getAttribute("data-test")))

test.describe("Tab settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("dnd-characters", "[]")
      localStorage.setItem("dnd-skip-auth", "true")
    })
    await page.goto("/settings/tabs")
    await page.waitForLoadState("networkidle")
  })

  test("dragging a tab below the next one reorders them, and the order survives a reload", async ({ page }) => {
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

    await page.reload()
    await page.waitForLoadState("networkidle")
    expect(await tabOrder(page)).toEqual(reordered)
  })
})

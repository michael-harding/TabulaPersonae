import { test, expect, type Page, type Locator } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"

// Every popup (DropdownMenu, Combobox, Select) must close on a second click of the control that
// opened it, so the user can dismiss a list covering other controls without moving the pointer.
// Real mouse clicks at the control's coordinates are used on purpose: an open popup can make the
// page behind it non-interactive, which Playwright's locator.click() would refuse to click through.

const popupOpen = (page: Page) => page.evaluate(() => document.querySelector("[role=listbox], [role=menu]") != null)

async function expectOpenCloseOpen(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded()
  const box = (await control.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  for (const expected of [true, false, true]) {
    await page.mouse.click(x, y)
    await expect.poll(() => popupOpen(page)).toBe(expected)
  }
  await page.keyboard.press("Escape")
}

test.describe("Popups close on a second click", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((data: unknown) => {
      localStorage.setItem("dnd-characters", JSON.stringify([data]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
  })

  test("DropdownMenu trigger", async ({ page }) => {
    await expectOpenCloseOpen(page, page.locator('[data-test="add-condition-button"]'))
  })

  test.describe("in Character Info edit mode", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("tab", { name: "Character" }).click()
      await page.locator('[data-test="character-basic-info-module-edit"]').click()
    })

    test("Combobox input", async ({ page }) => {
      await expectOpenCloseOpen(page, page.locator('[data-test="class-combobox"]'))
    })

    test("Combobox chevron", async ({ page }) => {
      await expectOpenCloseOpen(page, page.locator('[data-test="class-combobox"] ~ button'))
    })

    test("Select trigger", async ({ page }) => {
      await expectOpenCloseOpen(page, page.locator('[data-test="character-basic-info-module-content"] button[aria-haspopup="listbox"]').first())
    })
  })
})

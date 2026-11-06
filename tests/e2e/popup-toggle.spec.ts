import { type Page, type Locator } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { axeBuilder, test, expect } from "./test"

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
  // The scan every scenario gets (see ./test.ts) runs after the popup is closed again. The open
  // state is the one that had gone unchecked, and each kind of popup had violations in it.
  const results = await axeBuilder(page).analyze()
  expect(results.violations, "accessibility violations with the popup open").toEqual([])
  await page.keyboard.press("Escape")
}

test.describe("Popups close on a second click", () => {
  test.beforeEach(async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
  })

  test("DropdownMenu trigger", async ({ page }) => {
    await expectOpenCloseOpen(page, page.locator('[data-test="condition-add"]'))
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
      await expectOpenCloseOpen(page, page.locator('[data-test="class-combobox-toggle"]'))
    })

    test("Select trigger", async ({ page }) => {
      await expectOpenCloseOpen(page, page.getByRole("combobox", { name: "Alignment" }))
    })
  })
})

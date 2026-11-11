import { type Locator, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { axeBuilder, finishAnimations, test, expect } from "./test"

// Multi-line fields grow to fit their text instead of scrolling inside themselves (Textarea in
// src/components/ui/textarea.tsx). The unit tests stand in for layout; these check it for real:
// that no text is left hidden in the field, and that fitting it does not disturb the modal.

const id = testCharacter.id

const paragraph =
  "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."
const longText = (paragraphs: number) => Array.from({ length: paragraphs }, () => paragraph).join("\n\n")

async function openAddAction(page: Page): Promise<{ dialog: Locator; description: Locator }> {
  await seedGuest(page, testCharacter, { expandSections: true })
  await openSheet(page, id)
  await page.locator('[data-test="add-action-button"]').click()
  const dialog = page.getByRole("dialog")
  await finishAnimations(page)
  return { dialog, description: dialog.getByLabel("Description", { exact: true }) }
}

/** The field's height, and whether all its text is shown with none hidden past its bottom edge. */
const measure = (field: Locator) =>
  field.evaluate((el) => ({ height: el.clientHeight, fits: el.scrollHeight <= el.clientHeight }))

test("a description grows to fit pasted and typed text, and fits it again when the modal reopens", async ({ page }) => {
  const { dialog, description } = await openAddAction(page)
  const empty = await measure(description)
  await expect(description).toHaveCSS("resize", "none")

  // fill() replaces the text in one input event, as a paste does
  await description.fill(longText(4))
  const pasted = await measure(description)
  expect(pasted.fits).toBe(true)
  expect(pasted.height).toBeGreaterThan(empty.height)

  await description.press("ControlOrMeta+End")
  await description.pressSequentially("\n\nOne more line.")
  const typed = await measure(description)
  expect(typed.fits).toBe(true)
  expect(typed.height).toBeGreaterThan(pasted.height)

  expect((await axeBuilder(page).include("[role=dialog]").analyze()).violations).toEqual([])

  await dialog.getByLabel("Action Name").fill("Darkvision")
  await dialog.getByRole("button", { name: /^(add|save)/i }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole("button", { name: "Darkvision" }).first().click()
  await page.getByRole("button", { name: "Edit Darkvision" }).click()
  await finishAnimations(page)
  expect(await measure(description)).toEqual(typed)
})

test("typing at the end of a long description leaves the modal scrolled where it was", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 })
  const { dialog, description } = await openAddAction(page)
  await description.fill(longText(12))
  await dialog.evaluate((el) => { el.scrollTop = el.scrollHeight })
  await description.press("ControlOrMeta+End")
  const scrolled = await dialog.evaluate((el) => el.scrollTop)
  expect(scrolled).toBeGreaterThan(0)

  await description.pressSequentially(" More.")
  expect(await dialog.evaluate((el) => el.scrollTop)).toBe(scrolled)
})

test("a description fits its text again when the modal narrows and the text rewraps", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  const { description } = await openAddAction(page)
  await description.fill(longText(3))
  const wide = await measure(description)

  await page.setViewportSize({ width: 360, height: 800 })
  await expect.poll(async () => (await measure(description)).height).toBeGreaterThan(wide.height)
  expect((await measure(description)).fits).toBe(true)
})

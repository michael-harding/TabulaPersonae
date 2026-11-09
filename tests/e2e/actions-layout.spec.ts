import { type Locator, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import type { Attack, Character } from "../../src/lib/character-types"
import { openSheet, reload, seedGuest, storedCharacter } from "./helpers"
import { test, expect } from "./test"

// Reordering the Actions module's cards and setting them aside under "More", in edit mode. The unit
// tests replace the drag library, so this is where real pointer drags are checked.

const attack = (id: string, name: string): Attack => ({ id, name, type: "attack", attackBonus: 5, damage: "1d6", damageType: "Slashing", range: "5 ft", description: "" })

// Only three custom actions in the Actions section: no weapons, spells, features or items to sort around
const character: Character = {
  ...testCharacter,
  id: "actions-layout-char",
  attacks: [attack("a1", "Longsword"), attack("a2", "Dagger"), attack("a3", "Shove")],
  spells: [],
  equipment: [],
  classFeatures: [],
  speciesTraits: [],
  feats: [],
  backgroundFeatures: [],
}

async function open(page: Page, layout?: Character["actionLayout"]) {
  await seedGuest(page, { ...character, actionLayout: layout }, { expandSections: true })
  await openSheet(page, character.id)
  await page.locator('[data-test="actions-module-edit"]').click()
}

const module = (page: Page) => page.locator('[data-test="actions-module"]')
/** The Actions section's cards, in order, either side of its "More" heading (edit mode) or toggle (view mode). */
const parts = (page: Page, divider: string) =>
  module(page).evaluate((root, dividerHook) => {
    const divider = root.querySelector(`[data-test="${dividerHook}"]`)
    const main: string[] = [], more: string[] = []
    for (const li of root.querySelectorAll<HTMLElement>('li[data-test^="action-card-attack-"]')) {
      const after = divider != null && (divider.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      ;(after ? more : main).push(li.dataset.test!.replace("action-card-attack-", ""))
    }
    return { main, more }
  }, divider)
const handle = (page: Page, id: string) => page.locator(`[data-test="actions-action-card-custom:${id}-handle"]`)

const card = (page: Page, id: string) => page.locator(`[data-test="action-card-attack-${id}"]`)
const moreList = (page: Page) => page.locator('[data-test="actions-action-more-list"]')

/**
 * Presses on `from` and carries it to the center of `to` with the mouse, in steps: the drag only
 * starts once the pointer has travelled. Let go with `page.mouse.up()`, or with `drag`.
 */
async function carry(page: Page, from: Locator, to: Locator) {
  // The mouse only reaches what's on screen
  await from.scrollIntoViewIfNeeded()
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 })
}
async function drag(page: Page, from: Locator, to: Locator) {
  await carry(page, from, to)
  await page.mouse.up()
}

test.describe("Actions card layout", () => {
  test("dragging a card onto another reorders them, and the order is saved", async ({ page }) => {
    await open(page)
    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a1", "a2", "a3"], more: [] })

    // By its name: the whole card is what's dragged
    await drag(page, card(page, "a1").getByText("Longsword"), card(page, "a3"))

    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a2", "a3", "a1"], more: [] })
    // A drag ends with a click on the handle, which mustn't open its menu
    await expect(page.getByRole("menu")).toHaveCount(0)

    await page.locator('[data-test="actions-module-save"]').click()
    await reload(page)
    await expect.poll(() => parts(page, "actions-action-more-toggle")).toEqual({ main: ["a2", "a3", "a1"], more: [] })
    expect((await storedCharacter(page, character.id)).actionLayout).toEqual({ action: { main: ["a2", "a3", "a1"].map((id) => `custom:${id}`), more: [] } })
  })

  test("dragging a card into the empty More list sets it aside, collapsed once saved", async ({ page }) => {
    await open(page)

    const look = () => moreList(page).evaluate((el) => {
      const style = getComputedStyle(el)
      return { background: style.backgroundColor, border: style.borderTopColor }
    })
    const resting = await look()

    await carry(page, handle(page, "a2"), page.locator('[data-test="actions-action-more-empty"]'))
    // Lit up, background and border, while the card is over it
    await expect.poll(async () => (await look()).background).not.toBe(resting.background)
    await expect.poll(async () => (await look()).border).not.toBe(resting.border)
    await page.mouse.up()

    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a1", "a3"], more: ["a2"] })
    await expect.poll(look).toEqual(resting)

    await page.locator('[data-test="actions-module-save"]').click()
    await reload(page)
    const toggle = page.locator('[data-test="actions-action-more-toggle"]')
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(toggle).toContainText("More actions")
    await expect(page.locator('[data-test="action-card-attack-a2"]')).toHaveCount(0)
    expect((await storedCharacter(page, character.id)).actionLayout).toEqual({ action: { main: ["custom:a1", "custom:a3"], more: ["custom:a2"] } })

    await toggle.click()
    await expect(page.locator('[data-test="action-card-attack-a2"]')).toBeVisible()
  })

  test("@mobile reorders and sets aside a card from the keyboard alone", async ({ page }) => {
    await open(page)
    const later = page.locator('[data-test="actions-action-card-custom:a3-later"]')

    // The last shown card's Move later takes it across to More, and focus stays on the button
    await later.focus()
    await page.keyboard.press("Enter")
    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a1", "a2"], more: ["a3"] })
    // At the end of the section, Move later is disabled, so focus moves to Move earlier
    await expect(page.locator('[data-test="actions-action-card-custom:a3-earlier"]')).toBeFocused()

    // The handle's menu: Enter opens it on its first item, Move to start
    await handle(page, "a2").focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("menuitem", { name: "Move to start" })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a2", "a1"], more: ["a3"] })
    await expect(handle(page, "a2")).toBeFocused()

    await page.keyboard.press("Control+Enter")
    await expect.poll(async () => (await storedCharacter(page, character.id)).actionLayout).toEqual({ action: { main: ["custom:a2", "custom:a1"], more: ["custom:a3"] } })
  })

  test("dragging a card out of More leaves the shown cards in main while it's carried", async ({ page }) => {
    await open(page, { action: { main: ["custom:a1", "custom:a2"], more: ["custom:a3"] } })

    await carry(page, card(page, "a3"), card(page, "a1"))
    // Before it's let go: in main, and main's own cards still there, none of them pushed into More
    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a3", "a1", "a2"], more: [] })
    await page.mouse.up()

    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a3", "a1", "a2"], more: [] })
    await page.locator('[data-test="actions-module-save"]').click()
    await expect.poll(async () => (await storedCharacter(page, character.id)).actionLayout).toEqual({ action: { main: ["custom:a3", "custom:a1", "custom:a2"], more: [] } })
  })

  test("Cancel puts the cards back as they were", async ({ page }) => {
    await open(page)
    await page.locator('[data-test="actions-action-card-custom:a1-later"]').click()
    await expect.poll(() => parts(page, "actions-action-more-heading")).toEqual({ main: ["a2", "a1", "a3"], more: [] })

    await page.locator('[data-test="actions-module-cancel"]').click()

    await expect.poll(() => parts(page, "actions-action-more-toggle")).toEqual({ main: ["a1", "a2", "a3"], more: [] })
    expect((await storedCharacter(page, character.id)).actionLayout).toBeUndefined()
  })
})

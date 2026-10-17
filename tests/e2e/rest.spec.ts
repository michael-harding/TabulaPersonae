import { type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import type { Character } from "../../src/lib/character-types"
import { openSheet, reload, seedGuest, storedCharacter } from "./helpers"
import { test, expect } from "./test"

// What a short and a long rest actually change, and that the change is saved. Without an account.

// testCharacter, with something on every kind of recharge spent:
//   Second Wind (bonus action)    1/1 spent, recharges on a short rest
//   Speak with Animals (other)    3/3 spent, recharges on a long rest
//   level 1 spell slots           1/4 used
//   HP 38/44 with 5 temporary; 1 of 5 hit dice spent
const resting: Character = {
  ...testCharacter,
  bonusActions: [
    ...testCharacter.bonusActions,
    { id: "ba-second-wind", name: "Second Wind", type: "ability", description: "Regain 1d10 + level HP.", uses: 1, maxUses: 1, rechargeOn: "short-rest" },
  ],
}

async function rest(page: Page, kind: "short" | "long") {
  await page.locator('[data-test="take-a-rest-button"]').click()
  await page.locator(`[data-test="rest-type-${kind}-button"]`).click()
  await expect(page.locator(`[data-test="rest-type-${kind}-button"]`)).toHaveAttribute("aria-pressed", "true")
}

const usesOf = (character: Character, name: string) =>
  [...character.bonusActions, ...character.otherActions].find((a) => a.name === name)?.uses

test.describe("Short rest", () => {
  test("@mobile recharges short-rest uses only", async ({ page }) => {
    await seedGuest(page, resting)
    await openSheet(page, resting.id)
    await rest(page, "short")
    await page.locator('[data-test="rest-confirm-button"]').click()
    await expect(page.getByRole("dialog")).toBeHidden()

    await reload(page)
    const stored = await storedCharacter(page, resting.id)
    expect(usesOf(stored, "Second Wind")).toBe(0)
    expect(usesOf(stored, "Speak with Animals")).toBe(3)
    expect(stored.spellSlots[1].used).toBe(1)
    expect(stored.hitPoints).toMatchObject({ current: 38, temporary: 5 })
  })

  test("spending hit dice heals within the maximum and uses them up", async ({ page }) => {
    await seedGuest(page, resting)
    await openSheet(page, resting.id)
    await rest(page, "short")
    // Up to five dice are shown as dice to click; more, as a stepper
    await page.getByRole("dialog").getByRole("button", { name: "Click to spend this die" }).first().click()
    await page.locator('[data-test="rest-confirm-button"]').click()
    // With dice spent the dialog stays open to show the roll
    await page.locator('[data-test="rest-done-button"]').click()

    await reload(page)
    const stored = await storedCharacter(page, resting.id)
    expect(stored.spentHitDice).toBe(2)
    // A d10 + Constitution modifier (+2) heals 3–12, capped at the 44 maximum
    expect(stored.hitPoints.current).toBeGreaterThanOrEqual(41)
    expect(stored.hitPoints.current).toBeLessThanOrEqual(44)
  })
})

test.describe("Long rest", () => {
  test("@mobile restores HP, hit dice, spell slots and every recharging use", async ({ page }) => {
    await seedGuest(page, resting)
    await openSheet(page, resting.id)
    await rest(page, "long")
    // The dialog lists what will recharge
    await expect(page.getByRole("dialog").getByText("Speak with Animals")).toBeVisible()
    await expect(page.getByRole("dialog").getByText("Second Wind")).toBeVisible()
    await page.locator('[data-test="rest-confirm-button"]').click()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.locator('[data-test="current-hp"]')).toHaveText("44")

    await reload(page, "Spells")
    await expect(page.getByLabel("Used slot (click to restore)")).toHaveCount(0)
    const stored = await storedCharacter(page, resting.id)
    expect(stored.hitPoints).toMatchObject({ current: 44, temporary: 0 })
    expect(stored.spentHitDice).toBe(0)
    expect(Object.values(stored.spellSlots).map((slot) => slot.used)).toEqual(Array(9).fill(0))
    expect(usesOf(stored, "Second Wind")).toBe(0)
    expect(usesOf(stored, "Speak with Animals")).toBe(0)
  })
})

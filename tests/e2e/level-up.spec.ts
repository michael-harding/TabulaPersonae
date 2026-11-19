import type { Page } from "@playwright/test"

import { testCharacter, withHitPointsMode } from "../visual/fixtures"
import type { Character } from "../../src/lib/character-types"
import { openSheet, reload, seedGuest, storedCharacter } from "./helpers"
import { test, expect } from "./test"

// What a level up actually changes, and that the change is saved. Without an account.

async function openLevelUp(page: Page, character: Character) {
  await seedGuest(page, character)
  await openSheet(page, character.id, "Character")
  await page.locator('[data-test="character-basic-info-module-edit"]').click()
  await page.locator('[data-test="level-up-button"]').click()
  await expect(page.getByRole("dialog", { name: "Level Up" })).toBeVisible()
}

const hitPointsEffects = (character: Character) =>
  character.classFeatures?.find((feature) => feature.featureType === "Hit Points")?.levelEffects?.[0]?.effects

test("@mobile levels up a character, and the Character Information form shows the new level", async ({ page }) => {
  await openLevelUp(page, testCharacter)
  await page.locator('[data-test="level-up-confirm-button"]').click()
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(page.getByLabel("Level", { exact: true })).toHaveValue("6")

  await reload(page, "Character")
  expect((await storedCharacter(page, testCharacter.id)).level).toBe(6)
})

test("records the rolls for each level gained and heals by the HP they add", async ({ page }) => {
  // HP 38 of 46 calculated: d10 rolls 10, 6, 8, 7, 5 with Constitution +2 each
  const character: Character = { ...withHitPointsMode("rolled", { hitPointsRolledLevels: [10, 6, 8, 7, 5] }), hitPoints: { current: 38, maximum: 46, temporary: 0 } }
  await openLevelUp(page, character)
  const dialog = page.getByRole("dialog")
  const level = dialog.getByLabel("New Level")
  await level.fill("7")
  await level.press("Enter")

  // Confirm is refused until every roll is in
  await page.locator('[data-test="level-up-confirm-button"]').click()
  await expect(dialog.locator('[data-test="form-error-summary"]')).toBeVisible()

  await dialog.getByLabel("Rolled HP (Level 6)").fill("4")
  await dialog.getByLabel("Rolled HP (Level 7)").fill("9")
  await dialog.getByLabel("Rolled HP (Level 7)").press("Enter")
  await page.locator('[data-test="level-up-confirm-button"]').click()
  await expect(dialog).toBeHidden()

  await reload(page, "Character")
  const stored = await storedCharacter(page, character.id)
  expect(stored.level).toBe(7)
  expect(hitPointsEffects(stored)?.hitPointsRolledLevels).toEqual([10, 6, 8, 7, 5, 4, 9])
  // 4 + 2 and 9 + 2
  expect(stored.hitPoints.current).toBe(38 + 17)
})

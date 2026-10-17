import { type Page } from "@playwright/test"

import { makeLegacyCharacter } from "../visual/fixtures"
import type { Character } from "../../src/lib/character-types"
import { createUser, readCharacter, seedCharacter, signIn, withUniqueId } from "./emulator"
import { openSheet, reload, seedGuest, storedCharacter, storedCharacters } from "./helpers"
import { test, expect } from "./test"

// A character saved by an older version of the app — on this device, in an import file, or in
// the account — opens, is brought up to date, and stays that way: the migration's additions are
// saved once and never doubled. The schema-version migration work will replace the migration;
// these must keep passing across it.

const legacy = makeLegacyCharacter() as unknown as Character

/** What the migration must have produced, in whatever it was saved to. */
function expectMigrated(character: Character) {
  const features = character.classFeatures ?? []
  // The legacy spellcasting ability and hit die each became exactly one granting Feature
  expect(features.filter((f) => f.name === "Spellcasting")).toHaveLength(1)
  expect(features.filter((f) => f.name === "Hit Points")).toHaveLength(1)
  expect(features.find((f) => f.name === "Spellcasting")?.levelEffects?.[0].effects).toEqual({ spellcastingAbility: "wisdom" })
  expect(features.find((f) => f.name === "Hit Points")?.levelEffects?.[0].effects).toEqual({ hitDiceSize: 8 })
  // A Feature from before featureType has one now
  expect(features.find((f) => f.name === "Channel Divinity")).toHaveProperty("featureType")
  // The single `uses` field moved to where each kind of item keeps it
  const wand = character.equipment.find((e) => e.name === "Wand of Magic Missiles")!
  const potion = character.equipment.find((e) => e.name === "Potion of Healing")!
  expect(wand).toMatchObject({ charges: 2 })
  expect(potion).toMatchObject({ consumedUses: 1 })
  expect(wand).not.toHaveProperty("uses")
  expect(potion).not.toHaveProperty("uses")
  expect(character.damageResistances).toEqual(["Poison"])
  expect(character).toHaveProperty("useCalculatedArmorClass")
}

/** The generated features are listed on the Features tab. */
async function expectFeaturesListed(page: Page) {
  await page.getByRole("tab", { name: "Features" }).click()
  const panel = page.getByRole("tabpanel")
  await expect(panel.getByRole("button", { name: "Edit Spellcasting" })).toHaveCount(1)
  await expect(panel.getByRole("button", { name: "Edit Hit Points" })).toHaveCount(1)
  await expect(panel.getByRole("button", { name: "Edit Channel Divinity" })).toHaveCount(1)
}

/** One change, so the sheet saves the character as it now is. (It starts at full HP.) */
async function makeAnEdit(page: Page) {
  await page.getByRole("tab", { name: "Combat" }).click()
  await page.locator('[data-test="hp-decrease-button"]').click()
}

test.describe("A character saved by an older version", () => {
  test("on this device is brought up to date, and saving it twice adds nothing twice", async ({ page }) => {
    await seedGuest(page, legacy)
    await openSheet(page, legacy.id)
    await expectFeaturesListed(page)

    await makeAnEdit(page)
    await reload(page)
    const saved = await storedCharacter(page, legacy.id)
    expectMigrated(saved)

    // Loading the saved character again changes nothing: the ids it was saved with are kept
    await makeAnEdit(page)
    await reload(page)
    const savedAgain = await storedCharacter(page, legacy.id)
    expectMigrated(savedAgain)
    expect(savedAgain.classFeatures?.map((f) => f.id)).toEqual(saved.classFeatures?.map((f) => f.id))
    await expectFeaturesListed(page)
  })

  test("in an import file is brought up to date when it is imported", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await page.locator('[data-test="header-menu-trigger"]').click()
    await page.getByRole("menuitem", { name: "Import" }).click()
    await page.locator("#header-character-import").setInputFiles({
      name: "bram.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacy)),
    })
    await expect(page.getByText("Import Successful", { exact: true })).toBeVisible()

    const [imported] = await storedCharacters(page)
    expectMigrated(imported)
    await expectFeaturesListed(page)
  })

  test("in the account is brought up to date, and saved back to it once", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(legacy)
    await seedCharacter(user.uid, character)
    await signIn(page, user)
    await openSheet(page, character.id)
    await expectFeaturesListed(page)

    await makeAnEdit(page)
    await expect.poll(async () => (await readCharacter(character.id))?.hitPoints.current).toBe(legacy.hitPoints.current - 1)
    const saved = (await readCharacter(character.id))!
    expectMigrated(saved)

    await reload(page)
    await makeAnEdit(page)
    await expect.poll(async () => (await readCharacter(character.id))?.hitPoints.current).toBe(legacy.hitPoints.current - 2)
    const savedAgain = (await readCharacter(character.id))!
    expectMigrated(savedAgain)
    expect(savedAgain.classFeatures?.map((f) => f.id)).toEqual(saved.classFeatures?.map((f) => f.id))
  })
})

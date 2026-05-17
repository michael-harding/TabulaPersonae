import { test, expect } from "@playwright/test"
import { testCharacter, secondCharacter } from "./fixtures"

// All component screenshots are taken by navigating to the full character sheet
// and scoping the screenshot to a specific card element.

test.describe("CombatStats component", () => {
  test("normal HP state", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Combat Stats").locator("..").locator("..")
    await expect(card).toHaveScreenshot("combat-stats-normal-hp.png")
  })

  test("death saves visible at 0 HP", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Combat Stats").locator("..").locator("..")
    await expect(card).toHaveScreenshot("combat-stats-death-saves.png")
  })
})

test.describe("AbilityScores component", () => {
  test("view mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Ability Scores").locator("..").locator("..")
    await expect(card).toHaveScreenshot("ability-scores-view.png")
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    // Open edit mode via the aria-labeled Edit button
    await page.getByRole("button", { name: "Edit" }).first().click()
    const card = page.locator("text=Edit Ability Scores").locator("..").locator("..")
    await expect(card).toHaveScreenshot("ability-scores-edit.png")
  })
})

test.describe("HpProgressBar component", () => {
  test("full HP", async ({ page }) => {
    const fullHpChar = {
      ...testCharacter,
      hitPoints: { current: 44, maximum: 44, temporary: 0 },
    }
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, fullHpChar)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const bar = page.locator(".sticky.top-0")
    await expect(bar).toHaveScreenshot("hp-bar-full.png")
  })

  test("half HP", async ({ page }) => {
    const halfHpChar = {
      ...testCharacter,
      hitPoints: { current: 22, maximum: 44, temporary: 0 },
    }
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, halfHpChar)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const bar = page.locator(".sticky.top-0")
    await expect(bar).toHaveScreenshot("hp-bar-half.png")
  })

  test("0 HP", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, secondCharacter)
    await page.goto(`/character/${secondCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const bar = page.locator(".sticky.top-0")
    await expect(bar).toHaveScreenshot("hp-bar-zero.png")
  })
})

test.describe("SkillsProficiencies component", () => {
  test("with proficiencies and expertise", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Skills & Proficiencies").locator("..").locator("..")
    await expect(card).toHaveScreenshot("skills-with-proficiencies.png")
  })
})

test.describe("CharacterNotes component", () => {
  test("populated notes", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Character Background").locator("..").locator("..")
    await expect(card).toHaveScreenshot("character-notes-populated.png")
  })

  test("empty notes", async ({ page }) => {
    const emptyChar = {
      ...testCharacter,
      id: "empty-notes-char",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
    }
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, emptyChar)
    await page.goto(`/character/${emptyChar.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Character Background").locator("..").locator("..")
    await expect(card).toHaveScreenshot("character-notes-empty.png")
  })
})

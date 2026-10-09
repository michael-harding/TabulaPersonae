import { test, expect } from "@playwright/test"
// Scoped to WCAG 2.1 A/AA tags, matching ACCESSIBILITY.md's stated target conformance level —
// excludes axe's "best-practice" extras (e.g. the no-WCAG-tag "region" rule flagging
// Kobalte portal content rendered outside <main>) that aren't part of that target.
import AxeBuilder from "@axe-core/playwright"

import { testCharacter, secondCharacter, publicCharacter } from "./fixtures"

// All component screenshots are taken by navigating to the full character sheet
// and scoping the screenshot to a specific card element.

test.describe("CombatStatsModule component", () => {
  test("normal HP state", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Combat Stats").locator("..").locator("..")
    await expect(card).toHaveScreenshot("combat-stats-normal-hp.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
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
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator('[data-test="combat-stats-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("combat-stats-edit.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

test.describe("AbilityScoresModule component", () => {
  test("view mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Ability Scores").locator("..").locator("..")
    await expect(card).toHaveScreenshot("ability-scores-view.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    // Open edit mode via the exact aria-label="Edit" button (not "Edit <action name>" variants)
    await page.getByRole("button", { name: "Edit", exact: true }).first().click()
    const card = page.locator("text=Ability Scores").locator("..").locator("..")
    await expect(card).toHaveScreenshot("ability-scores-edit.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
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
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
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
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
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
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

test.describe("SkillsProficienciesModule component", () => {
  test("with proficiencies and expertise", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Skills & Proficiencies").locator("..").locator("..")
    await expect(card).toHaveScreenshot("skills-with-proficiencies.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    const card = page.locator('[data-test="skills-proficiencies-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("skills-proficiencies-edit.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

test.describe("CharacterNotesModule component", () => {
  test("populated notes", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Character Background").locator("..").locator("..")
    await expect(card).toHaveScreenshot("character-notes-populated.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
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

    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")

    const card = page.locator("text=Character Background").locator("..").locator("..")
    await expect(card).toHaveScreenshot("character-notes-empty.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")

    const card = page.locator('[data-test="character-notes-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("character-notes-edit.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

test.describe("CharacterBasicInfoModule component", () => {
  test("view mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")

    const card = page.locator('[data-test="character-basic-info-module"]')
    await expect(card).toHaveScreenshot("character-basic-info-view.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("edit mode", async ({ page }) => {
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("tab", { name: "Character" }).click()
    await page.waitForLoadState("networkidle")

    const card = page.locator('[data-test="character-basic-info-module"]')
    await card.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(card).toHaveScreenshot("character-basic-info-edit.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

test.describe("ActionCard uses tracker — interactive vs read-only", () => {
  test("pip tracker — interactive (normal character sheet)", async ({ page }) => {
    // testCharacter.otherActions has "Speak with Animals" with uses:3/maxUses:3
    await page.addInitScript((char) => {
      localStorage.setItem("dnd-characters", JSON.stringify([char]))
      localStorage.setItem("dnd-skip-auth", "true")
      localStorage.setItem(`dnd-collapsible-actions-${char.id}`, JSON.stringify(["actions", "bonus-actions", "reactions", "other"]))
    }, testCharacter)
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Combat" }).click()
    await page.waitForLoadState("networkidle")
    const card = page.locator(`[data-sem="action-card"]`).filter({ hasText: "Speak with Animals" })
    await expect(card).toHaveScreenshot("action-card-pip-tracker-interactive.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("pip tracker — read-only (public share page)", async ({ page }) => {
    await page.addInitScript(({ id, data }) => {
      localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(data))
    }, { id: publicCharacter.id, data: publicCharacter })
    await page.goto(`/share/${publicCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Combat" }).click()
    await page.waitForLoadState("networkidle")
    const card = page.locator(`[data-sem="action-card"]`).filter({ hasText: "Dark One's Blessing" })
    await expect(card).toHaveScreenshot("action-card-pip-tracker-readonly.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })

  test("stepper — read-only (public share page)", async ({ page }) => {
    await page.addInitScript(({ id, data }) => {
      localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(data))
    }, { id: publicCharacter.id, data: publicCharacter })
    await page.goto(`/share/${publicCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Combat" }).click()
    await page.waitForLoadState("networkidle")
    const card = page.locator(`[data-sem="action-card"]`).filter({ hasText: "Fiendish Resilience" })
    await expect(card).toHaveScreenshot("action-card-stepper-readonly.png")
    const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(axeResults.violations).toEqual([])
  })
})

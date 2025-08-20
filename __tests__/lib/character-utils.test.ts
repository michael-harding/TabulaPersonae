import {
  getAbilityModifier,
  getProficiencyBonus,
  getSkillModifier,
  getSavingThrowModifier,
  getSpellSaveDC,
  getSpellAttackBonus,
  formatModifier,
  SKILL_ABILITY_MAP,
  SKILL_DISPLAY_NAMES,
} from "../../lib/character-utils"
import { createDefaultCharacter, type AbilityScores } from "../../lib/character-types"

describe("Character Utils", () => {
  describe("getAbilityModifier", () => {
    it("calculates ability modifiers correctly", () => {
      expect(getAbilityModifier(1)).toBe(-5)
      expect(getAbilityModifier(8)).toBe(-1)
      expect(getAbilityModifier(9)).toBe(-1)
      expect(getAbilityModifier(10)).toBe(0)
      expect(getAbilityModifier(11)).toBe(0)
      expect(getAbilityModifier(12)).toBe(1)
      expect(getAbilityModifier(13)).toBe(1)
      expect(getAbilityModifier(14)).toBe(2)
      expect(getAbilityModifier(15)).toBe(2)
      expect(getAbilityModifier(16)).toBe(3)
      expect(getAbilityModifier(18)).toBe(4)
      expect(getAbilityModifier(20)).toBe(5)
      expect(getAbilityModifier(30)).toBe(10)
    })

    it("handles edge cases", () => {
      expect(getAbilityModifier(0)).toBe(-5)
      expect(getAbilityModifier(-1)).toBe(-5)
    })
  })

  describe("getProficiencyBonus", () => {
    it("calculates proficiency bonus by level", () => {
      expect(getProficiencyBonus(1)).toBe(2)
      expect(getProficiencyBonus(2)).toBe(2)
      expect(getProficiencyBonus(3)).toBe(2)
      expect(getProficiencyBonus(4)).toBe(2)
      expect(getProficiencyBonus(5)).toBe(3)
      expect(getProficiencyBonus(6)).toBe(3)
      expect(getProficiencyBonus(7)).toBe(3)
      expect(getProficiencyBonus(8)).toBe(3)
      expect(getProficiencyBonus(9)).toBe(4)
      expect(getProficiencyBonus(12)).toBe(4)
      expect(getProficiencyBonus(13)).toBe(5)
      expect(getProficiencyBonus(16)).toBe(5)
      expect(getProficiencyBonus(17)).toBe(6)
      expect(getProficiencyBonus(20)).toBe(6)
    })

    it("handles edge cases", () => {
      expect(getProficiencyBonus(0)).toBe(2)
      expect(getProficiencyBonus(-1)).toBe(2)
    })
  })

  describe("getSkillModifier", () => {
    it("calculates skill modifier without proficiency", () => {
      const result = getSkillModifier(14, 2, false, false)
      expect(result).toBe(2) // +2 from ability modifier only
    })

    it("calculates skill modifier with proficiency", () => {
      const result = getSkillModifier(14, 2, true, false)
      expect(result).toBe(4) // +2 ability + +2 proficiency
    })

    it("calculates skill modifier with expertise", () => {
      const result = getSkillModifier(14, 2, true, true)
      expect(result).toBe(6) // +2 ability + +2 proficiency + +2 expertise
    })

    it("handles expertise without proficiency", () => {
      const result = getSkillModifier(14, 2, false, true)
      expect(result).toBe(4) // +2 ability + +2 expertise (expertise implies proficiency)
    })

    it("handles negative ability modifiers", () => {
      const result = getSkillModifier(8, 2, true, false)
      expect(result).toBe(1) // -1 ability + +2 proficiency
    })
  })

  describe("getSavingThrowModifier", () => {
    it("calculates saving throw without proficiency", () => {
      const result = getSavingThrowModifier(14, 2, false)
      expect(result).toBe(2) // +2 from ability modifier only
    })

    it("calculates saving throw with proficiency", () => {
      const result = getSavingThrowModifier(14, 2, true)
      expect(result).toBe(4) // +2 ability + +2 proficiency
    })

    it("handles negative ability modifiers", () => {
      const result = getSavingThrowModifier(8, 2, false)
      expect(result).toBe(-1) // -1 from ability modifier
    })
  })

  describe("getSpellSaveDC", () => {
    describe("with Character object", () => {
      it("calculates spell save DC for character with spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "intelligence"
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3

        const result = getSpellSaveDC(character)
        expect(result).toBe(14) // 8 + 3 proficiency + 3 ability modifier
      })

      it("returns 8 for character without spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = ""

        const result = getSpellSaveDC(character)
        expect(result).toBe(8)
      })

      it("handles character with undefined ability scores", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "wisdom"
        character.abilityScores = undefined as any

        const result = getSpellSaveDC(character)
        expect(result).toBe(10) // 8 + 2 proficiency + 0 ability modifier (default 10)
      })
    })

    describe("with separate parameters", () => {
      const abilityScores: AbilityScores = {
        strength: 10,
        dexterity: 12,
        constitution: 14,
        intelligence: 16,
        wisdom: 13,
        charisma: 8,
      }

      it("calculates spell save DC with separate parameters", () => {
        const result = getSpellSaveDC("intelligence", abilityScores, 3)
        expect(result).toBe(14) // 8 + 3 proficiency + 3 ability modifier
      })

      it("returns 8 for empty spellcasting ability", () => {
        const result = getSpellSaveDC("" as any, abilityScores, 3)
        expect(result).toBe(8)
      })

      it("returns 8 for undefined ability scores", () => {
        const result = getSpellSaveDC("intelligence", undefined as any, 3)
        expect(result).toBe(8)
      })

      it("uses default proficiency bonus when not provided", () => {
        const result = getSpellSaveDC("intelligence", abilityScores, undefined as any)
        expect(result).toBe(13) // 8 + 2 default proficiency + 3 ability modifier
      })
    })
  })

  describe("getSpellAttackBonus", () => {
    describe("with Character object", () => {
      it("calculates spell attack bonus for character with spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "intelligence"
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3

        const result = getSpellAttackBonus(character)
        expect(result).toBe(6) // 3 proficiency + 3 ability modifier
      })

      it("returns 0 for character without spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = ""

        const result = getSpellAttackBonus(character)
        expect(result).toBe(0)
      })

      it("handles character with undefined ability scores", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "wisdom"
        character.abilityScores = undefined as any

        const result = getSpellAttackBonus(character)
        expect(result).toBe(2) // 2 proficiency + 0 ability modifier (default 10)
      })
    })

    describe("with separate parameters", () => {
      const abilityScores: AbilityScores = {
        strength: 10,
        dexterity: 12,
        constitution: 14,
        intelligence: 16,
        wisdom: 13,
        charisma: 8,
      }

      it("calculates spell attack bonus with separate parameters", () => {
        const result = getSpellAttackBonus("intelligence", abilityScores, 3)
        expect(result).toBe(6) // 3 proficiency + 3 ability modifier
      })

      it("returns 0 for empty spellcasting ability", () => {
        const result = getSpellAttackBonus("" as any, abilityScores, 3)
        expect(result).toBe(0)
      })

      it("returns 0 for undefined ability scores", () => {
        const result = getSpellAttackBonus("intelligence", undefined as any, 3)
        expect(result).toBe(0)
      })

      it("uses default proficiency bonus when not provided", () => {
        const result = getSpellAttackBonus("intelligence", abilityScores, undefined as any)
        expect(result).toBe(5) // 2 default proficiency + 3 ability modifier
      })
    })
  })

  describe("formatModifier", () => {
    it("formats positive modifiers with plus sign", () => {
      expect(formatModifier(0)).toBe("+0")
      expect(formatModifier(1)).toBe("+1")
      expect(formatModifier(5)).toBe("+5")
      expect(formatModifier(10)).toBe("+10")
    })

    it("formats negative modifiers without plus sign", () => {
      expect(formatModifier(-1)).toBe("-1")
      expect(formatModifier(-5)).toBe("-5")
      expect(formatModifier(-10)).toBe("-10")
    })
  })

  describe("SKILL_ABILITY_MAP", () => {
    it("contains all expected skills", () => {
      const expectedSkills = [
        "acrobatics",
        "animalHandling",
        "arcana",
        "athletics",
        "deception",
        "history",
        "insight",
        "intimidation",
        "investigation",
        "medicine",
        "nature",
        "perception",
        "performance",
        "persuasion",
        "religion",
        "sleightOfHand",
        "stealth",
        "survival",
      ]

      expectedSkills.forEach((skill) => {
        expect(SKILL_ABILITY_MAP).toHaveProperty(skill)
      })
    })

    it("maps skills to correct abilities", () => {
      expect(SKILL_ABILITY_MAP.athletics).toBe("strength")
      expect(SKILL_ABILITY_MAP.acrobatics).toBe("dexterity")
      expect(SKILL_ABILITY_MAP.arcana).toBe("intelligence")
      expect(SKILL_ABILITY_MAP.perception).toBe("wisdom")
      expect(SKILL_ABILITY_MAP.persuasion).toBe("charisma")
    })
  })

  describe("SKILL_DISPLAY_NAMES", () => {
    it("contains display names for all skills", () => {
      Object.keys(SKILL_ABILITY_MAP).forEach((skill) => {
        expect(SKILL_DISPLAY_NAMES).toHaveProperty(skill)
      })
    })

    it("has proper display names", () => {
      expect(SKILL_DISPLAY_NAMES.animalHandling).toBe("Animal Handling")
      expect(SKILL_DISPLAY_NAMES.sleightOfHand).toBe("Sleight of Hand")
      expect(SKILL_DISPLAY_NAMES.athletics).toBe("Athletics")
    })
  })
})

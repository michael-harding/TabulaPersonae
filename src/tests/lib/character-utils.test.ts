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
  parseHitDiceSize,
  rollHitDice,
  getEquippedWeaponAttacks,
  calculateEquippedAC,
} from "@/lib/character-utils"
import { createDefaultCharacter, type AbilityScores, type Equipment } from "@/lib/character-types"

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

  describe("parseHitDiceSize", () => {
    it("parses '1d8' → 8", () => {
      expect(parseHitDiceSize("1d8")).toBe(8)
    })

    it("parses '1d6' → 6", () => {
      expect(parseHitDiceSize("1d6")).toBe(6)
    })

    it("parses 'd12' → 12", () => {
      expect(parseHitDiceSize("d12")).toBe(12)
    })

    it("falls back to 8 for unrecognised strings", () => {
      expect(parseHitDiceSize("foo")).toBe(8)
      expect(parseHitDiceSize("")).toBe(8)
      expect(parseHitDiceSize("1d7")).toBe(8)
    })
  })

  describe("rollHitDice", () => {
    it("returns the correct number of adjusted rolls", () => {
      const { rolls } = rollHitDice(3, 8, 0)
      expect(rolls).toHaveLength(3)
    })

    it("applies conMod to each roll", () => {
      // With a +10 conMod, all results will be well above 1 and clearly modified
      const { rolls } = rollHitDice(10, 8, 10)
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(11) // min die roll 1 + 10
        expect(r).toBeLessThanOrEqual(18)    // max die roll 8 + 10
      }
    })

    it("floors each adjusted roll at 1 (minimum 1 per die)", () => {
      // With a -100 conMod every raw roll + modifier would be negative
      const { rolls } = rollHitDice(20, 4, -100)
      for (const r of rolls) {
        expect(r).toBe(1)
      }
    })

    it("total equals sum of adjusted rolls", () => {
      for (let i = 0; i < 10; i++) {
        const { rolls, total } = rollHitDice(4, 6, 2)
        expect(total).toBe(rolls.reduce((a, b) => a + b, 0))
      }
    })
  })
})

function makeWeaponItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "wpn-1",
    name: "Longsword",
    quantity: 1,
    weight: 3,
    description: "",
    equipped: true,
    type: "weapon",
    weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
    ...overrides,
  }
}

function makeArmorItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "arm-1",
    name: "Chain Mail",
    quantity: 1,
    weight: 55,
    description: "",
    equipped: true,
    type: "armor",
    armorStats: { baseAC: 16, armorType: "heavy" },
    ...overrides,
  }
}

const baseScores = { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 }

describe("getEquippedWeaponAttacks", () => {
  it("returns [] when no equipment", () => {
    const char = { ...createDefaultCharacter(), equipment: [] }
    expect(getEquippedWeaponAttacks(char)).toEqual([])
  })

  it("returns [] when weapon is not equipped", () => {
    const char = { ...createDefaultCharacter(), equipment: [makeWeaponItem({ equipped: false })] }
    expect(getEquippedWeaponAttacks(char)).toEqual([])
  })

  it("returns [] when equipped weapon has no weaponStats", () => {
    const char = { ...createDefaultCharacter(), equipment: [makeWeaponItem({ weaponStats: undefined })] }
    expect(getEquippedWeaponAttacks(char)).toEqual([])
  })

  it("derives STR attack: STR 16 (+3), proficient, profBonus 2 → attackBonus 5, damage '1d8+3'", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2, equipment: [makeWeaponItem()] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(5)
    expect(atk.damage).toBe("1d8+3")
    expect(atk.damageType).toBe("slashing")
    expect(atk.range).toBe("5 ft")
  })

  it("derives DEX attack for a ranged weapon", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      equipment: [makeWeaponItem({ weaponStats: { damage: "1d6", damageType: "piercing", weaponRange: "80/320 ft", attackAbility: "dex", proficient: true } })] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(4) // DEX +2 + prof +2
    expect(atk.damage).toBe("1d6+2")
  })

  it("finesse uses the higher of STR/DEX (DEX wins here)", () => {
    const scores = { ...baseScores, strength: 12, dexterity: 16 } // STR +1, DEX +3
    const char = { ...createDefaultCharacter(), abilityScores: scores, proficiencyBonus: 2,
      equipment: [makeWeaponItem({ weaponStats: { damage: "1d6", damageType: "piercing", weaponRange: "5 ft", attackAbility: "finesse", proficient: true } })] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(5) // DEX +3 + prof +2
    expect(atk.damage).toBe("1d6+3")
  })

  it("omits proficiency bonus when proficient is false", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      equipment: [makeWeaponItem({ weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: false } })] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(3) // STR +3 only
  })

  it("sets isDerived: true on all results", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2, equipment: [makeWeaponItem()] }
    expect(getEquippedWeaponAttacks(char)[0].isDerived).toBe(true)
  })

  it("uses 'weapon-' + equipment.id as the attack id", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2, equipment: [makeWeaponItem({ id: "wpn-abc" })] }
    expect(getEquippedWeaponAttacks(char)[0].id).toBe("weapon-wpn-abc")
  })

  it("formats negative ability modifier correctly in damage string", () => {
    const scores = { ...baseScores, strength: 8 } // STR -1
    const char = { ...createDefaultCharacter(), abilityScores: scores, proficiencyBonus: 2, equipment: [makeWeaponItem()] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.damage).toBe("1d8-1")
  })
})

describe("calculateEquippedAC", () => {
  const defaultChar = { ...createDefaultCharacter(), armorClass: 12, abilityScores: baseScores, equipment: [] }

  it("returns armorClass from character when no armor equipped", () => {
    expect(calculateEquippedAC(defaultChar).ac).toBe(12)
    expect(calculateEquippedAC(defaultChar).isEquippedArmor).toBe(false)
  })

  it("calculates light armor: baseAC + full DEX mod", () => {
    const char = { ...defaultChar, equipment: [makeArmorItem({ armorStats: { baseAC: 11, armorType: "light" as const } })] }
    expect(calculateEquippedAC(char).ac).toBe(13) // 11 + DEX +2
    expect(calculateEquippedAC(char).isEquippedArmor).toBe(true)
  })

  it("calculates medium armor: baseAC + DEX capped at +2", () => {
    const highDex = { ...baseScores, dexterity: 18 } // DEX +4, capped to +2
    const char = { ...defaultChar, abilityScores: highDex, equipment: [makeArmorItem({ armorStats: { baseAC: 13, armorType: "medium" as const } })] }
    expect(calculateEquippedAC(char).ac).toBe(15) // 13 + 2 (not 4)
  })

  it("calculates heavy armor: just baseAC, ignores DEX", () => {
    const char = { ...defaultChar, equipment: [makeArmorItem({ armorStats: { baseAC: 16, armorType: "heavy" as const } })] }
    expect(calculateEquippedAC(char).ac).toBe(16)
  })

  it("adds +2 for an equipped shield item", () => {
    const shieldItem = makeArmorItem({ id: "shld-1", name: "Shield", armorStats: { baseAC: 2, armorType: "shield" as const } })
    const bodyArmor = makeArmorItem({ armorStats: { baseAC: 16, armorType: "heavy" as const } })
    const char = { ...defaultChar, equipment: [bodyArmor, shieldItem] }
    expect(calculateEquippedAC(char).ac).toBe(18)
  })

  it("ignores unequipped armor items", () => {
    const char = { ...defaultChar, equipment: [makeArmorItem({ equipped: false })] }
    expect(calculateEquippedAC(char).isEquippedArmor).toBe(false)
    expect(calculateEquippedAC(char).ac).toBe(12)
  })
})

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
  calculateInitiative,
  getEffectiveMaxHp,
  isItemModifierActive,
  getEquipmentModifierTotals,
  getEffectiveAbilityScore,
  getEffectiveAbilityScores,
  getEffectiveSenses,
  getEffectiveMovementSpeeds,
  getEffectiveDamageResistances,
  getEffectiveDamageImmunities,
  getEffectiveDamageVulnerabilities,
  getEffectiveConditionImmunities,
  getEffectiveLanguages,
  getEffectiveProficiencies,
  getEffectiveCarryingCapacity,
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

    it("defaults itemBonus to 0 when omitted", () => {
      expect(getSavingThrowModifier(14, 2, true)).toBe(getSavingThrowModifier(14, 2, true, 0))
    })

    it("adds a nonzero itemBonus on top of a proficient save", () => {
      const result = getSavingThrowModifier(14, 2, true, 1)
      expect(result).toBe(5) // +2 ability + +2 proficiency + +1 item
    })

    it("applies itemBonus even when not proficient", () => {
      const result = getSavingThrowModifier(14, 2, false, 1)
      expect(result).toBe(3) // +2 ability + +1 item, no proficiency
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

      it("cascades an equipped ability-score-boosting item into spell save DC", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "intelligence"
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3
        character.equipment = [makeMagicItem({ modifiers: { abilityScores: { intelligence: 2 } } })]

        const result = getSpellSaveDC(character)
        expect(result).toBe(15) // 8 + 3 proficiency + 4 ability modifier (18 INT)
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

      it("cascades an equipped ability-score-boosting item into spell attack bonus", () => {
        const character = createDefaultCharacter()
        character.spellcastingAbility = "intelligence"
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3
        character.equipment = [makeMagicItem({ modifiers: { abilityScores: { intelligence: 2 } } })]

        const result = getSpellAttackBonus(character)
        expect(result).toBe(7) // 3 proficiency + 4 ability modifier (18 INT)
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

function makeMagicItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "item-1",
    name: "Test Item",
    quantity: 1,
    weight: 0,
    description: "",
    equipped: true,
    type: "other",
    magic: true,
    requiresAttunement: true,
    attuned: true,
    rarity: "rare",
    ...overrides,
  }
}

const baseScores = { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 }

describe("isItemModifierActive", () => {
  it("is active when equipped, magic, and attunement not required", () => {
    expect(isItemModifierActive(makeMagicItem({ requiresAttunement: false, attuned: undefined }))).toBe(true)
  })

  it("is active when equipped, magic, requires attunement, and attuned", () => {
    expect(isItemModifierActive(makeMagicItem({ requiresAttunement: true, attuned: true }))).toBe(true)
  })

  it("is inactive when not equipped", () => {
    expect(isItemModifierActive(makeMagicItem({ equipped: false }))).toBe(false)
  })

  it("is inactive when not magic", () => {
    expect(isItemModifierActive(makeMagicItem({ magic: false }))).toBe(false)
  })

  it("is inactive when attunement is required but the item is not attuned", () => {
    expect(isItemModifierActive(makeMagicItem({ requiresAttunement: true, attuned: false }))).toBe(false)
  })
})

describe("getEquipmentModifierTotals", () => {
  it("returns all-zero totals for undefined or empty equipment", () => {
    const zero = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
    const zeroTotals = {
      armorClass: 0,
      initiative: 0,
      savingThrows: zero,
      abilityScores: zero,
      resistances: [],
      immunities: [],
      vulnerabilities: [],
      conditionImmunities: [],
      senses: { darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0 },
      speed: 0,
      flySpeed: 0,
      swimSpeed: 0,
      climbSpeed: 0,
      burrowSpeed: 0,
      carryingCapacityBonus: 0,
      carryingCapacityMultiplier: 1,
      abilityScoreFloors: {},
      abilityScoreMaxCaps: {},
      languages: [],
      proficiencies: [],
    }
    expect(getEquipmentModifierTotals(undefined)).toEqual(zeroTotals)
    expect(getEquipmentModifierTotals([])).toEqual(zeroTotals)
  })

  it("sums modifiers across multiple active items", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { armorClass: 1, initiative: 2 } }),
      makeMagicItem({ id: "b", modifiers: { armorClass: 1, abilityScores: { strength: 2 } } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.armorClass).toBe(2)
    expect(totals.initiative).toBe(2)
    expect(totals.abilityScores.strength).toBe(2)
  })

  it("ignores items with no modifiers", () => {
    const equipment = [makeMagicItem({ modifiers: undefined })]
    expect(getEquipmentModifierTotals(equipment).armorClass).toBe(0)
  })

  it("ignores inactive items (unattuned, attunement required)", () => {
    const equipment = [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { armorClass: 3 } })]
    expect(getEquipmentModifierTotals(equipment).armorClass).toBe(0)
  })

  it("ignores non-magic items even if they carry a modifiers block", () => {
    const equipment = [makeMagicItem({ magic: false, modifiers: { armorClass: 3 } })]
    expect(getEquipmentModifierTotals(equipment).armorClass).toBe(0)
  })

  it("sums per-ability saving throw bonuses", () => {
    const equipment = [makeMagicItem({ modifiers: { savingThrows: { wisdom: 1, charisma: 2 } } })]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.savingThrows.wisdom).toBe(1)
    expect(totals.savingThrows.charisma).toBe(2)
    expect(totals.savingThrows.strength).toBe(0)
  })

  it("unions and dedupes resistances/immunities/vulnerabilities/conditionImmunities/languages/proficiencies across items", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { resistances: ["Fire", "Cold"], immunities: ["Poison"], vulnerabilities: ["Radiant"], conditionImmunities: ["Poisoned"], languages: ["Elvish"], proficiencies: ["Longsword"] } }),
      makeMagicItem({ id: "b", modifiers: { resistances: ["Fire", "Acid"], conditionImmunities: ["Poisoned", "Charmed"], languages: ["Elvish", "Dwarvish"] } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.resistances.sort()).toEqual(["Acid", "Cold", "Fire"])
    expect(totals.immunities).toEqual(["Poison"])
    expect(totals.vulnerabilities).toEqual(["Radiant"])
    expect(totals.conditionImmunities.sort()).toEqual(["Charmed", "Poisoned"])
    expect(totals.languages.sort()).toEqual(["Dwarvish", "Elvish"])
    expect(totals.proficiencies).toEqual(["Longsword"])
  })

  it("sums senses and movement speeds across items", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { senses: { darkvision: 60 }, flySpeed: 30, speed: 10 } }),
      makeMagicItem({ id: "b", modifiers: { senses: { darkvision: 30, blindsight: 10 }, flySpeed: 10 } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.senses.darkvision).toBe(90)
    expect(totals.senses.blindsight).toBe(10)
    expect(totals.flySpeed).toBe(40)
    expect(totals.speed).toBe(10)
  })

  it("sums carrying capacity bonus but takes the max multiplier", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { carryingCapacityBonus: 20, carryingCapacityMultiplier: 2 } }),
      makeMagicItem({ id: "b", modifiers: { carryingCapacityBonus: 10, carryingCapacityMultiplier: 1.5 } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.carryingCapacityBonus).toBe(30)
    expect(totals.carryingCapacityMultiplier).toBe(2)
  })

  it("takes the max ability score floor and max cap per ability across items", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { abilityScoreFloors: { strength: 19 }, abilityScoreMaxCaps: { strength: 22 } } }),
      makeMagicItem({ id: "b", modifiers: { abilityScoreFloors: { strength: 21 }, abilityScoreMaxCaps: { strength: 24 } } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.abilityScoreFloors.strength).toBe(21)
    expect(totals.abilityScoreMaxCaps.strength).toBe(24)
  })
})

describe("getEffectiveAbilityScore / getEffectiveAbilityScores", () => {
  it("returns the base score unchanged with no equipment", () => {
    const character = { abilityScores: baseScores, equipment: [] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(16)
  })

  it("adds an active item's ability bonus to the base score", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(18)
  })

  it("ignores an inactive item's ability bonus", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { abilityScores: { strength: 2 } } })],
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(16)
  })

  it("returns the manual override when useCalculatedAbilityScores is false", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
      abilityScoreOverrides: { strength: 25 },
      useCalculatedAbilityScores: { strength: false },
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(25)
  })

  it("falls back to the calculated value when the toggle is false but no override is set", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
      useCalculatedAbilityScores: { strength: false },
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(18)
  })

  it("getEffectiveAbilityScores resolves all six abilities at once", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2, wisdom: 1 } } })] }
    const scores = getEffectiveAbilityScores(character)
    expect(scores.strength).toBe(18)
    expect(scores.wisdom).toBe(11)
    expect(scores.dexterity).toBe(14)
  })

  it("raises the score to an active item's floor when base + bonus is lower", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScoreFloors: { strength: 19 } } })] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(19)
  })

  it("does not lower the score when it already exceeds the floor", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScoreFloors: { strength: 10 } } })] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(16)
  })
})

describe("getEffectiveSenses", () => {
  it("sums base senses with active item bonuses", () => {
    const character = { senses: { darkvision: 30 }, equipment: [makeMagicItem({ modifiers: { senses: { darkvision: 60 } } })] }
    expect(getEffectiveSenses(character).darkvision).toBe(90)
    expect(getEffectiveSenses(character).blindsight).toBe(0)
  })

  it("defaults to 0 with no base senses or equipment", () => {
    const character = { senses: undefined, equipment: [] }
    expect(getEffectiveSenses(character)).toEqual({ darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0 })
  })
})

describe("getEffectiveMovementSpeeds", () => {
  it("combines base movement with active item grants", () => {
    const character = { speed: 30, flySpeed: 0, swimSpeed: 0, climbSpeed: 0, burrowSpeed: 0, equipment: [makeMagicItem({ modifiers: { flySpeed: 30, speed: 10 } })] }
    const speeds = getEffectiveMovementSpeeds(character)
    expect(speeds.walk).toBe(40)
    expect(speeds.fly).toBe(30)
    expect(speeds.swim).toBe(0)
  })

  it("defaults walk speed to 30 when unset", () => {
    const character = { equipment: [] } as unknown as Parameters<typeof getEffectiveMovementSpeeds>[0]
    expect(getEffectiveMovementSpeeds(character).walk).toBe(30)
  })
})

describe("getEffectiveDamageResistances / Immunities / Vulnerabilities", () => {
  it("merges the character's own list with active item grants, deduped", () => {
    const character = {
      damageResistances: ["Fire"],
      damageImmunities: [],
      damageVulnerabilities: [],
      equipment: [makeMagicItem({ modifiers: { resistances: ["Fire", "Cold"], immunities: ["Poison"], vulnerabilities: ["Radiant"] } })],
    }
    expect(getEffectiveDamageResistances(character).sort()).toEqual(["Cold", "Fire"])
    expect(getEffectiveDamageImmunities(character)).toEqual(["Poison"])
    expect(getEffectiveDamageVulnerabilities(character)).toEqual(["Radiant"])
  })
})

describe("getEffectiveConditionImmunities", () => {
  it("merges the character's own list with active item grants, deduped", () => {
    const character = { conditionImmunities: ["Poisoned"], equipment: [makeMagicItem({ modifiers: { conditionImmunities: ["Poisoned", "Charmed"] } })] }
    expect(getEffectiveConditionImmunities(character).sort()).toEqual(["Charmed", "Poisoned"])
  })
})

describe("getEffectiveLanguages / getEffectiveProficiencies", () => {
  it("splits into own vs item-granted, excluding overlaps from granted", () => {
    const character = {
      languages: ["Common", "Elvish"],
      otherProficiencies: ["Longsword"],
      equipment: [makeMagicItem({ modifiers: { languages: ["Elvish", "Dwarvish"], proficiencies: ["Longsword", "Herbalism Kit"] } })],
    }
    const languages = getEffectiveLanguages(character)
    expect(languages.own).toEqual(["Common", "Elvish"])
    expect(languages.granted).toEqual(["Dwarvish"])

    const proficiencies = getEffectiveProficiencies(character)
    expect(proficiencies.own).toEqual(["Longsword"])
    expect(proficiencies.granted).toEqual(["Herbalism Kit"])
  })
})

describe("getEffectiveCarryingCapacity", () => {
  it("computes STR score x 15 with no equipment", () => {
    const character = { abilityScores: baseScores, equipment: [] }
    expect(getEffectiveCarryingCapacity(character)).toBe(16 * 15)
  })

  it("adds item bonus and applies the multiplier", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { carryingCapacityBonus: 20, carryingCapacityMultiplier: 2 } })],
    }
    expect(getEffectiveCarryingCapacity(character)).toBe((16 * 15 + 20) * 2)
  })
})

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

  it("a magic weapon derives an attack identically to a non-magic one (no bonus applied)", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      equipment: [makeWeaponItem({ magic: true, requiresAttunement: true, attuned: true, rarity: "rare" })] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(5) // STR +3 + prof +2, same as a mundane weapon
    expect(atk.damage).toBe("1d8+3")
  })
})

describe("calculateEquippedAC", () => {
  const defaultChar = { ...createDefaultCharacter(), armorClass: 12, abilityScores: baseScores, equipment: [] }

  it("computes unarmored AC as 10 + DEX modifier when no armor is equipped", () => {
    // DEX 14 -> +2, so unarmored AC = 10 + 2 = 12 (coincides with the fixture's stale armorClass: 12)
    expect(calculateEquippedAC(defaultChar).ac).toBe(12)
    expect(calculateEquippedAC(defaultChar).isEquippedArmor).toBe(false)
  })

  it("ignores the stored armorClass field entirely when unarmored (regression: used to silently return the raw field, freezing AC even as DEX changed)", () => {
    const char = { ...defaultChar, armorClass: 99, abilityScores: { ...baseScores, dexterity: 16 } }
    // DEX 16 -> +3, so unarmored AC = 13, NOT the stale armorClass: 99
    expect(calculateEquippedAC(char).ac).toBe(13)
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

  it("a magic armor piece without explicit modifiers contributes AC identically to a non-magic one", () => {
    const char = { ...defaultChar, equipment: [makeArmorItem({
      armorStats: { baseAC: 11, armorType: "light" as const },
      magic: true, requiresAttunement: false, rarity: "uncommon",
    })] }
    expect(calculateEquippedAC(char).ac).toBe(13) // 11 + DEX +2, same as a mundane light armor
  })

  it("applies an active magic item's AC bonus", () => {
    const char = { ...defaultChar, equipment: [makeMagicItem({ modifiers: { armorClass: 1 } })] }
    expect(calculateEquippedAC(char).ac).toBe(13) // 12 base + 1 item
    expect(calculateEquippedAC(char).breakdown).toContain("item bonus")
  })

  it("suppresses the AC bonus when attunement is required but the item is not attuned", () => {
    const char = { ...defaultChar, equipment: [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { armorClass: 1 } })] }
    expect(calculateEquippedAC(char).ac).toBe(12)
  })

  it("combines armor, shield, and an item AC bonus", () => {
    const shieldItem = makeArmorItem({ id: "shld-1", name: "Shield", armorStats: { baseAC: 2, armorType: "shield" as const } })
    const bodyArmor = makeArmorItem({ armorStats: { baseAC: 16, armorType: "heavy" as const } })
    const ring = makeMagicItem({ id: "ring-1", modifiers: { armorClass: 1 } })
    const char = { ...defaultChar, equipment: [bodyArmor, shieldItem, ring] }
    expect(calculateEquippedAC(char).ac).toBe(19) // 16 heavy + 2 shield + 1 item
  })

  it("cascades an ability-score-boosting item's effective DEX into light armor AC", () => {
    const char = {
      ...defaultChar,
      equipment: [
        makeArmorItem({ armorStats: { baseAC: 11, armorType: "light" as const } }),
        makeMagicItem({ id: "belt-1", modifiers: { abilityScores: { dexterity: 2 } } }),
      ],
    }
    // DEX 14 -> +2 base, +2 item -> effective DEX 16 -> +3 mod
    expect(calculateEquippedAC(char).ac).toBe(14) // 11 + 3
  })
})

describe("calculateInitiative", () => {
  const defaultChar = { abilityScores: baseScores, equipment: [] }

  it("returns the base DEX modifier with no equipment", () => {
    expect(calculateInitiative(defaultChar).initiative).toBe(2) // DEX 14 -> +2
    expect(calculateInitiative(defaultChar).breakdown).toBe("Dex +2")
  })

  it("adds an active item's initiative bonus", () => {
    const char = { ...defaultChar, equipment: [makeMagicItem({ modifiers: { initiative: 2 } })] }
    expect(calculateInitiative(char).initiative).toBe(4)
    expect(calculateInitiative(char).breakdown).toContain("item bonus")
  })

  it("ignores an inactive item's initiative bonus", () => {
    const char = { ...defaultChar, equipment: [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { initiative: 2 } })] }
    expect(calculateInitiative(char).initiative).toBe(2)
  })

  it("cascades an ability-score-boosting item's effective DEX into initiative", () => {
    const char = { ...defaultChar, equipment: [makeMagicItem({ modifiers: { abilityScores: { dexterity: 2 } } })] }
    // DEX 14 + 2 item = 16 -> +3 mod
    expect(calculateInitiative(char).initiative).toBe(3)
  })
})

describe("getEffectiveMaxHp", () => {
  it("returns maximum when there is no temporaryMaximum", () => {
    expect(getEffectiveMaxHp({ maximum: 24 })).toBe(24)
  })

  it("adds a positive temporaryMaximum to maximum", () => {
    expect(getEffectiveMaxHp({ maximum: 24, temporaryMaximum: 10 })).toBe(34)
  })

  it("adds a negative temporaryMaximum (curse scenario)", () => {
    expect(getEffectiveMaxHp({ maximum: 20, temporaryMaximum: -5 })).toBe(15)
  })

  it("floors the result at 1 when temporaryMaximum drives it to zero or below", () => {
    expect(getEffectiveMaxHp({ maximum: 5, temporaryMaximum: -5 })).toBe(1)
    expect(getEffectiveMaxHp({ maximum: 5, temporaryMaximum: -999 })).toBe(1)
  })

  it("defaults maximum to 1 and temporaryMaximum to 0 when missing", () => {
    expect(getEffectiveMaxHp({})).toBe(1)
    expect(getEffectiveMaxHp(undefined)).toBe(1)
  })
})

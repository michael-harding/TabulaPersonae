import {
  getAbilityModifier,
  getProficiencyBonus,
  getSkillModifier,
  getSavingThrowModifier,
  getSpellSaveDC,
  getSpellAttackBonus,
  computeSpellModifier,
  formatModifier,
  SKILL_ABILITY_MAP,
  SKILL_DISPLAY_NAMES,
  parseHitDiceSize,
  rollHitDice,
  getEquippedWeaponAttacks,
  calculateEquippedAC,
  calculateInitiative,
  calculateMaxHitPoints,
  getEffectiveMaxHp,
  isItemModifierActive,
  getEquipmentModifierTotals,
  getEffectiveAbilityScore,
  getEffectiveAbilityScores,
  getEffectiveSenses,
  getEffectiveMovementSpeeds,
  getMovementSpeedGrants,
  getEffectiveDamageResistances,
  getEffectiveDamageImmunities,
  getEffectiveDamageVulnerabilities,
  getEffectiveConditionImmunities,
  getEffectiveLanguages,
  getEffectiveProficiencies,
  getEffectiveCarryingCapacity,
  getCarryingCapacityBreakdown,
  getEffectiveSize,
  getActiveLevelEffect,
  getActiveFeatureEffects,
  getEffectiveSpellcastingAbility,
  getEffectiveHitDiceSize,
  getEffectiveSavingThrowProficiency,
  getEffectiveSkillProficiency,
  getAbilityScoreBaseMax,
  inferFeatureType,
} from "@/lib/character-utils"
import { createDefaultCharacter, type AbilityScores, type Equipment, type Feature } from "@/lib/character-types"

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
      it("calculates spell save DC for character with a Feature-granted spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3

        const result = getSpellSaveDC(character)
        expect(result).toBe(14) // 8 + 3 proficiency + 3 ability modifier
      })

      it("returns 8 for character without a Feature-granted spellcasting ability", () => {
        const character = createDefaultCharacter()

        const result = getSpellSaveDC(character)
        expect(result).toBe(8)
      })

      it("handles character with undefined ability scores", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] })]
        character.abilityScores = undefined as any

        const result = getSpellSaveDC(character)
        expect(result).toBe(10) // 8 + 2 proficiency + 0 ability modifier (default 10)
      })

      it("cascades an equipped ability-score-boosting item into spell save DC", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
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
      it("calculates spell attack bonus for character with a Feature-granted spellcasting ability", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
        character.abilityScores.intelligence = 16
        character.proficiencyBonus = 3

        const result = getSpellAttackBonus(character)
        expect(result).toBe(6) // 3 proficiency + 3 ability modifier
      })

      it("returns 0 for character without a Feature-granted spellcasting ability", () => {
        const character = createDefaultCharacter()

        const result = getSpellAttackBonus(character)
        expect(result).toBe(0)
      })

      it("handles character with undefined ability scores", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] })]
        character.abilityScores = undefined as any

        const result = getSpellAttackBonus(character)
        expect(result).toBe(2) // 2 proficiency + 0 ability modifier (default 10)
      })

      it("cascades an equipped ability-score-boosting item into spell attack bonus", () => {
        const character = createDefaultCharacter()
        character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
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

  describe("computeSpellModifier", () => {
    it("returns 0 for a character without a Feature-granted spellcasting ability", () => {
      const character = createDefaultCharacter()
      expect(computeSpellModifier(character)).toBe(0)
    })

    it("returns the Feature-granted spellcasting ability's modifier", () => {
      const character = createDefaultCharacter()
      character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
      character.abilityScores.intelligence = 16
      expect(computeSpellModifier(character)).toBe(3)
    })

    it("resolves through getEffectiveAbilityScore, respecting an ability score override", () => {
      const character = createDefaultCharacter()
      character.classFeatures = [makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })]
      character.abilityScores.intelligence = 10
      character.abilityScoreOverrides = { intelligence: 18 }
      character.useCalculatedAbilityScores = { intelligence: false }
      expect(computeSpellModifier(character)).toBe(4)
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

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "feature-1",
    name: "Test Feature",
    description: "",
    source: "class-feature",
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
    const zeroGrants = { strength: [], dexterity: [], constitution: [], intelligence: [], wisdom: [], charisma: [] }
    const zeroTotals = {
      armorClass: 0,
      initiative: 0,
      savingThrows: zero,
      abilityScores: zero,
      abilityScoreGrants: zeroGrants,
      resistances: [],
      immunities: [],
      vulnerabilities: [],
      conditionImmunities: [],
      senses: { darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0 },
      senseGrants: { darkvision: [], blindsight: [], tremorsense: [], truesight: [] },
      speed: 0,
      flySpeed: 0,
      swimSpeed: 0,
      climbSpeed: 0,
      burrowSpeed: 0,
      carryingCapacityBonus: 0,
      carryingCapacityMultiplier: 1,
      abilityScoreFloors: {},
      abilityScoreFloorSources: {},
      abilityScoreMaxCaps: {},
      abilityScoreMaxCapSources: {},
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

  // Regression: hand-edited or corrupted imported character JSON can carry stringified
  // numbers (e.g. modifiers.armorClass: "2"). `+=` on a string silently concatenates
  // instead of adding, so the accumulator must coerce with Number(...) first.
  it("adds numeric modifiers even when a value arrives as a string", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { armorClass: "2" as unknown as number } }),
      makeMagicItem({ id: "b", modifiers: { armorClass: 1 } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.armorClass).toBe(3)
    expect(totals.armorClass).not.toBe("21")
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

  it("takes the max ability score floor per ability across items", () => {
    const equipment = [
      makeMagicItem({ id: "a", modifiers: { abilityScoreFloors: { strength: 19 } } }),
      makeMagicItem({ id: "b", modifiers: { abilityScoreFloors: { strength: 21 } } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.abilityScoreFloors.strength).toBe(21)
  })

  it("takes the min ability score max cap per ability across items (most restrictive wins)", () => {
    const equipment = [
      makeMagicItem({ id: "a", name: "Ring of Might", modifiers: { abilityScoreMaxCaps: { strength: 22 } } }),
      makeMagicItem({ id: "b", name: "Manacles of Restraint", modifiers: { abilityScoreMaxCaps: { strength: 17 } } }),
    ]
    const totals = getEquipmentModifierTotals(equipment)
    expect(totals.abilityScoreMaxCaps.strength).toBe(17)
    expect(totals.abilityScoreMaxCapSources.strength).toBe("Manacles of Restraint")
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

  // Regression: a hand-edited or corrupted imported character JSON can carry a
  // stringified ability score (e.g. "18" instead of 18). `base + itemBonus` used to
  // silently string-concatenate in that case ("18" + 2 -> "182") instead of adding.
  it("adds numerically even when the base ability score arrives as a string", () => {
    const character = {
      abilityScores: { ...baseScores, strength: "18" as unknown as number },
      equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(20)
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

  it("lowers the score to an active item's cap when base + bonus exceeds it", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScoreMaxCaps: { strength: 15 } } })] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(15)
  })

  it("does not raise the score when it already is under the cap", () => {
    const character = { abilityScores: baseScores, equipment: [makeMagicItem({ modifiers: { abilityScoreMaxCaps: { strength: 20 } } })] }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(16)
  })

  it("a cap lower than an active floor wins (most restrictive constraint applies)", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { abilityScoreFloors: { strength: 19 }, abilityScoreMaxCaps: { strength: 17 } } })],
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(17)
  })

  it("never applies the cap to a custom override value", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { abilityScoreMaxCaps: { strength: 15 } } })],
      abilityScoreOverrides: { strength: 25 },
      useCalculatedAbilityScores: { strength: false },
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(25)
  })

  it("adds a feature-granted ability score bonus to the base score", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { strength: 2 } } }] })
    const character = { abilityScores: baseScores, equipment: [], classFeatures: [], speciesTraits: [feature], feats: [], level: 1 }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(18)
  })

  it("combines a feature-granted bonus with an equipment-granted bonus on the same ability", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { strength: 2 } } }] })
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 1 } } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getEffectiveAbilityScore(character, "strength")).toBe(19)
  })

  it("raises the score to a feature-granted floor when base + bonuses is lower", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScoreFloors: { wisdom: 18 } } }] })
    const character = { abilityScores: baseScores, equipment: [], classFeatures: [], speciesTraits: [feature], feats: [], level: 1 }
    expect(getEffectiveAbilityScore(character, "wisdom")).toBe(18)
  })

  it("lowers the score to a feature-granted cap when base + bonuses exceeds it", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScoreMaxCaps: { wisdom: 8 } } }] })
    const character = { abilityScores: baseScores, equipment: [], classFeatures: [], speciesTraits: [feature], feats: [], level: 1 }
    expect(getEffectiveAbilityScore(character, "wisdom")).toBe(8)
  })

  it("getEffectiveAbilityScores folds a feature-granted bonus into the resolved set", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { strength: 2, wisdom: 1 } } }] })
    const character = { abilityScores: baseScores, equipment: [], classFeatures: [], speciesTraits: [feature], feats: [], level: 1 }
    const scores = getEffectiveAbilityScores(character)
    expect(scores.strength).toBe(18)
    expect(scores.wisdom).toBe(11)
    expect(scores.dexterity).toBe(14)
  })
})

describe("getAbilityScoreBaseMax", () => {
  it("defaults to 20 with no exception grants", () => {
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1 }
    expect(getAbilityScoreBaseMax(character, "strength")).toBe(20)
  })

  it("is raised by a feature-granted exception (e.g. an Epic Boon or capstone)", () => {
    const feature = makeFeature({ source: "feat", name: "Epic Boon of Fortitude", levelEffects: [{ level: 1, effects: { abilityScoreBaseMax: { constitution: 25 } } }] })
    const character = { classFeatures: [], speciesTraits: [], feats: [feature], level: 1 }
    expect(getAbilityScoreBaseMax(character, "constitution")).toBe(25)
    expect(getAbilityScoreBaseMax(character, "strength")).toBe(20)
  })

  it("never lowers the ceiling below 20, even if a grant specifies a smaller value", () => {
    const feature = makeFeature({ source: "feat", levelEffects: [{ level: 1, effects: { abilityScoreBaseMax: { strength: 15 } } }] })
    const character = { classFeatures: [], speciesTraits: [], feats: [feature], level: 1 }
    expect(getAbilityScoreBaseMax(character, "strength")).toBe(20)
  })
})

describe("getEffectiveSenses", () => {
  it("sums active item bonuses", () => {
    const character = { equipment: [makeMagicItem({ modifiers: { senses: { darkvision: 60 } } })] }
    expect(getEffectiveSenses(character).darkvision).toBe(60)
    expect(getEffectiveSenses(character).blindsight).toBe(0)
  })

  it("defaults to 0 with no equipment or features", () => {
    const character = { equipment: [] }
    expect(getEffectiveSenses(character)).toEqual({ darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0 })
  })

  it("ignores character.senses entirely, even when set", () => {
    // character.senses is never read here; it's purely the custom-override storage field,
    // analogous to character.speed in getEffectiveMovementSpeeds.
    const character = { senses: { darkvision: 30 }, equipment: [] }
    expect(getEffectiveSenses(character).darkvision).toBe(0)
  })

  it("adds feature-granted senses alongside item bonuses", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { senses: { darkvision: 60 } } }] })
    const character = {
      equipment: [makeMagicItem({ modifiers: { senses: { darkvision: 10 } } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getEffectiveSenses(character).darkvision).toBe(70)
  })
})

describe("getEffectiveMovementSpeeds", () => {
  it("is all zero with no features and no equipment — no hardcoded '30 ft' fallback", () => {
    // getEffectiveMovementSpeeds is the "calculated value" fed into the useCalculatedSpeed
    // toggle in combat-stats-module.tsx (mirroring calculateEquippedAC, which never reads
    // character.armorClass either) — character.speed/flySpeed/etc. are never read here at all,
    // they're purely the custom-override storage fields.
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1, equipment: [] }
    expect(getEffectiveMovementSpeeds(character)).toEqual({ walk: 0, fly: 0, swim: 0, climb: 0, burrow: 0 })
  })

  it("ignores character.speed/flySpeed entirely, even when set", () => {
    const character = { speed: 30, flySpeed: 10, classFeatures: [], speciesTraits: [], feats: [], level: 1, equipment: [] }
    expect(getEffectiveMovementSpeeds(character)).toEqual({ walk: 0, fly: 0, swim: 0, climb: 0, burrow: 0 })
  })

  it("combines a feature-granted speed with active item grants", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { speed: 30 } }] })
    const character = { classFeatures: [], speciesTraits: [feature], feats: [], level: 1, equipment: [makeMagicItem({ modifiers: { flySpeed: 30, speed: 10 } })] }
    const speeds = getEffectiveMovementSpeeds(character)
    expect(speeds.walk).toBe(40)
    expect(speeds.fly).toBe(30)
    expect(speeds.swim).toBe(0)
  })

  it("adds an item bonus on top of a feature-granted movement speed", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { flySpeed: 30 } }] })
    const character = {
      equipment: [makeMagicItem({ modifiers: { flySpeed: 10 } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getEffectiveMovementSpeeds(character).fly).toBe(40)
  })

  it("does not double-count a feature-granted walk speed against a stale character.speed value", () => {
    // Regression test: a species's speed (e.g. Dwarf 25 ft) is an absolute characteristic, not a
    // "+X ft" bonus. Since character.speed is no longer read here at all, there's no way for a
    // leftover manual value to leak into the calculated total.
    const feature = makeFeature({ name: "Dwarf Speed", source: "species-trait", levelEffects: [{ level: 1, effects: { speed: 25 } }] })
    const character = {
      speed: 30, // stale value from a prior custom override, or the createDefaultCharacter seed
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
      equipment: [],
    }
    expect(getEffectiveMovementSpeeds(character).walk).toBe(25)
  })
})

describe("getMovementSpeedGrants", () => {
  it("is all undefined with no granting feature", () => {
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1 }
    expect(getMovementSpeedGrants(character)).toEqual({
      walk: undefined, fly: undefined, swim: undefined, climb: undefined, burrow: undefined,
    })
  })

  it("names the granting feature for each movement speed independently", () => {
    const walkFeature = makeFeature({ name: "Dwarf Speed", source: "species-trait", levelEffects: [{ level: 1, effects: { speed: 25 } }] })
    const flyFeature = makeFeature({ name: "Fly", source: "feat", levelEffects: [{ level: 1, effects: { flySpeed: 30 } }] })
    const character = {
      classFeatures: [], speciesTraits: [walkFeature], feats: [flyFeature], level: 1,
    }
    const grants = getMovementSpeedGrants(character)
    expect(grants.walk).toBe("Dwarf Speed Species Trait")
    expect(grants.fly).toBe("Fly Feat")
    expect(grants.swim).toBeUndefined()
  })
})

describe("getEffectiveDamageResistances / Immunities / Vulnerabilities", () => {
  it("splits into own vs item-granted, excluding overlaps from granted", () => {
    const character = {
      damageResistances: ["Fire"],
      damageImmunities: [],
      damageVulnerabilities: [],
      equipment: [makeMagicItem({ modifiers: { resistances: ["Fire", "Cold"], immunities: ["Poison"], vulnerabilities: ["Radiant"] } })],
    }
    const resistances = getEffectiveDamageResistances(character)
    expect(resistances.own).toEqual(["Fire"])
    expect(resistances.granted).toEqual(["Cold"])

    const immunities = getEffectiveDamageImmunities(character)
    expect(immunities.own).toEqual([])
    expect(immunities.granted).toEqual(["Poison"])

    const vulnerabilities = getEffectiveDamageVulnerabilities(character)
    expect(vulnerabilities.own).toEqual([])
    expect(vulnerabilities.granted).toEqual(["Radiant"])
  })

  it("merges feature-granted resistances/immunities/vulnerabilities and records grantedBy", () => {
    const feature = makeFeature({ name: "Dwarven Resilience", source: "species-trait", levelEffects: [{ level: 1, effects: { resistances: ["Poison"] } }] })
    const character = {
      damageResistances: [], damageImmunities: [], damageVulnerabilities: [],
      equipment: [makeMagicItem({ modifiers: { resistances: ["Cold"] } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    const resistances = getEffectiveDamageResistances(character)
    expect(resistances.granted.sort()).toEqual(["Cold", "Poison"])
    expect(resistances.grantedBy["Cold"]).toBe("equipment")
    expect(resistances.grantedBy["Poison"]).toBe("Dwarven Resilience Species Trait")
  })
})

describe("getEffectiveConditionImmunities", () => {
  it("merges the character's own list with active item grants, deduped", () => {
    const character = { conditionImmunities: ["Poisoned"], equipment: [makeMagicItem({ modifiers: { conditionImmunities: ["Poisoned", "Charmed"] } })] }
    const result = getEffectiveConditionImmunities(character)
    expect(result.own).toEqual(["Poisoned"])
    expect(result.granted).toEqual(["Charmed"])
  })

  it("merges feature-granted condition immunities and records grantedBy", () => {
    const feature = makeFeature({ name: "Fey Ancestry", source: "species-trait", levelEffects: [{ level: 1, effects: { conditionImmunities: ["Charmed"] } }] })
    const character = {
      conditionImmunities: [],
      equipment: [],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    const result = getEffectiveConditionImmunities(character)
    expect(result.granted).toEqual(["Charmed"])
    expect(result.grantedBy["Charmed"]).toBe("Fey Ancestry Species Trait")
  })
})

describe("getEffectiveLanguages / getEffectiveProficiencies", () => {
  it("splits into own vs item-granted, excluding overlaps from granted", () => {
    const character = {
      languages: ["Common", "Elvish"],
      otherProficiencies: ["Longsword"],
      equipment: [makeMagicItem({ modifiers: { languages: ["Elvish", "Dwarvish"], proficiencies: ["Longsword", "Herbalism Kit"] } })],
      level: 1,
    }
    const languages = getEffectiveLanguages(character)
    expect(languages.own).toEqual(["Common", "Elvish"])
    expect(languages.granted).toEqual(["Dwarvish"])

    const proficiencies = getEffectiveProficiencies(character)
    expect(proficiencies.own).toEqual(["Longsword"])
    expect(proficiencies.granted).toEqual(["Herbalism Kit"])
  })

  it("merges feature-granted languages alongside item-granted ones", () => {
    const feature = makeFeature({ name: "Draconic Ancestry", source: "species-trait", levelEffects: [{ level: 1, effects: { languages: ["Draconic"] } }] })
    const character = {
      languages: ["Common"],
      equipment: [makeMagicItem({ modifiers: { languages: ["Elvish"] } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    const languages = getEffectiveLanguages(character)
    expect(languages.granted.sort()).toEqual(["Draconic", "Elvish"])
    expect(languages.grantedBy["Elvish"]).toBe("equipment")
    expect(languages.grantedBy["Draconic"]).toBe("Draconic Ancestry Species Trait")
  })

  it("merges feature-granted proficiencies alongside item-granted ones", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { otherProficiencies: ["Light Armor", "Herbalism Kit"] } }] })
    const character = {
      otherProficiencies: ["Longsword"],
      equipment: [makeMagicItem({ modifiers: { proficiencies: ["Herbalism Kit"] } })],
      classFeatures: [feature],
      speciesTraits: [],
      feats: [],
      level: 1,
    }
    const proficiencies = getEffectiveProficiencies(character)
    expect(proficiencies.own).toEqual(["Longsword"])
    expect(proficiencies.granted.sort()).toEqual(["Herbalism Kit", "Light Armor"])
  })

  it("records grantedBy per proficiency, distinguishing equipment from a granting feature", () => {
    const feature = makeFeature({ name: "Martial Training", levelEffects: [{ level: 1, effects: { otherProficiencies: ["Light Armor"] } }] })
    const character = {
      otherProficiencies: [],
      equipment: [makeMagicItem({ modifiers: { proficiencies: ["Herbalism Kit"] } })],
      classFeatures: [feature],
      speciesTraits: [],
      feats: [],
      level: 1,
    }
    const proficiencies = getEffectiveProficiencies(character)
    expect(proficiencies.grantedBy["Herbalism Kit"]).toBe("equipment")
    expect(proficiencies.grantedBy["Light Armor"]).toBe("Martial Training Class Feature")
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

  it("adds a feature-granted bonus alongside the item bonus", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { carryingCapacityBonus: 10 } }] })
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { carryingCapacityBonus: 20 } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getEffectiveCarryingCapacity(character)).toBe(16 * 15 + 30)
  })

  it("takes the max multiplier between item- and feature-granted values rather than stacking them", () => {
    const feature = makeFeature({ name: "Powerful Build", source: "species-trait", levelEffects: [{ level: 1, effects: { carryingCapacityMultiplier: 2 } }] })
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { carryingCapacityMultiplier: 1.5 } })],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getEffectiveCarryingCapacity(character)).toBe(16 * 15 * 2)
  })
})

describe("getCarryingCapacityBreakdown", () => {
  it("shows the unwrapped Str x 15 formula with no bonus or multiplier", () => {
    const character = { abilityScores: baseScores, equipment: [] }
    expect(getCarryingCapacityBreakdown(character).breakdown).toBe("16 (Str) × 15")
  })

  it("appends a bonus term when an item or feature grants one", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { carryingCapacityBonus: 20 } })],
    }
    expect(getCarryingCapacityBreakdown(character).breakdown).toBe("16 (Str) × 15 + 20 (item/feature bonus)")
  })

  it("wraps the formula in parens and appends the multiplier when it is not 1", () => {
    const feature = makeFeature({ name: "Powerful Build", source: "species-trait", levelEffects: [{ level: 1, effects: { carryingCapacityMultiplier: 2 } }] })
    const character = {
      abilityScores: baseScores,
      equipment: [],
      classFeatures: [], speciesTraits: [feature], feats: [], level: 1,
    }
    expect(getCarryingCapacityBreakdown(character).breakdown).toBe("(16 (Str) × 15) × 2 (multiplier)")
  })

  it("wraps both the base formula and bonus term together when a bonus and a non-1 multiplier combine", () => {
    const character = {
      abilityScores: baseScores,
      equipment: [makeMagicItem({ modifiers: { carryingCapacityBonus: 20, carryingCapacityMultiplier: 2 } })],
    }
    expect(getCarryingCapacityBreakdown(character).breakdown).toBe("(16 (Str) × 15 + 20 (item/feature bonus)) × 2 (multiplier)")
  })
})

describe("getEffectiveSize", () => {
  it("returns an empty size with no source when no feature grants one", () => {
    // No fallback to "Medium" (or any other guess) — character.size is never read here, it's
    // purely the custom-override storage field for the useCalculatedSize toggle in
    // combat-stats-module.tsx. An unset size honestly reflects that nothing has defined it yet.
    expect(getEffectiveSize({ classFeatures: [], speciesTraits: [], feats: [], level: 1 })).toEqual({ size: "", source: undefined })
  })

  it("uses the feature-granted size and records provenance", () => {
    const feature = makeFeature({ name: "Powerful Build", source: "species-trait", levelEffects: [{ level: 1, effects: { size: "Large" } }] })
    const character = { classFeatures: [], speciesTraits: [feature], feats: [], level: 1 }
    expect(getEffectiveSize(character)).toEqual({ size: "Large", source: "Powerful Build Species Trait" })
  })

  it("respects level-gating", () => {
    const feature = makeFeature({ name: "Large Form", source: "species-trait", levelEffects: [{ level: 5, effects: { size: "Large" } }] })
    const below = { classFeatures: [], speciesTraits: [feature], feats: [], level: 4 }
    expect(getEffectiveSize(below)).toEqual({ size: "", source: undefined })

    const at = { classFeatures: [], speciesTraits: [feature], feats: [], level: 5 }
    expect(getEffectiveSize(at)).toEqual({ size: "Large", source: "Large Form Species Trait" })
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

  it("uses the item-boosted (effective) ability score for attack bonus, not the raw base", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      equipment: [makeWeaponItem(), makeMagicItem({ modifiers: { abilityScores: { strength: 4 } } })] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(7) // STR 16+4=20 -> +5, +prof 2
    expect(atk.damage).toBe("1d8+5")
  })

  it("respects a manual ability-score override when useCalculatedAbilityScores is false", () => {
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      abilityScoreOverrides: { strength: 8 }, useCalculatedAbilityScores: { strength: false },
      equipment: [makeWeaponItem()] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(1) // override 8 -> -1, +prof 2
  })

  it("respects an ability-score floor from an equipped magic item", () => {
    const char = { ...createDefaultCharacter(), abilityScores: { ...baseScores, dexterity: 6 }, proficiencyBonus: 2,
      equipment: [
        makeWeaponItem({ weaponStats: { damage: "1d6", damageType: "piercing", weaponRange: "60/240 ft", attackAbility: "dex", proficient: true } }),
        makeMagicItem({ modifiers: { abilityScoreFloors: { dexterity: 18 } } }),
      ] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(6) // DEX floored to 18 -> +4, +prof 2
  })

  it("cascades a feature-granted ability score bonus into attack bonus", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { strength: 4 } } }] })
    const char = { ...createDefaultCharacter(), abilityScores: baseScores, proficiencyBonus: 2,
      speciesTraits: [feature], equipment: [makeWeaponItem()] }
    const [atk] = getEquippedWeaponAttacks(char)
    expect(atk.attackBonus).toBe(7) // STR 16+4=20 -> +5, +prof 2
    expect(atk.damage).toBe("1d8+5")
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

  it("cascades a feature-granted ability score bonus into AC", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { dexterity: 2 } } }] })
    const char = { ...defaultChar, speciesTraits: [feature] }
    // DEX 14 -> +2 base, +2 feature -> effective DEX 16 -> +3 mod, unarmored AC = 13
    expect(calculateEquippedAC(char).ac).toBe(13)
  })
})

describe("calculateInitiative", () => {
  const defaultChar = { abilityScores: baseScores, equipment: [] }

  it("returns the base DEX modifier with no equipment", () => {
    expect(calculateInitiative(defaultChar).initiative).toBe(2) // DEX 14 -> +2
    expect(calculateInitiative(defaultChar).breakdown).toBe("+2 (Dex)")
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

  it("cascades a feature-granted ability score bonus into initiative", () => {
    const feature = makeFeature({ source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { dexterity: 2 } } }] })
    const char = { ...defaultChar, speciesTraits: [feature] }
    // DEX 14 + 2 feature = 16 -> +3 mod
    expect(calculateInitiative(char).initiative).toBe(3)
  })
})

describe("getEffectiveMaxHp", () => {
  it("returns maximum when there is no temporaryMaximum", () => {
    expect(getEffectiveMaxHp({ hitPoints: { maximum: 24 } })).toBe(24)
  })

  it("adds a positive temporaryMaximum to maximum", () => {
    expect(getEffectiveMaxHp({ hitPoints: { maximum: 24, temporaryMaximum: 10 } })).toBe(34)
  })

  it("adds a negative temporaryMaximum (curse scenario)", () => {
    expect(getEffectiveMaxHp({ hitPoints: { maximum: 20, temporaryMaximum: -5 } })).toBe(15)
  })

  it("floors the result at 1 when temporaryMaximum drives it to zero or below", () => {
    expect(getEffectiveMaxHp({ hitPoints: { maximum: 5, temporaryMaximum: -5 } })).toBe(1)
    expect(getEffectiveMaxHp({ hitPoints: { maximum: 5, temporaryMaximum: -999 } })).toBe(1)
  })

  it("defaults maximum to 1 and temporaryMaximum to 0 when missing", () => {
    expect(getEffectiveMaxHp({ hitPoints: {} })).toBe(1)
    expect(getEffectiveMaxHp(undefined)).toBe(1)
  })

  it("does not apply a feature-granted hpBonusPerLevel when useCalculatedMaximumHp is false or unset", () => {
    // Regression test: a custom/overridden Maximum must never have calculations silently applied
    // on top of it, exactly like a custom Armor Class ignores equipment bonuses.
    const bonusFeature = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const hitDieFeature = makeFeature({ name: "Fighter", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
    const character = { hitPoints: { maximum: 24 }, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature], feats: [], level: 5 }
    expect(getEffectiveMaxHp(character)).toBe(24)
    expect(getEffectiveMaxHp({ ...character, useCalculatedMaximumHp: false })).toBe(24)
  })

  it("applies the calculated total (Hit Die + CON + named bonuses) when useCalculatedMaximumHp is true", () => {
    const bonusFeature = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const hitDieFeature = makeFeature({ name: "Fighter", levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }] })
    const character = { hitPoints: { maximum: 24 }, useCalculatedMaximumHp: true, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature], feats: [], level: 5 }
    // d8 Hit Die, CON mod 0 (no abilityScores given): level 1 = 8, +4 more levels * avg(5) = 20, base = 28; + 1/level bonus * 5 = 5
    expect(getEffectiveMaxHp(character)).toBe(33)
  })

  it("still adds temporaryMaximum on top when calculated", () => {
    const hitDieFeature = makeFeature({ name: "Fighter", levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }] })
    const character = { hitPoints: { maximum: 24, temporaryMaximum: 10 }, useCalculatedMaximumHp: true, classFeatures: [hitDieFeature], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveMaxHp(character)).toBe(8 + 10)
  })

  it("defaults level to 1 when calculating with no level set", () => {
    const hitDieFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 4 } }] })
    const bonusFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 4 } }] })
    const character = { hitPoints: { maximum: 8 }, useCalculatedMaximumHp: true, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature], feats: [] }
    expect(getEffectiveMaxHp(character)).toBe(4 + 4)
  })

  it("respects level-gating on the bonus-granting feature when calculated", () => {
    const hitDieFeature = makeFeature({ name: "Fighter", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
    const bonusFeature = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 5, effects: { hpBonusPerLevel: 1 } }] })
    const below = { hitPoints: { maximum: 20 }, useCalculatedMaximumHp: true, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature], feats: [], level: 4 }
    // d10 Hit Die, CON mod 0: level 1 = 10, +3 more levels * avg(6) = 18, base = 28; bonus not active yet
    expect(getEffectiveMaxHp(below)).toBe(28)

    const at = { hitPoints: { maximum: 20 }, useCalculatedMaximumHp: true, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature], feats: [], level: 5 }
    // base at level 5 = 10 + 4*6 = 34; bonus = 1 * 5 = 5
    expect(getEffectiveMaxHp(at)).toBe(39)
  })

  it("ignores hitPointsMode 'flat' entirely when useCalculatedMaximumHp is false (custom means custom)", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "flat", hitPointsFlatValue: 999 } }] })
    const character = { hitPoints: { maximum: 24 }, useCalculatedMaximumHp: false, classFeatures: [feature], speciesTraits: [], feats: [], level: 5 }
    expect(getEffectiveMaxHp(character)).toBe(24)
  })
})

describe("calculateMaxHitPoints", () => {
  it("returns hp: 0 and an explanatory breakdown when no feature grants a Hit Die", () => {
    const result = calculateMaxHitPoints({ classFeatures: [], speciesTraits: [], feats: [] })
    expect(result.hp).toBe(0)
    expect(result.breakdown).toMatch(/no class feature grants a hit die/i)
  })

  it("computes level-1 HP as Hit Die size + CON modifier", () => {
    const hitDieFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }] })
    const character = { classFeatures: [hitDieFeature], speciesTraits: [], feats: [], level: 1, abilityScores: { strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 } }
    // d8 + CON mod (14 -> +2)
    expect(calculateMaxHitPoints(character).hp).toBe(10)
  })

  it("adds average Hit Die + CON modifier for each level after the first", () => {
    const hitDieFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
    const character = { classFeatures: [hitDieFeature], speciesTraits: [], feats: [], level: 3, abilityScores: { strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 } }
    // level 1: 10 + 2 = 12; levels 2-3: 2 * (avg(6) + 2) = 16; total 28
    expect(calculateMaxHitPoints(character).hp).toBe(28)
  })

  it("handles a negative Constitution modifier", () => {
    const hitDieFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 6 } }] })
    const character = { classFeatures: [hitDieFeature], speciesTraits: [], feats: [], level: 1, abilityScores: { strength: 10, dexterity: 10, constitution: 6, intelligence: 10, wisdom: 10, charisma: 10 } }
    // d6 + CON mod (6 -> -2)
    expect(calculateMaxHitPoints(character).hp).toBe(4)
  })

  it("names each hpBonusPerLevel-granting feature individually in the breakdown", () => {
    const hitDieFeature = makeFeature({ name: "Fighter", levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }] })
    const featureA = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const featureB = makeFeature({ name: "Tough", source: "feat", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 2 } }] })
    const character = { classFeatures: [hitDieFeature], speciesTraits: [featureA], feats: [featureB], level: 3 }
    const result = calculateMaxHitPoints(character)
    // base (d8, CON 0): 8 + 2*5 = 18; bonuses: (1+2) * 3 levels = 9; total 27
    expect(result.hp).toBe(27)
    expect(result.breakdown).toContain("Dwarven Toughness")
    expect(result.breakdown).toContain("Tough")
  })

  it("'per-level' mode uses an explicit hitPointsPerLevelAmount override instead of the average", () => {
    const hitDieFeature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 10, hitPointsMode: "per-level", hitPointsPerLevelAmount: 8 } }] })
    const character = { classFeatures: [hitDieFeature], speciesTraits: [], feats: [], level: 3, abilityScores: { strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 } }
    // level 1: 10 + 2 = 12; levels 2-3: 2 * (8 + 2) = 20; total 32 (vs. the default average of 6/level, which would give 28)
    expect(calculateMaxHitPoints(character).hp).toBe(32)
  })

  it("'flat' mode uses the fixed value exactly once, regardless of level or CON", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "flat", hitPointsFlatValue: 30 } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 5, abilityScores: { strength: 10, dexterity: 10, constitution: 18, intelligence: 10, wisdom: 10, charisma: 10 } }
    expect(calculateMaxHitPoints(character).hp).toBe(30)
  })

  it("'flat' mode still stacks hpBonusPerLevel bonuses on top", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "flat", hitPointsFlatValue: 30 } }] })
    const bonusFeature = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const character = { classFeatures: [feature], speciesTraits: [bonusFeature], feats: [], level: 5 }
    expect(calculateMaxHitPoints(character).hp).toBe(35)
  })

  it("'rolled' mode sums recorded entries, with CON added per entry, up to the current level", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "rolled", hitPointsRolledLevels: [8, 5] } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 2, abilityScores: { strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 } }
    // (8+2) + (5+2) = 17
    expect(calculateMaxHitPoints(character).hp).toBe(17)
  })

  it("'rolled' mode ignores entries beyond the character's current level", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "rolled", hitPointsRolledLevels: [8, 5, 99] } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 2 }
    expect(calculateMaxHitPoints(character).hp).toBe(13)
  })

  it("'rolled' mode treats a missing middle level as 0 and flags it in the breakdown", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "rolled", hitPointsRolledLevels: [8, 0, 7] } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 3 }
    const result = calculateMaxHitPoints(character)
    expect(result.hp).toBe(15)
    expect(result.breakdown).toMatch(/missing/i)
    expect(result.breakdown).toContain("2")
  })

  it("'rolled' mode requires an explicit level-1 entry — no automatic Hit-Die-max assumption", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "rolled", hitPointsRolledLevels: [] } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 1 }
    const result = calculateMaxHitPoints(character)
    expect(result.hp).toBe(0)
    expect(result.breakdown).toMatch(/missing/i)
  })

  it("'rolled' mode still stacks hpBonusPerLevel bonuses on top", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitPointsMode: "rolled", hitPointsRolledLevels: [8] } }] })
    const bonusFeature = makeFeature({ name: "Dwarven Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const character = { classFeatures: [feature], speciesTraits: [bonusFeature], feats: [], level: 1 }
    // 8 (roll) + 0 (con) + 1 (bonus * level 1) = 9
    expect(calculateMaxHitPoints(character).hp).toBe(9)
  })
})

describe("getActiveLevelEffect", () => {
  it("returns undefined when the feature has no levelEffects", () => {
    expect(getActiveLevelEffect(makeFeature(), 5)).toBeUndefined()
  })

  it("returns undefined when the character level is below every tier", () => {
    const feature = makeFeature({ levelEffects: [{ level: 3, effects: { spellcastingAbility: "wisdom" } }] })
    expect(getActiveLevelEffect(feature, 1)).toBeUndefined()
  })

  it("resolves a single tier as granted-at-level, active at and above that level", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] })
    expect(getActiveLevelEffect(feature, 1)?.spellcastingAbility).toBe("wisdom")
    expect(getActiveLevelEffect(feature, 20)?.spellcastingAbility).toBe("wisdom")
  })

  it("resolves the highest qualifying tier when a feature changes at multiple levels", () => {
    const feature = makeFeature({
      levelEffects: [
        { level: 1, effects: { hitDiceSize: 8 } },
        { level: 9, effects: { hitDiceSize: 10 } },
        { level: 16, effects: { hitDiceSize: 12 } },
      ],
    })
    expect(getActiveLevelEffect(feature, 1)?.hitDiceSize).toBe(8)
    expect(getActiveLevelEffect(feature, 8)?.hitDiceSize).toBe(8)
    expect(getActiveLevelEffect(feature, 9)?.hitDiceSize).toBe(10)
    expect(getActiveLevelEffect(feature, 15)?.hitDiceSize).toBe(10)
    expect(getActiveLevelEffect(feature, 16)?.hitDiceSize).toBe(12)
    expect(getActiveLevelEffect(feature, 20)?.hitDiceSize).toBe(12)
  })
})

describe("getActiveFeatureEffects", () => {
  it("returns empty totals when there are no features", () => {
    const totals = getActiveFeatureEffects({ classFeatures: [], speciesTraits: [], feats: [], level: 5 })
    expect(totals.spellcastingAbility).toBeUndefined()
    expect(totals.hitDiceSize).toBeUndefined()
    expect(totals.savingThrowProficiencies).toEqual({})
    expect(totals.skillProficiencies).toEqual({})
    expect(totals.otherProficiencies).toEqual({})
  })

  it("aggregates backgroundFeatures the same way as classFeatures/speciesTraits/feats", () => {
    const feature = makeFeature({ name: "Acolyte", source: "background", levelEffects: [{ level: 1, effects: { skillProficiencies: [{ skill: "insight" }], otherProficiencies: ["Calligrapher's Supplies"] } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [], speciesTraits: [], feats: [], backgroundFeatures: [feature], level: 1 })
    expect(totals.skillProficiencies.insight?.source).toBe("Acolyte Background")
    expect(totals.otherProficiencies).toEqual({ "Calligrapher's Supplies": "Acolyte Background" })
  })

  it("only applies effects from features whose level threshold has been reached", () => {
    const feature = makeFeature({ levelEffects: [{ level: 4, effects: { skillProficiencies: [{ skill: "perception" }] } }] })
    const below = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 3 })
    expect(below.skillProficiencies.perception).toBeUndefined()

    const at = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 4 })
    expect(at.skillProficiencies.perception?.source).toBe("Test Feature Class Feature")
  })

  it("last-source-wins for scalar fields in class -> species -> feat order, recording provenance", () => {
    const classFeature = makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })
    const feat = makeFeature({ name: "Homebrew Feat", source: "feat", levelEffects: [{ level: 1, effects: { spellcastingAbility: "charisma" } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [classFeature], speciesTraits: [], feats: [feat], level: 1 })
    expect(totals.spellcastingAbility).toBe("charisma")
    expect(totals.spellcastingAbilitySource).toBe("Homebrew Feat Feat")
  })

  it("additively unions saving throw and other-proficiency grants across features, recording the first-source feature", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["strength"], otherProficiencies: ["Light Armor"] } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["strength", "constitution"], otherProficiencies: ["Light Armor", "Simple Weapons"] } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.savingThrowProficiencies.strength).toBe("A Class Feature")
    expect(totals.savingThrowProficiencies.constitution).toBe("B Class Feature")
    expect(totals.otherProficiencies).toEqual({ "Light Armor": "A Class Feature", "Simple Weapons": "B Class Feature" })
  })

  it("ORs the expertise flag together when two features grant the same skill", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { skillProficiencies: [{ skill: "stealth", expertise: false }] } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { skillProficiencies: [{ skill: "stealth", expertise: true }] } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.skillProficiencies.stealth).toEqual({ expertise: true, source: "A Class Feature" })
  })

  it("sums senses and carrying capacity bonus across features", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { senses: { darkvision: 60 }, carryingCapacityBonus: 20 } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { senses: { darkvision: 30 }, carryingCapacityBonus: 10 } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.senses.darkvision).toBe(90)
    expect(totals.carryingCapacityBonus).toBe(30)
  })

  it("sums hpBonusPerLevel across features", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 2 } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.hpBonusPerLevel).toBe(3)
  })

  it("only applies hpBonusPerLevel from features whose level threshold has been reached", () => {
    const feature = makeFeature({ levelEffects: [{ level: 4, effects: { hpBonusPerLevel: 1 } }] })
    const below = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 3 })
    expect(below.hpBonusPerLevel).toBe(0)

    const at = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 4 })
    expect(at.hpBonusPerLevel).toBe(1)
  })

  it("last-source-wins for Hit Points mode fields, mirroring hitDiceSize", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { hitDiceSize: 8, hitPointsMode: "per-level" } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { hitPointsMode: "flat", hitPointsFlatValue: 40 } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.hitPointsMode).toBe("flat")
    expect(totals.hitPointsFlatValue).toBe(40)
  })

  it("last-source-wins for movement speeds (an absolute characteristic, not a stacking bonus), recording provenance", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { speed: 25, flySpeed: 10 } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { flySpeed: 20 } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.speed).toBe(25)
    expect(totals.speedSource).toBe("A Class Feature")
    expect(totals.flySpeed).toBe(20)
    expect(totals.flySpeedSource).toBe("B Class Feature")
  })

  it("takes the max carrying capacity multiplier across features", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { carryingCapacityMultiplier: 2 } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { carryingCapacityMultiplier: 1.5 } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.carryingCapacityMultiplier).toBe(2)
  })

  it("last-source-wins for size, recording provenance", () => {
    const species = makeFeature({ name: "Goliath", source: "species-trait", levelEffects: [{ level: 1, effects: { size: "Medium" } }] })
    const feat = makeFeature({ name: "Giant Ancestry", source: "feat", levelEffects: [{ level: 1, effects: { size: "Large" } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [], speciesTraits: [species], feats: [feat], level: 1 })
    expect(totals.size).toBe("Large")
    expect(totals.sizeSource).toBe("Giant Ancestry Feat")
  })

  it("first-source-wins for resistances/immunities/vulnerabilities/conditionImmunities/languages", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { resistances: ["Poison"], immunities: ["Disease"], vulnerabilities: ["Radiant"], conditionImmunities: ["Poisoned"], languages: ["Dwarvish"] } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { resistances: ["Poison", "Cold"], immunities: ["Disease"], vulnerabilities: ["Radiant", "Fire"], conditionImmunities: ["Poisoned", "Charmed"], languages: ["Dwarvish", "Giant"] } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.resistances).toEqual({ Poison: "A Class Feature", Cold: "B Class Feature" })
    expect(totals.immunities).toEqual({ Disease: "A Class Feature" })
    expect(totals.vulnerabilities).toEqual({ Radiant: "A Class Feature", Fire: "B Class Feature" })
    expect(totals.conditionImmunities).toEqual({ Poisoned: "A Class Feature", Charmed: "B Class Feature" })
    expect(totals.languages).toEqual({ Dwarvish: "A Class Feature", Giant: "B Class Feature" })
  })

  it("only applies newly-added numeric/list effects from features whose level threshold has been reached", () => {
    const feature = makeFeature({ levelEffects: [{ level: 4, effects: { flySpeed: 30, languages: ["Draconic"] } }] })
    const below = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 3 })
    expect(below.flySpeed).toBeUndefined()
    expect(below.languages).toEqual({})

    const at = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 4 })
    expect(at.flySpeed).toBe(30)
    expect(at.languages).toEqual({ Draconic: "Test Feature Class Feature" })
  })

  it("accumulates a single feature's own tiers instead of only applying the highest one", () => {
    const feature = makeFeature({
      name: "Growing Resilience",
      levelEffects: [
        { level: 1, effects: { abilityScores: { constitution: 1 } } },
        { level: 4, effects: { abilityScores: { constitution: 1 } } },
      ],
    })
    const below = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 3 })
    expect(below.abilityScores.constitution).toBe(1)

    const at = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 4 })
    expect(at.abilityScores.constitution).toBe(2)
  })

  it("unions a single feature's proficiency/resistance-style grants across tiers instead of losing earlier ones", () => {
    const feature = makeFeature({
      name: "Attuned Senses",
      levelEffects: [
        { level: 1, effects: { skillProficiencies: [{ skill: "survival" }] } },
        { level: 6, effects: { skillProficiencies: [{ skill: "nature" }] } },
      ],
    })
    const totals = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 6 })
    expect(totals.skillProficiencies.survival?.source).toBe("Attuned Senses Class Feature")
    expect(totals.skillProficiencies.nature?.source).toBe("Attuned Senses Class Feature")
  })

  it("resolves a single feature's own floor/cap tiers to the strongest constraint, not a sum", () => {
    const feature = makeFeature({
      name: "Rising Fortitude",
      levelEffects: [
        { level: 1, effects: { abilityScoreFloors: { constitution: 13 } } },
        { level: 8, effects: { abilityScoreFloors: { constitution: 15 } } },
      ],
    })
    const totals = getActiveFeatureEffects({ classFeatures: [feature], speciesTraits: [], feats: [], level: 8 })
    expect(totals.abilityScoreFloors.constitution).toBe(15)
  })

  it("sums ability score bonuses across features and records each as a separate named grant", () => {
    const featureA = makeFeature({ name: "Hill Dwarf Toughness", source: "species-trait", levelEffects: [{ level: 1, effects: { abilityScores: { strength: 2 } } }] })
    const featureB = makeFeature({ name: "Ability Score Improvement", levelEffects: [{ level: 4, effects: { abilityScores: { strength: 1 } } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureB], speciesTraits: [featureA], feats: [], level: 4 })
    expect(totals.abilityScores.strength).toBe(3)
    expect(totals.abilityScoreGrants.strength).toEqual([
      { source: "Ability Score Improvement Class Feature", amount: 1 },
      { source: "Hill Dwarf Toughness Species Trait", amount: 2 },
    ])
  })

  it("takes the max ability score floor across features and records the winning source", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { abilityScoreFloors: { wisdom: 18 } } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { abilityScoreFloors: { wisdom: 21 } } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.abilityScoreFloors.wisdom).toBe(21)
    expect(totals.abilityScoreFloorSources.wisdom).toBe("B Class Feature")
  })

  it("takes the min ability score max cap across features and records the winning source (most restrictive wins)", () => {
    const featureA = makeFeature({ name: "A", levelEffects: [{ level: 1, effects: { abilityScoreMaxCaps: { wisdom: 18 } } }] })
    const featureB = makeFeature({ name: "B", levelEffects: [{ level: 1, effects: { abilityScoreMaxCaps: { wisdom: 12 } } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.abilityScoreMaxCaps.wisdom).toBe(12)
    expect(totals.abilityScoreMaxCapSources.wisdom).toBe("B Class Feature")
  })

  it("takes the max ability score base max across features and records the winning source (most generous exception wins)", () => {
    const featureA = makeFeature({ name: "Epic Boon of Fortitude", levelEffects: [{ level: 1, effects: { abilityScoreBaseMax: { constitution: 25 } } }] })
    const featureB = makeFeature({ name: "Primal Champion", levelEffects: [{ level: 1, effects: { abilityScoreBaseMax: { constitution: 23 } } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [featureA, featureB], speciesTraits: [], feats: [], level: 1 })
    expect(totals.abilityScoreBaseMax.constitution).toBe(25)
    expect(totals.abilityScoreBaseMaxSources.constitution).toBe("Epic Boon of Fortitude Class Feature")
  })

  it("aggregates a backgroundFeatures-sourced ability score bonus (2024 Background ASI path)", () => {
    const backgroundFeature = makeFeature({ name: "Acolyte", source: "background", levelEffects: [{ level: 1, effects: { abilityScores: { wisdom: 2, intelligence: 1 } } }] })
    const totals = getActiveFeatureEffects({ classFeatures: [], speciesTraits: [], feats: [], backgroundFeatures: [backgroundFeature], level: 1 })
    expect(totals.abilityScores.wisdom).toBe(2)
    expect(totals.abilityScores.intelligence).toBe(1)
    expect(totals.abilityScoreGrants.wisdom).toEqual([{ source: "Acolyte Background", amount: 2 }])
  })
})

describe("getEffectiveSpellcastingAbility", () => {
  it("ignores the raw field when no feature grants an ability", () => {
    // spellcastingAbility can only ever be set via a Class Feature/Trait/Feat grant — the raw
    // field is legacy/import metadata only (see pdf-parser's synthetic "Spellcasting" feature).
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveSpellcastingAbility(character)).toBe("")
  })

  it("returns the feature-granted ability", () => {
    const feature = makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveSpellcastingAbility(character)).toBe("intelligence")
  })

  it("returns empty string once the granting feature is removed, even if a stale raw field remains", () => {
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1, spellcastingAbility: "wisdom" as const }
    expect(getEffectiveSpellcastingAbility(character)).toBe("")
  })
})

describe("getEffectiveHitDiceSize", () => {
  it("returns undefined when no feature grants a hit die size", () => {
    expect(getEffectiveHitDiceSize({ classFeatures: [], speciesTraits: [], feats: [], level: 1 })).toBeUndefined()
  })

  it("returns the feature-granted hit die size", () => {
    const feature = makeFeature({ levelEffects: [{ level: 1, effects: { hitDiceSize: 12 } }] })
    const character = { classFeatures: [feature], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveHitDiceSize(character)).toBe(12)
  })

  it("ignores stale raw hitDiceSize/hitDice fields once no feature grants one, even if they're still present", () => {
    const character = { classFeatures: [], speciesTraits: [], feats: [], level: 1, hitDiceSize: 10, hitDice: "1d8" } as any
    expect(getEffectiveHitDiceSize(character)).toBeUndefined()
  })
})

describe("inferFeatureType", () => {
  it("returns 'Action' whenever actionKind is set, regardless of levelEffects", () => {
    expect(inferFeatureType("action", undefined)).toBe("Action")
  })

  it("returns '' when there is no actionKind and no levelEffects", () => {
    expect(inferFeatureType(undefined, undefined)).toBe("")
  })

  it("infers 'Hit Points' from an explicit hitDiceSize of 0", () => {
    // 0 is falsy, so the check for hitDiceSize can't be a bare truthiness test on its own —
    // hitPointsMode being present at all is what actually catches this case.
    expect(inferFeatureType(undefined, [{ level: 1, effects: { hitDiceSize: 0, hitPointsMode: "flat" } }])).toBe("Hit Points")
  })

  it("infers 'Senses' from an explicit sense value of 0", () => {
    expect(inferFeatureType(undefined, [{ level: 1, effects: { senses: { darkvision: 0 } } }])).toBe("Senses")
  })

  it("infers 'Max HP Bonus' from an explicit hpBonusPerLevel of 0", () => {
    expect(inferFeatureType(undefined, [{ level: 1, effects: { hpBonusPerLevel: 0 } }])).toBe("Max HP Bonus")
  })

  it("infers 'Ability Scores' from an explicit floor of 0", () => {
    expect(inferFeatureType(undefined, [{ level: 1, effects: { abilityScoreFloors: { strength: 0 } } }])).toBe("Ability Scores")
  })

  it("checks spellcastingAbility before hitDiceSize when both are somehow present", () => {
    expect(inferFeatureType(undefined, [{ level: 1, effects: { spellcastingAbility: "wisdom", hitDiceSize: 8 } }])).toBe("Spellcasting Ability")
  })
})

describe("getEffectiveSavingThrowProficiency / getEffectiveSkillProficiency", () => {
  it("is proficient via the character's own flag when no feature grants it", () => {
    const character = { savingThrows: { strength: true } as any, classFeatures: [], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveSavingThrowProficiency(character, "strength")).toEqual({ proficient: true, granted: false, grantedBy: undefined })
  })

  it("is proficient and marked granted when a feature grants the save, independent of the own flag", () => {
    const feature = makeFeature({ name: "Divine Protection", levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["wisdom"] } }] })
    const character = { savingThrows: { wisdom: false } as any, classFeatures: [feature], speciesTraits: [], feats: [], level: 1 }
    expect(getEffectiveSavingThrowProficiency(character, "wisdom")).toEqual({ proficient: true, granted: true, grantedBy: "Divine Protection Class Feature" })
  })

  it("preserves the character's own flag once a granting feature's level requirement is no longer met", () => {
    const feature = makeFeature({ name: "Late Bonus", levelEffects: [{ level: 10, effects: { savingThrowProficiencies: ["dexterity"] } }] })
    const character = { savingThrows: { dexterity: false } as any, classFeatures: [feature], speciesTraits: [], feats: [], level: 5 }
    expect(getEffectiveSavingThrowProficiency(character, "dexterity")).toEqual({ proficient: false, granted: false, grantedBy: undefined })
  })

  it("merges skill proficiency and expertise from own and granted sources", () => {
    const feature = makeFeature({ name: "Skilled", levelEffects: [{ level: 1, effects: { skillProficiencies: [{ skill: "perception", expertise: true }] } }] })
    const character = {
      skills: { perception: { proficient: false, expertise: false } } as any,
      classFeatures: [feature], speciesTraits: [], feats: [], level: 1,
    }
    expect(getEffectiveSkillProficiency(character, "perception")).toEqual({ proficient: true, expertise: true, granted: true, expertiseGranted: true, grantedBy: "Skilled Class Feature" })
  })
})

describe("spell calculations with a feature-granted spellcasting ability", () => {
  it("uses the feature-granted ability instead of a stale raw spellcastingAbility field", () => {
    const feature = makeFeature({ name: "Spellcasting", levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] })
    const character = createDefaultCharacter()
    character.classFeatures = [feature]
    character.spellcastingAbility = "charisma"
    character.abilityScores.wisdom = 16
    character.abilityScores.charisma = 10
    character.proficiencyBonus = 3

    expect(getSpellSaveDC(character)).toBe(14) // 8 + 3 prof + 3 WIS mod
    expect(getSpellAttackBonus(character)).toBe(6) // 3 prof + 3 WIS mod
    expect(computeSpellModifier(character)).toBe(3)
  })
})

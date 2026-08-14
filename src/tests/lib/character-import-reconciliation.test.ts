import { reconcileImportedCharacter, reconcileImportedCharacters, freshenCalculatedFields } from "@/lib/character-import-reconciliation"
import { createDefaultCharacter } from "@/lib/character-types"

describe("reconcileImportedCharacter", () => {
  it("passes through non-object input unchanged", () => {
    expect(reconcileImportedCharacter(null)).toBeNull()
    expect(reconcileImportedCharacter(undefined)).toBeUndefined()
  })

  it("marks every already-consistent default-character field as calculated", () => {
    const result = reconcileImportedCharacter(createDefaultCharacter())
    expect(result.useCalculatedArmorClass).toBe(true)
    expect(result.useCalculatedInitiative).toBe(true)
    expect(result.useCalculatedProficiencyBonus).toBe(true)
    expect(result.useCalculatedSpellSaveDC).toBe(true)
    expect(result.useCalculatedSpellAttackBonus).toBe(true)
  })

  describe("armorClass", () => {
    it("marks calculated when the imported value matches the formula", () => {
      const character: any = { ...createDefaultCharacter(), armorClass: 10 }
      expect(reconcileImportedCharacter(character).useCalculatedArmorClass).toBe(true)
    })

    it("marks custom and preserves the value when it doesn't match", () => {
      const character: any = { ...createDefaultCharacter(), armorClass: 15 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedArmorClass).toBe(false)
      expect(result.armorClass).toBe(15)
    })
  })

  describe("initiative", () => {
    it("treats a matching value of 0 as calculated, not absent", () => {
      const character: any = { ...createDefaultCharacter(), initiative: 0 }
      expect(reconcileImportedCharacter(character).useCalculatedInitiative).toBe(true)
    })

    it("marks custom and preserves a mismatched value", () => {
      const character: any = { ...createDefaultCharacter(), initiative: 3 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedInitiative).toBe(false)
      expect(result.initiative).toBe(3)
    })
  })

  describe("proficiencyBonus", () => {
    it("marks calculated when it matches getProficiencyBonus(level)", () => {
      const character: any = { ...createDefaultCharacter(), level: 5, proficiencyBonus: 3 }
      expect(reconcileImportedCharacter(character).useCalculatedProficiencyBonus).toBe(true)
    })

    it("marks custom and preserves a mismatched value", () => {
      const character: any = { ...createDefaultCharacter(), level: 5, proficiencyBonus: 2 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedProficiencyBonus).toBe(false)
      expect(result.proficiencyBonus).toBe(2)
    })
  })

  describe("passive scores", () => {
    it("marks passivePerception calculated when it matches", () => {
      const character: any = { ...createDefaultCharacter(), passivePerception: 10 }
      expect(reconcileImportedCharacter(character).useCalculatedPassivePerception).toBe(true)
    })

    it("marks passivePerception custom and preserves a mismatched value", () => {
      const character: any = { ...createDefaultCharacter(), passivePerception: 15 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedPassivePerception).toBe(false)
      expect(result.passivePerception).toBe(15)
    })

    it("leaves the toggle untouched when passivePerception is absent", () => {
      const character: any = { ...createDefaultCharacter() }
      delete character.passivePerception
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedPassivePerception).toBeUndefined()
    })

    it("marks passiveInsight calculated when it matches", () => {
      const character: any = { ...createDefaultCharacter(), passiveInsight: 10 }
      expect(reconcileImportedCharacter(character).useCalculatedPassiveInsight).toBe(true)
    })

    it("marks passiveInsight custom when it mismatches", () => {
      const character: any = { ...createDefaultCharacter(), passiveInsight: 13 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedPassiveInsight).toBe(false)
      expect(result.passiveInsight).toBe(13)
    })

    it("marks passiveInvestigation calculated when it matches", () => {
      const character: any = { ...createDefaultCharacter(), passiveInvestigation: 10 }
      expect(reconcileImportedCharacter(character).useCalculatedPassiveInvestigation).toBe(true)
    })

    it("marks passiveInvestigation custom when it mismatches", () => {
      const character: any = { ...createDefaultCharacter(), passiveInvestigation: 13 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedPassiveInvestigation).toBe(false)
      expect(result.passiveInvestigation).toBe(13)
    })
  })

  describe("attunementLimit", () => {
    it("marks calculated when it matches BASE_ATTUNEMENT_LIMIT", () => {
      const character: any = { ...createDefaultCharacter(), attunementLimit: 3 }
      expect(reconcileImportedCharacter(character).useCalculatedAttunementLimit).toBe(true)
    })

    it("marks custom and preserves a mismatched value", () => {
      const character: any = { ...createDefaultCharacter(), attunementLimit: 5 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedAttunementLimit).toBe(false)
      expect(result.attunementLimit).toBe(5)
    })
  })

  describe("carryingCapacity", () => {
    it("marks calculated when it matches strength * 15", () => {
      const character: any = { ...createDefaultCharacter(), carryingCapacity: 150 }
      expect(reconcileImportedCharacter(character).useCalculatedCarryingCapacity).toBe(true)
    })

    it("marks custom and preserves a mismatched value", () => {
      const character: any = { ...createDefaultCharacter(), carryingCapacity: 100 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedCarryingCapacity).toBe(false)
      expect(result.carryingCapacity).toBe(100)
    })
  })

  describe("spellcasting stats", () => {
    it("marks non-caster defaults (8/0/0) as calculated", () => {
      const character: any = {
        ...createDefaultCharacter(),
        spellcastingAbility: "",
        spellSaveDC: 8,
        spellAttackBonus: 0,
        spellModifier: 0,
      }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedSpellSaveDC).toBe(true)
      expect(result.useCalculatedSpellAttackBonus).toBe(true)
      expect(result.useCalculatedSpellModifier).toBe(true)
    })

    it("marks a matching caster's stats as calculated when a Class Feature grants the ability", () => {
      // spellcastingAbility is only ever consulted via a Class Feature grant now — the raw field
      // alone (with no granting feature) can never produce a "calculated" match.
      const character: any = {
        ...createDefaultCharacter(),
        classFeatures: [{
          id: "f-1", name: "Spellcasting", description: "", source: "class-feature",
          levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }],
        }],
        spellSaveDC: 13,
        spellAttackBonus: 5,
        spellModifier: 3,
      }
      character.abilityScores = { ...character.abilityScores, intelligence: 16 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedSpellSaveDC).toBe(true)
      expect(result.useCalculatedSpellAttackBonus).toBe(true)
      expect(result.useCalculatedSpellModifier).toBe(true)
    })

    it("marks a mismatched caster's stats as custom and preserves the values", () => {
      const character: any = {
        ...createDefaultCharacter(),
        classFeatures: [{
          id: "f-1", name: "Spellcasting", description: "", source: "class-feature",
          levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }],
        }],
        spellSaveDC: 99,
        spellAttackBonus: 99,
        spellModifier: 99,
      }
      character.abilityScores = { ...character.abilityScores, intelligence: 16 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedSpellSaveDC).toBe(false)
      expect(result.useCalculatedSpellAttackBonus).toBe(false)
      expect(result.useCalculatedSpellModifier).toBe(false)
      expect(result.spellSaveDC).toBe(99)
      expect(result.spellAttackBonus).toBe(99)
      expect(result.spellModifier).toBe(99)
    })

    it("treats a raw spellcastingAbility with no granting Class Feature as a custom override, not a calculated match", () => {
      const character: any = {
        ...createDefaultCharacter(),
        spellcastingAbility: "intelligence",
        spellSaveDC: 13,
        spellAttackBonus: 5,
        spellModifier: 3,
      }
      character.abilityScores = { ...character.abilityScores, intelligence: 16 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedSpellSaveDC).toBe(false)
      expect(result.useCalculatedSpellAttackBonus).toBe(false)
      expect(result.useCalculatedSpellModifier).toBe(false)
      expect(result.spellSaveDC).toBe(13)
      expect(result.spellAttackBonus).toBe(5)
      expect(result.spellModifier).toBe(3)
    })

    it("falls back to the non-caster calculation when spellcastingAbility is entirely missing", () => {
      const character: any = { ...createDefaultCharacter(), spellSaveDC: 8, spellAttackBonus: 0 }
      delete character.spellcastingAbility
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedSpellSaveDC).toBe(true)
      expect(result.useCalculatedSpellAttackBonus).toBe(true)
    })
  })

  describe("ability score overrides", () => {
    it("marks calculated when the override matches the base+item formula", () => {
      const character: any = { ...createDefaultCharacter() }
      character.abilityScores = { ...character.abilityScores, strength: 16 }
      character.abilityScoreOverrides = { strength: 16 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedAbilityScores?.strength).toBe(true)
    })

    it("marks custom and preserves the override when it mismatches", () => {
      const character: any = { ...createDefaultCharacter() }
      character.abilityScores = { ...character.abilityScores, strength: 14 }
      character.abilityScoreOverrides = { strength: 18 }
      const result = reconcileImportedCharacter(character)
      expect(result.useCalculatedAbilityScores?.strength).toBe(false)
      expect(result.abilityScoreOverrides?.strength).toBe(18)
    })

    it("leaves useCalculatedAbilityScores untouched when no overrides are present", () => {
      const result = reconcileImportedCharacter(createDefaultCharacter())
      expect(result.useCalculatedAbilityScores).toBeUndefined()
    })
  })

  it("reconciles ability scores before the scalar pass, so a stale flag can't produce a wrong armor class result", () => {
    const character: any = { ...createDefaultCharacter() }
    character.abilityScores = { ...character.abilityScores, dexterity: 10 }
    character.abilityScoreOverrides = { dexterity: 16 }
    character.useCalculatedAbilityScores = { dexterity: true } // stale: claims calculated despite an override being present
    character.armorClass = 13 // only correct (10 + 3 DEX) if the override is honored

    const result = reconcileImportedCharacter(character)

    expect(result.useCalculatedAbilityScores?.dexterity).toBe(false)
    expect(result.useCalculatedArmorClass).toBe(true)
  })
})

describe("reconcileImportedCharacters", () => {
  it("maps an array of raw characters", () => {
    const character: any = { ...createDefaultCharacter(), armorClass: 15 }
    const [result] = reconcileImportedCharacters([character])
    expect(result.useCalculatedArmorClass).toBe(false)
  })

  it("returns [] for non-array input", () => {
    expect(reconcileImportedCharacters(null)).toEqual([])
    expect(reconcileImportedCharacters(undefined)).toEqual([])
    expect(reconcileImportedCharacters("not an array")).toEqual([])
  })
})

describe("freshenCalculatedFields", () => {
  // A spellcaster whose Class Feature grants intelligence (16, +3 mod) as the spellcasting
  // ability. Default proficiencyBonus (2) -> spellSaveDC 13, spellAttackBonus 5, spellModifier 3.
  function makeCaster() {
    const character: any = {
      ...createDefaultCharacter(),
      classFeatures: [{
        id: "f-1", name: "Spellcasting", description: "", source: "class-feature",
        levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }],
      }],
    }
    character.abilityScores = { ...character.abilityScores, intelligence: 16 }
    return character
  }

  it("refreshes a stale spellSaveDC when explicitly marked calculated", () => {
    const character = { ...makeCaster(), useCalculatedSpellSaveDC: true, spellSaveDC: 8 }
    expect(freshenCalculatedFields(character).spellSaveDC).toBe(13)
  })

  it("refreshes spellSaveDC/spellAttackBonus/spellModifier when the toggle is entirely absent, matching the UI's own default-to-calculated fallback", () => {
    // The exact bug scenario: a caster who never explicitly touched the Actions module toggle
    // still displays calculated values live (useCalculatedSpellSaveDC ?? true), but the backing
    // field was left at whatever it was last written — stale here.
    const character = makeCaster()
    delete character.useCalculatedSpellSaveDC
    delete character.useCalculatedSpellAttackBonus
    delete character.useCalculatedSpellModifier
    character.spellSaveDC = 8
    character.spellAttackBonus = 0
    character.spellModifier = 0
    const fresh = freshenCalculatedFields(character)
    expect(fresh.spellSaveDC).toBe(13)
    expect(fresh.spellAttackBonus).toBe(5)
    expect(fresh.spellModifier).toBe(3)
  })

  it("does not touch a field explicitly marked custom, even if it differs from the calculated value", () => {
    const character = { ...makeCaster(), useCalculatedSpellSaveDC: false, spellSaveDC: 99 }
    expect(freshenCalculatedFields(character).spellSaveDC).toBe(99)
  })

  it("does not touch initiative/proficiencyBonus when their toggle is absent — those default to custom, not calculated", () => {
    const character: any = { ...createDefaultCharacter(), initiative: 7, proficiencyBonus: 99 }
    delete character.useCalculatedInitiative
    delete character.useCalculatedProficiencyBonus
    const fresh = freshenCalculatedFields(character)
    expect(fresh.initiative).toBe(7)
    expect(fresh.proficiencyBonus).toBe(99)
  })

  it("round-trips through export and re-import as calculated, fixing the reported bug end-to-end", () => {
    const character = { ...makeCaster(), useCalculatedSpellSaveDC: true, spellSaveDC: 8 } // stale
    const exported = freshenCalculatedFields(character)
    const reimported = reconcileImportedCharacter(exported)
    expect(reimported.useCalculatedSpellSaveDC).toBe(true)
    expect(reimported.spellSaveDC).toBe(13)
  })

  it("is idempotent once every calculated field has already been freshened", () => {
    // createDefaultCharacter() itself leaves several calculated fields (attunementLimit,
    // carryingCapacity, the passive scores, spellModifier) entirely unset, so a single freshen
    // pass legitimately fills them in — a second pass on that already-freshened result is the
    // real no-op case.
    const once = freshenCalculatedFields(createDefaultCharacter())
    expect(freshenCalculatedFields(once)).toEqual(once)
  })
})

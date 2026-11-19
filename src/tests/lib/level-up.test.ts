import { createDefaultCharacter, type Character, type Feature, type FeatureEffects } from "@/lib/character-types"
import { getEffectiveMaxHp } from "@/lib/character-utils"
import {
  applyLevelUp,
  clampCharacterLevel,
  findHitPointsSource,
  getLevelUpSummary,
  levelsGained,
  type LevelUpInput,
} from "@/lib/level-up"

// createDefaultCharacter: level 1, CON 10, calculated Max HP and proficiency bonus, a Hit Points
// feature giving a d8 (no mode set, so per level) and Ability Score Improvements at 4, 8, 12, 16, 19.
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return { id: "f1", name: "Feature", description: "", source: "class-feature", featureType: "Custom", ...overrides }
}

/** The character with its required Hit Points feature's effects replaced. */
function withHitPoints(character: Character, effects: FeatureEffects): Character {
  return {
    ...character,
    classFeatures: (character.classFeatures ?? []).map((feature) =>
      feature.featureType === "Hit Points" ? { ...feature, levelEffects: [{ level: 1, effects }] } : feature,
    ),
  }
}

const hitPointsEffects = (character: Character) =>
  character.classFeatures?.find((feature) => feature.featureType === "Hit Points")?.levelEffects?.[0]?.effects

function makeInput(overrides: Partial<LevelUpInput> = {}): LevelUpInput {
  return { level: 2, flatHitPoints: 0, rolledHitPoints: {}, ...overrides }
}

describe("clampCharacterLevel", () => {
  it.each([[0, 1], [1, 1], [7.6, 7], [20, 20], [25, 20], [Number.NaN, 1]])("keeps %d within 1–20 as %d", (level, expected) => {
    expect(clampCharacterLevel(level)).toBe(expected)
  })
})

describe("levelsGained", () => {
  it("lists every level after the current one up to the new one", () => {
    expect(levelsGained(3, 6)).toEqual([4, 5, 6])
    expect(levelsGained(3, 3)).toEqual([])
  })
})

describe("findHitPointsSource", () => {
  it("is null when no tier sets how Max HP is calculated", () => {
    expect(findHitPointsSource(makeCharacter())).toBeNull()
  })

  it("finds the Hit Points feature's tier and its mode", () => {
    const character = withHitPoints(makeCharacter(), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10] })
    const source = findHitPointsSource(character)
    expect(source?.mode).toBe("rolled")
    expect(source?.feature.featureType).toBe("Hit Points")
    expect(source?.tierIndex).toBe(0)
  })

  it("takes a later feature's tier over an earlier one, as the Max HP calculation does", () => {
    const legacy = makeFeature({ id: "legacy", featureType: "Hit Points (legacy)", levelEffects: [{ level: 1, effects: { hitPointsMode: "flat", hitPointsFlatValue: 30 } }] })
    const character = withHitPoints({ ...makeCharacter(), feats: [legacy] }, { hitDiceSize: 8, hitPointsMode: "per-level" })
    expect(findHitPointsSource(character)?.feature.id).toBe("legacy")
  })
})

describe("applyLevelUp", () => {
  it("sets the level and heals by the Max HP gained, per level", () => {
    const leveled = applyLevelUp(makeCharacter({ hitPoints: { current: 6, maximum: 8, temporary: 0 } }), makeInput({ level: 3 }))
    expect(leveled.level).toBe(3)
    // d8: 8 at level 1, then 5 (the average) at each level after
    expect(getEffectiveMaxHp(leveled)).toBe(18)
    expect(leveled.hitPoints.current).toBe(16)
  })

  it("keeps the level within 20", () => {
    expect(applyLevelUp(makeCharacter({ level: 19 }), makeInput({ level: 25 })).level).toBe(20)
  })

  it("writes the new single value to the Hit Points feature", () => {
    const character = withHitPoints(makeCharacter({ hitPoints: { current: 10, maximum: 10, temporary: 0 } }), { hitDiceSize: 8, hitPointsMode: "flat", hitPointsFlatValue: 10 })
    const leveled = applyLevelUp(character, makeInput({ flatHitPoints: 17 }))
    expect(hitPointsEffects(leveled)).toEqual({ hitDiceSize: 8, hitPointsMode: "flat", hitPointsFlatValue: 17 })
    expect(getEffectiveMaxHp(leveled)).toBe(17)
    expect(leveled.hitPoints.current).toBe(17)
  })

  it("records each gained level's roll, keeping the earlier ones", () => {
    const character = withHitPoints(makeCharacter({ level: 2 }), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10, 6] })
    const leveled = applyLevelUp(character, makeInput({ level: 4, rolledHitPoints: { 3: 4, 4: 9 } }))
    expect(hitPointsEffects(leveled)?.hitPointsRolledLevels).toEqual([10, 6, 4, 9])
  })

  it("keeps a roll already recorded for a gained level that has none entered", () => {
    const character = withHitPoints(makeCharacter({ level: 2 }), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10, 6, 7] })
    const leveled = applyLevelUp(character, makeInput({ level: 4, rolledHitPoints: { 4: 2 } }))
    expect(hitPointsEffects(leveled)?.hitPointsRolledLevels).toEqual([10, 6, 7, 2])
  })

  it("leaves a per-level Hit Points feature as it is", () => {
    const character = withHitPoints(makeCharacter(), { hitDiceSize: 8, hitPointsMode: "per-level", hitPointsPerLevelAmount: 6 })
    const leveled = applyLevelUp(character, makeInput({ flatHitPoints: 99, rolledHitPoints: { 2: 3 } }))
    expect(hitPointsEffects(leveled)).toEqual({ hitDiceSize: 8, hitPointsMode: "per-level", hitPointsPerLevelAmount: 6 })
  })

  it("doesn't move current HP when Max HP is custom", () => {
    const character = makeCharacter({ useCalculatedMaximumHp: false, hitPoints: { current: 20, maximum: 30, temporary: 0 } })
    expect(applyLevelUp(character, makeInput()).hitPoints.current).toBe(20)
  })
})

describe("getLevelUpSummary", () => {
  const summarize = (character: Character, input: Partial<LevelUpInput> = {}) =>
    getLevelUpSummary(character, applyLevelUp(character, makeInput(input)))
  const change = (summary: ReturnType<typeof getLevelUpSummary>, id: string) => summary.changes.find((c) => c.id === id)
  const manual = (summary: ReturnType<typeof getLevelUpSummary>, id: string) => summary.manualValues.find((m) => m.id === id)

  it("lists the Hit Points changes", () => {
    const summary = summarize(makeCharacter({ hitPoints: { current: 8, maximum: 8, temporary: 0 } }))
    expect(change(summary, "max-hp")).toMatchObject({ group: "Hit Points", before: "8", after: "13" })
    expect(change(summary, "current-hp")).toMatchObject({ before: "8", after: "13" })
    expect(change(summary, "hit-dice")).toMatchObject({ before: "1d8", after: "2d8" })
  })

  it("lists the proficiency bonus and everything that adds it", () => {
    const character = makeCharacter({
      level: 4,
      savingThrows: { ...createDefaultCharacter().savingThrows, dexterity: true },
      skills: { ...createDefaultCharacter().skills, stealth: { proficient: true, expertise: false } },
    })
    const summary = summarize(character, { level: 5 })
    expect(change(summary, "proficiency-bonus")).toMatchObject({ group: "Combat", before: "+2", after: "+3" })
    expect(change(summary, "save-dexterity")).toMatchObject({ group: "Saving Throws", before: "+2", after: "+3" })
    expect(change(summary, "skill-stealth")).toMatchObject({ group: "Skills", before: "+2", after: "+3" })
    // Not proficient: no change
    expect(change(summary, "save-strength")).toBeUndefined()
    expect(change(summary, "skill-arcana")).toBeUndefined()
  })

  it("only lists values that change", () => {
    const summary = summarize(makeCharacter({ level: 2 }), { level: 3 })
    expect(change(summary, "proficiency-bonus")).toBeUndefined()
    expect(summary.changes.every((c) => c.before !== c.after)).toBe(true)
  })

  it("calls out a custom value whose calculated value would change, and nothing derived from it changes", () => {
    const character = makeCharacter({
      level: 4,
      useCalculatedProficiencyBonus: false,
      proficiencyBonus: 2,
      skills: { ...createDefaultCharacter().skills, stealth: { proficient: true, expertise: false } },
    })
    const summary = summarize(character, { level: 5 })
    expect(change(summary, "proficiency-bonus")).toBeUndefined()
    expect(manual(summary, "proficiency-bonus")).toMatchObject({ label: "Proficiency Bonus", value: "+2", reason: "Custom value" })
    expect(change(summary, "skill-stealth")).toBeUndefined()
  })

  it("calls out a custom Max HP with the value entered", () => {
    const summary = summarize(makeCharacter({ useCalculatedMaximumHp: false, hitPoints: { current: 20, maximum: 30, temporary: 0 } }))
    expect(change(summary, "max-hp")).toBeUndefined()
    expect(manual(summary, "max-hp")).toMatchObject({ value: "30" })
  })

  it("calls out hand-entered attack bonuses and DCs when the proficiency bonus changes", () => {
    const character = makeCharacter({
      level: 4,
      attacks: [{ id: "a1", name: "Bite", type: "attack", description: "", attackBonus: 5 }],
      bonusActions: [{ id: "b1", name: "Shove", type: "ability", description: "", attackBonus: 0 }],
      feats: [makeFeature({ id: "breath", name: "Breath Weapon", source: "feat", attackSave: "DEX save DC 13" })],
    })
    const summary = summarize(character, { level: 5 })
    expect(manual(summary, "attack-bonus-a1")).toMatchObject({ label: "Bite Attack Bonus", value: "+5" })
    expect(manual(summary, "attack-save-breath")).toMatchObject({ label: "Breath Weapon Save", value: "DEX save DC 13" })
    // 0 means no attack roll
    expect(manual(summary, "attack-bonus-b1")).toBeUndefined()
  })

  it("doesn't call out hand-entered attack bonuses when the proficiency bonus stays", () => {
    const character = makeCharacter({ level: 2, attacks: [{ id: "a1", name: "Bite", type: "attack", description: "", attackBonus: 5 }] })
    expect(summarize(character, { level: 3 }).manualValues).toEqual([])
  })

  it("lists the features gaining something in the levels gained", () => {
    const spellcasting = makeFeature({
      id: "sc", name: "Spellcasting", featureType: "Spellcasting",
      levelEffects: [
        { level: 2, effects: { spellcastingAbility: "wisdom", spellSlots: { 1: 2 } } },
        { level: 3, effects: { spellcastingAbility: "wisdom", spellSlots: { 1: 3 } } },
        { level: 5, effects: { spellcastingAbility: "wisdom", spellSlots: { 1: 4, 2: 2 } } },
      ],
    })
    const extraAttack = makeFeature({ id: "ea", name: "Extra Attack", featureType: "Action", actionKind: "action", level: 5 })
    const later = makeFeature({ id: "later", name: "Later", featureType: "Action", actionKind: "action", level: 9 })
    const character = makeCharacter({ level: 2, classFeatures: [...(createDefaultCharacter().classFeatures ?? []), spellcasting, extraAttack, later] })

    const summary = summarize(character, { level: 5 })
    expect(summary.gainedFeatures).toEqual([
      { id: "sc", name: "Spellcasting", kind: "Class Feature", gains: [
        { level: 3, text: "Spell Slots: 3 × 1st" },
        { level: 5, text: "Spell Slots: 4 × 1st, 2 × 2nd" },
      ] },
      { id: "ea", name: "Extra Attack", kind: "Class Feature", gains: [{ level: 5, text: "Becomes available" }] },
    ])
    expect(change(summary, "spell-slots-1")).toMatchObject({ group: "Spellcasting", before: "2", after: "4" })
    expect(change(summary, "spell-slots-2")).toMatchObject({ before: "0", after: "2" })
    expect(summary.spellcasting).toBe(true)
  })

  it("lists the Ability Score Improvement levels gained", () => {
    expect(summarize(makeCharacter({ level: 3 }), { level: 4 }).abilityScoreImprovementLevels).toEqual([4])
    expect(summarize(makeCharacter({ level: 3 }), { level: 9 }).abilityScoreImprovementLevels).toEqual([4, 8])
    expect(summarize(makeCharacter({ level: 4 }), { level: 5 }).abilityScoreImprovementLevels).toEqual([])
  })

  it("leaves out the spells reminder for a character that casts no spells", () => {
    expect(summarize(makeCharacter()).spellcasting).toBe(false)
  })

  it("lists max uses that follow level or proficiency bonus", () => {
    const rage = makeFeature({ id: "rage", name: "Rage", maxUsesMode: "per-level", maxUsesPerLevel: 1 })
    const luck = makeFeature({ id: "luck", name: "Lucky", source: "feat", maxUsesMode: "proficiency-bonus" })
    const flat = makeFeature({ id: "flat", name: "Second Wind", maxUses: 1 })
    const character = makeCharacter({ level: 4, classFeatures: [rage, flat], feats: [luck] })
    const summary = summarize(character, { level: 5 })
    expect(change(summary, "feature-uses-rage")).toMatchObject({ group: "Feature Uses", label: "Rage", before: "4", after: "5" })
    expect(change(summary, "feature-uses-luck")).toMatchObject({ before: "2", after: "3" })
    expect(change(summary, "feature-uses-flat")).toBeUndefined()
  })

  it("lists equipped weapons' attack bonuses", () => {
    const character = makeCharacter({
      level: 4,
      equipment: [{
        id: "bow", name: "Longbow", quantity: 1, weight: 2, description: "", equipped: true, type: "weapon",
        weaponStats: { damage: "1d8", damageType: "piercing", weaponRange: "150/600", attackAbility: "dex", proficient: true },
      }],
    })
    const summary = summarize(character, { level: 5 })
    expect(change(summary, "weapon-bow-attack")).toMatchObject({ group: "Attacks", label: "Longbow Attack Bonus", before: "+2", after: "+3" })
    expect(change(summary, "weapon-bow-damage")).toBeUndefined()
  })
})

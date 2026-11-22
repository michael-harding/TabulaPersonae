import type { AbilityScores, ActionKind, Character, Equipment, ItemModifiers, Feature, FeatureEffects, FeatureKind, FeatureLevelEffect, FeatureTypeValue, HitPointsMode, SenseType, Skills, Spell, SpellSlotLevel, UseableEntry } from "./character-types"
import { rollMany, parseDiceString, type DieSize } from "./dice"
import { FEATURE_LIST_FIELDS, type FeatureListField } from "./required-features"

export function getAbilityModifier(score: number): number {
  return Math.floor((Math.max(0, score) - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, level) / 4) + 1
}

type ProficiencyBonusCharacter = Partial<Pick<Character, "level" | "proficiencyBonus" | "useCalculatedProficiencyBonus">>

/**
 * The proficiency bonus every roll adds: the level's when calculated, the stored value as-is when
 * custom. The stored value of a calculated bonus is only rewritten when Combat Stats is saved, so it
 * goes stale after a level change; nothing may read character.proficiencyBonus directly. A
 * character saved before new characters started out calculated has no toggle, and stays custom.
 */
export function getEffectiveProficiencyBonus(character: ProficiencyBonusCharacter): number {
  const spec = CUSTOMIZABLE_VALUES.proficiencyBonus
  return isCalculated(character, "proficiencyBonus") ? spec.calculated(character) : spec.custom(character)
}

export function getSkillModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean,
): number {
  const abilityMod = getAbilityModifier(abilityScore)
  let bonus = abilityMod

  if (isProficient) {
    bonus += proficiencyBonus
  }

  if (hasExpertise) {
    bonus += proficiencyBonus
  }

  return bonus
}

export function getSavingThrowModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  itemBonus: number = 0,
): number {
  const abilityMod = getAbilityModifier(abilityScore)
  return (isProficient ? abilityMod + proficiencyBonus : abilityMod) + itemBonus
}

export function isItemModifierActive(
  item: Pick<Equipment, "equipped" | "magic" | "requiresAttunement" | "attuned">
): boolean {
  if (!item.equipped || !item.magic) return false
  if (item.requiresAttunement && !item.attuned) return false
  return true
}

/** A single named contribution to an additive total — one item or one feature, never a lump category. */
export interface SourcedBonus {
  source: string
  amount: number
}

export interface EquipmentModifierTotals {
  armorClass: number
  initiative: number
  savingThrows: Record<keyof AbilityScores, number>
  abilityScores: Record<keyof AbilityScores, number>
  abilityScoreGrants: Record<keyof AbilityScores, SourcedBonus[]>
  resistances: string[]
  immunities: string[]
  vulnerabilities: string[]
  conditionImmunities: string[]
  senses: Record<SenseType, number>
  senseGrants: Record<SenseType, SourcedBonus[]>
  speed: number
  flySpeed: number
  swimSpeed: number
  climbSpeed: number
  burrowSpeed: number
  carryingCapacityBonus: number
  carryingCapacityMultiplier: number
  abilityScoreFloors: Partial<Record<keyof AbilityScores, number>>
  abilityScoreFloorSources: Partial<Record<keyof AbilityScores, string>>
  abilityScoreMaxCaps: Partial<Record<keyof AbilityScores, number>>
  abilityScoreMaxCapSources: Partial<Record<keyof AbilityScores, string>>
  languages: string[]
  proficiencies: string[]
}

function dedupUnion(...lists: (string[] | undefined)[]): string[] {
  return Array.from(new Set(lists.flatMap((l) => l ?? [])))
}

export const ABILITY_KEYS: (keyof AbilityScores)[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]

export const ABILITY_DISPLAY_NAMES: Record<keyof AbilityScores, string> = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
}

export const ABILITY_ABBREVIATIONS: Record<keyof AbilityScores, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA",
}

/** Title-case ability abbreviations for prose/tooltip breakdowns (e.g. "+2 (Dex)"), as opposed to the all-caps ABILITY_ABBREVIATIONS used for stat-block headers. */
export const ABILITY_TITLE_CASE: Record<keyof AbilityScores, string> = {
  strength: "Str", dexterity: "Dex", constitution: "Con", intelligence: "Int", wisdom: "Wis", charisma: "Cha",
}

export const FEATURE_KIND_LABELS: Record<FeatureKind, string> = {
  "class-feature": "Class Feature",
  "species-trait": "Species Trait",
  "feat": "Feat",
  "background": "Background",
}

/** A feature's name plus its kind (e.g. "Speed Species Trait") — used everywhere a tooltip names the specific feature granting a value, so it never gets mislabeled as a generic "Class Feature". */
export function featureSourceLabel(feature: Pick<Feature, "name" | "source">): string {
  return `${feature.name} ${FEATURE_KIND_LABELS[feature.source]}`
}

// Migration-only: derives the Feature Type a pre-existing Feature would have had, from its stored
// effects shape, for backfilling the persisted featureType field onto records that predate it (see
// character-migrations.ts). The live UI never calls this — once a Feature has a persisted
// featureType, that's the source of truth, not a re-guess from its current effects.
export function inferFeatureType(actionKind: ActionKind | undefined, levelEffects: FeatureLevelEffect[] | undefined): FeatureTypeValue {
  if (actionKind) return 'Action'
  const effects = levelEffects?.[0]?.effects
  if (effects?.spellcastingAbility || effects?.spellSlots) return 'Spellcasting'
  if (
    effects?.hitDiceSize ||
    effects?.hitPointsMode != null ||
    effects?.hitPointsFlatValue != null ||
    effects?.hitPointsPerLevelAmount != null ||
    (effects?.hitPointsRolledLevels?.length ?? 0) > 0
  ) return 'Hit Points'
  if (effects?.size) return 'Size'
  if (effects?.creatureType) return 'Creature Type'
  if (effects?.savingThrowProficiencies?.length) return 'Saving Throw Proficiency'
  if (effects?.skillProficiencies?.length) return 'Skill Proficiency'
  if (effects?.otherProficiencies?.length) return 'Other Proficiency'
  if (
    effects?.speed != null ||
    effects?.flySpeed != null ||
    effects?.swimSpeed != null ||
    effects?.climbSpeed != null ||
    effects?.burrowSpeed != null
  ) return 'Speed'
  if (effects?.senses && Object.values(effects.senses).some((v) => v != null)) return 'Senses'
  if (effects?.resistances?.length || effects?.immunities?.length || effects?.vulnerabilities?.length) return 'Damage Resistance/Immunity/Vulnerability'
  if (effects?.conditionImmunities?.length) return 'Condition Immunity'
  if (effects?.languages?.length) return 'Language'
  if (effects?.carryingCapacityBonus != null || effects?.carryingCapacityMultiplier != null) return 'Carrying Capacity'
  if (effects?.abilityScores && Object.values(effects.abilityScores).some((v) => v != null)) return 'Ability Scores'
  if (effects?.abilityScoreFloors && Object.values(effects.abilityScoreFloors).some((v) => v != null)) return 'Ability Scores'
  if (effects?.abilityScoreMaxCaps && Object.values(effects.abilityScoreMaxCaps).some((v) => v != null)) return 'Ability Scores'
  if (effects?.abilityScoreBaseMax && Object.values(effects.abilityScoreBaseMax).some((v) => v != null)) return 'Ability Scores'
  if (effects?.hpBonusPerLevel != null) return 'Max HP Bonus'
  return 'Custom'
}

export const ZERO_ABILITY_SCORES: Record<keyof AbilityScores, number> = {
  strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0,
}

/** The normal maximum an ability score can be raised to through ordinary advancement (ASIs, most feats). Epic Boons, capstone features, and homebrew content raise this per-ability via FeatureEffects.abilityScoreBaseMax. */
export const DEFAULT_ABILITY_SCORE_MAX = 20

export const ZERO_SENSES: Record<SenseType, number> = {
  darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0,
}

export function getEquipmentModifierTotals(equipment: Equipment[] | undefined): EquipmentModifierTotals {
  const totals: EquipmentModifierTotals = {
    armorClass: 0,
    initiative: 0,
    savingThrows: { ...ZERO_ABILITY_SCORES },
    abilityScores: { ...ZERO_ABILITY_SCORES },
    abilityScoreGrants: { strength: [], dexterity: [], constitution: [], intelligence: [], wisdom: [], charisma: [] },
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
    senses: { ...ZERO_SENSES },
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
  const resistanceLists: string[][] = []
  const immunityLists: string[][] = []
  const vulnerabilityLists: string[][] = []
  const conditionImmunityLists: string[][] = []
  const languageLists: string[][] = []
  const proficiencyLists: string[][] = []

  for (const item of equipment ?? []) {
    if (!isItemModifierActive(item) || !item.modifiers) continue
    const mods = item.modifiers
    totals.armorClass += Number(mods.armorClass ?? 0)
    totals.initiative += Number(mods.initiative ?? 0)
    for (const ability of ABILITY_KEYS) {
      totals.savingThrows[ability] += Number(mods.savingThrows?.[ability] ?? 0)
      const abilityAmount = Number(mods.abilityScores?.[ability] ?? 0)
      if (abilityAmount) {
        totals.abilityScores[ability] += abilityAmount
        totals.abilityScoreGrants[ability].push({ source: item.name, amount: abilityAmount })
      }
      if (mods.abilityScoreFloors?.[ability] != null && mods.abilityScoreFloors[ability]! > (totals.abilityScoreFloors[ability] ?? -Infinity)) {
        totals.abilityScoreFloors[ability] = mods.abilityScoreFloors[ability]
        totals.abilityScoreFloorSources[ability] = item.name
      }
      if (mods.abilityScoreMaxCaps?.[ability] != null && mods.abilityScoreMaxCaps[ability]! < (totals.abilityScoreMaxCaps[ability] ?? Infinity)) {
        totals.abilityScoreMaxCaps[ability] = mods.abilityScoreMaxCaps[ability]
        totals.abilityScoreMaxCapSources[ability] = item.name
      }
    }
    for (const sense of SENSE_TYPES) {
      const senseAmount = Number(mods.senses?.[sense] ?? 0)
      if (senseAmount) {
        totals.senses[sense] += senseAmount
        totals.senseGrants[sense].push({ source: item.name, amount: senseAmount })
      }
    }
    totals.speed += Number(mods.speed ?? 0)
    totals.flySpeed += Number(mods.flySpeed ?? 0)
    totals.swimSpeed += Number(mods.swimSpeed ?? 0)
    totals.climbSpeed += Number(mods.climbSpeed ?? 0)
    totals.burrowSpeed += Number(mods.burrowSpeed ?? 0)
    totals.carryingCapacityBonus += Number(mods.carryingCapacityBonus ?? 0)
    if (mods.carryingCapacityMultiplier != null) {
      totals.carryingCapacityMultiplier = Math.max(totals.carryingCapacityMultiplier, mods.carryingCapacityMultiplier)
    }
    resistanceLists.push(mods.resistances ?? [])
    immunityLists.push(mods.immunities ?? [])
    vulnerabilityLists.push(mods.vulnerabilities ?? [])
    conditionImmunityLists.push(mods.conditionImmunities ?? [])
    languageLists.push(mods.languages ?? [])
    proficiencyLists.push(mods.proficiencies ?? [])
  }

  totals.resistances = dedupUnion(...resistanceLists)
  totals.immunities = dedupUnion(...immunityLists)
  totals.vulnerabilities = dedupUnion(...vulnerabilityLists)
  totals.conditionImmunities = dedupUnion(...conditionImmunityLists)
  totals.languages = dedupUnion(...languageLists)
  totals.proficiencies = dedupUnion(...proficiencyLists)

  return totals
}

export interface EquipmentSkillEffectTotals {
  advantage: Partial<Record<keyof Skills, string[]>>
  disadvantage: Partial<Record<keyof Skills, string[]>>
}

// Skill advantage/disadvantage applies whenever an item is equipped, regardless of magic status —
// unlike every field in EquipmentModifierTotals above, which is gated by isItemModifierActive()
// (magic + attunement). A mundane suit of Chainmail must still impose Stealth disadvantage.
export function getEquipmentSkillEffectTotals(equipment: Equipment[] | undefined): EquipmentSkillEffectTotals {
  const totals: EquipmentSkillEffectTotals = { advantage: {}, disadvantage: {} }
  for (const item of equipment ?? []) {
    if (!item.equipped || !item.modifiers) continue
    for (const skill of item.modifiers.skillAdvantage ?? []) {
      (totals.advantage[skill] ??= []).push(item.name)
    }
    for (const skill of item.modifiers.skillDisadvantage ?? []) {
      (totals.disadvantage[skill] ??= []).push(item.name)
    }
  }
  return totals
}

export interface FeatureEffectTotals {
  spellcastingAbility?: keyof AbilityScores
  spellcastingAbilitySource?: string
  hitDiceSize?: number
  hitDiceSizeSource?: string
  hitDiceSizeSourceFeatureId?: string
  hitPointsMode?: HitPointsMode
  hitPointsFlatValue?: number
  hitPointsPerLevelAmount?: number
  hitPointsRolledLevels?: number[]
  size?: string
  sizeSource?: string
  savingThrowProficiencies: Partial<Record<keyof AbilityScores, string>>
  skillProficiencies: Partial<Record<keyof Skills, { expertise: boolean; source: string }>>
  skillAdvantageGrants: Partial<Record<keyof Skills, string[]>>
  skillDisadvantageGrants: Partial<Record<keyof Skills, string[]>>
  /** Proficiency/resistance/etc. name -> name of the granting feature (first source wins). */
  otherProficiencies: Record<string, string>
  resistances: Record<string, string>
  immunities: Record<string, string>
  vulnerabilities: Record<string, string>
  conditionImmunities: Record<string, string>
  languages: Record<string, string>
  senses: Record<SenseType, number>
  senseGrants: Record<SenseType, SourcedBonus[]>
  abilityScores: Record<keyof AbilityScores, number>
  abilityScoreGrants: Record<keyof AbilityScores, SourcedBonus[]>
  abilityScoreFloors: Partial<Record<keyof AbilityScores, number>>
  abilityScoreFloorSources: Partial<Record<keyof AbilityScores, string>>
  abilityScoreMaxCaps: Partial<Record<keyof AbilityScores, number>>
  abilityScoreMaxCapSources: Partial<Record<keyof AbilityScores, string>>
  abilityScoreBaseMax: Partial<Record<keyof AbilityScores, number>>
  abilityScoreBaseMaxSources: Partial<Record<keyof AbilityScores, string>>
  /**
   * Movement fields are last-source-wins overrides, not additive bonuses, unlike every other
   * numeric field here — a species's walking/fly/swim/climb/burrow speed is an absolute
   * characteristic (e.g. "Dwarves have a speed of 25 ft"), not a "+X ft" bonus. Summing it with
   * the character's own `speed` (which already defaults to 30, representing a Medium species'
   * baseline) would double-count. Equipment bonuses on top of this remain additive (see
   * getEffectiveMovementSpeeds) since gear genuinely does grant incremental bonuses.
   */
  speed?: number
  speedSource?: string
  flySpeed?: number
  flySpeedSource?: string
  swimSpeed?: number
  swimSpeedSource?: string
  climbSpeed?: number
  climbSpeedSource?: string
  burrowSpeed?: number
  burrowSpeedSource?: string
  carryingCapacityBonus: number
  carryingCapacityMultiplier: number
  hpBonusPerLevel: number
  hpBonusPerLevelGrants: SourcedBonus[]
  /** How many slots of each level the character has, summed over its Spellcasting features. */
  spellSlots: Record<SpellSlotLevel, number>
  /** How many spells the character can prepare, summed over its Prepared Spells features; 0 with none. */
  preparedSpells: number
  preparedSpellsGrants: SourcedBonus[]
  /** The levels at which the character gains an Ability Score Improvement or a feat, ascending, from its Ability Score Improvement features. */
  abilityScoreImprovementLevels: number[]
}

export const SPELL_SLOT_LEVELS: readonly SpellSlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const ZERO_SPELL_SLOTS: Record<SpellSlotLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }

/** A spell slot level as it's read aloud: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th". */
export function ordinal(level: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = level % 100
  return level + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0])
}

// Every tier whose level threshold has been reached, oldest first — not just the highest one.
// getActiveFeatureEffects folds over all of them so a feature's tiers accumulate (an ability score
// bonus at level 1 plus another at level 4 sum to both, a proficiency granted at level 1 survives a
// different one granted at level 6), while getActiveLevelEffect below still exposes just the final
// entry for callers that only care about the feature's current single-fact state (e.g. hit die size).
function getQualifyingLevelEffects(feature: Feature, level: number): FeatureEffects[] {
  return (feature.levelEffects ?? [])
    .filter((tier) => tier.level <= level)
    .sort((a, b) => a.level - b.level)
    .map((tier) => tier.effects)
}

/**
 * Whether a tier sets how Max HP is calculated (a Hit Points feature's mode and its values). The
 * last qualifying tier that does is the one calculateMaxHitPoints reads (see getActiveFeatureEffects).
 */
export function setsMaxHitPoints(effects: FeatureEffects): boolean {
  return effects.hitPointsMode != null ||
    effects.hitPointsFlatValue != null ||
    effects.hitPointsPerLevelAmount != null ||
    (effects.hitPointsRolledLevels?.length ?? 0) > 0
}

export function getActiveLevelEffect(feature: Feature, level: number): FeatureEffects | undefined {
  const tiers = getQualifyingLevelEffects(feature, level)
  return tiers.length > 0 ? tiers[tiers.length - 1] : undefined
}

type FeatureEffectCharacter = Pick<Character, "classFeatures" | "speciesTraits" | "feats" | "backgroundFeatures"> & Partial<Pick<Character, "level">>

export function getActiveFeatureEffects(character: FeatureEffectCharacter): FeatureEffectTotals {
  const totals: FeatureEffectTotals = {
    savingThrowProficiencies: {},
    skillProficiencies: {},
    skillAdvantageGrants: {},
    skillDisadvantageGrants: {},
    otherProficiencies: {},
    resistances: {},
    immunities: {},
    vulnerabilities: {},
    conditionImmunities: {},
    languages: {},
    senses: { ...ZERO_SENSES },
    senseGrants: { darkvision: [], blindsight: [], tremorsense: [], truesight: [] },
    abilityScores: { ...ZERO_ABILITY_SCORES },
    abilityScoreGrants: { strength: [], dexterity: [], constitution: [], intelligence: [], wisdom: [], charisma: [] },
    abilityScoreFloors: {},
    abilityScoreFloorSources: {},
    abilityScoreMaxCaps: {},
    abilityScoreMaxCapSources: {},
    abilityScoreBaseMax: {},
    abilityScoreBaseMaxSources: {},
    carryingCapacityBonus: 0,
    carryingCapacityMultiplier: 1,
    hpBonusPerLevel: 0,
    hpBonusPerLevelGrants: [],
    spellSlots: { ...ZERO_SPELL_SLOTS },
    preparedSpells: 0,
    preparedSpellsGrants: [],
    abilityScoreImprovementLevels: [],
  }
  const level = character.level ?? 1

  for (const features of [safeFeatures(character.classFeatures), safeFeatures(character.speciesTraits), safeFeatures(character.feats), safeFeatures(character.backgroundFeatures)]) {
    for (const feature of features) {
      const tiers = getQualifyingLevelEffects(feature, level)
      if (tiers.length === 0) continue

      const sourceLabel = featureSourceLabel(feature)

      for (const effects of tiers) {
        if (effects.spellcastingAbility) {
          totals.spellcastingAbility = effects.spellcastingAbility
          totals.spellcastingAbilitySource = sourceLabel
        }
        if (effects.hitDiceSize) {
          totals.hitDiceSize = effects.hitDiceSize
          totals.hitDiceSizeSource = sourceLabel
          totals.hitDiceSizeSourceFeatureId = feature.id
        }
        if (setsMaxHitPoints(effects)) {
          totals.hitPointsMode = effects.hitPointsMode
          totals.hitPointsFlatValue = effects.hitPointsFlatValue
          totals.hitPointsPerLevelAmount = effects.hitPointsPerLevelAmount
          totals.hitPointsRolledLevels = effects.hitPointsRolledLevels
        }
        for (const asiLevel of effects.abilityScoreImprovementLevels ?? []) {
          if (!totals.abilityScoreImprovementLevels.includes(asiLevel)) totals.abilityScoreImprovementLevels.push(asiLevel)
        }
        if (effects.size) {
          totals.size = effects.size
          totals.sizeSource = sourceLabel
        }
        for (const ability of effects.savingThrowProficiencies ?? []) {
          if (!totals.savingThrowProficiencies[ability]) {
            totals.savingThrowProficiencies[ability] = sourceLabel
          }
        }
        for (const grant of effects.skillProficiencies ?? []) {
          const existing = totals.skillProficiencies[grant.skill]
          totals.skillProficiencies[grant.skill] = {
            expertise: (existing?.expertise ?? false) || !!grant.expertise,
            source: existing?.source ?? sourceLabel,
          }
        }
        for (const skill of effects.skillAdvantage ?? []) {
          (totals.skillAdvantageGrants[skill] ??= []).push(sourceLabel)
        }
        for (const skill of effects.skillDisadvantage ?? []) {
          (totals.skillDisadvantageGrants[skill] ??= []).push(sourceLabel)
        }
        for (const prof of effects.otherProficiencies ?? []) {
          if (!totals.otherProficiencies[prof]) {
            totals.otherProficiencies[prof] = sourceLabel
          }
        }
        for (const r of effects.resistances ?? []) {
          if (!totals.resistances[r]) totals.resistances[r] = sourceLabel
        }
        for (const i of effects.immunities ?? []) {
          if (!totals.immunities[i]) totals.immunities[i] = sourceLabel
        }
        for (const v of effects.vulnerabilities ?? []) {
          if (!totals.vulnerabilities[v]) totals.vulnerabilities[v] = sourceLabel
        }
        for (const c of effects.conditionImmunities ?? []) {
          if (!totals.conditionImmunities[c]) totals.conditionImmunities[c] = sourceLabel
        }
        for (const l of effects.languages ?? []) {
          if (!totals.languages[l]) totals.languages[l] = sourceLabel
        }
        for (const sense of SENSE_TYPES) {
          const senseAmount = Number(effects.senses?.[sense] ?? 0)
          if (senseAmount) {
            totals.senses[sense] += senseAmount
            totals.senseGrants[sense].push({ source: sourceLabel, amount: senseAmount })
          }
        }
        for (const ability of ABILITY_KEYS) {
          const abilityAmount = Number(effects.abilityScores?.[ability] ?? 0)
          if (abilityAmount) {
            totals.abilityScores[ability] += abilityAmount
            totals.abilityScoreGrants[ability].push({ source: sourceLabel, amount: abilityAmount })
          }
          if (effects.abilityScoreFloors?.[ability] != null && effects.abilityScoreFloors[ability]! > (totals.abilityScoreFloors[ability] ?? -Infinity)) {
            totals.abilityScoreFloors[ability] = effects.abilityScoreFloors[ability]
            totals.abilityScoreFloorSources[ability] = sourceLabel
          }
          if (effects.abilityScoreMaxCaps?.[ability] != null && effects.abilityScoreMaxCaps[ability]! < (totals.abilityScoreMaxCaps[ability] ?? Infinity)) {
            totals.abilityScoreMaxCaps[ability] = effects.abilityScoreMaxCaps[ability]
            totals.abilityScoreMaxCapSources[ability] = sourceLabel
          }
          if (effects.abilityScoreBaseMax?.[ability] != null && effects.abilityScoreBaseMax[ability]! > (totals.abilityScoreBaseMax[ability] ?? -Infinity)) {
            totals.abilityScoreBaseMax[ability] = effects.abilityScoreBaseMax[ability]
            totals.abilityScoreBaseMaxSources[ability] = sourceLabel
          }
        }
        if (effects.speed != null) { totals.speed = effects.speed; totals.speedSource = sourceLabel }
        if (effects.flySpeed != null) { totals.flySpeed = effects.flySpeed; totals.flySpeedSource = sourceLabel }
        if (effects.swimSpeed != null) { totals.swimSpeed = effects.swimSpeed; totals.swimSpeedSource = sourceLabel }
        if (effects.climbSpeed != null) { totals.climbSpeed = effects.climbSpeed; totals.climbSpeedSource = sourceLabel }
        if (effects.burrowSpeed != null) { totals.burrowSpeed = effects.burrowSpeed; totals.burrowSpeedSource = sourceLabel }
        totals.carryingCapacityBonus += Number(effects.carryingCapacityBonus ?? 0)
        if (effects.carryingCapacityMultiplier != null) {
          totals.carryingCapacityMultiplier = Math.max(totals.carryingCapacityMultiplier, effects.carryingCapacityMultiplier)
        }
        // Safe to fold over every qualifying tier like every other field here only because the
        // Features UI (features-module.tsx's SINGLE_EFFECT_TYPES) restricts "Max HP Bonus" to a
        // single tier — its value is scaled again later in calculateMaxHitPoints (× total character
        // level), so a feature with more than one qualifying hpBonusPerLevel tier would push
        // multiple grants and get double/triple-multiplied instead of contributing one
        // flat-then-scaled rate. Not enforced at this layer — a hand-edited/imported Feature with
        // two such tiers would hit this, since raw character JSON is never schema-validated.
        const hpBonusPerLevelAmount = Number(effects.hpBonusPerLevel ?? 0)
        if (hpBonusPerLevelAmount) {
          totals.hpBonusPerLevel += hpBonusPerLevelAmount
          totals.hpBonusPerLevelGrants.push({ source: sourceLabel, amount: hpBonusPerLevelAmount })
        }
      }

      // Not folded like the rest: each Spellcasting tier is a whole row of the slot table, so only the
      // highest one reached counts (tiers are in level order), and a row without slots gives none.
      // Separate features still add up.
      const highestTier = tiers[tiers.length - 1]
      const slotRow = highestTier.spellSlots
      for (const slotLevel of SPELL_SLOT_LEVELS) {
        totals.spellSlots[slotLevel] += Math.max(0, Number(slotRow?.[slotLevel] ?? 0))
      }
      // The same for Prepared Spells: each tier is a row of the class's table
      const prepared = Math.max(0, Number(highestTier.preparedSpells ?? 0))
      if (prepared) {
        totals.preparedSpells += prepared
        totals.preparedSpellsGrants.push({ source: sourceLabel, amount: prepared })
      }
    }
  }

  totals.abilityScoreImprovementLevels.sort((a, b) => a - b)
  return totals
}

export interface SpellSlotState {
  total: number
  used: number
}

/**
 * The character's spell slots at each level: how many its Spellcasting features give it, and how
 * many of those are spent. A spent count above the total (the feature was edited, or the character's
 * level lowered) counts as all of them spent.
 */
export function getSpellSlots(
  character: FeatureEffectCharacter & Pick<Character, "spentSpellSlots">,
): Record<SpellSlotLevel, SpellSlotState> {
  const totals = getActiveFeatureEffects(character).spellSlots
  const slots = {} as Record<SpellSlotLevel, SpellSlotState>
  for (const slotLevel of SPELL_SLOT_LEVELS) {
    const total = totals[slotLevel]
    slots[slotLevel] = { total, used: Math.min(total, Math.max(0, character.spentSpellSlots?.[slotLevel] ?? 0)) }
  }
  return slots
}

/**
 * How many spells the character can prepare, from its Prepared Spells features, and the tooltip
 * naming each one, e.g. "4 (Prepared Spells Class Feature) + 2 (Magic Initiate Feat)". Undefined
 * when no Prepared Spells feature applies at the character's level.
 */
export function getPreparedSpellsLimit(character: FeatureEffectCharacter): { total: number; breakdown: string } | undefined {
  const { preparedSpells, preparedSpellsGrants } = getActiveFeatureEffects(character)
  if (preparedSpellsGrants.length === 0) return undefined
  const [first, ...rest] = preparedSpellsGrants
  const breakdown = `${first.amount} (${first.source})` + rest.map((grant) => formatTerm(grant.amount, grant.source)).join("")
  return { total: preparedSpells, breakdown }
}

/** The character with `used` of its slots of `slotLevel` spent. */
export function withSpentSpellSlots(character: Character, slotLevel: SpellSlotLevel, used: number): Character {
  return { ...character, spentSpellSlots: { ...character.spentSpellSlots, [slotLevel]: Math.max(0, used) } }
}

const FEATURE_LIST_BY_KIND: Record<FeatureKind, FeatureListField> = {
  "class-feature": "classFeatures",
  "species-trait": "speciesTraits",
  "background": "backgroundFeatures",
  "feat": "feats",
}

/** The list a feature of this kind lives in. */
export function featureListField(kind: FeatureKind): FeatureListField {
  return FEATURE_LIST_BY_KIND[kind]
}

/** The name a new Spellcasting feature starts with. */
export const SPELLCASTING_FEATURE_NAME = "Spellcasting & Spell Slots"

/** Whether any of the feature's rows gives a spell slot. */
export function givesSpellSlots(feature: Feature): boolean {
  return (feature.levelEffects ?? []).some((tier) => Object.values(tier.effects.spellSlots ?? {}).some((count) => (count ?? 0) > 0))
}

/**
 * The feature the Spells module's Edit Slots button opens, in the Features tab's order: the first
 * Spellcasting feature giving slots, else the first Spellcasting class feature (a species trait or
 * feat granting only a spellcasting ability isn't where a class's slots go).
 */
export function findSpellcastingFeature(character: FeatureEffectCharacter): Feature | undefined {
  const spellcasting = Object.values(FEATURE_LIST_BY_KIND)
    .flatMap((field) => safeFeatures(character[field]))
    .filter((feature) => feature.featureType === "Spellcasting")
  return spellcasting.find(givesSpellSlots) ?? spellcasting.find((feature) => feature.source === "class-feature")
}

/** The highest character level the sheet supports. */
export const MAX_CHARACTER_LEVEL = 20

/** A level within 1–MAX_CHARACTER_LEVEL: a character's level, or the level a feature row applies from. */
export function clampCharacterLevel(level: number): number {
  return Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level) || 1))
}

/**
 * A Spellcasting Class Feature giving this ability and these slots from `level` on: what
 * spellcasting from outside the Features tab becomes. Either may be absent.
 */
export function makeSpellcastingFeature(
  effects: Pick<FeatureEffects, "spellcastingAbility" | "spellSlots">,
  level: number,
  description: string,
): Feature {
  return {
    id: crypto.randomUUID(),
    name: SPELLCASTING_FEATURE_NAME,
    description,
    source: "class-feature",
    featureType: "Spellcasting",
    levelEffects: [{
      level: clampCharacterLevel(level),
      effects: {
        ...(effects.spellcastingAbility ? { spellcastingAbility: effects.spellcastingAbility } : {}),
        ...(effects.spellSlots ? { spellSlots: effects.spellSlots } : {}),
      },
    }],
  }
}

/**
 * The character with `feature` saved: replacing the feature with its id in whichever list holds it,
 * or, when no list does, added at the end of the list for its source.
 */
export function withFeatureSaved(character: Character, feature: Feature): Character {
  const next = { ...character }
  let found = false
  for (const field of Object.values(FEATURE_LIST_BY_KIND)) {
    const list = safeFeatures(character[field])
    if (!list.some((f) => f.id === feature.id)) continue
    next[field] = list.map((f) => (f.id === feature.id ? feature : f))
    found = true
  }
  if (!found) {
    const field = featureListField(feature.source)
    next[field] = [...safeFeatures(character[field]), feature]
  }
  return next
}

// Spellcasting ability is only ever set via a Class Feature/Species Trait/Feat grant — the raw
// `character.spellcastingAbility` field is legacy/import metadata and is never consulted here, so
// removing the granting feature always fully clears it from every calculation.
export function getEffectiveSpellcastingAbility(
  character: Pick<Character, "classFeatures" | "speciesTraits" | "feats" | "level">
): keyof AbilityScores | "" {
  return getActiveFeatureEffects(character).spellcastingAbility ?? ""
}

// Hit die size is only ever set via a Class Feature/Trait/Feat grant — no fallback to the raw
// `character.hitDiceSize` or `character.hitDice` fields, both legacy/import metadata with no
// editing surface of their own. Returns undefined when nothing currently grants one; callers must
// treat that as "no valid hit die" rather than guessing a default.
export function getEffectiveHitDiceSize(
  character: Pick<Character, "classFeatures" | "speciesTraits" | "feats" | "level">
): number | undefined {
  return getActiveFeatureEffects(character).hitDiceSize
}

export function getEffectiveSavingThrowProficiency(
  character: Pick<Character, "savingThrows" | "classFeatures" | "speciesTraits" | "feats" | "level">,
  ability: keyof AbilityScores,
): { proficient: boolean; granted: boolean; grantedBy?: string } {
  const own = character.savingThrows?.[ability] ?? false
  const grantedBy = getActiveFeatureEffects(character).savingThrowProficiencies[ability]
  return { proficient: own || !!grantedBy, granted: !!grantedBy, grantedBy }
}

export function getEffectiveSkillProficiency(
  character: Pick<Character, "skills" | "classFeatures" | "speciesTraits" | "feats" | "level">,
  skill: keyof Skills,
): { proficient: boolean; expertise: boolean; granted: boolean; expertiseGranted: boolean; grantedBy?: string } {
  const own = character.skills?.[skill]
  const grant = getActiveFeatureEffects(character).skillProficiencies[skill]
  return {
    proficient: (own?.proficient ?? false) || !!grant,
    expertise: (own?.expertise ?? false) || (grant?.expertise ?? false),
    granted: !!grant,
    expertiseGranted: !!grant?.expertise,
    grantedBy: grant?.source,
  }
}

export type SkillAdvantageState = "advantage" | "disadvantage" | "none"

export interface EffectiveSkillAdvantage {
  state: SkillAdvantageState
  isManualOverride: boolean
  advantageSources: string[]
  disadvantageSources: string[]
}

// A manually-set advantage/disadvantage on the skill itself always wins outright, regardless of
// what equipment or features say (e.g. a player fighting blind overrides a mundane Stealth
// disadvantage from armor). Only when neither is manually set do pooled equipment + feature
// sources apply, and per 5e's stacking rule, an advantage source and a disadvantage source cancel
// each other out to "none" rather than combining.
export function getEffectiveSkillAdvantage(
  character: Pick<Character, "skills" | "equipment" | "classFeatures" | "speciesTraits" | "feats" | "level">,
  skill: keyof Skills,
): EffectiveSkillAdvantage {
  const own = character.skills?.[skill]
  const manualAdvantage = own?.advantage ?? false
  const manualDisadvantage = own?.disadvantage ?? false

  const equipTotals = getEquipmentSkillEffectTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const advantageSources = [...(equipTotals.advantage[skill] ?? []), ...(featureTotals.skillAdvantageGrants[skill] ?? [])]
  const disadvantageSources = [...(equipTotals.disadvantage[skill] ?? []), ...(featureTotals.skillDisadvantageGrants[skill] ?? [])]

  if (manualAdvantage || manualDisadvantage) {
    return {
      state: manualAdvantage ? "advantage" : "disadvantage",
      isManualOverride: true,
      advantageSources,
      disadvantageSources,
    }
  }

  const hasAdvantage = advantageSources.length > 0
  const hasDisadvantage = disadvantageSources.length > 0
  const state: SkillAdvantageState = hasAdvantage && hasDisadvantage ? "none" : hasAdvantage ? "advantage" : hasDisadvantage ? "disadvantage" : "none"

  return { state, isManualOverride: false, advantageSources, disadvantageSources }
}

// abilityScores and equipment are optional because the calculations already fall back when they
// are missing (a base score of 10, no items), which character-migrations.ts relies on for records
// saved before those fields were guaranteed.
type AbilityScoreCharacter = Partial<Pick<Character, "abilityScores" | "equipment">>
  & Pick<Character, "abilityScoreOverrides" | "useCalculatedAbilityScores">
  & FeatureEffectCharacter

function getCalculatedAbilityScoreFromTotals(
  character: AbilityScoreCharacter,
  ability: keyof AbilityScores,
  itemTotals: EquipmentModifierTotals,
  featureTotals: FeatureEffectTotals,
): number {
  const base = Number(character.abilityScores?.[ability] ?? 10)
  const itemBonus = itemTotals.abilityScores[ability]
  const featureBonus = featureTotals.abilityScores[ability]
  const floor = Math.max(itemTotals.abilityScoreFloors[ability] ?? -Infinity, featureTotals.abilityScoreFloors[ability] ?? -Infinity)
  const cap = Math.min(itemTotals.abilityScoreMaxCaps[ability] ?? Infinity, featureTotals.abilityScoreMaxCaps[ability] ?? Infinity)
  return Math.min(Math.max(base + itemBonus + featureBonus, floor), cap)
}

function getEffectiveAbilityScoreFromTotals(
  character: AbilityScoreCharacter,
  ability: keyof AbilityScores,
  itemTotals: EquipmentModifierTotals,
  featureTotals: FeatureEffectTotals,
): number {
  const calculated = getCalculatedAbilityScoreFromTotals(character, ability, itemTotals, featureTotals)
  return isAbilityScoreCalculated(character, ability) ? calculated : (character.abilityScoreOverrides?.[ability] ?? calculated)
}

/** Whether the sheet shows the calculated score for this ability, as it does when no toggle is stored. */
export function isAbilityScoreCalculated(character: Pick<Character, "useCalculatedAbilityScores">, ability: keyof AbilityScores): boolean {
  return character.useCalculatedAbilityScores?.[ability] ?? true
}

export function getCalculatedAbilityScore(character: AbilityScoreCharacter, ability: keyof AbilityScores): number {
  return getCalculatedAbilityScoreFromTotals(character, ability, getEquipmentModifierTotals(character.equipment), getActiveFeatureEffects(character))
}

export function getEffectiveAbilityScore(character: AbilityScoreCharacter, ability: keyof AbilityScores): number {
  return getEffectiveAbilityScoreFromTotals(character, ability, getEquipmentModifierTotals(character.equipment), getActiveFeatureEffects(character))
}

// Governs only the editable base ability score (the normal advancement ceiling of 20, raised by
// Epic Boons/capstones/homebrew feature grants) — it must never be applied to the effective score,
// which item bonuses and floors/caps can legitimately push past 20 without any exception.
export function getAbilityScoreBaseMax(character: FeatureEffectCharacter, ability: keyof AbilityScores): number {
  return Math.max(DEFAULT_ABILITY_SCORE_MAX, getActiveFeatureEffects(character).abilityScoreBaseMax[ability] ?? -Infinity)
}

export function getEffectiveAbilityScores(character: AbilityScoreCharacter): AbilityScores {
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const result = {} as AbilityScores
  for (const ability of ABILITY_KEYS) {
    result[ability] = getEffectiveAbilityScoreFromTotals(character, ability, itemTotals, featureTotals)
  }
  return result
}

export function getPassiveScore(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean,
): number {
  return 10 + getSkillModifier(abilityScore, proficiencyBonus, isProficient, hasExpertise)
}

type SensesCharacter = Partial<Pick<Character, "equipment">> & FeatureEffectCharacter

// No fallback to a hardcoded base — like getEffectiveMovementSpeeds, a sense only has a real
// answer once a Species Trait or item grants it. character.senses is never read here; it's
// purely the custom-override storage field, analogous to character.speed.
export function getEffectiveSenses(character: SensesCharacter): Record<SenseType, number> {
  const itemTotals = getEquipmentModifierTotals(character.equipment).senses
  const featureTotals = getActiveFeatureEffects(character).senses
  const result = {} as Record<SenseType, number>
  for (const sense of SENSE_TYPES) {
    result[sense] = itemTotals[sense] + featureTotals[sense]
  }
  return result
}

/** Whether the sheet shows the calculated range for this sense, as it does when no toggle is stored. */
export function isSenseCalculated(character: Pick<Character, "useCalculatedSenses">, sense: SenseType): boolean {
  return character.useCalculatedSenses?.[sense] ?? true
}

/** The range the player entered for this sense: what the sheet shows while it is custom. */
export function getCustomSense(character: Pick<Character, "senses">, sense: SenseType): number {
  return character.senses?.[sense] ?? 0
}

export interface MovementSpeeds {
  walk: number
  fly: number
  swim: number
  climb: number
  burrow: number
}

type MovementCharacter = Partial<Pick<Character, "equipment">> & FeatureEffectCharacter

// No fallback to a hardcoded "30 ft" baseline — a species's walking speed only has a real answer
// once a Species Trait (or, failing that, a manual custom override — see useCalculatedSpeed in
// combat-stats-module.tsx) provides one, exactly like getEffectiveSpellcastingAbility/
// getEffectiveHitDiceSize have no fallback either. `character.speed`/`flySpeed`/etc. are never
// read here; they're purely the custom-override storage fields, analogous to how
// calculateEquippedAC never reads the raw `character.armorClass`.
export function getEffectiveMovementSpeeds(character: MovementCharacter): MovementSpeeds {
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  return {
    walk: (featureTotals.speed ?? 0) + itemTotals.speed,
    fly: (featureTotals.flySpeed ?? 0) + itemTotals.flySpeed,
    swim: (featureTotals.swimSpeed ?? 0) + itemTotals.swimSpeed,
    climb: (featureTotals.climbSpeed ?? 0) + itemTotals.climbSpeed,
    burrow: (featureTotals.burrowSpeed ?? 0) + itemTotals.burrowSpeed,
  }
}

export interface MovementSpeedGrants {
  walk?: string
  fly?: string
  swim?: string
  climb?: string
  burrow?: string
}

/** Which of the character's movement speeds are currently granted by a feature, and by what — used to explain the calculated value in a tooltip. */
export function getMovementSpeedGrants(character: FeatureEffectCharacter): MovementSpeedGrants {
  const totals = getActiveFeatureEffects(character)
  return {
    walk: totals.speedSource,
    fly: totals.flySpeedSource,
    swim: totals.swimSpeedSource,
    climb: totals.climbSpeedSource,
    burrow: totals.burrowSpeedSource,
  }
}

export interface EffectiveGrantList {
  own: string[]
  granted: string[]
}

export interface EffectiveProficiencyList extends EffectiveGrantList {
  /** For each granted value: the granting feature's name, or "equipment" if granted by gear. */
  grantedBy: Record<string, string>
}

function mergeGrantList(
  own: string[] | undefined,
  itemGranted: string[],
  featureGranted: Record<string, string>,
): EffectiveProficiencyList {
  const ownList = own ?? []
  const granted = dedupUnion(itemGranted, Object.keys(featureGranted)).filter((v) => !ownList.includes(v))
  const grantedBy: Record<string, string> = {}
  for (const v of granted) {
    // Prefer the feature as the attributed source when a value is granted by both — it's more
    // specific/actionable in a tooltip than the generic "equipment" label, and doesn't disappear
    // from the tooltip if the item granting it is later unequipped while the feature still applies.
    grantedBy[v] = featureGranted[v] ?? "equipment"
  }
  return { own: ownList, granted, grantedBy }
}

export function getEffectiveConditionImmunities(
  character: Pick<Character, "conditionImmunities" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).conditionImmunities
  const featureGranted = getActiveFeatureEffects(character).conditionImmunities
  return mergeGrantList(character.conditionImmunities, itemGranted, featureGranted)
}

export function getEffectiveDamageResistances(
  character: Pick<Character, "damageResistances" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).resistances
  const featureGranted = getActiveFeatureEffects(character).resistances
  return mergeGrantList(character.damageResistances, itemGranted, featureGranted)
}

export function getEffectiveDamageImmunities(
  character: Pick<Character, "damageImmunities" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).immunities
  const featureGranted = getActiveFeatureEffects(character).immunities
  return mergeGrantList(character.damageImmunities, itemGranted, featureGranted)
}

export function getEffectiveDamageVulnerabilities(
  character: Pick<Character, "damageVulnerabilities" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).vulnerabilities
  const featureGranted = getActiveFeatureEffects(character).vulnerabilities
  return mergeGrantList(character.damageVulnerabilities, itemGranted, featureGranted)
}

export function getEffectiveLanguages(
  character: Pick<Character, "languages" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).languages
  const featureGranted = getActiveFeatureEffects(character).languages
  return mergeGrantList(character.languages, itemGranted, featureGranted)
}

export function getEffectiveProficiencies(
  character: Pick<Character, "otherProficiencies" | "equipment"> & FeatureEffectCharacter
): EffectiveProficiencyList {
  const itemGranted = getEquipmentModifierTotals(character.equipment).proficiencies
  const featureGranted = getActiveFeatureEffects(character).otherProficiencies
  return mergeGrantList(character.otherProficiencies, itemGranted, featureGranted)
}

type CarryingCapacityCharacter = AbilityScoreCharacter & FeatureEffectCharacter

export function getCarryingCapacityBreakdown(character: CarryingCapacityCharacter): { capacity: number; breakdown: string } {
  const strengthScore = getEffectiveAbilityScore(character, "strength")
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const bonus = itemTotals.carryingCapacityBonus + featureTotals.carryingCapacityBonus
  const multiplier = Math.max(itemTotals.carryingCapacityMultiplier, featureTotals.carryingCapacityMultiplier)
  const capacity = Math.floor((strengthScore * 15 + bonus) * multiplier)

  let breakdown = `${strengthScore} (${ABILITY_TITLE_CASE.strength}) × 15`
  breakdown += formatBonusTerm(bonus, "item/feature bonus")
  if (multiplier !== 1) breakdown = `(${breakdown}) × ${multiplier} (multiplier)`

  return { capacity, breakdown }
}

export function getEffectiveCarryingCapacity(character: CarryingCapacityCharacter): number {
  return getCarryingCapacityBreakdown(character).capacity
}

// No fallback to a hardcoded "Medium" default — like getEffectiveMovementSpeeds, this is purely
// what the Species Trait system says (empty string if nothing grants a size yet). Size is only ever
// granted by a Species Trait; a character has no size of its own.
export function getEffectiveSize(character: FeatureEffectCharacter): { size: string; source?: string } {
  const featureTotals = getActiveFeatureEffects(character)
  return { size: featureTotals.size ?? "", source: featureTotals.sizeSource }
}

/** A Species Trait granting a size: what a size from outside the Features tab becomes. */
export function makeSizeTrait(size: string, description: string): Feature {
  return {
    id: crypto.randomUUID(),
    name: "Size",
    description,
    source: "species-trait",
    featureType: "Size",
    levelEffects: [{ level: 1, effects: { size } }],
  }
}

/**
 * The tooltip of a value a Species Trait grants — a speed or the size — in the "value (Source)"
 * form every calculated value uses. A speed is given in feet.
 */
export function speciesGrantTooltip(value: number | string, source: string | undefined): string {
  if (!source) return "No species trait grants this — add one in Features, or switch to custom entry"
  const formatted = typeof value === "number" ? `${value} ft` : value
  return `${formatted} (${source})`
}

type BaseHitPointsCharacter = Partial<Pick<Character, "abilityScores" | "equipment">> & Pick<Character, "abilityScoreOverrides" | "useCalculatedAbilityScores"> & FeatureEffectCharacter

// A "Hit Points" Class Feature is the only source of a calculated base, via one of three
// DM-chosen modes (FeatureEffects.hitPointsMode, defaulting to 'per-level' for legacy data that
// predates this field): 'flat' (one fixed total, applied once, no CON), 'per-level' (5e-standard
// math — max die + CON at level 1, then a fixed per-level amount + CON, defaulting to the die's
// mathematical average when not overridden), or 'rolled' (a per-level list of actually-recorded
// values, CON added per entry, missing levels contribute 0 and are flagged rather than guessed).
// Each hpBonusPerLevel-granting feature (e.g. Dwarven Toughness) is named individually in the
// breakdown and stacks on top of all three modes identically. Never reads hitPoints.maximum — like
// calculateEquippedAC never reads character.armorClass, this is the fully-independent "calculated"
// side of the Maximum HP CalculatedValue field in combat-stats-module.tsx.
export function calculateMaxHitPoints(character: BaseHitPointsCharacter): { hp: number; breakdown: string } {
  const featureTotals = getActiveFeatureEffects(character)
  const hitDiceSize = featureTotals.hitDiceSize
  const mode: HitPointsMode = featureTotals.hitPointsMode ?? 'per-level'
  const level = character.level ?? 1
  const abilityScoreCharacter: AbilityScoreCharacter = { ...character, abilityScores: character.abilityScores ?? ({} as AbilityScores), equipment: character.equipment ?? [] }
  const conMod = getAbilityModifier(getEffectiveAbilityScore(abilityScoreCharacter, "constitution"))

  let hp: number
  let breakdown: string

  if (mode === 'flat') {
    hp = featureTotals.hitPointsFlatValue ?? 0
    breakdown = `${hp} (Fixed Hit Points)`
  } else if (mode === 'rolled') {
    const rolls = featureTotals.hitPointsRolledLevels ?? []
    const terms: string[] = []
    const missing: number[] = []
    hp = 0
    for (let lvl = 1; lvl <= level; lvl++) {
      const amount = rolls[lvl - 1]
      // 0 (or a missing index) means "not yet recorded" — a real die roll is always >= 1.
      if (!amount) { missing.push(lvl); continue }
      const total = amount + conMod
      hp += total
      terms.push(`${total} (Level ${lvl}: ${amount}${formatTerm(conMod, "Constitution")})`)
    }
    breakdown = terms.length > 0 ? terms.join(" + ") : "No rolled HP entered yet"
    if (missing.length > 0) {
      breakdown += ` — missing roll${missing.length > 1 ? "s" : ""} for level${missing.length > 1 ? "s" : ""} ${missing.join(", ")} (contributing 0 until entered)`
    }
  } else {
    if (!hitDiceSize) {
      return { hp: 0, breakdown: "No class feature grants a Hit Die — add one in Features, or switch to custom entry" }
    }
    const perLevelAverage = Math.floor(hitDiceSize / 2) + 1
    const perLevelAmount = featureTotals.hitPointsPerLevelAmount ?? perLevelAverage
    const additionalLevels = level - 1

    breakdown = `${hitDiceSize} (Level 1 d${hitDiceSize} Hit Die)${formatTerm(conMod, "Constitution")}`
    if (additionalLevels > 0) {
      const perLevelLabel = featureTotals.hitPointsPerLevelAmount != null ? `${perLevelAmount} HP/level` : `${perLevelAmount} avg d${hitDiceSize}`
      breakdown += ` + ${additionalLevels} × (${perLevelLabel}${formatTerm(conMod, "Constitution")})`
    }
    hp = hitDiceSize + conMod + additionalLevels * (perLevelAmount + conMod)
  }

  for (const grant of featureTotals.hpBonusPerLevelGrants) {
    const amount = grant.amount * level
    hp += amount
    breakdown += formatBonusTerm(amount, grant.source)
  }

  return { hp, breakdown }
}

type MaxHpCharacter = { hitPoints?: { maximum?: number; temporaryMaximum?: number }; useCalculatedMaximumHp?: boolean } & BaseHitPointsCharacter

// hitPoints.maximum is the manual/custom-override value — used as-is with nothing added, exactly
// like a custom Armor Class ignores equipment bonuses. hpBonusPerLevel only applies inside the
// calculated branch (see calculateMaxHitPoints); it must never silently apply on top of a custom
// value, or the displayed max would disagree with what the player actually typed. temporaryMaximum
// is not part of this calculated/custom split — it's a directly-edited field (its own Stepper in
// combat-stats-module.tsx) representing a temporary buff/curse, so it stays additive either way.
export function getEffectiveMaxHp(character?: MaxHpCharacter): number {
  if (!character) return 1
  const spec = CUSTOMIZABLE_VALUES.maximumHp
  const baseHp = isCalculated(character, "maximumHp") ? spec.calculated(character) : spec.custom(character)
  return Math.max(1, baseHp + (character.hitPoints?.temporaryMaximum ?? 0))
}

/**
 * `next` with its current HP moved by the maximum HP its level change gained or lost: a level up
 * heals by what it adds, a level down takes it away again. Losing a level is not damage, so it never
 * drops a conscious character to 0. A custom maximum doesn't follow the level, so nothing moves.
 */
export function applyLevelChange(previous: Character, next: Character): Character {
  if ((previous.level ?? 1) === (next.level ?? 1)) return next
  const change = getEffectiveMaxHp(next) - getEffectiveMaxHp(previous)
  if (change === 0) return next
  const current = next.hitPoints?.current ?? 0
  const floor = Math.min(current, 1)
  return { ...next, hitPoints: { ...next.hitPoints, current: Math.max(floor, Math.min(current + change, getEffectiveMaxHp(next))) } }
}

export function getSpellSaveDC(character: Character): number {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return 8
  const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, ability))
  return 8 + getEffectiveProficiencyBonus(character) + abilityMod
}

export function getSpellAttackBonus(character: Character): number {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return 0
  const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, ability))
  return getEffectiveProficiencyBonus(character) + abilityMod
}

export function computeSpellModifier(character: Character): number {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return 0
  return getAbilityModifier(getEffectiveAbilityScore(character, ability))
}

/** The tooltip breakdown of getSpellAttackBonus. */
export function getSpellAttackBreakdown(character: Character): string {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return "No spellcasting ability set"
  return `${formatLeadingTerm(computeSpellModifier(character), ABILITY_TITLE_CASE[ability])}${formatTerm(getEffectiveProficiencyBonus(character), "Prof")}`
}

/** The tooltip breakdown of getSpellSaveDC. */
export function getSpellSaveDCBreakdown(character: Character): string {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return "No spellcasting ability set"
  return `8${formatTerm(getEffectiveProficiencyBonus(character), "Prof")}${formatTerm(computeSpellModifier(character), ABILITY_TITLE_CASE[ability])}`
}

/** The spell save DC the sheet shows: the custom value when one is set, the calculated one otherwise. */
export function getEffectiveSpellSaveDC(character: Character): number {
  return getEffectiveValue(character, "spellSaveDC")
}

/** The spell attack bonus the sheet shows: the custom value when one is set, the calculated one otherwise. */
export function getEffectiveSpellAttackBonus(character: Character): number {
  return getEffectiveValue(character, "spellAttackBonus")
}

/** The tooltip of getEffectiveSpellSaveDC: its breakdown, or "Custom" for a custom value. */
export function getEffectiveSpellSaveDCTooltip(character: Character): string {
  return isCalculated(character, "spellSaveDC") ? getSpellSaveDCBreakdown(character) : "Custom"
}

/** The tooltip of getEffectiveSpellAttackBonus: its breakdown, or "Custom" for a custom value. */
export function getEffectiveSpellAttackTooltip(character: Character): string {
  return isCalculated(character, "spellAttackBonus") ? getSpellAttackBreakdown(character) : "Custom"
}

/** A passive score as the sheet calculates it: 10 + the skill's modifier, with any feature-granted proficiency. */
export function getCalculatedPassiveScore(character: Character, skill: keyof Skills): number {
  const proficiency = getEffectiveSkillProficiency(character, skill)
  return getPassiveScore(
    getEffectiveAbilityScore(character, SKILL_ABILITY_MAP[skill]),
    getEffectiveProficiencyBonus(character),
    proficiency.proficient,
    proficiency.expertise,
  )
}

/**
 * A value the sheet shows that has a calculated/custom toggle stored as one boolean. Every reader of
 * these values goes through this table (isCalculated, getCustomValue, getEffectiveValue), so the
 * modules, the stats bar, import reconciliation and the Level Up summary agree on what the sheet shows.
 */
interface CustomizableValue<C> {
  /** The calculated/custom toggle's field. */
  toggle: keyof Character
  /** Whether a character with no toggle stored counts as calculated. */
  calculatedByDefault: boolean
  calculated: (character: C) => number
  /** The value the player entered, which the sheet shows while the value is custom; a fallback when none is stored. */
  custom: (character: C) => number
}

export const CUSTOMIZABLE_VALUES = {
  maximumHp: {
    toggle: "useCalculatedMaximumHp", calculatedByDefault: false,
    // Before temporaryMaximum, which getEffectiveMaxHp adds to either
    calculated: (c: BaseHitPointsCharacter) => calculateMaxHitPoints(c).hp,
    custom: (c: Pick<MaxHpCharacter, "hitPoints">) => c.hitPoints?.maximum ?? 1,
  },
  proficiencyBonus: {
    toggle: "useCalculatedProficiencyBonus", calculatedByDefault: false,
    calculated: (c: ProficiencyBonusCharacter) => getProficiencyBonus(c.level ?? 1),
    custom: (c: ProficiencyBonusCharacter) => c.proficiencyBonus ?? 2,
  },
  armorClass: {
    toggle: "useCalculatedArmorClass", calculatedByDefault: true,
    calculated: (c: Character) => calculateEquippedAC(c).ac,
    custom: (c: Character) => c.armorClass ?? 10,
  },
  initiative: {
    toggle: "useCalculatedInitiative", calculatedByDefault: false,
    calculated: (c: Character) => calculateInitiative(c).initiative,
    custom: (c: Character) => c.initiative ?? 0,
  },
  speed: {
    toggle: "useCalculatedSpeed", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveMovementSpeeds(c).walk,
    custom: (c: Character) => c.speed ?? 30,
  },
  flySpeed: {
    toggle: "useCalculatedFlySpeed", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveMovementSpeeds(c).fly,
    custom: (c: Character) => c.flySpeed ?? 0,
  },
  swimSpeed: {
    toggle: "useCalculatedSwimSpeed", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveMovementSpeeds(c).swim,
    custom: (c: Character) => c.swimSpeed ?? 0,
  },
  climbSpeed: {
    toggle: "useCalculatedClimbSpeed", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveMovementSpeeds(c).climb,
    custom: (c: Character) => c.climbSpeed ?? 0,
  },
  burrowSpeed: {
    toggle: "useCalculatedBurrowSpeed", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveMovementSpeeds(c).burrow,
    custom: (c: Character) => c.burrowSpeed ?? 0,
  },
  passivePerception: {
    toggle: "useCalculatedPassivePerception", calculatedByDefault: true,
    calculated: (c: Character) => getCalculatedPassiveScore(c, "perception"),
    custom: (c: Character) => c.passivePerception ?? getCalculatedPassiveScore(c, "perception"),
  },
  passiveInsight: {
    toggle: "useCalculatedPassiveInsight", calculatedByDefault: true,
    calculated: (c: Character) => getCalculatedPassiveScore(c, "insight"),
    custom: (c: Character) => c.passiveInsight ?? getCalculatedPassiveScore(c, "insight"),
  },
  passiveInvestigation: {
    toggle: "useCalculatedPassiveInvestigation", calculatedByDefault: true,
    calculated: (c: Character) => getCalculatedPassiveScore(c, "investigation"),
    custom: (c: Character) => c.passiveInvestigation ?? getCalculatedPassiveScore(c, "investigation"),
  },
  attunementLimit: {
    toggle: "useCalculatedAttunementLimit", calculatedByDefault: true,
    calculated: () => BASE_ATTUNEMENT_LIMIT,
    custom: (c: Character) => c.attunementLimit ?? BASE_ATTUNEMENT_LIMIT,
  },
  carryingCapacity: {
    toggle: "useCalculatedCarryingCapacity", calculatedByDefault: true,
    calculated: (c: Character) => getEffectiveCarryingCapacity(c),
    custom: (c: Character) => c.carryingCapacity ?? getEffectiveCarryingCapacity(c),
  },
  spellSaveDC: {
    toggle: "useCalculatedSpellSaveDC", calculatedByDefault: true,
    calculated: (c: Character) => getSpellSaveDC(c),
    custom: (c: Character) => c.spellSaveDC ?? getSpellSaveDC(c),
  },
  spellAttackBonus: {
    toggle: "useCalculatedSpellAttackBonus", calculatedByDefault: true,
    calculated: (c: Character) => getSpellAttackBonus(c),
    custom: (c: Character) => c.spellAttackBonus ?? getSpellAttackBonus(c),
  },
} as const satisfies Record<string, CustomizableValue<never>>

export type CustomizableValueKey = keyof typeof CUSTOMIZABLE_VALUES

type CalculatedToggles = Partial<Pick<Character, (typeof CUSTOMIZABLE_VALUES)[CustomizableValueKey]["toggle"]>>

/** Whether the sheet shows the calculated value: the stored toggle, or the value's default when none is stored. */
export function isCalculated(character: CalculatedToggles, key: CustomizableValueKey): boolean {
  const spec = CUSTOMIZABLE_VALUES[key]
  return character[spec.toggle] ?? spec.calculatedByDefault
}

/** The value the player entered (see CustomizableValue.custom). */
export function getCustomValue(character: Character, key: CustomizableValueKey): number {
  return CUSTOMIZABLE_VALUES[key].custom(character)
}

/** The value the sheet shows: calculated or custom, as its toggle says. */
export function getEffectiveValue(character: Character, key: CustomizableValueKey): number {
  return isCalculated(character, key) ? CUSTOMIZABLE_VALUES[key].calculated(character) : getCustomValue(character, key)
}

const SAVE_ABILITY_START = /^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\b/i
// A DC typed into the text ("DEX save DC 13"), with what joins it on: the character's own DC replaces it
const TYPED_DC = /[\s,;:-]*\bDC\s*\d+\b/gi

/**
 * The label of a spell's save badge, for an Attack/Save that starts with an ability ("DEX",
 * "STR/Athletics", "Wisdom save"); null for any other text, which is shown as written without a DC.
 * A lone abbreviation reads "DEX Save"; other text is kept as written, less any DC typed into it.
 */
export function spellSaveLabel(attackSave: string | undefined): string | null {
  const value = attackSave?.trim() ?? ""
  if (!SAVE_ABILITY_START.test(value)) return null
  const abbreviation = value.toUpperCase()
  if ((Object.values(ABILITY_ABBREVIATIONS) as string[]).includes(abbreviation)) return `${abbreviation} Save`
  return value.replace(TYPED_DC, "").trim()
}

export const SKILL_ABILITY_MAP = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
} as const

export const SKILL_DISPLAY_NAMES = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
} as const

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

export function parseHitDiceSize(hitDice: string): number {
  return parseDiceString(hitDice)?.sides ?? 8
}

export function rollHitDice(count: number, dieSize: DieSize, conMod: number): { total: number; rolls: number[] } {
  const { rolls } = rollMany(count, dieSize)
  const adjusted = rolls.map((r) => Math.max(1, r + conMod))
  return { rolls: adjusted, total: adjusted.reduce((a, b) => a + b, 0) }
}

export function safeFeatures(raw: Feature[] | string | undefined): Feature[] {
  if (!raw || typeof raw === 'string') return []
  return raw
}

type RechargeOn = NonNullable<UseableEntry['rechargeOn']>

/** How each rest a limited-use entry recharges on is named, wherever it's shown. */
export const RECHARGE_ON_LABELS: Record<RechargeOn, string> = {
  'short-rest': 'Short Rest',
  'long-rest': 'Long Rest',
}

/** The "Recharge On" choices every form offers for a limited-use entry; "" means it doesn't recharge. */
export const RECHARGE_ON_OPTIONS: { value: '' | RechargeOn; label: string }[] = [
  { value: '', label: 'None' },
  ...(Object.entries(RECHARGE_ON_LABELS) as [RechargeOn, string][]).map(([value, label]) => ({ value, label })),
]

/** How each kind of action is named, wherever it's shown. */
export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  'action': 'Action',
  'bonus-action': 'Bonus Action',
  'reaction': 'Reaction',
  'other': 'Other',
}

/** The action kinds as choices, in the order the Actions module lists its sections. */
export const ACTION_KIND_OPTIONS: { value: ActionKind; label: string }[] =
  (Object.entries(ACTION_KIND_LABELS) as [ActionKind, string][]).map(([value, label]) => ({ value, label }))

export const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]
export const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => t.charAt(0).toUpperCase() + t.slice(1))

/** Suggested gain types; the field also takes free text. "Temp HP" is shown in the health bar's temp HP color. */
export const TEMP_HP_GAIN_TYPE = "Temp HP"
export const GAIN_TYPE_OPTIONS = ["Healing", TEMP_HP_GAIN_TYPE]

/**
 * Puts a list of damage types into its standard form: a value matching one of DAMAGE_TYPE_OPTIONS
 * in any case becomes that option ("fire" → "Fire"), anything else is kept as typed, and blanks
 * and case-insensitive duplicates are dropped. Returns `values` itself when nothing changes.
 */
export function normalizeDamageTypes(values: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    normalized.push(DAMAGE_TYPE_OPTIONS.find((option) => option.toLowerCase() === key) ?? trimmed)
  }
  const unchanged = normalized.length === values.length && normalized.every((value, i) => value === values[i])
  return unchanged ? values : normalized
}

export const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
]

export const EXHAUSTION = "Exhaustion"
export const MAX_EXHAUSTION_LEVEL = 6

// 2014 PHB, Appendix A: each level adds its row, and the effects are cumulative
const EXHAUSTION_2014 = [
  "Disadvantage on ability checks",
  "Speed halved",
  "Disadvantage on attack rolls and saving throws",
  "Hit point maximum halved",
  "Speed reduced to 0",
  "Death",
]

/**
 * What a character's Exhaustion level does under their edition's rules. 2014: the cumulative
 * level table. 2024 (Rules Glossary): d20 Tests are reduced by 2 and Speed by 5 ft per level, and
 * level 6 is death. Shown to the player; nothing is applied to calculated values.
 */
export function getExhaustionEffects(edition: "2014" | "2024", level: number): string[] {
  const clamped = Math.min(Math.max(Math.floor(level), 0), MAX_EXHAUSTION_LEVEL)
  if (clamped === 0) return []
  if (edition === "2014") return EXHAUSTION_2014.slice(0, clamped)
  if (clamped === MAX_EXHAUSTION_LEVEL) return ["Death"]
  return [`d20 Tests −${2 * clamped}`, `Speed −${5 * clamped} ft`]
}

/** A character's conditions as shown, with Exhaustion and its level after the others. */
export function displayedConditions(character: Pick<Character, "conditions" | "exhaustionLevel">): string[] {
  const level = character.exhaustionLevel ?? 0
  return [...(character.conditions ?? []), ...(level > 0 ? [`${EXHAUSTION} ${level}`] : [])]
}

// ── Spells in effect ──────────────────────────────────────────────────────────────────────────

const CONCENTRATION_LEAD = /^\s*concentration\b[\s,:;-]*/i

/**
 * Splits duration text that leads with "Concentration" ("Concentration, up to 1 minute", or with no
 * comma, as some sheets write it) into that and the duration itself ("up to 1 minute").
 */
export function splitConcentrationDuration(text: string): { concentration: boolean; duration: string } {
  const lead = CONCENTRATION_LEAD.exec(text)
  return lead
    ? { concentration: true, duration: text.slice(lead[0].length).trim() }
    : { concentration: false, duration: text.trim() }
}

/** A spell's duration without any "Concentration" lead-in, for reading how long it lasts. */
const bareDuration = (duration: string | undefined) => splitConcentrationDuration(duration ?? "").duration

/**
 * A spell's duration as shown on its card: the text as stored, so nothing in it is hidden, even a
 * "Concentration" lead-in that disagrees with the spell's concentration setting. Null when it has
 * none or is instantaneous.
 */
export function spellDurationLabel(duration: string | undefined): string | null {
  const d = (duration ?? "").trim()
  return !d || bareDuration(d).toLowerCase() === "instantaneous" ? null : d
}

/** Whether a spell stays in effect once cast: it needs concentration or lasts longer than an instant. */
export function isSustainedSpell(spell: Pick<Spell, "concentration" | "duration">): boolean {
  return !!spell.concentration || spellDurationLabel(spell.duration) != null
}

/**
 * The spells in effect, concentration first, then the others in the order they were cast. Ids of
 * deleted spells, and of spells edited so they no longer last, are left out.
 */
export function activeSpells(character: Pick<Character, "activeSpellIds" | "spells">): Spell[] {
  const byId = new Map((character.spells ?? []).map((spell) => [spell.id, spell]))
  const active = (character.activeSpellIds ?? [])
    .map((id) => byId.get(id))
    .filter((spell): spell is Spell => !!spell && isSustainedSpell(spell))
  return [...active.filter((s) => s.concentration), ...active.filter((s) => !s.concentration)]
}

/**
 * activeSpellIds once the spell is cast. A concentration spell ends any other one, since only one can
 * be held at a time. A spell that doesn't last leaves the list as it is.
 */
export function withSpellActivated(character: Pick<Character, "activeSpellIds" | "spells">, spell: Spell): string[] {
  const ids = character.activeSpellIds ?? []
  if (!isSustainedSpell(spell)) return ids
  const concentrationIds = new Set(spell.concentration
    ? (character.spells ?? []).filter((s) => s.concentration).map((s) => s.id)
    : [])
  return [...ids.filter((id) => id !== spell.id && !concentrationIds.has(id)), spell.id]
}

/** activeSpellIds once the spell has ended. */
export function withSpellEnded(character: Pick<Character, "activeSpellIds">, spellId: string): string[] {
  return (character.activeSpellIds ?? []).filter((id) => id !== spellId)
}

/** One spell a feature's tiers give, with the settings of the tier that gives it. */
export interface FeatureSpellGrant {
  spellId: string
  /** The level of the tier whose settings apply: the last one reached, or the first one not yet reached. */
  level: number
  /** Whether the character has reached that tier. */
  active: boolean
  slots: boolean
  /** Free casts per recharge; 0 when the spell can't be cast without a slot. */
  freeCasts: number
}

/**
 * The spells a 'Spells' feature gives, in the order its tiers name them. Tiers add up; a spell named
 * again in a later tier the character has reached takes that tier's settings (so a feature can give
 * more free casts at a higher level). A spell only named in tiers not reached yet is listed as not
 * active, with the first of those tiers.
 */
export function getFeatureSpellGrants(feature: Feature, characterLevel: number): FeatureSpellGrant[] {
  const grants = new Map<string, FeatureSpellGrant>()
  const tiers = [...(feature.levelEffects ?? [])].sort((a, b) => a.level - b.level)
  for (const tier of tiers) {
    const active = tier.level <= characterLevel
    for (const spellId of tier.effects.grantedSpells ?? []) {
      // Tiers are in level order, so the reached ones come first: a tier not reached only lists a
      // spell no earlier tier gives
      if (!active && grants.has(spellId)) continue
      grants.set(spellId, {
        spellId,
        level: tier.level,
        active,
        slots: !!tier.effects.grantedSpellsSlots,
        freeCasts: Math.max(0, Math.floor(Number(tier.effects.grantedSpellsFreeCasts ?? 0))),
      })
    }
  }
  return [...grants.values()]
}

/** Free casts of a spell its feature has spent since it last recharged. */
export function featureSpellCastsSpent(feature: Pick<Feature, "spellCastsSpent">, spellId: string): number {
  return Math.max(0, Number(feature.spellCastsSpent?.[spellId] ?? 0))
}

/**
 * How a source lets a spell be cast without a slot. `remaining`/`total` are absent when the casts
 * aren't counted (an item that spends no charges).
 */
export interface FreeCast {
  /** Uses spent per cast: 1 for a feature's free cast, the grant's charges for an item. */
  cost: number
  remaining?: number
  total?: number
}

/** A feature or item that gives a spell, as the spell's cards and edit form show it. */
export interface SpellGrantSource {
  /** `feature:<id>` or `item:<id>`, unique among a spell's sources. */
  key: string
  kind: "feature" | "item"
  sourceId: string
  /** The name tooltips and chips show: the feature's name and kind, or the item's name. */
  name: string
  /**
   * The feature's or item's own name, without the kind: what a spell card's cast choice shows,
   * where the card already says where the spell comes from.
   */
  shortName: string
  /** Whether the source gives the spell now: the feature tier is reached, or the item's modifiers apply. */
  active: boolean
  /** A feature tier not reached yet: the level it's gained at. */
  fromLevel?: number
  /** A feature's spell that is castable with slots, which makes it always prepared. */
  alwaysPrepared: boolean
  free?: FreeCast
}

type SpellGrantCharacter = FeatureEffectCharacter & Partial<Pick<Character, "equipment">>

/**
 * Every spell's sources, by spell id: the features whose tiers name it, then the magic items that
 * give it. Inactive sources are included, so a spell can show where it will come from.
 */
export function getSpellGrantSources(character: SpellGrantCharacter): Map<string, SpellGrantSource[]> {
  const sources = new Map<string, SpellGrantSource[]>()
  const add = (spellId: string, source: SpellGrantSource) => {
    const list = sources.get(spellId)
    if (list) list.push(source)
    else sources.set(spellId, [source])
  }
  const level = character.level ?? 1

  for (const field of FEATURE_LIST_FIELDS) {
    for (const feature of safeFeatures(character[field])) {
      for (const grant of getFeatureSpellGrants(feature, level)) {
        add(grant.spellId, {
          key: `feature:${feature.id}`,
          kind: "feature",
          sourceId: feature.id,
          name: featureSourceLabel(feature),
          shortName: feature.name,
          active: grant.active,
          ...(grant.active ? {} : { fromLevel: grant.level }),
          alwaysPrepared: grant.slots,
          ...(grant.freeCasts > 0
            ? { free: { cost: 1, total: grant.freeCasts, remaining: Math.max(0, grant.freeCasts - featureSpellCastsSpent(feature, grant.spellId)) } }
            : {}),
        })
      }
    }
  }

  for (const item of character.equipment ?? []) {
    if (!item.magic) continue
    for (const grant of item.modifiers?.grantedSpells ?? []) {
      let free: FreeCast | undefined
      if (grant.charges != null) {
        const cost = Math.max(0, Math.floor(Number(grant.charges)))
        free = hasChargesTracking(item) && cost > 0
          ? { cost, total: item.maxUses ?? 0, remaining: Math.max(0, (item.maxUses ?? 0) - (item.charges ?? 0)) }
          : { cost: 0 }
      }
      add(grant.spellId, {
        key: `item:${item.id}`,
        kind: "item",
        sourceId: item.id,
        name: item.name,
        shortName: item.name,
        active: isItemModifierActive(item),
        alwaysPrepared: false,
        ...(free ? { free } : {}),
      })
    }
  }
  return sources
}

/** Whether an active feature makes the spell always prepared (a cantrip: always known). */
export function isAlwaysPrepared(sources: readonly SpellGrantSource[] | undefined): boolean {
  return (sources ?? []).some((source) => source.active && source.alwaysPrepared)
}

/** The active sources a spell can be cast from without a slot, spent or not. */
export function freeCastSources(sources: readonly SpellGrantSource[] | undefined): (SpellGrantSource & { free: FreeCast })[] {
  return (sources ?? []).filter((source): source is SpellGrantSource & { free: FreeCast } => source.active && !!source.free)
}

/** Whether a free cast has enough uses left to pay for one more cast. */
export function canAffordFreeCast(free: FreeCast): boolean {
  return free.remaining == null || free.remaining >= free.cost
}

/** The tooltip of an inactive source's chip: why it doesn't give the spell now. */
export function inactiveGrantReason(source: SpellGrantSource): string {
  return source.kind === "item" ? "Item not currently equipped/attuned" : `From level ${source.fromLevel}`
}

/**
 * Whether a spell can be cast from its action card: a cantrip while known, any other spell while
 * prepared, and any spell an active source makes always prepared or lets be cast without a slot.
 */
export function isSpellReady(spell: Pick<Spell, "level" | "known" | "prepared">, sources?: readonly SpellGrantSource[]): boolean {
  if (spell.level === 0 ? (spell.known ?? true) : !!spell.prepared) return true
  return isAlwaysPrepared(sources) || freeCastSources(sources).length > 0
}

/** Whether a spell of 1st level or higher can be cast with the character's slots: while it's prepared. */
export function canCastWithSlots(spell: Pick<Spell, "level" | "prepared">, sources?: readonly SpellGrantSource[]): boolean {
  return spell.level > 0 && (!!spell.prepared || isAlwaysPrepared(sources))
}

/**
 * The character with one free cast of the spell spent from the source: one of a feature's casts of
 * that spell, or the grant's charges from an item. An item cast that spends no charges changes nothing.
 */
export function withFreeCastSpent(character: Character, source: Pick<SpellGrantSource, "kind" | "sourceId" | "free">, spellId: string): Character {
  if (source.kind === "feature") {
    for (const field of FEATURE_LIST_FIELDS) {
      const features = safeFeatures(character[field])
      if (!features.some((feature) => feature.id === source.sourceId)) continue
      return {
        ...character,
        [field]: features.map((feature) => feature.id === source.sourceId
          ? { ...feature, spellCastsSpent: { ...feature.spellCastsSpent, [spellId]: featureSpellCastsSpent(feature, spellId) + 1 } }
          : feature),
      }
    }
    return character
  }
  const cost = source.free?.cost ?? 0
  if (cost <= 0) return character
  return {
    ...character,
    equipment: (character.equipment ?? []).map((item) => item.id === source.sourceId && hasChargesTracking(item)
      ? { ...item, charges: Math.min(item.maxUses ?? 0, (item.charges ?? 0) + cost) }
      : item),
  }
}

/** The feature with its spells' free casts restored, as a rest matching its rechargeOn does. */
export function withSpellCastsRecharged<T extends Pick<Feature, "spellCastsSpent">>(feature: T): T {
  if (!feature.spellCastsSpent) return feature
  const rest = { ...feature }
  delete rest.spellCastsSpent
  return rest
}

/**
 * The character with its spells replaced: a spell that is deleted, unprepared, or (a cantrip) no
 * longer known ends, so it isn't left in effect with no card to end it from.
 */
export function withSpells(character: Character, spells: Spell[]): Character {
  if (!character.activeSpellIds) return { ...character, spells }
  const sources = getSpellGrantSources(character)
  const ready = new Set(spells.filter((spell) => isSpellReady(spell, sources.get(spell.id))).map((spell) => spell.id))
  return { ...character, spells, activeSpellIds: character.activeSpellIds.filter((id) => ready.has(id)) }
}

/**
 * The character without the spell: it leaves the spell list, ends if in effect, and is no longer
 * named by any feature or item that gave it. The features and items themselves stay.
 */
export function withSpellDeleted(character: Character, spellId: string): Character {
  const next: Character = { ...character }
  for (const field of FEATURE_LIST_FIELDS) {
    const features = safeFeatures(character[field])
    if (!features.some((feature) => namesSpell(feature, spellId))) continue
    next[field] = features.map((feature) => {
      if (!namesSpell(feature, spellId)) return feature
      const levelEffects = feature.levelEffects?.map((tier) => tier.effects.grantedSpells?.includes(spellId)
        ? { ...tier, effects: { ...tier.effects, grantedSpells: tier.effects.grantedSpells.filter((id) => id !== spellId) } }
        : tier)
      const spellCastsSpent = { ...feature.spellCastsSpent }
      delete spellCastsSpent[spellId]
      const rest: Feature = { ...feature, levelEffects }
      if (Object.keys(spellCastsSpent).length > 0) rest.spellCastsSpent = spellCastsSpent
      else delete rest.spellCastsSpent
      return rest
    })
  }
  if ((character.equipment ?? []).some((item) => item.modifiers?.grantedSpells?.some((grant) => grant.spellId === spellId))) {
    next.equipment = character.equipment.map((item) => {
      const grants = item.modifiers?.grantedSpells
      if (!grants?.some((grant) => grant.spellId === spellId)) return item
      const remaining = grants.filter((grant) => grant.spellId !== spellId)
      const modifiers: ItemModifiers = { ...item.modifiers, grantedSpells: remaining }
      if (remaining.length === 0) delete modifiers.grantedSpells
      return { ...item, modifiers }
    })
  }
  return withSpells(next, (character.spells ?? []).filter((spell) => spell.id !== spellId))
}

function namesSpell(feature: Feature, spellId: string): boolean {
  return (feature.levelEffects ?? []).some((tier) => tier.effects.grantedSpells?.includes(spellId)) ||
    feature.spellCastsSpent?.[spellId] != null
}

const PARSED_DURATION = /^(?:up to\s+)?(\d+)\s+(round|minute|hour)s?$/i

/**
 * Which rest outlasts a spell's duration. Only "N rounds/minutes/hours" and "up to N ..." are read:
 * rounds, minutes, and a single hour end on any rest, and up to 8 hours on a long rest. Anything
 * longer or written any other way ("Until dispelled", "10 days") ends only when the user ends it.
 */
export function spellEndsOnRest(duration: string | undefined): "any-rest" | "long-rest" | null {
  const match = PARSED_DURATION.exec(bareDuration(duration))
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit !== "hour" || amount < 2) return "any-rest"
  return amount <= 8 ? "long-rest" : null
}

/** The spells a rest ends: those whose duration it outlasts. */
export function spellsEndedByRest(character: Pick<Character, "activeSpellIds" | "spells">, rest: "short" | "long"): Spell[] {
  return activeSpells(character).filter((spell) => {
    const endsOn = spellEndsOnRest(spell.duration)
    return endsOn === "any-rest" || (endsOn === "long-rest" && rest === "long")
  })
}

/** activeSpellIds after a rest, without the spells it ends. */
export function activeSpellIdsAfterRest(character: Pick<Character, "activeSpellIds" | "spells">, rest: "short" | "long"): string[] {
  const ended = new Set(spellsEndedByRest(character, rest).map((spell) => spell.id))
  return (character.activeSpellIds ?? []).filter((id) => !ended.has(id))
}

export const SENSE_TYPES: SenseType[] = ["darkvision", "blindsight", "tremorsense", "truesight"]
export const SENSE_LABELS: Record<SenseType, string> = {
  darkvision: "Darkvision",
  blindsight: "Blindsight",
  tremorsense: "Tremorsense",
  truesight: "Truesight",
}

export const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]

export const CREATURE_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental", "Fey",
  "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
]

export const BASE_ATTUNEMENT_LIMIT = 3

export interface DerivedWeaponAttack {
  id: string
  /** The equipment item the attack comes from, for editing it. */
  itemId: string
  name: string
  type: "attack"
  attackBonus: number
  attackBonusTooltip: string
  damage: string
  damageTooltip: string
  damageType: string
  damageRecurring?: boolean
  range: string
  highlights?: string
  description: string
  isDerived: true
}

export function getEquippedWeaponAttacks(
  character: Pick<Character, "equipment" | "abilityScores" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
    & ProficiencyBonusCharacter & FeatureEffectCharacter
): DerivedWeaponAttack[] {
  const equipment = character.equipment ?? []
  const profBonus = getEffectiveProficiencyBonus(character)
  const itemTotals = getEquipmentModifierTotals(equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const strMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "strength", itemTotals, featureTotals))
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals, featureTotals))

  return equipment
    .filter((item): item is Equipment & { weaponStats: NonNullable<Equipment["weaponStats"]> } =>
      item.equipped && item.type === "weapon" && item.weaponStats != null
    )
    .map((item) => {
      const { damage, damageType, damageRecurring, weaponRange, attackAbility, proficient } = item.weaponStats
      const bonus = isItemModifierActive(item) ? (item.modifiers?.weaponBonus ?? 0) : 0
      const usesDex = attackAbility === "dex" || (attackAbility === "finesse" && dexMod > strMod)
      const abilityMod = usesDex ? dexMod : strMod
      const abilityLabel = usesDex ? ABILITY_TITLE_CASE.dexterity : ABILITY_TITLE_CASE.strength
      const attackBonus = abilityMod + bonus + (proficient ? profBonus : 0)
      const damageMod = abilityMod + bonus
      const damageStr = `${damage}${formatModifier(damageMod)}`
      const bonusTerm = formatBonusTerm(bonus, "Weapon Bonus")
      const abilityTerm = formatLeadingTerm(abilityMod, abilityLabel)
      const attackBonusTooltip = `${abilityTerm}${bonusTerm}${proficient ? formatTerm(profBonus, "Prof") : ""}`
      // With no dice entered, the ability modifier leads, so it carries its own sign.
      const damageTooltip = `${damage ? `${damage}${formatTerm(abilityMod, abilityLabel)}` : abilityTerm}${bonusTerm}`
      return {
        id: `weapon-${item.id}`,
        itemId: item.id,
        name: item.name,
        type: "attack" as const,
        attackBonus,
        attackBonusTooltip,
        damage: damageStr,
        damageTooltip,
        damageType,
        damageRecurring,
        range: weaponRange,
        highlights: item.highlights,
        description: item.description,
        isDerived: true as const,
      }
    })
}

/** A joined additive term for a tooltip breakdown, e.g. " + 2 (Ring of Protection)" — omitted entirely when the bonus is zero. */
export function formatBonusTerm(bonus: number, label: string): string {
  if (bonus === 0) return ""
  return bonus > 0 ? ` + ${bonus} (${label})` : ` - ${Math.abs(bonus)} (${label})`
}

/** Like formatBonusTerm, but never suppressed at zero — for terms that are always part of the formula (e.g. a Dex modifier that can legitimately be +0). */
export function formatTerm(amount: number, label: string): string {
  return amount >= 0 ? ` + ${amount} (${label})` : ` - ${Math.abs(amount)} (${label})`
}

/** The first term of a formula: with no term before it to carry an operator, the amount carries its own sign. */
export function formatLeadingTerm(amount: number, label: string): string {
  return `${formatModifier(amount)} (${label})`
}

export function calculateEquippedAC(
  character: AbilityScoreCharacter
): { ac: number; breakdown: string; isEquippedArmor: boolean } {
  const equipment = character.equipment ?? []
  const itemTotals = getEquipmentModifierTotals(equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals, featureTotals))
  const itemBonus = itemTotals.armorClass

  const equippedArmor = equipment.filter(
    (item): item is Equipment & { armorStats: NonNullable<Equipment["armorStats"]> } =>
      item.equipped && item.type === "armor" && item.armorStats != null
  )

  const bodyArmor = equippedArmor.find((item) => item.armorStats.armorType !== "shield")
  const shieldActive = equippedArmor.some((item) => item.armorStats.armorType === "shield")

  const dexLabel = ABILITY_TITLE_CASE.dexterity

  if (!bodyArmor) {
    const base = 10 + dexMod
    const ac = (shieldActive ? base + 2 : base) + itemBonus
    let breakdown = `10${formatTerm(dexMod, dexLabel)}`
    if (shieldActive) breakdown += " + 2 (shield)"
    breakdown += formatBonusTerm(itemBonus, "item bonus")
    return { ac, breakdown, isEquippedArmor: false }
  }

  const { baseAC, armorType } = bodyArmor.armorStats
  let ac: number
  let breakdown: string

  if (armorType === "light") {
    ac = baseAC + dexMod
    breakdown = `${baseAC} (${bodyArmor.name})${formatTerm(dexMod, dexLabel)}`
  } else if (armorType === "medium") {
    const dexBonus = Math.min(dexMod, 2)
    ac = baseAC + dexBonus
    breakdown = `${baseAC} (${bodyArmor.name})${formatTerm(dexBonus, `${dexLabel}, max +2`)}`
  } else {
    ac = baseAC
    breakdown = `${baseAC} (${bodyArmor.name})`
  }

  if (shieldActive) {
    ac += 2
    breakdown += " + 2 (shield)"
  }

  ac += itemBonus
  breakdown += formatBonusTerm(itemBonus, "item bonus")

  return { ac, breakdown, isEquippedArmor: true }
}

export function calculateInitiative(
  character: Pick<Character, "abilityScores" | "equipment" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
    & FeatureEffectCharacter
): { initiative: number; breakdown: string } {
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals, featureTotals))
  const itemBonus = itemTotals.initiative
  return {
    initiative: dexMod + itemBonus,
    breakdown: `${formatLeadingTerm(dexMod, ABILITY_TITLE_CASE.dexterity)}${formatBonusTerm(itemBonus, "item bonus")}`,
  }
}

export function remainingUses(used: number | undefined, max: number | undefined): number {
  return (max ?? 0) - (used ?? 0)
}

export function spentFromRemaining(remaining: number, max: number | undefined): number {
  return (max ?? 0) - remaining
}

/** A feature's max uses for this character right now: its flat count, or one scaled by level or proficiency bonus. */
export function effectiveMaxUses(feature: Feature, character: ProficiencyBonusCharacter): number {
  switch (feature.maxUsesMode) {
    case 'per-level': return (feature.maxUsesPerLevel ?? 0) * (character.level ?? 1)
    case 'proficiency-bonus': return getEffectiveProficiencyBonus(character)
    default: return feature.maxUses ?? 0
  }
}

export function hasChargesTracking(item: Pick<Equipment, "magic" | "maxUses">): boolean {
  return !!item.magic && (item.maxUses ?? 0) > 0
}

export function effectiveEquipmentMaxUses(item: Pick<Equipment, "type" | "quantity" | "magic" | "maxUses">): number {
  if (hasChargesTracking(item)) return item.maxUses ?? 0
  if (item.type === "consumable") return item.quantity
  return item.maxUses ?? 0
}

export function effectiveEquipmentUses(item: Pick<Equipment, "charges" | "consumedUses" | "magic" | "maxUses">): number {
  return hasChargesTracking(item) ? (item.charges ?? 0) : (item.consumedUses ?? 0)
}

export function reconcileEquipmentRest(item: Equipment, restTypes: Array<"short-rest" | "long-rest">): Equipment {
  let next = item
  const consumed = item.consumedUses ?? 0
  if (item.type === "consumable" && consumed > 0) {
    next = { ...next, quantity: Math.max(0, next.quantity - consumed), consumedUses: 0 }
  }
  if (hasChargesTracking(item) && item.rechargeOn && restTypes.includes(item.rechargeOn)) {
    next = { ...next, charges: 0 }
  }
  return next
}

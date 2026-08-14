import type { AbilityScores, ActionKind, Character, Equipment, Feature, FeatureEffects, FeatureKind, FeatureLevelEffect, FeatureTypeValue, HitPointsMode, SenseType, Skills } from "./character-types"
import { rollMany, parseDiceString, type DieSize } from "./dice"

export function getAbilityModifier(score: number): number {
  return Math.floor((Math.max(0, score) - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, level) / 4) + 1
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
export function inferFeatureType(actionKind: ActionKind | undefined, levelEffects: FeatureLevelEffect[] | undefined): FeatureTypeValue | '' {
  if (actionKind) return 'Action'
  const effects = levelEffects?.[0]?.effects
  if (effects?.spellcastingAbility) return 'Spellcasting Ability'
  if (
    effects?.hitDiceSize ||
    effects?.hitPointsMode !== undefined ||
    effects?.hitPointsFlatValue !== undefined ||
    effects?.hitPointsPerLevelAmount !== undefined ||
    (effects?.hitPointsRolledLevels?.length ?? 0) > 0
  ) return 'Hit Points'
  if (effects?.size) return 'Size'
  if (effects?.savingThrowProficiencies?.length) return 'Saving Throw Proficiency'
  if (effects?.skillProficiencies?.length) return 'Skill Proficiency'
  if (effects?.otherProficiencies?.length) return 'Other Proficiency'
  if (
    effects?.speed !== undefined ||
    effects?.flySpeed !== undefined ||
    effects?.swimSpeed !== undefined ||
    effects?.climbSpeed !== undefined ||
    effects?.burrowSpeed !== undefined
  ) return 'Speed'
  if (effects?.senses && Object.values(effects.senses).some((v) => v !== undefined)) return 'Senses'
  if (effects?.resistances?.length || effects?.immunities?.length || effects?.vulnerabilities?.length) return 'Damage Resistance/Immunity/Vulnerability'
  if (effects?.conditionImmunities?.length) return 'Condition Immunity'
  if (effects?.languages?.length) return 'Language'
  if (effects?.carryingCapacityBonus !== undefined || effects?.carryingCapacityMultiplier !== undefined) return 'Carrying Capacity'
  if (effects?.abilityScores && Object.values(effects.abilityScores).some((v) => v !== undefined)) return 'Ability Scores'
  if (effects?.abilityScoreFloors && Object.values(effects.abilityScoreFloors).some((v) => v !== undefined)) return 'Ability Scores'
  if (effects?.abilityScoreMaxCaps && Object.values(effects.abilityScoreMaxCaps).some((v) => v !== undefined)) return 'Ability Scores'
  if (effects?.abilityScoreBaseMax && Object.values(effects.abilityScoreBaseMax).some((v) => v !== undefined)) return 'Ability Scores'
  if (effects?.hpBonusPerLevel !== undefined) return 'Max HP Bonus'
  return ''
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
      if (mods.abilityScoreFloors?.[ability] !== undefined && mods.abilityScoreFloors[ability]! > (totals.abilityScoreFloors[ability] ?? -Infinity)) {
        totals.abilityScoreFloors[ability] = mods.abilityScoreFloors[ability]
        totals.abilityScoreFloorSources[ability] = item.name
      }
      if (mods.abilityScoreMaxCaps?.[ability] !== undefined && mods.abilityScoreMaxCaps[ability]! < (totals.abilityScoreMaxCaps[ability] ?? Infinity)) {
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
    if (mods.carryingCapacityMultiplier !== undefined) {
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

export function getActiveLevelEffect(feature: Feature, level: number): FeatureEffects | undefined {
  const tiers = getQualifyingLevelEffects(feature, level)
  return tiers.length > 0 ? tiers[tiers.length - 1] : undefined
}

type FeatureEffectCharacter = Pick<Character, "classFeatures" | "speciesTraits" | "feats" | "backgroundFeatures"> & Partial<Pick<Character, "level">>

export function getActiveFeatureEffects(character: FeatureEffectCharacter): FeatureEffectTotals {
  const totals: FeatureEffectTotals = {
    savingThrowProficiencies: {},
    skillProficiencies: {},
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
        if (
          effects.hitPointsMode !== undefined ||
          effects.hitPointsFlatValue !== undefined ||
          effects.hitPointsPerLevelAmount !== undefined ||
          (effects.hitPointsRolledLevels?.length ?? 0) > 0
        ) {
          totals.hitPointsMode = effects.hitPointsMode
          totals.hitPointsFlatValue = effects.hitPointsFlatValue
          totals.hitPointsPerLevelAmount = effects.hitPointsPerLevelAmount
          totals.hitPointsRolledLevels = effects.hitPointsRolledLevels
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
          if (effects.abilityScoreFloors?.[ability] !== undefined && effects.abilityScoreFloors[ability]! > (totals.abilityScoreFloors[ability] ?? -Infinity)) {
            totals.abilityScoreFloors[ability] = effects.abilityScoreFloors[ability]
            totals.abilityScoreFloorSources[ability] = sourceLabel
          }
          if (effects.abilityScoreMaxCaps?.[ability] !== undefined && effects.abilityScoreMaxCaps[ability]! < (totals.abilityScoreMaxCaps[ability] ?? Infinity)) {
            totals.abilityScoreMaxCaps[ability] = effects.abilityScoreMaxCaps[ability]
            totals.abilityScoreMaxCapSources[ability] = sourceLabel
          }
          if (effects.abilityScoreBaseMax?.[ability] !== undefined && effects.abilityScoreBaseMax[ability]! > (totals.abilityScoreBaseMax[ability] ?? -Infinity)) {
            totals.abilityScoreBaseMax[ability] = effects.abilityScoreBaseMax[ability]
            totals.abilityScoreBaseMaxSources[ability] = sourceLabel
          }
        }
        if (effects.speed !== undefined) { totals.speed = effects.speed; totals.speedSource = sourceLabel }
        if (effects.flySpeed !== undefined) { totals.flySpeed = effects.flySpeed; totals.flySpeedSource = sourceLabel }
        if (effects.swimSpeed !== undefined) { totals.swimSpeed = effects.swimSpeed; totals.swimSpeedSource = sourceLabel }
        if (effects.climbSpeed !== undefined) { totals.climbSpeed = effects.climbSpeed; totals.climbSpeedSource = sourceLabel }
        if (effects.burrowSpeed !== undefined) { totals.burrowSpeed = effects.burrowSpeed; totals.burrowSpeedSource = sourceLabel }
        totals.carryingCapacityBonus += Number(effects.carryingCapacityBonus ?? 0)
        if (effects.carryingCapacityMultiplier !== undefined) {
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
    }
  }

  return totals
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

type AbilityScoreCharacter = Pick<
  Character,
  "abilityScores" | "equipment" | "abilityScoreOverrides" | "useCalculatedAbilityScores"
> & FeatureEffectCharacter

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
  const useCalculated = character.useCalculatedAbilityScores?.[ability] ?? true
  return useCalculated ? calculated : (character.abilityScoreOverrides?.[ability] ?? calculated)
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

type SensesCharacter = Pick<Character, "equipment"> & FeatureEffectCharacter

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

export interface MovementSpeeds {
  walk: number
  fly: number
  swim: number
  climb: number
  burrow: number
}

type MovementCharacter = Pick<Character, "equipment"> & FeatureEffectCharacter

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
// what the Species Trait system says (empty string if nothing grants a size yet). `character.size`
// is never read here; it's purely the custom-override storage field (see useCalculatedSize in
// combat-stats-module.tsx).
export function getEffectiveSize(character: FeatureEffectCharacter): { size: string; source?: string } {
  const featureTotals = getActiveFeatureEffects(character)
  return { size: featureTotals.size ?? "", source: featureTotals.sizeSource }
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
      const perLevelLabel = featureTotals.hitPointsPerLevelAmount !== undefined ? `${perLevelAmount} HP/level` : `${perLevelAmount} avg d${hitDiceSize}`
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
  const hitPoints = character?.hitPoints
  const useCalculated = character?.useCalculatedMaximumHp ?? false
  const baseHp = useCalculated && character ? calculateMaxHitPoints(character).hp : (hitPoints?.maximum ?? 1)
  return Math.max(1, baseHp + (hitPoints?.temporaryMaximum ?? 0))
}

export function getSpellSaveDC(character: Character): number
export function getSpellSaveDC(
  spellcastingAbility: keyof AbilityScores,
  abilityScores: AbilityScores,
  proficiencyBonus: number,
): number
export function getSpellSaveDC(
  characterOrAbility: Character | keyof AbilityScores,
  abilityScores?: AbilityScores,
  proficiencyBonus?: number,
): number {
  // If first parameter is a Character object
  if (typeof characterOrAbility === "object" && "spellcastingAbility" in characterOrAbility) {
    const character = characterOrAbility
    const ability = getEffectiveSpellcastingAbility(character)
    if (!ability) return 8
    const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, ability))
    return 8 + (character.proficiencyBonus || 2) + abilityMod
  }

  // Original function signature
  const spellcastingAbility = characterOrAbility as keyof AbilityScores
  if (!spellcastingAbility || !abilityScores) return 8
  const abilityMod = getAbilityModifier(abilityScores[spellcastingAbility])
  return 8 + (proficiencyBonus || 2) + abilityMod
}

export function getSpellAttackBonus(character: Character): number
export function getSpellAttackBonus(
  spellcastingAbility: keyof AbilityScores,
  abilityScores: AbilityScores,
  proficiencyBonus: number,
): number
export function getSpellAttackBonus(
  characterOrAbility: Character | keyof AbilityScores,
  abilityScores?: AbilityScores,
  proficiencyBonus?: number,
): number {
  // If first parameter is a Character object
  if (typeof characterOrAbility === "object" && "spellcastingAbility" in characterOrAbility) {
    const character = characterOrAbility
    const ability = getEffectiveSpellcastingAbility(character)
    if (!ability) return 0
    const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, ability))
    return (character.proficiencyBonus || 2) + abilityMod
  }

  // Original function signature
  const spellcastingAbility = characterOrAbility as keyof AbilityScores
  if (!spellcastingAbility || !abilityScores) return 0
  const abilityMod = getAbilityModifier(abilityScores[spellcastingAbility])
  return (proficiencyBonus || 2) + abilityMod
}

export function computeSpellModifier(character: Character): number {
  const ability = getEffectiveSpellcastingAbility(character)
  if (!ability) return 0
  return getAbilityModifier(getEffectiveAbilityScore(character, ability))
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

export const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]
export const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => t.charAt(0).toUpperCase() + t.slice(1))

export const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
]

export const SENSE_TYPES: SenseType[] = ["darkvision", "blindsight", "tremorsense", "truesight"]
export const SENSE_LABELS: Record<SenseType, string> = {
  darkvision: "Darkvision",
  blindsight: "Blindsight",
  tremorsense: "Tremorsense",
  truesight: "Truesight",
}

export const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]

export const BASE_ATTUNEMENT_LIMIT = 3

export interface DerivedWeaponAttack {
  id: string
  name: string
  type: "attack"
  attackBonus: number
  damage: string
  damageType: string
  range: string
  description: string
  isDerived: true
}

export function getEquippedWeaponAttacks(
  character: Pick<Character, "equipment" | "abilityScores" | "proficiencyBonus" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
    & FeatureEffectCharacter
): DerivedWeaponAttack[] {
  const equipment = character.equipment ?? []
  const profBonus = character.proficiencyBonus ?? 2
  const itemTotals = getEquipmentModifierTotals(equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const strMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "strength", itemTotals, featureTotals))
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals, featureTotals))

  return equipment
    .filter((item): item is Equipment & { weaponStats: NonNullable<Equipment["weaponStats"]> } =>
      item.equipped && item.type === "weapon" && item.weaponStats !== undefined
    )
    .map((item) => {
      const { damage, damageType, weaponRange, attackAbility, proficient } = item.weaponStats
      const abilityMod =
        attackAbility === "dex" ? dexMod
        : attackAbility === "finesse" ? Math.max(strMod, dexMod)
        : strMod
      const attackBonus = abilityMod + (proficient ? profBonus : 0)
      const damageStr = abilityMod >= 0 ? `${damage}+${abilityMod}` : `${damage}${abilityMod}`
      return {
        id: `weapon-${item.id}`,
        name: item.name,
        type: "attack" as const,
        attackBonus,
        damage: damageStr,
        damageType,
        range: weaponRange,
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

export function calculateEquippedAC(
  character: Pick<Character, "equipment" | "abilityScores" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
    & FeatureEffectCharacter
): { ac: number; breakdown: string; isEquippedArmor: boolean } {
  const equipment = character.equipment ?? []
  const itemTotals = getEquipmentModifierTotals(equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals, featureTotals))
  const itemBonus = itemTotals.armorClass

  const equippedArmor = equipment.filter(
    (item): item is Equipment & { armorStats: NonNullable<Equipment["armorStats"]> } =>
      item.equipped && item.type === "armor" && item.armorStats !== undefined
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
    breakdown: `${formatModifier(dexMod)} (${ABILITY_TITLE_CASE.dexterity})${formatBonusTerm(itemBonus, "item bonus")}`,
  }
}

export function remainingUses(used: number | undefined, max: number | undefined): number {
  return (max ?? 0) - (used ?? 0)
}

export function spentFromRemaining(remaining: number, max: number | undefined): number {
  return (max ?? 0) - remaining
}

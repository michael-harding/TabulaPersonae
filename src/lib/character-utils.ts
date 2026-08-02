import type { AbilityScores, Character, Equipment, Feature, FeatureEffects, SenseType, Skills } from "./character-types"
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

export interface EquipmentModifierTotals {
  armorClass: number
  initiative: number
  savingThrows: Record<keyof AbilityScores, number>
  abilityScores: Record<keyof AbilityScores, number>
  resistances: string[]
  immunities: string[]
  vulnerabilities: string[]
  conditionImmunities: string[]
  senses: Record<SenseType, number>
  speed: number
  flySpeed: number
  swimSpeed: number
  climbSpeed: number
  burrowSpeed: number
  carryingCapacityBonus: number
  carryingCapacityMultiplier: number
  abilityScoreFloors: Partial<Record<keyof AbilityScores, number>>
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

export const ZERO_ABILITY_SCORES: Record<keyof AbilityScores, number> = {
  strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0,
}

export const ZERO_SENSES: Record<SenseType, number> = {
  darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0,
}

export function getEquipmentModifierTotals(equipment: Equipment[] | undefined): EquipmentModifierTotals {
  const totals: EquipmentModifierTotals = {
    armorClass: 0,
    initiative: 0,
    savingThrows: { ...ZERO_ABILITY_SCORES },
    abilityScores: { ...ZERO_ABILITY_SCORES },
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
    senses: { ...ZERO_SENSES },
    speed: 0,
    flySpeed: 0,
    swimSpeed: 0,
    climbSpeed: 0,
    burrowSpeed: 0,
    carryingCapacityBonus: 0,
    carryingCapacityMultiplier: 1,
    abilityScoreFloors: {},
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
      totals.abilityScores[ability] += Number(mods.abilityScores?.[ability] ?? 0)
      if (mods.abilityScoreFloors?.[ability] !== undefined) {
        totals.abilityScoreFloors[ability] = Math.max(totals.abilityScoreFloors[ability] ?? -Infinity, mods.abilityScoreFloors[ability]!)
      }
    }
    for (const sense of SENSE_TYPES) {
      totals.senses[sense] += Number(mods.senses?.[sense] ?? 0)
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
}

export function getActiveLevelEffect(feature: Feature, level: number): FeatureEffects | undefined {
  const tiers = (feature.levelEffects ?? []).filter((tier) => tier.level <= level)
  if (tiers.length === 0) return undefined
  return tiers.reduce((best, tier) => (tier.level > best.level ? tier : best)).effects
}

type FeatureEffectCharacter = Pick<Character, "classFeatures" | "speciesTraits" | "feats"> & Partial<Pick<Character, "level">>

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
    carryingCapacityBonus: 0,
    carryingCapacityMultiplier: 1,
  }
  const level = character.level ?? 1

  for (const features of [safeFeatures(character.classFeatures), safeFeatures(character.speciesTraits), safeFeatures(character.feats)]) {
    for (const feature of features) {
      const effects = getActiveLevelEffect(feature, level)
      if (!effects) continue

      if (effects.spellcastingAbility) {
        totals.spellcastingAbility = effects.spellcastingAbility
        totals.spellcastingAbilitySource = feature.name
      }
      if (effects.hitDiceSize) {
        totals.hitDiceSize = effects.hitDiceSize
        totals.hitDiceSizeSource = feature.name
      }
      if (effects.size) {
        totals.size = effects.size
        totals.sizeSource = feature.name
      }
      for (const ability of effects.savingThrowProficiencies ?? []) {
        if (!totals.savingThrowProficiencies[ability]) {
          totals.savingThrowProficiencies[ability] = feature.name
        }
      }
      for (const grant of effects.skillProficiencies ?? []) {
        const existing = totals.skillProficiencies[grant.skill]
        totals.skillProficiencies[grant.skill] = {
          expertise: (existing?.expertise ?? false) || !!grant.expertise,
          source: existing?.source ?? feature.name,
        }
      }
      for (const prof of effects.otherProficiencies ?? []) {
        if (!totals.otherProficiencies[prof]) {
          totals.otherProficiencies[prof] = feature.name
        }
      }
      for (const r of effects.resistances ?? []) {
        if (!totals.resistances[r]) totals.resistances[r] = feature.name
      }
      for (const i of effects.immunities ?? []) {
        if (!totals.immunities[i]) totals.immunities[i] = feature.name
      }
      for (const v of effects.vulnerabilities ?? []) {
        if (!totals.vulnerabilities[v]) totals.vulnerabilities[v] = feature.name
      }
      for (const c of effects.conditionImmunities ?? []) {
        if (!totals.conditionImmunities[c]) totals.conditionImmunities[c] = feature.name
      }
      for (const l of effects.languages ?? []) {
        if (!totals.languages[l]) totals.languages[l] = feature.name
      }
      for (const sense of SENSE_TYPES) {
        totals.senses[sense] += Number(effects.senses?.[sense] ?? 0)
      }
      if (effects.speed !== undefined) { totals.speed = effects.speed; totals.speedSource = feature.name }
      if (effects.flySpeed !== undefined) { totals.flySpeed = effects.flySpeed; totals.flySpeedSource = feature.name }
      if (effects.swimSpeed !== undefined) { totals.swimSpeed = effects.swimSpeed; totals.swimSpeedSource = feature.name }
      if (effects.climbSpeed !== undefined) { totals.climbSpeed = effects.climbSpeed; totals.climbSpeedSource = feature.name }
      if (effects.burrowSpeed !== undefined) { totals.burrowSpeed = effects.burrowSpeed; totals.burrowSpeedSource = feature.name }
      totals.carryingCapacityBonus += Number(effects.carryingCapacityBonus ?? 0)
      if (effects.carryingCapacityMultiplier !== undefined) {
        totals.carryingCapacityMultiplier = Math.max(totals.carryingCapacityMultiplier, effects.carryingCapacityMultiplier)
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
): { proficient: boolean; expertise: boolean; granted: boolean; grantedBy?: string } {
  const own = character.skills?.[skill]
  const grant = getActiveFeatureEffects(character).skillProficiencies[skill]
  return {
    proficient: (own?.proficient ?? false) || !!grant,
    expertise: (own?.expertise ?? false) || (grant?.expertise ?? false),
    granted: !!grant,
    grantedBy: grant?.source,
  }
}

type AbilityScoreCharacter = Pick<
  Character,
  "abilityScores" | "equipment" | "abilityScoreOverrides" | "useCalculatedAbilityScores"
>

function getCalculatedAbilityScoreFromTotals(
  character: AbilityScoreCharacter,
  ability: keyof AbilityScores,
  itemTotals: EquipmentModifierTotals,
): number {
  const base = Number(character.abilityScores?.[ability] ?? 10)
  const itemBonus = itemTotals.abilityScores[ability]
  const floor = itemTotals.abilityScoreFloors[ability]
  return Math.max(base + itemBonus, floor ?? -Infinity)
}

function getEffectiveAbilityScoreFromTotals(
  character: AbilityScoreCharacter,
  ability: keyof AbilityScores,
  itemTotals: EquipmentModifierTotals,
): number {
  const calculated = getCalculatedAbilityScoreFromTotals(character, ability, itemTotals)
  const useCalculated = character.useCalculatedAbilityScores?.[ability] ?? true
  return useCalculated ? calculated : (character.abilityScoreOverrides?.[ability] ?? calculated)
}

export function getCalculatedAbilityScore(character: AbilityScoreCharacter, ability: keyof AbilityScores): number {
  return getCalculatedAbilityScoreFromTotals(character, ability, getEquipmentModifierTotals(character.equipment))
}

export function getEffectiveAbilityScore(character: AbilityScoreCharacter, ability: keyof AbilityScores): number {
  return getEffectiveAbilityScoreFromTotals(character, ability, getEquipmentModifierTotals(character.equipment))
}

export function getEffectiveAbilityScores(character: AbilityScoreCharacter): AbilityScores {
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const result = {} as AbilityScores
  for (const ability of ABILITY_KEYS) {
    result[ability] = getEffectiveAbilityScoreFromTotals(character, ability, itemTotals)
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

type SensesCharacter = Pick<Character, "senses" | "equipment"> & FeatureEffectCharacter

export function getEffectiveSenses(character: SensesCharacter): Record<SenseType, number> {
  const itemTotals = getEquipmentModifierTotals(character.equipment).senses
  const featureTotals = getActiveFeatureEffects(character).senses
  const result = {} as Record<SenseType, number>
  for (const sense of SENSE_TYPES) {
    result[sense] = (character.senses?.[sense] ?? 0) + itemTotals[sense] + featureTotals[sense]
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
    grantedBy[v] = itemGranted.includes(v) ? "equipment" : featureGranted[v]
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

export function getEffectiveCarryingCapacity(character: CarryingCapacityCharacter): number {
  const strengthScore = getEffectiveAbilityScore(character, "strength")
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const featureTotals = getActiveFeatureEffects(character)
  const bonus = itemTotals.carryingCapacityBonus + featureTotals.carryingCapacityBonus
  const multiplier = Math.max(itemTotals.carryingCapacityMultiplier, featureTotals.carryingCapacityMultiplier)
  return Math.floor((strengthScore * 15 + bonus) * multiplier)
}

// No fallback to a hardcoded "Medium" default — like getEffectiveMovementSpeeds, this is purely
// what the Species Trait system says (empty string if nothing grants a size yet). `character.size`
// is never read here; it's purely the custom-override storage field (see useCalculatedSize in
// combat-stats-module.tsx).
export function getEffectiveSize(character: FeatureEffectCharacter): { size: string; source?: string } {
  const featureTotals = getActiveFeatureEffects(character)
  return { size: featureTotals.size ?? "", source: featureTotals.sizeSource }
}

export function getEffectiveMaxHp(hitPoints?: { maximum?: number; temporaryMaximum?: number }): number {
  return Math.max(1, (hitPoints?.maximum ?? 1) + (hitPoints?.temporaryMaximum ?? 0))
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
): DerivedWeaponAttack[] {
  const equipment = character.equipment ?? []
  const profBonus = character.proficiencyBonus ?? 2
  const itemTotals = getEquipmentModifierTotals(equipment)
  const strMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "strength", itemTotals))
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals))

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

function formatBonusTerm(bonus: number, label: string): string {
  if (bonus === 0) return ""
  return bonus > 0 ? ` + ${bonus} (${label})` : ` - ${Math.abs(bonus)} (${label})`
}

export function calculateEquippedAC(
  character: Pick<Character, "equipment" | "abilityScores" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
): { ac: number; breakdown: string; isEquippedArmor: boolean } {
  const equipment = character.equipment ?? []
  const itemTotals = getEquipmentModifierTotals(equipment)
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals))
  const itemBonus = itemTotals.armorClass

  const equippedArmor = equipment.filter(
    (item): item is Equipment & { armorStats: NonNullable<Equipment["armorStats"]> } =>
      item.equipped && item.type === "armor" && item.armorStats !== undefined
  )

  const bodyArmor = equippedArmor.find((item) => item.armorStats.armorType !== "shield")
  const shieldActive = equippedArmor.some((item) => item.armorStats.armorType === "shield")

  if (!bodyArmor) {
    const base = 10 + dexMod
    const ac = (shieldActive ? base + 2 : base) + itemBonus
    let breakdown = `10 + ${dexMod} DEX`
    if (shieldActive) breakdown += " + 2 (shield)"
    breakdown += formatBonusTerm(itemBonus, "item bonus")
    return { ac, breakdown, isEquippedArmor: false }
  }

  const { baseAC, armorType } = bodyArmor.armorStats
  let ac: number
  let breakdown: string

  if (armorType === "light") {
    ac = baseAC + dexMod
    breakdown = `${baseAC} + ${dexMod} DEX`
  } else if (armorType === "medium") {
    const dexBonus = Math.min(dexMod, 2)
    ac = baseAC + dexBonus
    breakdown = `${baseAC} + ${dexBonus} DEX (max +2)`
  } else {
    ac = baseAC
    breakdown = `${baseAC}`
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
): { initiative: number; breakdown: string } {
  const itemTotals = getEquipmentModifierTotals(character.equipment)
  const dexMod = getAbilityModifier(getEffectiveAbilityScoreFromTotals(character, "dexterity", itemTotals))
  const itemBonus = itemTotals.initiative
  return {
    initiative: dexMod + itemBonus,
    breakdown: `Dex ${formatModifier(dexMod)}${formatBonusTerm(itemBonus, "item bonus")}`,
  }
}

export function remainingUses(used: number | undefined, max: number | undefined): number {
  return (max ?? 0) - (used ?? 0)
}

export function spentFromRemaining(remaining: number, max: number | undefined): number {
  return (max ?? 0) - remaining
}

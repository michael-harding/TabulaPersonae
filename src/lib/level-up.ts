import type { AbilityScores, Character, Feature, FeatureEffects, HitPointsMode, SenseType, Skills } from "./character-types"
import {
  ABILITY_DISPLAY_NAMES,
  ABILITY_KEYS,
  FEATURE_KIND_LABELS,
  SENSE_LABELS,
  SENSE_TYPES,
  SKILL_ABILITY_MAP,
  SKILL_DISPLAY_NAMES,
  SPELL_SLOT_LEVELS,
  applyLevelChange,
  calculateEquippedAC,
  calculateInitiative,
  effectiveMaxUses,
  formatModifier,
  getActiveFeatureEffects,
  getCalculatedAbilityScore,
  getEffectiveAbilityScores,
  getEffectiveCarryingCapacity,
  getEffectiveHitDiceSize,
  getEffectiveMaxHp,
  getEffectiveMovementSpeeds,
  getEffectiveProficiencyBonus,
  getEffectiveSavingThrowProficiency,
  getEffectiveSenses,
  getEffectiveSkillProficiency,
  getEffectiveSpellcastingAbility,
  getEquipmentModifierTotals,
  getEquippedWeaponAttacks,
  getPassiveScore,
  getPreparedSpellsLimit,
  getProficiencyBonus,
  getSavingThrowModifier,
  getSkillModifier,
  getSpellAttackBonus,
  getSpellSaveDC,
  getSpellSlots,
  ordinal,
  safeFeatures,
  setsMaxHitPoints,
} from "./character-utils"
import { formatFeatureEffectsLine } from "./feature-effect-lines"
import { effectFeatureType, FEATURE_LIST_FIELDS } from "./required-features"

export const MAX_CHARACTER_LEVEL = 20

/** A level within 1–20, the character levels the sheet supports. */
export function clampCharacterLevel(level: number): number {
  return Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level) || 1))
}

/** The levels a level up from `from` to `to` gains, in order: from + 1 through to. */
export function levelsGained(from: number, to: number): number[] {
  const levels: number[] = []
  for (let level = from + 1; level <= to; level++) levels.push(level)
  return levels
}

/** The tier that sets how a character's Max HP is calculated, and the feature it belongs to. */
export interface HitPointsSource {
  feature: Feature
  /** The tier's index in feature.levelEffects. */
  tierIndex: number
  effects: FeatureEffects
  mode: HitPointsMode
}

/**
 * The tier calculateMaxHitPoints reads its mode and values from at the character's level: the last
 * qualifying tier that sets them, in the order getActiveFeatureEffects folds the features. Null when
 * no tier sets them, so Max HP is calculated per level from the hit die alone.
 */
export function findHitPointsSource(character: Character): HitPointsSource | null {
  const level = character.level ?? 1
  let source: HitPointsSource | null = null
  for (const field of FEATURE_LIST_FIELDS) {
    for (const feature of safeFeatures(character[field])) {
      const tiers = (feature.levelEffects ?? [])
        .map((tier, tierIndex) => ({ tier, tierIndex }))
        .filter(({ tier }) => tier.level <= level && setsMaxHitPoints(tier.effects))
        // Stable, so tiers of the same level keep their order, as in getActiveFeatureEffects
        .sort((a, b) => a.tier.level - b.tier.level)
      const last = tiers[tiers.length - 1]
      if (last) {
        source = { feature, tierIndex: last.tierIndex, effects: last.tier.effects, mode: last.tier.effects.hitPointsMode ?? "per-level" }
      }
    }
  }
  return source
}

/** What the player enters in the Level Up modal. */
export interface LevelUpInput {
  level: number
  /** The new Max HP, for a Hit Points feature with a single value. */
  flatHitPoints: number
  /** The roll for each level gained, by level, for a Hit Points feature with rolled values. */
  rolledHitPoints: Record<number, number>
}

function withFeatureReplaced(character: Character, feature: Feature): Character {
  const next = { ...character }
  for (const field of FEATURE_LIST_FIELDS) {
    const list = safeFeatures(character[field])
    if (list.some((f) => f.id === feature.id)) next[field] = list.map((f) => (f.id === feature.id ? feature : f))
  }
  return next
}

function withTierEffects(feature: Feature, tierIndex: number, effects: FeatureEffects): Feature {
  return {
    ...feature,
    levelEffects: (feature.levelEffects ?? []).map((tier, index) => (index === tierIndex ? { ...tier, effects } : tier)),
  }
}

/**
 * The character at its new level: the Hit Points feature given the new single value or the rolls
 * for the levels gained, and current HP raised by the Max HP gained (see applyLevelChange).
 * Everything else that depends on level is calculated from it, so nothing else is written.
 */
export function applyLevelUp(character: Character, input: LevelUpInput): Character {
  const fromLevel = character.level ?? 1
  const level = clampCharacterLevel(input.level)
  let next: Character = { ...character, level }

  const source = findHitPointsSource(next)
  if (source?.mode === "flat") {
    next = withFeatureReplaced(next, withTierEffects(source.feature, source.tierIndex, {
      ...source.effects,
      hitPointsFlatValue: Math.max(0, input.flatHitPoints),
    }))
  } else if (source?.mode === "rolled") {
    const rolls = [...(source.effects.hitPointsRolledLevels ?? [])]
    while (rolls.length < level) rolls.push(0)
    for (const gained of levelsGained(fromLevel, level)) {
      const roll = input.rolledHitPoints[gained]
      if (roll != null) rolls[gained - 1] = Math.max(0, roll)
    }
    next = withFeatureReplaced(next, withTierEffects(source.feature, source.tierIndex, { ...source.effects, hitPointsRolledLevels: rolls }))
  }

  return applyLevelChange(character, next)
}

export type LevelUpChangeGroup =
  | "Hit Points" | "Combat" | "Ability Scores" | "Saving Throws" | "Skills" | "Senses" | "Spellcasting" | "Feature Uses" | "Attacks" | "Inventory"

export const LEVEL_UP_CHANGE_GROUPS: readonly LevelUpChangeGroup[] = [
  "Hit Points", "Combat", "Ability Scores", "Saving Throws", "Skills", "Senses", "Spellcasting", "Feature Uses", "Attacks", "Inventory",
]

/** A value the level up changes, as the sheet will show it. */
export interface LevelUpChange {
  id: string
  group: LevelUpChangeGroup
  label: string
  before: string
  after: string
}

/** A value the player set by hand, which the level up leaves as it is although it would change. */
export interface LevelUpManualValue {
  id: string
  label: string
  value: string
  /** Why it needs updating. */
  reason: string
}

/** A feature that gains something in the levels gained: becoming available, or a new tier. */
export interface LevelUpGainedFeature {
  id: string
  name: string
  /** e.g. "Class Feature" */
  kind: string
  /** What it gains at each level, in level order. */
  gains: { level: number; text: string }[]
}

export interface LevelUpSummary {
  changes: LevelUpChange[]
  manualValues: LevelUpManualValue[]
  gainedFeatures: LevelUpGainedFeature[]
  /** The levels gained at which the character gets an Ability Score Improvement or a feat. */
  abilityScoreImprovementLevels: number[]
  /** Whether the character casts spells at its new level, so may have new spells and cantrips to choose. */
  spellcasting: boolean
}

/**
 * One value the sheet shows that can depend on level. `value` is what the sheet calculates. A value
 * with a calculated/custom toggle has `custom` and `customValue`: while it is custom the sheet shows
 * the value the player entered, which a level up leaves alone, so a change to the calculated value
 * becomes a reminder to update it by hand instead.
 */
interface TrackedValue {
  id: string
  group: LevelUpChangeGroup
  label: string
  value: (character: Character) => string
  custom?: (character: Character) => boolean
  customValue?: (character: Character) => string
}

const feet = (distance: number) => `${distance} ft`

const MOVEMENT_FIELDS = [
  { key: "walk", label: "Speed", value: "speed", flag: "useCalculatedSpeed" },
  { key: "fly", label: "Fly Speed", value: "flySpeed", flag: "useCalculatedFlySpeed" },
  { key: "swim", label: "Swim Speed", value: "swimSpeed", flag: "useCalculatedSwimSpeed" },
  { key: "climb", label: "Climb Speed", value: "climbSpeed", flag: "useCalculatedClimbSpeed" },
  { key: "burrow", label: "Burrow Speed", value: "burrowSpeed", flag: "useCalculatedBurrowSpeed" },
] as const

const PASSIVE_FIELDS = [
  { skill: "perception", value: "passivePerception", flag: "useCalculatedPassivePerception" },
  { skill: "insight", value: "passiveInsight", flag: "useCalculatedPassiveInsight" },
  { skill: "investigation", value: "passiveInvestigation", flag: "useCalculatedPassiveInvestigation" },
] as const

const SKILL_KEYS = Object.keys(SKILL_DISPLAY_NAMES) as (keyof Skills)[]

function passiveScore(character: Character, skill: keyof Skills): number {
  const proficiency = getEffectiveSkillProficiency(character, skill)
  return getPassiveScore(
    getEffectiveAbilityScores(character)[SKILL_ABILITY_MAP[skill]],
    getEffectiveProficiencyBonus(character),
    proficiency.proficient,
    proficiency.expertise,
  )
}

function savingThrow(character: Character, ability: keyof AbilityScores): number {
  return getSavingThrowModifier(
    getEffectiveAbilityScores(character)[ability],
    getEffectiveProficiencyBonus(character),
    getEffectiveSavingThrowProficiency(character, ability).proficient,
    getEquipmentModifierTotals(character.equipment).savingThrows[ability],
  )
}

function skillModifier(character: Character, skill: keyof Skills): number {
  const proficiency = getEffectiveSkillProficiency(character, skill)
  return getSkillModifier(
    getEffectiveAbilityScores(character)[SKILL_ABILITY_MAP[skill]],
    getEffectiveProficiencyBonus(character),
    proficiency.proficient,
    proficiency.expertise,
  )
}

// Each value is worked out with the same functions, and the same calculated/custom defaults, as the
// module that shows it, so the summary says what the sheet will show.
function trackedValues(before: Character, after: Character): TrackedValue[] {
  const values: TrackedValue[] = [
    {
      id: "max-hp", group: "Hit Points", label: "Max HP",
      value: (c) => String(getEffectiveMaxHp({ ...c, useCalculatedMaximumHp: true })),
      custom: (c) => !(c.useCalculatedMaximumHp ?? false),
      customValue: (c) => String(getEffectiveMaxHp(c)),
    },
    { id: "current-hp", group: "Hit Points", label: "Current HP", value: (c) => String(c.hitPoints?.current ?? 0) },
    {
      id: "hit-dice", group: "Hit Points", label: "Hit Dice",
      value: (c) => {
        const die = getEffectiveHitDiceSize(c)
        return die == null ? "None" : `${c.level ?? 1}d${die}`
      },
    },
    {
      id: "proficiency-bonus", group: "Combat", label: "Proficiency Bonus",
      value: (c) => formatModifier(getProficiencyBonus(c.level ?? 1)),
      custom: (c) => !(c.useCalculatedProficiencyBonus ?? false),
      customValue: (c) => formatModifier(getEffectiveProficiencyBonus(c)),
    },
    {
      id: "armor-class", group: "Combat", label: "Armor Class",
      value: (c) => String(calculateEquippedAC(c).ac),
      custom: (c) => !(c.useCalculatedArmorClass ?? true),
      customValue: (c) => String(c.armorClass ?? 10),
    },
    {
      id: "initiative", group: "Combat", label: "Initiative",
      value: (c) => formatModifier(calculateInitiative(c).initiative),
      custom: (c) => !(c.useCalculatedInitiative ?? false),
      customValue: (c) => formatModifier(c.initiative ?? 0),
    },
    ...MOVEMENT_FIELDS.map((field): TrackedValue => ({
      id: `movement-${field.key}`, group: "Combat", label: field.label,
      value: (c) => feet(getEffectiveMovementSpeeds(c)[field.key]),
      custom: (c) => !(c[field.flag] ?? true),
      customValue: (c) => feet(c[field.value] ?? 0),
    })),
    ...ABILITY_KEYS.map((ability): TrackedValue => ({
      id: `ability-${ability}`, group: "Ability Scores", label: ABILITY_DISPLAY_NAMES[ability],
      value: (c) => String(getCalculatedAbilityScore(c, ability)),
      custom: (c) => !(c.useCalculatedAbilityScores?.[ability] ?? true),
      customValue: (c) => String(getEffectiveAbilityScores(c)[ability]),
    })),
    ...ABILITY_KEYS.map((ability): TrackedValue => ({
      id: `save-${ability}`, group: "Saving Throws", label: ABILITY_DISPLAY_NAMES[ability],
      value: (c) => formatModifier(savingThrow(c, ability)),
    })),
    ...SKILL_KEYS.map((skill): TrackedValue => ({
      id: `skill-${skill}`, group: "Skills", label: SKILL_DISPLAY_NAMES[skill],
      value: (c) => formatModifier(skillModifier(c, skill)),
    })),
    ...PASSIVE_FIELDS.map((field): TrackedValue => ({
      id: `passive-${field.skill}`, group: "Skills", label: `Passive ${SKILL_DISPLAY_NAMES[field.skill]}`,
      value: (c) => String(passiveScore(c, field.skill)),
      custom: (c) => !(c[field.flag] ?? true),
      customValue: (c) => String(c[field.value] ?? passiveScore(c, field.skill)),
    })),
    ...SENSE_TYPES.map((sense: SenseType): TrackedValue => ({
      id: `sense-${sense}`, group: "Senses", label: SENSE_LABELS[sense],
      value: (c) => feet(getEffectiveSenses(c)[sense]),
      custom: (c) => !(c.useCalculatedSenses?.[sense] ?? true),
      customValue: (c) => feet(c.senses?.[sense] ?? 0),
    })),
    {
      id: "spellcasting-ability", group: "Spellcasting", label: "Spellcasting Ability",
      value: (c) => {
        const ability = getEffectiveSpellcastingAbility(c)
        return ability ? ABILITY_DISPLAY_NAMES[ability] : "None"
      },
    },
    {
      id: "spell-save-dc", group: "Spellcasting", label: "Spell Save DC",
      value: (c) => String(getSpellSaveDC(c)),
      custom: (c) => !(c.useCalculatedSpellSaveDC ?? true),
      customValue: (c) => String(c.spellSaveDC),
    },
    {
      id: "spell-attack-bonus", group: "Spellcasting", label: "Spell Attack Bonus",
      value: (c) => formatModifier(getSpellAttackBonus(c)),
      custom: (c) => !(c.useCalculatedSpellAttackBonus ?? true),
      customValue: (c) => formatModifier(c.spellAttackBonus),
    },
    ...SPELL_SLOT_LEVELS.map((slotLevel): TrackedValue => ({
      id: `spell-slots-${slotLevel}`, group: "Spellcasting", label: `${ordinal(slotLevel)} Level Spell Slots`,
      value: (c) => String(getSpellSlots(c)[slotLevel].total),
    })),
    { id: "prepared-spells", group: "Spellcasting", label: "Prepared Spells", value: (c) => String(getPreparedSpellsLimit(c)?.total ?? 0) },
    {
      id: "carrying-capacity", group: "Inventory", label: "Carrying Capacity",
      value: (c) => `${getEffectiveCarryingCapacity(c)} lb`,
      custom: (c) => !(c.useCalculatedCarryingCapacity ?? true),
      customValue: (c) => `${c.carryingCapacity ?? getEffectiveCarryingCapacity(c)} lb`,
    },
  ]

  // A feature's max uses can follow level or proficiency bonus (see effectiveMaxUses)
  for (const field of FEATURE_LIST_FIELDS) {
    for (const feature of safeFeatures(before[field])) {
      if ((feature.maxUsesMode ?? "flat") === "flat") continue
      values.push({
        id: `feature-uses-${feature.id}`, group: "Feature Uses", label: feature.name,
        value: (c) => String(effectiveMaxUses(safeFeatures(c[field]).find((f) => f.id === feature.id) ?? feature, c)),
      })
    }
  }

  // Equipped weapons' attacks, which add the proficiency bonus and ability modifier
  const weaponIds = new Set([...getEquippedWeaponAttacks(before), ...getEquippedWeaponAttacks(after)].map((attack) => attack.id))
  for (const id of weaponIds) {
    const attackOf = (c: Character) => getEquippedWeaponAttacks(c).find((attack) => attack.id === id)
    const name = (attackOf(after) ?? attackOf(before))?.name ?? ""
    values.push(
      { id: `${id}-attack`, group: "Attacks", label: `${name} Attack Bonus`, value: (c) => formatModifier(attackOf(c)?.attackBonus ?? 0) },
      { id: `${id}-damage`, group: "Attacks", label: `${name} Damage`, value: (c) => attackOf(c)?.damage ?? "" },
    )
  }

  return values
}

// A typed DC, as in "DEX save DC 13"
const TYPED_DC = /\bDC\s*\d+/i

/**
 * Actions and features with an attack bonus or save DC typed in by hand: they don't follow the
 * proficiency bonus, so they need updating when it changes. An attack bonus of 0 means no attack roll.
 */
function handEnteredAttacks(character: Character): LevelUpManualValue[] {
  const entries = [
    ...(character.attacks ?? []),
    ...(character.bonusActions ?? []),
    ...(character.reactions ?? []),
    ...(character.otherActions ?? []),
    ...FEATURE_LIST_FIELDS.flatMap((field) => safeFeatures(character[field])),
  ]
  const values: LevelUpManualValue[] = []
  for (const entry of entries) {
    const attackSave = "attackSave" in entry ? (entry.attackSave ?? "") : ""
    if (entry.attackBonus) {
      values.push({ id: `attack-bonus-${entry.id}`, label: `${entry.name} Attack Bonus`, value: formatModifier(entry.attackBonus), reason: "Entered by hand" })
    }
    if (TYPED_DC.test(attackSave)) {
      values.push({ id: `attack-save-${entry.id}`, label: `${entry.name} Save`, value: attackSave, reason: "Entered by hand" })
    }
  }
  return values
}

function gainedFeatures(character: Character, fromLevel: number, toLevel: number): LevelUpGainedFeature[] {
  const gainedAt = (level: number) => level > fromLevel && level <= toLevel
  const gained: LevelUpGainedFeature[] = []
  for (const field of FEATURE_LIST_FIELDS) {
    for (const feature of safeFeatures(character[field])) {
      const gains: { level: number; text: string }[] = []
      // An action feature with an "At Level" becomes available at that level
      if (feature.level != null && gainedAt(feature.level)) gains.push({ level: feature.level, text: "Becomes available" })
      const type = effectFeatureType(feature.featureType ?? "Custom")
      for (const tier of feature.levelEffects ?? []) {
        if (!gainedAt(tier.level)) continue
        gains.push({ level: tier.level, text: formatFeatureEffectsLine(type, tier.effects) || "New benefits" })
      }
      if (gains.length === 0) continue
      gained.push({ id: feature.id, name: feature.name, kind: FEATURE_KIND_LABELS[feature.source], gains: gains.sort((a, b) => a.level - b.level) })
    }
  }
  return gained.sort((a, b) => a.gains[0].level - b.gains[0].level)
}

/**
 * What a level up changes, from the character before it to the character after it (applyLevelUp):
 * every value the sheet shows that changes, the features gaining something, the values the player
 * set by hand that now need updating, and the choices the player makes themselves.
 */
export function getLevelUpSummary(before: Character, after: Character): LevelUpSummary {
  const fromLevel = before.level ?? 1
  const toLevel = after.level ?? 1
  const changes: LevelUpChange[] = []
  const manualValues: LevelUpManualValue[] = []

  for (const tracked of trackedValues(before, after)) {
    const valueBefore = tracked.value(before)
    const valueAfter = tracked.value(after)
    if (valueBefore === valueAfter) continue
    if (tracked.custom?.(before)) {
      manualValues.push({ id: tracked.id, label: tracked.label, value: tracked.customValue?.(before) ?? valueBefore, reason: "Custom value" })
    } else {
      changes.push({ id: tracked.id, group: tracked.group, label: tracked.label, before: valueBefore, after: valueAfter })
    }
  }

  if (getEffectiveProficiencyBonus(before) !== getEffectiveProficiencyBonus(after)) {
    manualValues.push(...handEnteredAttacks(before))
  }

  const afterEffects = getActiveFeatureEffects(after)
  const spellSlots = getSpellSlots(after)
  return {
    changes,
    manualValues,
    gainedFeatures: gainedFeatures(after, fromLevel, toLevel),
    abilityScoreImprovementLevels: afterEffects.abilityScoreImprovementLevels.filter((level) => level > fromLevel && level <= toLevel),
    spellcasting: !!afterEffects.spellcastingAbility
      || SPELL_SLOT_LEVELS.some((slotLevel) => spellSlots[slotLevel].total > 0)
      || afterEffects.preparedSpellsGrants.length > 0
      || (after.spells ?? []).length > 0,
  }
}


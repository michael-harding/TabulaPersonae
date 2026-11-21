import type { AbilityScores, Feature, FeatureEffects, FeatureLevelEffect, FeatureTypeValue, Spell } from "./character-types"
import { ABILITY_ABBREVIATIONS, ABILITY_KEYS, formatModifier, ordinal, SENSE_LABELS, SENSE_TYPES, SKILL_DISPLAY_NAMES, SPELL_SLOT_LEVELS } from "./character-utils"
import { effectFeatureType } from "./required-features"

// Formats one tier's effects into a single human-readable summary line for card display, keyed off
// the same featureType switch LevelEffectRow (features-module.tsx) uses to decide which fields are relevant. Returns ''
// when nothing in this tier is populated (e.g. a freshly added, still-empty tier) so callers can
// filter it out rather than rendering a blank line — mirrors the "only show populated fields" idiom
// used by the Spell/Equipment cards' <Show when={field}> rows.
/** Names a spell by id, for a 'Spells' feature's line. */
export type SpellNameResolver = (spellId: string) => string

/** The resolver for a character's spells. A spell no longer in the list (an imported file) is named as such. */
export function spellNameResolver(spells: readonly Pick<Spell, "id" | "name">[] | undefined): SpellNameResolver {
  const names = new Map((spells ?? []).map((spell) => [spell.id, spell.name]))
  return (spellId) => names.get(spellId) ?? "Unknown spell"
}

export function formatFeatureEffectsLine(featureType: FeatureTypeValue, effects: FeatureEffects, spellName?: SpellNameResolver): string {
  const parts: string[] = []
  switch (featureType) {
    case 'Hit Points': {
      if (effects.hitDiceSize) parts.push(`Hit Die: d${effects.hitDiceSize}`)
      if (effects.hitPointsMode === 'flat' && effects.hitPointsFlatValue) {
        parts.push(`Fixed Max HP: ${effects.hitPointsFlatValue}`)
      } else if (effects.hitPointsMode === 'per-level' && effects.hitPointsPerLevelAmount) {
        parts.push(`+${effects.hitPointsPerLevelAmount} HP per level after 1st`)
      } else if (effects.hitPointsMode === 'rolled' && (effects.hitPointsRolledLevels?.length ?? 0) > 0) {
        parts.push(`Rolled HP: ${effects.hitPointsRolledLevels!.filter((v) => v > 0).join(', ')}`)
      }
      break
    }
    case 'Size':
      if (effects.size) parts.push(`Size: ${effects.size}`)
      break
    case 'Creature Type':
      if (effects.creatureType) parts.push(`Creature Type: ${effects.creatureType}`)
      break
    case 'Max HP Bonus':
      if (effects.hpBonusPerLevel) parts.push(`+${effects.hpBonusPerLevel} Max HP per level`)
      break
    case 'Ability Score Improvement':
      if ((effects.abilityScoreImprovementLevels?.length ?? 0) > 0) parts.push(`Levels: ${effects.abilityScoreImprovementLevels!.join(', ')}`)
      break
    case 'Prepared Spells':
      if (effects.preparedSpells) parts.push(`Prepared Spells: ${effects.preparedSpells}`)
      break
    case 'Saving Throw Proficiency':
      if ((effects.savingThrowProficiencies?.length ?? 0) > 0) {
        parts.push(`Saving Throws: ${effects.savingThrowProficiencies!.map((a) => ABILITY_ABBREVIATIONS[a]).join(', ')}`)
      }
      break
    case 'Skill Proficiency':
      if ((effects.skillProficiencies?.length ?? 0) > 0) {
        parts.push(`Skills: ${effects.skillProficiencies!
          .map((g) => SKILL_DISPLAY_NAMES[g.skill] + (g.expertise ? ' (Expertise)' : ''))
          .join(', ')}`)
      }
      break
    case 'Other Proficiency':
      if ((effects.otherProficiencies?.length ?? 0) > 0) parts.push(`Proficiencies: ${effects.otherProficiencies!.join(', ')}`)
      break
    case 'Speed': {
      const speeds: string[] = []
      if (effects.speed) speeds.push(`${effects.speed} ft`)
      if (effects.flySpeed) speeds.push(`Fly ${effects.flySpeed} ft`)
      if (effects.swimSpeed) speeds.push(`Swim ${effects.swimSpeed} ft`)
      if (effects.climbSpeed) speeds.push(`Climb ${effects.climbSpeed} ft`)
      if (effects.burrowSpeed) speeds.push(`Burrow ${effects.burrowSpeed} ft`)
      if (speeds.length > 0) parts.push(`Speed: ${speeds.join(', ')}`)
      break
    }
    case 'Senses': {
      const senses = SENSE_TYPES
        .filter((s) => effects.senses?.[s])
        .map((s) => `${SENSE_LABELS[s]} ${effects.senses![s]} ft`)
      if (senses.length > 0) parts.push(senses.join(', '))
      break
    }
    case 'Damage Resistance/Immunity/Vulnerability':
      if ((effects.resistances?.length ?? 0) > 0) parts.push(`Resistances: ${effects.resistances!.join(', ')}`)
      if ((effects.immunities?.length ?? 0) > 0) parts.push(`Immunities: ${effects.immunities!.join(', ')}`)
      if ((effects.vulnerabilities?.length ?? 0) > 0) parts.push(`Vulnerabilities: ${effects.vulnerabilities!.join(', ')}`)
      break
    case 'Condition Immunity':
      if ((effects.conditionImmunities?.length ?? 0) > 0) parts.push(`Condition Immunities: ${effects.conditionImmunities!.join(', ')}`)
      break
    case 'Language':
      if ((effects.languages?.length ?? 0) > 0) parts.push(`Languages: ${effects.languages!.join(', ')}`)
      break
    case 'Carrying Capacity': {
      const cap: string[] = []
      if (effects.carryingCapacityBonus) cap.push(`${formatModifier(effects.carryingCapacityBonus)} lbs`)
      if (effects.carryingCapacityMultiplier) cap.push(`×${effects.carryingCapacityMultiplier}`)
      if (cap.length > 0) parts.push(`Carrying Capacity: ${cap.join(', ')}`)
      break
    }
    case 'Ability Scores': {
      const fmtGroup = (label: string, record: Partial<Record<keyof AbilityScores, number>> | undefined, fmt: (v: number) => string) => {
        const entries = ABILITY_KEYS.filter((a) => record?.[a] != null)
        if (entries.length === 0) return
        parts.push(`${label}: ${entries.map((a) => `${ABILITY_ABBREVIATIONS[a]} ${fmt(record![a]!)}`).join(', ')}`)
      }
      fmtGroup('Ability Scores', effects.abilityScores, formatModifier)
      fmtGroup('Floor', effects.abilityScoreFloors, (v) => `${v}`)
      fmtGroup('Max Cap', effects.abilityScoreMaxCaps, (v) => `${v}`)
      fmtGroup('Base Max', effects.abilityScoreBaseMax, (v) => `${v}`)
      break
    }
    case 'Spells': {
      const ids = effects.grantedSpells ?? []
      if (ids.length === 0) break
      parts.push(`Spells: ${ids.map((id) => spellName?.(id) ?? "Unknown spell").join(', ')}`)
      if (effects.grantedSpellsSlots) parts.push('Always prepared')
      const freeCasts = effects.grantedSpellsFreeCasts ?? 0
      if (freeCasts > 0) parts.push(`${freeCasts} free cast${freeCasts === 1 ? '' : 's'} each`)
      break
    }
    // The ability is the whole feature's, so it gets a line of its own (see featureEffectLines)
    case 'Spellcasting': {
      const slots = SPELL_SLOT_LEVELS.filter((level) => (effects.spellSlots?.[level] ?? 0) > 0)
      if (slots.length > 0) parts.push(`Spell Slots: ${slots.map((level) => `${effects.spellSlots![level]} × ${ordinal(level)}`).join(', ')}`)
      break
    }
  }
  return parts.join(' · ')
}

// Builds the display lines for a feature's levelEffects — one line per tier that has anything
// populated (a tier added and never filled in is dropped silently rather than rendering blank).
// 'Action' never reaches here (see the Features module's card JSX, which only calls this for other featureTypes), and
// 'Custom' has no tiers.
// `level` is null for a line about the whole feature rather than one tier: a Spellcasting
// feature's ability, which every tier carries.
export function featureEffectLines(feature: Feature, spellName?: SpellNameResolver): { level: number | null; text: string }[] {
  const type = effectFeatureType(feature.featureType ?? 'Custom')
  const tierLines = (feature.levelEffects ?? [])
    .map((tier) => ({ level: tier.level, text: formatFeatureEffectsLine(type, tier.effects, spellName) }))
    .filter((line) => line.text !== '')
  const ability = type === 'Spellcasting' ? spellcastingAbilityOf(feature.levelEffects ?? []) : undefined
  return ability ? [{ level: null, text: `Spellcasting Ability: ${ABILITY_ABBREVIATIONS[ability]}` }, ...tierLines] : tierLines
}

// A Spellcasting feature's ability: every row carries it, so the first row that has one
export function spellcastingAbilityOf(tiers: FeatureLevelEffect[]): keyof AbilityScores | undefined {
  return tiers.find((tier) => tier.effects.spellcastingAbility)?.effects.spellcastingAbility
}

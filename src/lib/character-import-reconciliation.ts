import type { AbilityScores, Character } from "./character-types"
import {
  calculateEquippedAC,
  calculateInitiative,
  computeSpellModifier,
  getCalculatedAbilityScore,
  getEffectiveAbilityScore,
  getEffectiveCarryingCapacity,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
  BASE_ATTUNEMENT_LIMIT,
} from "./character-utils"

const ABILITY_KEYS: (keyof AbilityScores)[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * getSpellSaveDC/getSpellAttackBonus dispatch to their Character overload via
 * `"spellcastingAbility" in x`. A hand-edited/partial import missing that key
 * would otherwise silently fall into the wrong overload branch.
 */
function withSpellcastingAbilityKey(character: Character): Character {
  return { ...character, spellcastingAbility: character.spellcastingAbility ?? "" }
}

function reconcileAbilityScoreOverrides(character: any): any {
  const overrides = character.abilityScoreOverrides
  if (!overrides || typeof overrides !== "object") return character

  const nextFlags: Partial<Record<keyof AbilityScores, boolean>> = { ...(character.useCalculatedAbilityScores ?? {}) }
  let touched = false

  for (const ability of ABILITY_KEYS) {
    const overrideValue = overrides[ability]
    if (!isFiniteNumber(overrideValue)) continue
    const calculated = getCalculatedAbilityScore(character, ability)
    nextFlags[ability] = overrideValue === calculated
    touched = true
  }

  return touched ? { ...character, useCalculatedAbilityScores: nextFlags } : character
}

interface ScalarFieldSpec {
  valueKey: keyof Character
  toggleKey: keyof Character
  compute: (character: Character) => number
}

const SCALAR_FIELD_SPECS: ScalarFieldSpec[] = [
  { valueKey: "armorClass", toggleKey: "useCalculatedArmorClass", compute: (c) => calculateEquippedAC(c).ac },
  { valueKey: "initiative", toggleKey: "useCalculatedInitiative", compute: (c) => calculateInitiative(c).initiative },
  { valueKey: "proficiencyBonus", toggleKey: "useCalculatedProficiencyBonus", compute: (c) => getProficiencyBonus(c.level ?? 1) },
  {
    valueKey: "passivePerception",
    toggleKey: "useCalculatedPassivePerception",
    compute: (c) =>
      getPassiveScore(
        getEffectiveAbilityScore(c, "wisdom"),
        c.proficiencyBonus ?? 2,
        c.skills?.perception?.proficient ?? false,
        c.skills?.perception?.expertise ?? false,
      ),
  },
  {
    valueKey: "passiveInsight",
    toggleKey: "useCalculatedPassiveInsight",
    compute: (c) =>
      getPassiveScore(
        getEffectiveAbilityScore(c, "wisdom"),
        c.proficiencyBonus ?? 2,
        c.skills?.insight?.proficient ?? false,
        c.skills?.insight?.expertise ?? false,
      ),
  },
  {
    valueKey: "passiveInvestigation",
    toggleKey: "useCalculatedPassiveInvestigation",
    compute: (c) =>
      getPassiveScore(
        getEffectiveAbilityScore(c, "intelligence"),
        c.proficiencyBonus ?? 2,
        c.skills?.investigation?.proficient ?? false,
        c.skills?.investigation?.expertise ?? false,
      ),
  },
  { valueKey: "attunementLimit", toggleKey: "useCalculatedAttunementLimit", compute: () => BASE_ATTUNEMENT_LIMIT },
  { valueKey: "carryingCapacity", toggleKey: "useCalculatedCarryingCapacity", compute: (c) => getEffectiveCarryingCapacity(c) },
  { valueKey: "spellSaveDC", toggleKey: "useCalculatedSpellSaveDC", compute: (c) => getSpellSaveDC(withSpellcastingAbilityKey(c)) },
  { valueKey: "spellAttackBonus", toggleKey: "useCalculatedSpellAttackBonus", compute: (c) => getSpellAttackBonus(withSpellcastingAbilityKey(c)) },
  { valueKey: "spellModifier", toggleKey: "useCalculatedSpellModifier", compute: (c) => computeSpellModifier(c) },
]

function reconcileScalarField(character: any, spec: ScalarFieldSpec): any {
  const value = character[spec.valueKey]
  if (!isFiniteNumber(value)) return character
  const calculated = spec.compute(character as Character)
  return { ...character, [spec.toggleKey]: value === calculated }
}

/**
 * For a character arriving from outside the app (JSON re-import, PDF scrape),
 * infer whether each calculated/custom stat should be treated as calculated
 * or custom by comparing the imported value against what the app would
 * currently calculate. Runs once, at import time only — never on normal load,
 * so it can't fight a user's later deliberate toggle changes.
 */
export function reconcileImportedCharacter(raw: any): Character {
  if (!raw || typeof raw !== "object") return raw as Character
  try {
    let character: any = reconcileAbilityScoreOverrides({ ...raw })
    for (const spec of SCALAR_FIELD_SPECS) {
      character = reconcileScalarField(character, spec)
    }
    return character as Character
  } catch (error) {
    console.error("Failed to reconcile calculated fields on imported character:", error)
    return raw as Character
  }
}

export function reconcileImportedCharacters(raw: unknown): Character[] {
  return Array.isArray(raw) ? raw.map(reconcileImportedCharacter) : []
}

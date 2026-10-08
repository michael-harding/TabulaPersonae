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
  ABILITY_KEYS,
} from "./character-utils"

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
  // Mirrors this field's own `useCalculatedX ?? <default>` fallback in the module that owns its
  // editing UI (combat-stats-module.tsx / actions-module.tsx / skills-proficiencies-module.tsx /
  // equipment-inventory-module.tsx) — needed by freshenCalculatedFields below to know whether an
  // *absent* toggle should be treated as calculated or custom, matching what the UI already shows.
  defaultCalculated: boolean
}

const SCALAR_FIELD_SPECS: ScalarFieldSpec[] = [
  { valueKey: "armorClass", toggleKey: "useCalculatedArmorClass", compute: (c) => calculateEquippedAC(c).ac, defaultCalculated: true },
  { valueKey: "initiative", toggleKey: "useCalculatedInitiative", compute: (c) => calculateInitiative(c).initiative, defaultCalculated: false },
  { valueKey: "proficiencyBonus", toggleKey: "useCalculatedProficiencyBonus", compute: (c) => getProficiencyBonus(c.level ?? 1), defaultCalculated: false },
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
    defaultCalculated: true,
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
    defaultCalculated: true,
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
    defaultCalculated: true,
  },
  { valueKey: "attunementLimit", toggleKey: "useCalculatedAttunementLimit", compute: () => BASE_ATTUNEMENT_LIMIT, defaultCalculated: true },
  { valueKey: "carryingCapacity", toggleKey: "useCalculatedCarryingCapacity", compute: (c) => getEffectiveCarryingCapacity(c), defaultCalculated: true },
  { valueKey: "spellSaveDC", toggleKey: "useCalculatedSpellSaveDC", compute: (c) => getSpellSaveDC(withSpellcastingAbilityKey(c)), defaultCalculated: true },
  { valueKey: "spellAttackBonus", toggleKey: "useCalculatedSpellAttackBonus", compute: (c) => getSpellAttackBonus(withSpellcastingAbilityKey(c)), defaultCalculated: true },
  { valueKey: "spellModifier", toggleKey: "useCalculatedSpellModifier", compute: (c) => computeSpellModifier(c), defaultCalculated: true },
]

function reconcileScalarField(character: any, spec: ScalarFieldSpec): any {
  const value = character[spec.valueKey]
  if (!isFiniteNumber(value)) return character
  const calculated = spec.compute(character as Character)
  return { ...character, [spec.toggleKey]: value === calculated }
}

/**
 * Refreshes every field the character currently has marked calculated (explicitly, or by the same
 * default its own editing module falls back to when the toggle is absent) to match a live
 * recompute — meant to run right before a character leaves the app (export). The backing store for
 * a calculated field like spellSaveDC is normally only synced when its owning module is explicitly
 * saved (see e.g. actions-module.tsx's handleSave), so it can silently drift from a fresh
 * recompute — a level-up, an ability score change — while the toggle itself stays correctly
 * "calculated" and the live UI keeps displaying the right number regardless (display always
 * recomputes live, never reads the stale stored value directly). That drift is invisible until the
 * character is exported and re-imported: reconcileScalarField above has no way to know the toggle
 * was right and the stored number was just stale, so it infers "custom" from the mismatch alone.
 * Freshening at export time means the exported snapshot never contains that contradiction.
 */
export function freshenCalculatedFields(character: Character): Character {
  let next = character
  for (const spec of SCALAR_FIELD_SPECS) {
    const useCalculated = (next[spec.toggleKey] as boolean | undefined) ?? spec.defaultCalculated
    if (!useCalculated) continue
    const calculated = spec.compute(next)
    if (next[spec.valueKey] === calculated) continue
    next = { ...next, [spec.valueKey]: calculated }
  }
  return next
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

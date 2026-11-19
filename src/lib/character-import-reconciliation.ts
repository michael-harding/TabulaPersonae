import type { AbilityScores, Character } from "./character-types"
import {
  getCalculatedAbilityScore,
  isCalculated,
  ABILITY_KEYS,
  CUSTOMIZABLE_VALUES,
  type CustomizableValueKey,
} from "./character-utils"

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function reconcileAbilityScoreOverrides(character: Character): Character {
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

// The values with a calculated/custom toggle stored at the top level of the character, under the
// same name as their CUSTOMIZABLE_VALUES key. Maximum HP is nested in hitPoints, so it has its own
// functions below; the movement speeds are left to character-migrations.ts.
const SCALAR_FIELDS = [
  "armorClass",
  "initiative",
  "proficiencyBonus",
  "passivePerception",
  "passiveInsight",
  "passiveInvestigation",
  "attunementLimit",
  "carryingCapacity",
  "spellSaveDC",
  "spellAttackBonus",
] as const satisfies (CustomizableValueKey & keyof Character)[]

type ScalarField = (typeof SCALAR_FIELDS)[number]

function reconcileScalarField(character: Character, field: ScalarField): Character {
  const value = character[field]
  if (!isFiniteNumber(value)) return character
  const spec = CUSTOMIZABLE_VALUES[field]
  return { ...character, [spec.toggle]: value === spec.calculated(character) }
}

// Maximum HP is nested in hitPoints, so it can't be a ScalarFieldSpec. Compared without
// temporaryMaximum, which calculateMaxHitPoints leaves out as well.
function reconcileMaximumHp(character: Character): Character {
  const maximum = character.hitPoints?.maximum
  if (!isFiniteNumber(maximum)) return character
  return { ...character, useCalculatedMaximumHp: maximum === CUSTOMIZABLE_VALUES.maximumHp.calculated(character) }
}

function freshenMaximumHp(character: Character): Character {
  if (!isCalculated(character, "maximumHp")) return character
  const calculated = CUSTOMIZABLE_VALUES.maximumHp.calculated(character)
  if (character.hitPoints?.maximum === calculated) return character
  return { ...character, hitPoints: { ...character.hitPoints, maximum: calculated } }
}

/**
 * Refreshes every field the character currently has marked calculated (explicitly, or by the same
 * default the sheet falls back to when the toggle is absent) to match a live
 * recompute — meant to run right before a character leaves the app (export). The stored value of
 * a calculated field like spellSaveDC is only rewritten when an edit form that shows it is saved
 * (e.g. the Spells module's Spell Save DC), so it can silently drift from a fresh
 * recompute — a level-up, an ability score change — while the toggle itself stays correctly
 * "calculated" and the live UI keeps displaying the right number regardless (display always
 * recomputes live, never reads the stale stored value directly). That drift is invisible until the
 * character is exported and re-imported: reconcileScalarField above has no way to know the toggle
 * was right and the stored number was just stale, so it infers "custom" from the mismatch alone.
 * Freshening at export time means the exported snapshot never contains that contradiction.
 */
export function freshenCalculatedFields(character: Character): Character {
  let next = character
  for (const field of SCALAR_FIELDS) {
    if (!isCalculated(next, field)) continue
    const calculated = CUSTOMIZABLE_VALUES[field].calculated(next)
    if (next[field] === calculated) continue
    next = { ...next, [field]: calculated }
  }
  return freshenMaximumHp(next)
}

/**
 * For a character arriving from outside the app (JSON re-import, PDF scrape),
 * infer whether each calculated/custom stat should be treated as calculated
 * or custom by comparing the imported value against what the app would
 * currently calculate. Runs once, at import time only — never on normal load,
 * so it can't fight a user's later deliberate toggle changes.
 *
 * Takes a `Character`, not raw file contents: every import path runs migrateCharacter first
 * (see header-menu.tsx), which is where untyped data becomes a `Character`.
 */
export function reconcileImportedCharacter(imported: Character): Character {
  try {
    let character = reconcileAbilityScoreOverrides(imported)
    for (const field of SCALAR_FIELDS) {
      character = reconcileScalarField(character, field)
    }
    return reconcileMaximumHp(character)
  } catch (error) {
    console.error("Failed to reconcile calculated fields on imported character:", error)
    return imported
  }
}

export function reconcileImportedCharacters(imported: Character[]): Character[] {
  return imported.map(reconcileImportedCharacter)
}

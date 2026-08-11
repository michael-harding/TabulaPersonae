import type { Character, Feature } from "./character-types"
import { calculateEquippedAC, getActiveFeatureEffects, getEffectiveMovementSpeeds, getEffectiveSize, parseHitDiceSize } from "./character-utils"

const CALCULATED_VALUE_FLAGS = [
  "useCalculatedArmorClass",
  "useCalculatedSpeed",
  "useCalculatedFlySpeed",
  "useCalculatedSwimSpeed",
  "useCalculatedClimbSpeed",
  "useCalculatedBurrowSpeed",
  "useCalculatedSize",
] as const

/**
 * Spellcasting ability and hit die size used to be plain `character.spellcastingAbility`/
 * `hitDice`/`hitDiceSize` fields; they're now derived exclusively from a Class Feature/Species
 * Trait/Feat's `levelEffects` (see getEffectiveSpellcastingAbility/getEffectiveHitDiceSize in
 * character-utils.ts, which never read the legacy fields). A character saved before this system
 * existed has the legacy fields but no Feature granting the equivalent effect, so it silently
 * loses spellcasting/hit-dice functionality unless one is synthesized here. Two separate Features
 * (not one combined one) because the Features-tab edit form infers a single type per feature from
 * its effects (spellcastingAbility is checked before hitDiceSize) — combining them risks the edit
 * form silently dropping one on save.
 */
function importLegacyFeatureGrants(raw: any): Feature[] | undefined {
  const activeEffects = getActiveFeatureEffects(raw)
  const additions: Feature[] = []

  if (raw.spellcastingAbility && !activeEffects.spellcastingAbility) {
    additions.push({
      id: crypto.randomUUID(),
      name: "Legacy Spellcasting",
      description: "Automatically created when this character was upgraded, to preserve its previously-set spellcasting ability. Feel free to edit or replace with a proper Class Feature.",
      source: "class-feature",
      levelEffects: [{ level: 1, effects: { spellcastingAbility: raw.spellcastingAbility } }],
    })
  }

  const legacyHitDiceSize = raw.hitDiceSize ?? (raw.hitDice ? parseHitDiceSize(raw.hitDice) : undefined)
  if (legacyHitDiceSize && !activeEffects.hitDiceSize) {
    additions.push({
      id: crypto.randomUUID(),
      name: "Legacy Hit Points",
      description: "Automatically created when this character was upgraded, to preserve its previously-set hit die size. Feel free to edit or replace with a proper Class Feature.",
      source: "class-feature",
      levelEffects: [{ level: 1, effects: { hitDiceSize: legacyHitDiceSize } }],
    })
  }

  return additions.length > 0 ? [...(raw.classFeatures ?? []), ...additions] : undefined
}

/**
 * Flags introduced after launch default to "calculated" for brand-new characters (see
 * createDefaultCharacter), but characters saved before a given flag existed have no such key in
 * their persisted JSON. Back-fill those based on whether the character's existing value already
 * matches what the calculation produces: if so, switching to calculated changes nothing on screen
 * (and the character gains future recalculation for free); if the stored value differs, keep it in
 * custom mode so the manually-entered value isn't silently replaced by a different one.
 *
 * "Some CALCULATED_VALUE_FLAGS key is missing" also doubles as the signal for "this save predates
 * the whole branch that introduced Feature-based spellcasting/hit-dice" (they shipped together),
 * so the legacy-Feature-grant import below is gated on the same check.
 */
export function migrateCharacter(raw: any): Character {
  if (!raw || typeof raw !== "object") return raw as Character
  if (CALCULATED_VALUE_FLAGS.every((flag) => flag in raw)) return raw as Character

  const patch: Record<string, unknown> = {}
  const backfill = (flag: (typeof CALCULATED_VALUE_FLAGS)[number], storedValue: unknown, calculatedValue: unknown) => {
    if (flag in raw) return
    patch[flag] = storedValue === undefined || storedValue === calculatedValue
  }

  backfill("useCalculatedArmorClass", raw.armorClass, calculateEquippedAC(raw).ac)
  const movement = getEffectiveMovementSpeeds(raw)
  backfill("useCalculatedSpeed", raw.speed, movement.walk)
  backfill("useCalculatedFlySpeed", raw.flySpeed, movement.fly)
  backfill("useCalculatedSwimSpeed", raw.swimSpeed, movement.swim)
  backfill("useCalculatedClimbSpeed", raw.climbSpeed, movement.climb)
  backfill("useCalculatedBurrowSpeed", raw.burrowSpeed, movement.burrow)
  backfill("useCalculatedSize", raw.size, getEffectiveSize(raw).size)

  const importedFeatures = importLegacyFeatureGrants(raw)
  if (importedFeatures) patch.classFeatures = importedFeatures

  return { ...raw, ...patch }
}

export function migrateCharacters(raw: unknown): Character[] {
  return Array.isArray(raw) ? raw.map(migrateCharacter) : []
}

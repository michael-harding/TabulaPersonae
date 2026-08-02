import type { Character } from "./character-types"
import { calculateEquippedAC, getEffectiveMovementSpeeds, getEffectiveSize } from "./character-utils"

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
 * Flags introduced after launch default to "calculated" for brand-new characters (see
 * createDefaultCharacter), but characters saved before a given flag existed have no such key in
 * their persisted JSON. Back-fill those based on whether the character's existing value already
 * matches what the calculation produces: if so, switching to calculated changes nothing on screen
 * (and the character gains future recalculation for free); if the stored value differs, keep it in
 * custom mode so the manually-entered value isn't silently replaced by a different one.
 */
export function migrateCharacter(raw: any): Character {
  if (!raw || typeof raw !== "object") return raw as Character
  if (CALCULATED_VALUE_FLAGS.every((flag) => flag in raw)) return raw as Character

  const patch: Record<string, boolean> = {}
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

  return { ...raw, ...patch }
}

export function migrateCharacters(raw: unknown): Character[] {
  return Array.isArray(raw) ? raw.map(migrateCharacter) : []
}

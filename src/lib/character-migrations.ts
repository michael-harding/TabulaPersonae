import type { Character } from "./character-types"

/**
 * Characters saved before `useCalculatedArmorClass` existed have no such key
 * in their persisted JSON. Treating the key's absence as "legacy" lets us
 * preserve their manually-stored armorClass instead of silently switching
 * them to the 10+DEX calculated formula.
 */
export function migrateCharacter(raw: any): Character {
  if (!raw || typeof raw !== "object") return raw as Character
  if ("useCalculatedArmorClass" in raw) return raw as Character
  return { ...raw, useCalculatedArmorClass: false }
}

export function migrateCharacters(raw: unknown): Character[] {
  return Array.isArray(raw) ? raw.map(migrateCharacter) : []
}

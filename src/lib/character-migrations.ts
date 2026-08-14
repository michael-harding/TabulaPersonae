import type { Character, Feature, SenseType } from "./character-types"
import { calculateEquippedAC, getActiveFeatureEffects, getEffectiveMovementSpeeds, getEffectiveSenses, getEffectiveSize, inferFeatureType, parseHitDiceSize, safeFeatures, SENSE_TYPES } from "./character-utils"

const CALCULATED_VALUE_FLAGS = [
  "useCalculatedArmorClass",
  "useCalculatedSpeed",
  "useCalculatedFlySpeed",
  "useCalculatedSwimSpeed",
  "useCalculatedClimbSpeed",
  "useCalculatedBurrowSpeed",
  "useCalculatedSize",
  // useCalculatedSenses is object-valued (per-sense), not boolean like its siblings above, so it's
  // listed here purely as an early-return presence sentinel — its actual backfill logic lives in
  // the dedicated block below, not in the generic backfill() helper.
  "useCalculatedSenses",
] as const

const FEATURE_LIST_FIELDS = ["classFeatures", "speciesTraits", "feats", "backgroundFeatures"] as const

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
      name: "Spellcasting",
      description: "Grants this character's spellcasting ability, carried over from before Class Features tracked it directly.",
      source: "class-feature",
      levelEffects: [{ level: 1, effects: { spellcastingAbility: raw.spellcastingAbility } }],
    })
  }

  const legacyHitDiceSize = raw.hitDiceSize ?? (raw.hitDice ? parseHitDiceSize(raw.hitDice) : undefined)
  if (legacyHitDiceSize && !activeEffects.hitDiceSize) {
    additions.push({
      id: crypto.randomUUID(),
      name: "Hit Points",
      description: "Grants this character's hit die, used to calculate Max HP and spend Hit Dice on a short rest. Carried over from before Class Features tracked it directly.",
      source: "class-feature",
      levelEffects: [{ level: 1, effects: { hitDiceSize: legacyHitDiceSize } }],
    })
  }

  return additions.length > 0 ? [...safeFeatures(raw.classFeatures), ...additions] : undefined
}

/**
 * Backfills the persisted featureType onto any Feature that predates the field, using the same
 * inference the live edit-modal used to run on every open (see inferFeatureType in
 * character-utils.ts) — but exactly once, here, rather than as permanent runtime machinery. Runs
 * unconditionally, not gated behind CALCULATED_VALUE_FLAGS: see the note on migrateCharacter below
 * for why nesting it inside that gate would silently skip PDF-imported characters.
 */
function backfillFeatureTypes(features: Feature[]): Feature[] | undefined {
  let changed = false
  const next = features.map((f) => {
    if ('featureType' in f) return f
    changed = true
    return { ...f, featureType: inferFeatureType(f.actionKind, f.levelEffects) }
  })
  return changed ? next : undefined
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
 * so the legacy-Feature-grant import below is gated on the same check. The featureType backfill
 * further below is deliberately NOT part of this gate: a PDF-imported character is merged as
 * `{ ...createDefaultCharacter(), ...parsed }` (see pdf-parser.ts's mergeWithDefault), which
 * already carries every CALCULATED_VALUE_FLAGS key from the default — so a featureType backfill
 * nested inside this gate would never run for PDF-imported Features (pdf-parser.ts constructs
 * Features without featureType too). Genuinely legacy JSON-imported/stored characters still hit
 * this gate correctly, since they lack the flags.
 */
export function migrateCharacter(raw: any): Character {
  if (!raw || typeof raw !== "object") return raw as Character

  const patch: Record<string, unknown> = {}

  if (!CALCULATED_VALUE_FLAGS.every((flag) => flag in raw)) {
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

    if (!("useCalculatedSenses" in raw)) {
      const senseTotals = getEffectiveSenses(raw)
      const useCalculatedSenses: Partial<Record<SenseType, boolean>> = {}
      for (const sense of SENSE_TYPES) {
        const stored = raw.senses?.[sense]
        useCalculatedSenses[sense] = stored === undefined || stored === senseTotals[sense]
      }
      patch.useCalculatedSenses = useCalculatedSenses
    }

    const importedFeatures = importLegacyFeatureGrants(raw)
    if (importedFeatures) patch.classFeatures = importedFeatures
  }

  for (const field of FEATURE_LIST_FIELDS) {
    const current = safeFeatures((patch[field] as Feature[] | undefined) ?? raw[field])
    const backfilled = backfillFeatureTypes(current)
    if (backfilled) patch[field] = backfilled
  }

  return Object.keys(patch).length > 0 ? { ...raw, ...patch } : (raw as Character)
}

export function migrateCharacters(raw: unknown): Character[] {
  return Array.isArray(raw) ? raw.map(migrateCharacter) : []
}

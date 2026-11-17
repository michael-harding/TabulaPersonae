import type { Character, Feature, FeatureEffects, FeatureKind, FeatureTypeValue, RequiredFeatureType } from "./character-types"

export const FEATURE_LIST_FIELDS = ["classFeatures", "speciesTraits", "feats", "backgroundFeatures"] as const
export type FeatureListField = (typeof FEATURE_LIST_FIELDS)[number]

interface RequiredFeatureSpec {
  type: RequiredFeatureType
  /** The list the required feature lives in. */
  field: FeatureListField
  source: FeatureKind
  name: string
  description: string
  /** Its starting values, for a character that has no feature of this type yet. */
  effects: () => FeatureEffects
}

/**
 * The features every character has exactly one of. Required-ness comes from the Feature Type alone:
 * these types are not offered in the Feature Type menu, a required feature's type is locked, and it
 * cannot be deleted, so the one feature of each type in its list is the required one. Any other
 * feature of the type is relabelled "<type> (legacy)" by ensureRequiredFeatures.
 */
const REQUIRED_FEATURES: RequiredFeatureSpec[] = [
  {
    type: "Hit Points",
    field: "classFeatures",
    source: "class-feature",
    name: "Hit Points",
    description: "Grants this character's hit die, used to calculate Max HP and spend Hit Dice on a short rest. Update the die size to match your class.",
    effects: () => ({ hitDiceSize: 8 }),
  },
  {
    type: "Creature Type",
    field: "speciesTraits",
    source: "species-trait",
    name: "Creature Type",
    description: "This character's creature type. Update it to match your species.",
    effects: () => ({ creatureType: "Humanoid" }),
  },
  {
    type: "Size",
    field: "speciesTraits",
    source: "species-trait",
    name: "Size",
    description: "Grants this character's size. Update it to match your species.",
    effects: () => ({ size: "Medium" }),
  },
  {
    type: "Speed",
    field: "speciesTraits",
    source: "species-trait",
    name: "Speed",
    description: "Grants this character's speeds. Update them to match your species.",
    effects: () => ({ speed: 30 }),
  },
  {
    type: "Language",
    field: "speciesTraits",
    source: "species-trait",
    name: "Languages",
    description: "Grants the languages this character knows. Add any others your species, background or class gives.",
    effects: () => ({ languages: ["Common"] }),
  },
]

export const REQUIRED_FEATURE_TYPES: readonly RequiredFeatureType[] = REQUIRED_FEATURES.map((spec) => spec.type)

const LEGACY_SUFFIX = " (legacy)"

export function isRequiredFeatureType(type: string | undefined): type is RequiredFeatureType {
  return (REQUIRED_FEATURE_TYPES as readonly string[]).includes(type ?? "")
}

/** Whether this feature is one of the required ones, which can't be deleted or change type. */
export function isRequiredFeature(feature: Pick<Feature, "featureType">): boolean {
  return isRequiredFeatureType(feature.featureType)
}

/**
 * The type whose effect fields a feature edits and displays: a legacy type behaves exactly like the
 * required type it was relabelled from.
 */
export function effectFeatureType(type: FeatureTypeValue | ""): FeatureTypeValue | "" {
  if (!type.endsWith(LEGACY_SUFFIX)) return type
  const base = type.slice(0, -LEGACY_SUFFIX.length)
  return isRequiredFeatureType(base) ? base : type
}

function makeRequiredFeature(spec: RequiredFeatureSpec): Feature {
  return {
    id: crypto.randomUUID(),
    name: spec.name,
    description: spec.description,
    source: spec.source,
    featureType: spec.type,
    levelEffects: [{ level: 1, effects: spec.effects() }],
  }
}

/** A new character's required features, for createDefaultCharacter. */
export function createRequiredFeatures(): Pick<Character, "classFeatures" | "speciesTraits"> {
  return {
    classFeatures: REQUIRED_FEATURES.filter((spec) => spec.field === "classFeatures").map(makeRequiredFeature),
    speciesTraits: REQUIRED_FEATURES.filter((spec) => spec.field === "speciesTraits").map(makeRequiredFeature),
  }
}

/**
 * Gives a character exactly one feature of each required type, in that type's list:
 * - the first feature of the type already in its list becomes the required one, as it is;
 * - a list with none gets a new one with the starting values, placed first in the list. Size, Speed
 *   and the hit die take the value of the last feature that sets them, so an existing feature that
 *   grants one, under another type, keeps winning;
 * - every other feature of the type, in any list, becomes "<type> (legacy)". Only the label changes:
 *   its effects still apply, so no calculated value moves.
 *
 * Expects each feature's featureType to be set already (see the backfill in migrateCharacter).
 * Returns only the lists that changed, or undefined when none did, so running it again on its own
 * result changes nothing.
 */
export function ensureRequiredFeatures(
  lists: Record<FeatureListField, Feature[]>,
): Partial<Record<FeatureListField, Feature[]>> | undefined {
  const next: Record<FeatureListField, Feature[]> = { ...lists }
  const changed = new Set<FeatureListField>()
  const added: Partial<Record<FeatureListField, Feature[]>> = {}

  for (const spec of REQUIRED_FEATURES) {
    const kept = next[spec.field].find((feature) => feature.featureType === spec.type)
    for (const field of FEATURE_LIST_FIELDS) {
      if (!next[field].some((feature) => feature.featureType === spec.type && feature !== kept)) continue
      next[field] = next[field].map((feature) =>
        feature.featureType === spec.type && feature !== kept ? { ...feature, featureType: `${spec.type}${LEGACY_SUFFIX}` } : feature,
      )
      changed.add(field)
    }
    if (!kept) {
      (added[spec.field] ??= []).push(makeRequiredFeature(spec))
      changed.add(spec.field)
    }
  }

  if (changed.size === 0) return undefined
  const result: Partial<Record<FeatureListField, Feature[]>> = {}
  for (const field of changed) result[field] = [...(added[field] ?? []), ...next[field]]
  return result
}

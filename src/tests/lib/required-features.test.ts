import type { Feature, FeatureTypeValue } from "@/lib/character-types"
import { createStartingFeatures, DEFAULT_ABILITY_SCORE_IMPROVEMENT_LEVELS, effectFeatureType, ensureRequiredFeatures, isRequiredFeature, REQUIRED_FEATURE_TYPES } from "@/lib/required-features"

const feature = (id: string, source: Feature["source"], featureType: FeatureTypeValue, effects: Feature["levelEffects"] = []): Feature => ({
  id, name: id, description: "", source, featureType, levelEffects: effects,
})

const emptyLists = () => ({ classFeatures: [] as Feature[], speciesTraits: [] as Feature[], feats: [] as Feature[], backgroundFeatures: [] as Feature[] })

describe("createStartingFeatures", () => {
  it("makes Hit Points and Ability Score Improvement class features and the rest species traits, with the starting values", () => {
    const { classFeatures, speciesTraits } = createStartingFeatures()
    expect(classFeatures!.map((f: Feature) => [f.name, f.source, f.featureType, f.levelEffects])).toEqual([
      ["Hit Points", "class-feature", "Hit Points", [{ level: 1, effects: { hitDiceSize: 8 } }]],
      ["Ability Score Improvement", "class-feature", "Ability Score Improvement", [{ level: 1, effects: { abilityScoreImprovementLevels: [4, 8, 12, 16, 19] } }]],
    ])
    expect(speciesTraits!.map((f: Feature) => [f.name, f.source, f.featureType, f.levelEffects])).toEqual([
      ["Creature Type", "species-trait", "Creature Type", [{ level: 1, effects: { creatureType: "Humanoid" } }]],
      ["Size", "species-trait", "Size", [{ level: 1, effects: { size: "Medium" } }]],
      ["Speed", "species-trait", "Speed", [{ level: 1, effects: { speed: 30 } }]],
      ["Languages", "species-trait", "Language", [{ level: 1, effects: { languages: ["Common"] } }]],
    ])
  })

  it("gives each feature its own id and effects object", () => {
    const first = createStartingFeatures()
    const second = createStartingFeatures()
    expect(first.speciesTraits![0].id).not.toBe(second.speciesTraits![0].id)
    expect(first.speciesTraits![3].levelEffects![0].effects.languages).not.toBe(second.speciesTraits![3].levelEffects![0].effects.languages)
    // Editing one character's levels must not change another's, nor the defaults
    expect(first.classFeatures![1].levelEffects![0].effects.abilityScoreImprovementLevels)
      .not.toBe(second.classFeatures![1].levelEffects![0].effects.abilityScoreImprovementLevels)
    expect(first.classFeatures![1].levelEffects![0].effects.abilityScoreImprovementLevels).not.toBe(DEFAULT_ABILITY_SCORE_IMPROVEMENT_LEVELS)
  })
})

describe("isRequiredFeature / effectFeatureType", () => {
  it.each(REQUIRED_FEATURE_TYPES)("treats %s as required, and its legacy type as optional", (type) => {
    expect(isRequiredFeature({ featureType: type })).toBe(true)
    expect(isRequiredFeature({ featureType: `${type} (legacy)` })).toBe(false)
    expect(effectFeatureType(`${type} (legacy)`)).toBe(type)
  })

  it("leaves every other type as it is", () => {
    expect(isRequiredFeature({ featureType: "Senses" })).toBe(false)
    // A character can get speed and languages from several features
    expect(isRequiredFeature({ featureType: "Speed" })).toBe(false)
    expect(isRequiredFeature({ featureType: "Language" })).toBe(false)
    expect(isRequiredFeature({ featureType: "Custom" })).toBe(false)
    expect(isRequiredFeature({ featureType: "Prepared Spells" })).toBe(false)
    expect(isRequiredFeature({})).toBe(false)
    expect(effectFeatureType("Senses")).toBe("Senses")
    expect(effectFeatureType("Custom")).toBe("Custom")
  })
})

describe("ensureRequiredFeatures", () => {
  it("adds every missing required feature at the start of its list", () => {
    const rage = feature("rage", "class-feature", "Action")
    const result = ensureRequiredFeatures({ ...emptyLists(), classFeatures: [rage] })!
    expect(result.classFeatures!.map((f) => f.featureType)).toEqual(["Hit Points", "Ability Score Improvement", "Action"])
    expect(result.speciesTraits!.map((f) => f.featureType)).toEqual(["Creature Type", "Size"])
    expect(result).not.toHaveProperty("feats")
    expect(result).not.toHaveProperty("backgroundFeatures")
  })

  // Speed, Size and the hit die take the last feature's value, so a new one placed first can't
  // override what an existing feature of another type grants
  it("places a new feature before any existing one", () => {
    const flight = feature("wings", "species-trait", "Senses", [{ level: 1, effects: { speed: 25 } }])
    const result = ensureRequiredFeatures({ ...emptyLists(), speciesTraits: [flight] })!
    expect(result.speciesTraits!.at(-1)).toBe(flight)
  })

  it("adopts the first feature of the type in its list, unchanged", () => {
    const first = feature("first", "species-trait", "Size", [{ level: 1, effects: { size: "Small" } }])
    const second = feature("second", "species-trait", "Size", [{ level: 1, effects: { size: "Large" } }])
    const result = ensureRequiredFeatures({ ...emptyLists(), speciesTraits: [first, second] })!
    const sizes = result.speciesTraits!.filter((f) => f.levelEffects?.some((tier) => tier.effects.size))
    expect(sizes[0]).toBe(first)
    expect(sizes[1]).toEqual({ ...second, featureType: "Size (legacy)" })
  })

  it("does not adopt a feature from another list: it gets the legacy type, and a new required one is added", () => {
    const hitDie = feature("hd", "feat", "Hit Points", [{ level: 1, effects: { hitDiceSize: 10 } }])
    const result = ensureRequiredFeatures({ ...emptyLists(), feats: [hitDie] })!
    expect(result.feats).toEqual([{ ...hitDie, featureType: "Hit Points (legacy)" }])
    expect(result.classFeatures!.map((f) => f.featureType)).toEqual(["Hit Points", "Ability Score Improvement"])
  })

  it("keeps a character's own Ability Score Improvement levels", () => {
    const fighter = feature("asi", "class-feature", "Ability Score Improvement", [{ level: 1, effects: { abilityScoreImprovementLevels: [4, 6, 8, 12, 14, 16, 19] } }])
    const hitPoints = feature("hp", "class-feature", "Hit Points")
    const { speciesTraits } = createStartingFeatures()
    expect(ensureRequiredFeatures({ ...emptyLists(), classFeatures: [hitPoints, fighter], speciesTraits: speciesTraits! })).toBeUndefined()
  })

  it("returns undefined when every required feature is already in place", () => {
    const { classFeatures, speciesTraits } = createStartingFeatures()
    const lists = { ...emptyLists(), classFeatures: classFeatures!, speciesTraits: speciesTraits!, feats: [feature("legacy", "feat", "Size (legacy)")] }
    expect(ensureRequiredFeatures(lists)).toBeUndefined()
  })

  it("adds no Speed or Languages, and leaves any number of them as they are", () => {
    const { classFeatures, speciesTraits } = createStartingFeatures()
    const lists = {
      ...emptyLists(), classFeatures: classFeatures!,
      speciesTraits: speciesTraits!.filter((f) => f.featureType !== "Speed" && f.featureType !== "Language"),
      feats: [feature("mobile", "feat", "Speed"), feature("linguist", "feat", "Language"), feature("linguist2", "feat", "Language")],
    }
    expect(ensureRequiredFeatures(lists)).toBeUndefined()
  })
})

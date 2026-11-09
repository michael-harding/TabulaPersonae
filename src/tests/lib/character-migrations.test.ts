import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character } from "@/lib/character-types"
import { getEffectiveHitDiceSize, getEffectiveSpellcastingAbility } from "@/lib/character-utils"

describe("migrateCharacter", () => {
  it("is a no-op for an already-current character", () => {
    const character = createDefaultCharacter()
    expect(migrateCharacter(character)).toEqual(character)
  })

  it("keeps the Actions module's card layout, and adds none to a character without one", () => {
    const actionLayout = { action: { main: ["custom:a1"], more: ["spell:s1"] }, reaction: { more: ["feature:f1"] } }
    const stored = JSON.parse(JSON.stringify({ ...createDefaultCharacter(), actionLayout })) as unknown
    expect(migrateCharacter(stored).actionLayout).toEqual(actionLayout)
    expect(migrateCharacter(createDefaultCharacter())).not.toHaveProperty("actionLayout")
  })

  it("backfills useCalculatedArmorClass to true when the stored AC already matches the calculated AC", () => {
    // Default character: no equipment, ability scores all 10 -> calculated AC is 10, same as the
    // stored default. Nothing changes on screen by switching to calculated, so it's safe to do so.
    const raw = { ...createDefaultCharacter() }
    delete raw.useCalculatedArmorClass
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(true)
  })

  it("backfills useCalculatedArmorClass to false when the stored AC differs from the calculated AC", () => {
    const raw = { ...createDefaultCharacter(), armorClass: 17 }
    delete raw.useCalculatedArmorClass
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedArmorClass).toBe(false)
    expect(migrated.armorClass).toBe(17)
  })

  it("leaves an explicit true value untouched", () => {
    const raw = { ...createDefaultCharacter(), useCalculatedArmorClass: true }
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(true)
  })

  it("leaves an explicit false value untouched", () => {
    const raw = { ...createDefaultCharacter(), useCalculatedArmorClass: false }
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(false)
  })

  it("backfills the speed calculated-value flags to true when the stored values already match the calculated ones", () => {
    // A default character has no Species Trait effects, so calculated walk speed is 0 — which does
    // not match the stored default (30), so this case instead uses a character with no baked-in
    // speeds at all to exercise the "matches" path.
    const raw = { ...createDefaultCharacter(), speed: undefined, flySpeed: undefined, swimSpeed: undefined, climbSpeed: undefined, burrowSpeed: undefined }
    delete raw.useCalculatedSpeed
    delete raw.useCalculatedFlySpeed
    delete raw.useCalculatedSwimSpeed
    delete raw.useCalculatedClimbSpeed
    delete raw.useCalculatedBurrowSpeed
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(true)
    expect(migrated.useCalculatedFlySpeed).toBe(true)
    expect(migrated.useCalculatedSwimSpeed).toBe(true)
    expect(migrated.useCalculatedClimbSpeed).toBe(true)
    expect(migrated.useCalculatedBurrowSpeed).toBe(true)
  })

  it("treats null speed/size values from external JSON the same as absent ones", () => {
    // Imported JSON can carry `null` where the model expects an absent key; a strict
    // `=== undefined` check would treat null as a stored custom value and backfill `false`.
    // `any`: null is deliberately outside the Character type, simulating external JSON
    const raw = { ...createDefaultCharacter(), speed: null, flySpeed: null, swimSpeed: null, climbSpeed: null, burrowSpeed: null, size: null }
    delete raw.useCalculatedSpeed
    delete raw.useCalculatedFlySpeed
    delete raw.useCalculatedSwimSpeed
    delete raw.useCalculatedClimbSpeed
    delete raw.useCalculatedBurrowSpeed
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(true)
    expect(migrated.useCalculatedFlySpeed).toBe(true)
    expect(migrated.useCalculatedSwimSpeed).toBe(true)
    expect(migrated.useCalculatedClimbSpeed).toBe(true)
    expect(migrated.useCalculatedBurrowSpeed).toBe(true)
    // A null size is no size: nothing to keep, and the field is not part of a character any more
    expect(migrated).not.toHaveProperty("size")
  })

  it("defaults the speed calculated-value flags to false when the stored values differ from the calculated ones, preserving them (and the size, as a Species Trait)", () => {
    // A pre-existing character has no concept of a species-trait-derived speed/size — it just has
    // whatever number/string the player typed in, which (with no Species Trait effects configured)
    // won't match the feature-derived calculation (0 / ""). Backfilling `true` here would silently
    // replace the player's value with that calculated one — exactly the bug this migration exists
    // to prevent.
    const raw = { ...createDefaultCharacter(), speed: 25, flySpeed: 10, swimSpeed: 5, climbSpeed: 5, burrowSpeed: 5, size: "Small" }
    delete raw.useCalculatedSpeed
    delete raw.useCalculatedFlySpeed
    delete raw.useCalculatedSwimSpeed
    delete raw.useCalculatedClimbSpeed
    delete raw.useCalculatedBurrowSpeed
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(false)
    expect(migrated.useCalculatedFlySpeed).toBe(false)
    expect(migrated.useCalculatedSwimSpeed).toBe(false)
    expect(migrated.useCalculatedClimbSpeed).toBe(false)
    expect(migrated.useCalculatedBurrowSpeed).toBe(false)
    expect(migrated.speed).toBe(25)
    // Size is a Species Trait now: the typed-in size is kept as one
    expect(migrated.speciesTraits?.at(-1)?.levelEffects?.[0].effects).toEqual({ size: "Small" })
    expect(migrated).not.toHaveProperty("size")
  })

  it("only backfills the specific flags that are missing, leaving others untouched", () => {
    const raw = { ...createDefaultCharacter(), useCalculatedSpeed: false }
    delete raw.useCalculatedFlySpeed
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(false)
    // flySpeed 0 (stored) matches the calculated 0 (no species trait), so it backfills to true
    expect(migrated.useCalculatedFlySpeed).toBe(true)
  })

  // Size is a Species Trait: a character no longer has a size of its own, or a flag for one
  it("gives a new character no size fields, and leaves it as it is", () => {
    const fresh = createDefaultCharacter()
    expect(fresh).not.toHaveProperty("size")
    expect(fresh).not.toHaveProperty("useCalculatedSize")
    expect(migrateCharacter(fresh)).toBe(fresh)
  })

  it("drops the old size fields from a stored character", () => {
    const migrated = migrateCharacter({ ...createDefaultCharacter(), size: "Medium", useCalculatedSize: false })
    expect(migrated).not.toHaveProperty("size")
    expect(migrated).not.toHaveProperty("useCalculatedSize")
  })

  it("rejects input that is not a character record", () => {
    expect(() => migrateCharacter(null)).toThrow(TypeError)
    expect(() => migrateCharacter(undefined)).toThrow(TypeError)
    expect(() => migrateCharacter("Thorin")).toThrow(TypeError)
    expect(() => migrateCharacter([createDefaultCharacter()])).toThrow(TypeError)
  })

  describe("legacy spellcasting/hit-die Feature import", () => {
    // These fixtures explicitly clear classFeatures to simulate a genuinely pre-existing (legacy)
    // character — one saved before createDefaultCharacter started granting a starter "Hit Points"
    // Feature, so it never got one. A real legacy character can't carry a Feature that didn't exist
    // yet; only brand-new characters created under the current code do.
    it("synthesizes a Feature granting the legacy spellcasting ability when nothing else grants one", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "intelligence", hitDice: "" }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("intelligence")
      expect(migrated.classFeatures).toHaveLength(1)
      // Named plainly, not "Legacy Spellcasting" — it's meant to be a normal, permanent Feature,
      // not a disposable placeholder a player might delete and lose spellcasting functionality.
      expect(migrated.classFeatures![0].name).toBe("Spellcasting")
    })

    it("does not synthesize a Spellcasting Feature from a legacy value that is not an ability", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "Intelligence (INT)", hitDice: "" }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      expect(migrateCharacter(raw).classFeatures).toEqual([])
    })

    it("synthesizes a Feature granting the legacy hit die size when nothing else grants one", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], hitDice: "1d10" }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(getEffectiveHitDiceSize(migrated)).toBe(10)
      // spellcastingAbility defaults to "" on a fresh character, so no spellcasting Feature is added
      expect(migrated.classFeatures).toHaveLength(1)
      // Named plainly, not "Legacy Hit Points" — see note on the spellcasting case above.
      expect(migrated.classFeatures![0].name).toBe("Hit Points")
    })

    it("prefers an explicit legacy hitDiceSize over parsing hitDice", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], hitDice: "1d8", hitDiceSize: 12 }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(getEffectiveHitDiceSize(migrated)).toBe(12)
    })

    it("synthesizes separate Features for spellcasting and hit die, so editing one in the Features tab can't drop the other", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "wisdom", hitDice: "1d8" }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures).toHaveLength(2)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("wisdom")
      expect(getEffectiveHitDiceSize(migrated)).toBe(8)
    })

    it("does not synthesize a duplicate Feature when one already grants the legacy value", () => {
      const raw = {
        ...createDefaultCharacter(),
        spellcastingAbility: "wisdom",
        hitDice: "",
        classFeatures: [
          { id: "f1", name: "Spellcasting", description: "", source: "class-feature", levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] },
        ],
      }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures).toHaveLength(1)
    })

    it("also covers PDF-imported characters, whose plain Features have no levelEffects", () => {
      const raw = {
        ...createDefaultCharacter(),
        spellcastingAbility: "charisma",
        hitDice: "1d8",
        classFeatures: [{ id: "f1", name: "Bardic Inspiration", description: "Imported from PDF", source: "class-feature" }],
      }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("charisma")
      expect(getEffectiveHitDiceSize(migrated)).toBe(8)
      expect(migrated.classFeatures).toHaveLength(3)
    })

    it("normalizes a legacy string-shaped classFeatures instead of spreading it character-by-character", () => {
      const raw = {
        ...createDefaultCharacter(),
        classFeatures: "Rage, Reckless Attack, Danger Sense",
        spellcastingAbility: "wisdom",
        hitDice: "",
      }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      expect(() => migrateCharacter(raw)).not.toThrow()
      const migrated = migrateCharacter(raw)
      // Only the synthesized "Spellcasting" Feature — the legacy string was discarded via
      // safeFeatures(), not spread into ~35 one-character entries.
      expect(migrated.classFeatures).toHaveLength(1)
      expect(migrated.classFeatures![0].name).toBe("Spellcasting")
    })
  })

  describe("featureType backfill", () => {
    it("backfills featureType onto a Feature that predates the field", () => {
      const raw = {
        ...createDefaultCharacter(),
        classFeatures: [
          { id: "f1", name: "Rage", description: "", source: "class-feature", levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["strength"] } }] },
        ],
      }
      delete raw.useCalculatedArmorClass // also exercises the CALCULATED_VALUE_FLAGS-gated path
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures![0].featureType).toBe("Saving Throw Proficiency")
    })

    it("backfills featureType even when every CALCULATED_VALUE_FLAGS key is already present (the PDF-import merge path)", () => {
      // createDefaultCharacter() already has every CALCULATED_VALUE_FLAGS key set, same as the
      // { ...createDefaultCharacter(), ...parsed } merge PDF import produces (see mergeWithDefault
      // in pdf-parser.ts) — deliberately NOT deleting any flag here, so migrateCharacter's
      // CALCULATED_VALUE_FLAGS gate is skipped entirely. The featureType backfill must still run.
      const raw = {
        ...createDefaultCharacter(),
        classFeatures: [
          { id: "f1", name: "Bardic Inspiration", description: "", source: "class-feature", actionKind: "bonus-action" },
        ],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures!.find((f) => f.name === "Bardic Inspiration")?.featureType).toBe("Action")
    })

    it("does not touch a Feature that already has a featureType, including ''", () => {
      const raw = {
        ...createDefaultCharacter(),
        classFeatures: [
          { id: "f1", name: "Custom", description: "", source: "class-feature", featureType: "" },
        ],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures![0].featureType).toBe("")
    })

    it("gives a legacy-synthesized Spellcasting Feature the correct featureType", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "intelligence", hitDice: "" }
      delete raw.useCalculatedArmorClass // saved before the calculated-value flags: a legacy character
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures![0].name).toBe("Spellcasting")
      expect(migrated.classFeatures![0].featureType).toBe("Spellcasting Ability")
    })

    it("backfills featureType on every feature list, not just classFeatures", () => {
      const raw = {
        ...createDefaultCharacter(),
        speciesTraits: [{ id: "f1", name: "Darkvision", description: "", source: "species-trait", levelEffects: [{ level: 1, effects: { senses: { darkvision: 60 } } }] }],
        feats: [{ id: "f2", name: "Tough", description: "", source: "feat", levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 2 } }] }],
        backgroundFeatures: [{ id: "f3", name: "Acolyte", description: "", source: "background" }],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.speciesTraits![0].featureType).toBe("Senses")
      expect(migrated.feats![0].featureType).toBe("Max HP Bonus")
      expect(migrated.backgroundFeatures![0].featureType).toBe("")
    })
  })

  // Size is a Species Trait. A size the user entered by hand becomes one; a value nothing proves
  // they chose (the old "Medium" default) is not turned into a trait.
  describe("custom size", () => {
    const sizeTraits = (character: ReturnType<typeof migrateCharacter>) =>
      (character.speciesTraits ?? []).filter((trait) => trait.levelEffects?.some((tier) => tier.effects?.size))

    it("turns a size the user switched to custom into a Species Trait granting it", () => {
      const migrated = migrateCharacter({ ...createDefaultCharacter(), speciesTraits: [], size: "Small", useCalculatedSize: false })
      expect(sizeTraits(migrated)).toEqual([expect.objectContaining({
        name: "Size", source: "species-trait", featureType: "Size", levelEffects: [{ level: 1, effects: { size: "Small" } }],
      })])
      expect(migrated).not.toHaveProperty("useCalculatedSize")
    })

    // The flag is no evidence for Medium: the migration that added it stored `false` for every
    // older character whose size didn't match the calculated one, the old default included
    it("does not turn a stored Medium into a trait, even with the custom flag set", () => {
      const migrated = migrateCharacter({ ...createDefaultCharacter(), speciesTraits: [], size: "Medium", useCalculatedSize: false })
      expect(sizeTraits(migrated)).toEqual([])
    })

    it("turns an older character's non-default size into a trait, since only the user could have set it", () => {
      const raw: Record<string, unknown> = { ...createDefaultCharacter(), speciesTraits: [], size: "Large" }
      expect(sizeTraits(migrateCharacter(raw))[0].levelEffects?.[0].effects).toEqual({ size: "Large" })
    })

    it("does not turn an older character's Medium into a trait: it was the default, not necessarily a choice", () => {
      const raw: Record<string, unknown> = { ...createDefaultCharacter(), speciesTraits: [], size: "Medium" }
      expect(sizeTraits(migrateCharacter(raw))).toEqual([])
    })

    it("adds nothing when the size is calculated, or a trait already grants one", () => {
      const calculated = migrateCharacter({ ...createDefaultCharacter(), speciesTraits: [], size: "Small", useCalculatedSize: true })
      expect(sizeTraits(calculated)).toEqual([])
      const granted = {
        id: "t1", name: "Small", description: "", source: "species-trait" as const, featureType: "Size" as const,
        levelEffects: [{ level: 1, effects: { size: "Small" } }],
      }
      const withTrait = migrateCharacter({ ...createDefaultCharacter(), speciesTraits: [granted], size: "Tiny", useCalculatedSize: false })
      expect(sizeTraits(withTrait)).toEqual([granted])
    })

    // Regression: only traits active at the current level were checked, so a level-3 character with
    // a trait granting Large at level 5 gained a second, conflicting Size trait
    it("adds nothing when a Feature grants a size only at a higher level", () => {
      const later = {
        id: "t1", name: "Large Form", description: "", source: "species-trait" as const, featureType: "Size" as const,
        levelEffects: [{ level: 5, effects: { size: "Large" } }],
      }
      const migrated = migrateCharacter({ ...createDefaultCharacter(), level: 3, speciesTraits: [later], size: "Small", useCalculatedSize: false })
      expect(sizeTraits(migrated)).toEqual([later])
    })
  })

  // Exhaustion was an on/off condition before it had levels. A stored "Exhaustion" proves level 1
  // and no more, so that is what it becomes.
  describe("exhaustion level", () => {
    it("turns a stored Exhaustion condition into level 1, keeping the other conditions", () => {
      const migrated = migrateCharacter({ ...createDefaultCharacter(), conditions: ["Poisoned", "Exhaustion"] })
      expect(migrated.exhaustionLevel).toBe(1)
      expect(migrated.conditions).toEqual(["Poisoned"])
    })

    it("leaves a character that already has a level alone", () => {
      const raw = { ...createDefaultCharacter(), conditions: ["Exhaustion"], exhaustionLevel: 3 }
      expect(migrateCharacter(raw).exhaustionLevel).toBe(3)
    })

    it("adds no level to a character without the condition", () => {
      const migrated = migrateCharacter({ ...createDefaultCharacter(), conditions: ["Prone"] })
      expect(migrated).not.toHaveProperty("exhaustionLevel")
      expect(migrated.conditions).toEqual(["Prone"])
    })
  })

  describe("equipment uses backfill", () => {
    it("relocates a legacy consumedUses-style uses to charges for a magic item with charges configured", () => {
      const raw = {
        ...createDefaultCharacter(),
        equipment: [{ id: "e1", name: "Wand", quantity: 1, weight: 1, description: "", equipped: true, type: "other", magic: true, maxUses: 3, uses: 2 }],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.equipment![0].charges).toBe(2)
      expect(migrated.equipment![0].consumedUses).toBeUndefined()
      expect("uses" in migrated.equipment![0]).toBe(false)
    })

    it("relocates a legacy uses to consumedUses for a plain consumable item", () => {
      const raw = {
        ...createDefaultCharacter(),
        equipment: [{ id: "e1", name: "Potion", quantity: 5, weight: 1, description: "", equipped: true, type: "consumable", uses: 2 }],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.equipment![0].consumedUses).toBe(2)
      expect(migrated.equipment![0].charges).toBeUndefined()
      expect("uses" in migrated.equipment![0]).toBe(false)
    })

    it("does not touch an item that already has no legacy uses field", () => {
      const raw = {
        ...createDefaultCharacter(),
        equipment: [{ id: "e1", name: "Rope", quantity: 1, weight: 1, description: "", equipped: false, type: "other", charges: 0 }],
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.equipment![0]).toEqual(raw.equipment[0])
    })
  })

  describe("useCalculatedSenses backfill", () => {
    it("backfills to true when the stored sense already matches the calculated total", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], senses: { darkvision: 0 } }
      delete raw.useCalculatedSenses
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses).toEqual({ darkvision: true, blindsight: true, tremorsense: true, truesight: true })
    })

    it("backfills to false and preserves the stored value when it differs from the calculated total", () => {
      const raw = { ...createDefaultCharacter(), classFeatures: [], senses: { darkvision: 60 } }
      delete raw.useCalculatedSenses
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses?.darkvision).toBe(false)
      expect(migrated.senses?.darkvision).toBe(60)
    })

    it("treats a null sense value from external JSON the same as an absent one", () => {
      // `any`: null is deliberately outside the Character type, simulating external JSON
      const raw = { ...createDefaultCharacter(), classFeatures: [], senses: { darkvision: null } }
      delete raw.useCalculatedSenses
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses?.darkvision).toBe(true)
    })

    it("leaves an already-present useCalculatedSenses untouched", () => {
      const raw = {
        ...createDefaultCharacter(),
        classFeatures: [],
        senses: { darkvision: 60 },
        useCalculatedSenses: { darkvision: true, blindsight: true, tremorsense: true, truesight: true },
      }
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses).toEqual({ darkvision: true, blindsight: true, tremorsense: true, truesight: true })
    })
  })
})

describe("migrateCharacter damage type normalisation", () => {
  const FIELDS = ["damageResistances", "damageImmunities", "damageVulnerabilities"] as const

  // These three lists were free text before they became a menu of the standard damage types, so
  // saved characters can hold "fire" where the menu (and feature/equipment grants) say "Fire".
  it.each(FIELDS)("re-cases standard types and drops the resulting duplicates in %s", (field) => {
    const raw = { ...createDefaultCharacter(), [field]: ["fire", "Fire", "Nonmagical Bludgeoning"] }
    expect(migrateCharacter(raw)[field]).toEqual(["Fire", "Nonmagical Bludgeoning"])
  })

  it.each(FIELDS)("does not create %s on a character that never had it", (field) => {
    const raw: Partial<Character> = { ...createDefaultCharacter() }
    delete raw[field]
    expect(field in migrateCharacter(raw)).toBe(false)
  })

  it("returns the same object when every list is already in its standard form", () => {
    const raw = { ...createDefaultCharacter(), damageResistances: ["Fire", "Homebrew"], damageImmunities: [] }
    expect(migrateCharacter(raw)).toBe(raw)
  })

  it("leaves a list alone when it holds something other than strings", () => {
    const raw = { ...createDefaultCharacter(), damageResistances: ["fire", 3] }
    expect(migrateCharacter(raw).damageResistances).toEqual(["fire", 3])
  })
})

describe("migrateCharacters", () => {
  it("maps an array of raw records", () => {
    const raw = { ...createDefaultCharacter() }
    delete raw.useCalculatedArmorClass
    const [migrated] = migrateCharacters([raw])
    expect(migrated.useCalculatedArmorClass).toBe(true)
  })

  it("drops entries that are not character records", () => {
    const record = createDefaultCharacter()
    expect(migrateCharacters([null, record, "Thorin", 3, [record]])).toEqual([record])
  })

  it("returns [] for non-array input", () => {
    expect(migrateCharacters(null)).toEqual([])
    expect(migrateCharacters(undefined)).toEqual([])
    expect(migrateCharacters("not an array")).toEqual([])
  })
})

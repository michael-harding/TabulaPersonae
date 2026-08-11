import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import { createDefaultCharacter } from "@/lib/character-types"
import { getEffectiveHitDiceSize, getEffectiveSpellcastingAbility } from "@/lib/character-utils"

describe("migrateCharacter", () => {
  it("is a no-op for an already-current character", () => {
    const character = createDefaultCharacter()
    expect(migrateCharacter(character)).toEqual(character)
  })

  it("backfills useCalculatedArmorClass to true when the stored AC already matches the calculated AC", () => {
    // Default character: no equipment, ability scores all 10 -> calculated AC is 10, same as the
    // stored default. Nothing changes on screen by switching to calculated, so it's safe to do so.
    const raw: any = { ...createDefaultCharacter() }
    delete raw.useCalculatedArmorClass
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(true)
  })

  it("backfills useCalculatedArmorClass to false when the stored AC differs from the calculated AC", () => {
    const raw: any = { ...createDefaultCharacter(), armorClass: 17 }
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

  it("backfills the speed/size calculated-value flags to true when the stored values already match the calculated ones", () => {
    // A default character has no Species Trait effects, so calculated walk speed is 0 and
    // calculated size is "" — nothing here matches the stored defaults (30/"Medium"), so this case
    // instead uses a character with no baked-in speed/size at all to exercise the "matches" path.
    const raw: any = { ...createDefaultCharacter(), speed: undefined, flySpeed: undefined, swimSpeed: undefined, climbSpeed: undefined, burrowSpeed: undefined, size: undefined }
    delete raw.useCalculatedSpeed
    delete raw.useCalculatedFlySpeed
    delete raw.useCalculatedSwimSpeed
    delete raw.useCalculatedClimbSpeed
    delete raw.useCalculatedBurrowSpeed
    delete raw.useCalculatedSize
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(true)
    expect(migrated.useCalculatedFlySpeed).toBe(true)
    expect(migrated.useCalculatedSwimSpeed).toBe(true)
    expect(migrated.useCalculatedClimbSpeed).toBe(true)
    expect(migrated.useCalculatedBurrowSpeed).toBe(true)
    expect(migrated.useCalculatedSize).toBe(true)
  })

  it("defaults the speed/size calculated-value flags to false when the stored values differ from the calculated ones, preserving them", () => {
    // A pre-existing character has no concept of a species-trait-derived speed/size — it just has
    // whatever number/string the player typed in, which (with no Species Trait effects configured)
    // won't match the feature-derived calculation (0 / ""). Backfilling `true` here would silently
    // replace the player's value with that calculated one — exactly the bug this migration exists
    // to prevent.
    const raw: any = { ...createDefaultCharacter(), speed: 25, flySpeed: 10, swimSpeed: 5, climbSpeed: 5, burrowSpeed: 5, size: "Small" }
    delete raw.useCalculatedSpeed
    delete raw.useCalculatedFlySpeed
    delete raw.useCalculatedSwimSpeed
    delete raw.useCalculatedClimbSpeed
    delete raw.useCalculatedBurrowSpeed
    delete raw.useCalculatedSize
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(false)
    expect(migrated.useCalculatedFlySpeed).toBe(false)
    expect(migrated.useCalculatedSwimSpeed).toBe(false)
    expect(migrated.useCalculatedClimbSpeed).toBe(false)
    expect(migrated.useCalculatedBurrowSpeed).toBe(false)
    expect(migrated.useCalculatedSize).toBe(false)
    expect(migrated.speed).toBe(25)
    expect(migrated.size).toBe("Small")
  })

  it("only backfills the specific flags that are missing, leaving others untouched", () => {
    const raw: any = { ...createDefaultCharacter(), useCalculatedSpeed: true }
    delete raw.useCalculatedSize
    const migrated = migrateCharacter(raw)
    expect(migrated.useCalculatedSpeed).toBe(true)
    // size: "Medium" (stored) differs from the calculated "" (no species trait), so it backfills to false.
    expect(migrated.useCalculatedSize).toBe(false)
  })

  it("passes through non-object input unchanged", () => {
    expect(migrateCharacter(null)).toBeNull()
    expect(migrateCharacter(undefined)).toBeUndefined()
  })

  describe("legacy spellcasting/hit-die Feature import", () => {
    // These fixtures explicitly clear classFeatures to simulate a genuinely pre-existing (legacy)
    // character — one saved before createDefaultCharacter started granting a starter "Hit Points"
    // Feature, so it never got one. A real legacy character can't carry a Feature that didn't exist
    // yet; only brand-new characters created under the current code do.
    it("synthesizes a Feature granting the legacy spellcasting ability when nothing else grants one", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "intelligence", hitDice: "" }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("intelligence")
      expect(migrated.classFeatures).toHaveLength(1)
      // Named plainly, not "Legacy Spellcasting" — it's meant to be a normal, permanent Feature,
      // not a disposable placeholder a player might delete and lose spellcasting functionality.
      expect(migrated.classFeatures![0].name).toBe("Spellcasting")
    })

    it("synthesizes a Feature granting the legacy hit die size when nothing else grants one", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], hitDice: "1d10" }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(getEffectiveHitDiceSize(migrated)).toBe(10)
      // spellcastingAbility defaults to "" on a fresh character, so no spellcasting Feature is added
      expect(migrated.classFeatures).toHaveLength(1)
      // Named plainly, not "Legacy Hit Points" — see note on the spellcasting case above.
      expect(migrated.classFeatures![0].name).toBe("Hit Points")
    })

    it("prefers an explicit legacy hitDiceSize over parsing hitDice", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], hitDice: "1d8", hitDiceSize: 12 }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(getEffectiveHitDiceSize(migrated)).toBe(12)
    })

    it("synthesizes separate Features for spellcasting and hit die, so editing one in the Features tab can't drop the other", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], spellcastingAbility: "wisdom", hitDice: "1d8" }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures).toHaveLength(2)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("wisdom")
      expect(getEffectiveHitDiceSize(migrated)).toBe(8)
    })

    it("does not synthesize a duplicate Feature when one already grants the legacy value", () => {
      const raw: any = {
        ...createDefaultCharacter(),
        spellcastingAbility: "wisdom",
        hitDice: "",
        classFeatures: [
          { id: "f1", name: "Spellcasting", description: "", source: "class-feature", levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }] },
        ],
      }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(migrated.classFeatures).toHaveLength(1)
    })

    it("also covers PDF-imported characters, whose plain Features have no levelEffects", () => {
      const raw: any = {
        ...createDefaultCharacter(),
        spellcastingAbility: "charisma",
        hitDice: "1d8",
        classFeatures: [{ id: "f1", name: "Bardic Inspiration", description: "Imported from PDF", source: "class-feature" }],
      }
      delete raw.useCalculatedSize
      const migrated = migrateCharacter(raw)
      expect(getEffectiveSpellcastingAbility(migrated)).toBe("charisma")
      expect(getEffectiveHitDiceSize(migrated)).toBe(8)
      expect(migrated.classFeatures).toHaveLength(3)
    })

    it("normalizes a legacy string-shaped classFeatures instead of spreading it character-by-character", () => {
      const raw: any = {
        ...createDefaultCharacter(),
        classFeatures: "Rage, Reckless Attack, Danger Sense",
        spellcastingAbility: "wisdom",
        hitDice: "",
      }
      delete raw.useCalculatedSize
      expect(() => migrateCharacter(raw)).not.toThrow()
      const migrated = migrateCharacter(raw)
      // Only the synthesized "Spellcasting" Feature — the legacy string was discarded via
      // safeFeatures(), not spread into ~35 one-character entries.
      expect(migrated.classFeatures).toHaveLength(1)
      expect(migrated.classFeatures![0].name).toBe("Spellcasting")
    })
  })

  describe("useCalculatedSenses backfill", () => {
    it("backfills to true when the stored sense already matches the calculated total", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], senses: { darkvision: 0 } }
      delete raw.useCalculatedSenses
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses).toEqual({ darkvision: true, blindsight: true, tremorsense: true, truesight: true })
    })

    it("backfills to false and preserves the stored value when it differs from the calculated total", () => {
      const raw: any = { ...createDefaultCharacter(), classFeatures: [], senses: { darkvision: 60 } }
      delete raw.useCalculatedSenses
      const migrated = migrateCharacter(raw)
      expect(migrated.useCalculatedSenses?.darkvision).toBe(false)
      expect(migrated.senses?.darkvision).toBe(60)
    })

    it("leaves an already-present useCalculatedSenses untouched", () => {
      const raw: any = {
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

describe("migrateCharacters", () => {
  it("maps an array of raw records", () => {
    const raw: any = { ...createDefaultCharacter() }
    delete raw.useCalculatedArmorClass
    const [migrated] = migrateCharacters([raw])
    expect(migrated.useCalculatedArmorClass).toBe(true)
  })

  it("returns [] for non-array input", () => {
    expect(migrateCharacters(null)).toEqual([])
    expect(migrateCharacters(undefined)).toEqual([])
    expect(migrateCharacters("not an array")).toEqual([])
  })
})

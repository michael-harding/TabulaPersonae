import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import { createDefaultCharacter } from "@/lib/character-types"

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

import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import { createDefaultCharacter } from "@/lib/character-types"

describe("migrateCharacter", () => {
  it("is a no-op for an already-current character", () => {
    const character = createDefaultCharacter()
    expect(migrateCharacter(character)).toEqual(character)
  })

  it("defaults useCalculatedArmorClass to false when the key is entirely absent", () => {
    const raw: any = { ...createDefaultCharacter() }
    delete raw.useCalculatedArmorClass
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(false)
  })

  it("leaves an explicit true value untouched", () => {
    const raw = { ...createDefaultCharacter(), useCalculatedArmorClass: true }
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(true)
  })

  it("leaves an explicit false value untouched", () => {
    const raw = { ...createDefaultCharacter(), useCalculatedArmorClass: false }
    expect(migrateCharacter(raw).useCalculatedArmorClass).toBe(false)
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
    expect(migrated.useCalculatedArmorClass).toBe(false)
  })

  it("returns [] for non-array input", () => {
    expect(migrateCharacters(null)).toEqual([])
    expect(migrateCharacters(undefined)).toEqual([])
    expect(migrateCharacters("not an array")).toEqual([])
  })
})

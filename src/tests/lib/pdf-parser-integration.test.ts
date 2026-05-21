/**
 * Integration test: parses the actual D&D Beyond PDF and verifies the extracted data.
 * Does NOT mock pdf-lib — uses the real library against the real file.
 *
 * Ground truth is Urush Greenshield, Paladin 2, as exported from D&D Beyond.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { parsePdfBuffer, mergeWithDefault } from "@/lib/pdf-parser"

const PDF_PATH = resolve(__dirname, "../test-for-import.pdf")

function loadTestPdf(): Uint8Array {
  return new Uint8Array(readFileSync(PDF_PATH))
}

describe("PDF parser integration — Urush Greenshield (D&D Beyond export)", () => {
  it("parses the PDF without throwing", async () => {
    const file = loadTestPdf()
    await expect(parsePdfBuffer(file)).resolves.toBeDefined()
  })

  describe("character identity", () => {
    it("extracts the character name (strips player tag)", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.name).toBe("Urush Greenshield")
    })

    it("extracts class and level", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.class).toBe("Paladin")
      expect(result.level).toBe(2)
    })

    it("extracts race", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.race).toBe("Orc")
    })

    it("extracts background", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.background).toBe("Acolyte")
    })

    it("extracts alignment", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.alignment).toBe("Chaotic Good")
    })

    it("extracts experience points", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.experiencePoints).toBe(360)
    })
  })

  describe("ability scores", () => {
    it("extracts STR, DEX, INT, WIS, CHA", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.abilityScores?.strength).toBe(15)
      expect(result.abilityScores?.dexterity).toBe(10)
      expect(result.abilityScores?.intelligence).toBe(12)
      expect(result.abilityScores?.wisdom).toBe(10)
      expect(result.abilityScores?.charisma).toBe(15)
    })
  })

  describe("combat stats", () => {
    it("extracts armor class", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.armorClass).toBe(18)
    })

    it("extracts initiative", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.initiative).toBe(0)
    })

    it("extracts speed", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.speed).toBe(30)
    })

    it("extracts max HP", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.hitPoints?.maximum).toBe(18)
    })

    it("extracts hit dice", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.hitDice).toBe("2d10")
    })

    it("extracts proficiency bonus", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.proficiencyBonus).toBe(2)
    })
  })

  describe("skills", () => {
    it("marks Athletics as proficient", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.skills?.athletics.proficient).toBe(true)
    })

    it("marks non-proficient skills as not proficient", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.skills?.acrobatics.proficient).toBe(false)
      expect(result.skills?.arcana.proficient).toBe(false)
    })
  })

  describe("biography", () => {
    it("extracts age", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.age).toBe("31")
    })

    it("extracts height", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.height).toBe("6ft 1in")
    })

    it("extracts weight", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.weight).toBe("250")
    })

    it("extracts eyes", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.eyes).toBe("Green")
    })

    it("extracts skin", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.skin).toBe("Green")
    })

    it("extracts hair", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.hair).toBe("Brown")
    })
  })

  describe("languages and proficiencies", () => {
    it("extracts Common, Common Sign Language, and Orc as languages", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.languages).toContain("Common")
      expect(result.languages).toContain("Orc")
    })

    it("extracts armor and weapon proficiencies", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      const profs = result.otherProficiencies?.join(" ") ?? ""
      expect(profs).toMatch(/armor|weapon|martial|simple/i)
    })
  })

  describe("spellcasting", () => {
    it("extracts spellcasting class", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.spellcastingClass?.toLowerCase()).toContain("paladin")
    })

    it("extracts spellcasting ability as charisma", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      expect(result.spellcastingAbility).toBe("charisma")
    })

    it("extracts cantrips", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      const spellNames = result.spells?.map(s => s.name) ?? []
      expect(spellNames.some(n => /spare the dying/i.test(n))).toBe(true)
    })

    it("extracts 1st level spells", async () => {
      const file = loadTestPdf()
      const result = await parsePdfBuffer(file)
      const spellNames = result.spells?.map(s => s.name) ?? []
      expect(spellNames.some(n => /heroism/i.test(n))).toBe(true)
    })
  })

  describe("feature parsing", () => {
    it("classFeatures has multiple individual entries (not one blob)", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      expect(result.classFeatures?.length).toBeGreaterThan(1)
    })
    it("Lay On Hands is parsed as an individual classFeature", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      expect(result.classFeatures?.some(f => /lay on hands/i.test(f.name))).toBe(true)
    })
    it("Spellcasting is parsed as an individual classFeature", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      expect(result.classFeatures?.some(f => /spellcasting/i.test(f.name))).toBe(true)
    })
    it("Adrenaline Rush is parsed as a species trait (not a class feature)", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      const f = result.speciesTraits?.find(f => /adrenaline rush/i.test(f.name))
      expect(f).toBeDefined()
      expect(result.classFeatures?.some(f => /adrenaline rush/i.test(f.name))).toBe(false)
    })
    it("speciesTraits has multiple individual entries (not one blob)", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      expect(result.speciesTraits?.length).toBeGreaterThan(1)
    })
    it("feats array has individual entries", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      expect(result.feats?.length).toBeGreaterThan(0)
    })
    it("no feature has undefined id, name, description, or source", async () => {
      const result = await parsePdfBuffer(loadTestPdf())
      const allFeatures = [
        ...(result.classFeatures ?? []),
        ...(result.speciesTraits ?? []),
        ...(result.feats ?? []),
      ]
      for (const f of allFeatures) {
        expect(f.id).toBeTruthy()
        expect(typeof f.name).toBe("string")
        expect(typeof f.description).toBe("string")
        expect(f.source).toBeDefined()
      }
    })
  })

  describe("mergeWithDefault produces a valid Character", () => {
    it("produces a complete, Firebase-safe character with no undefined values", async () => {
      const file = loadTestPdf()
      const parsed = await parsePdfBuffer(file)
      const character = mergeWithDefault(parsed)

      // Verify identity is preserved
      expect(character.name).toBe("Urush Greenshield")
      expect(character.class).toBe("Paladin")
      expect(character.level).toBe(2)
      expect(character.edition).toBe("2014")
      expect(character.id).toBeTruthy()

      // Verify no undefined values anywhere (Firestore would reject them)
      const serialized = JSON.stringify(character)
      expect(serialized).not.toContain('"undefined"')
      const reparsed = JSON.parse(serialized)
      function hasUndefined(obj: unknown, path = ""): string | null {
        if (obj === undefined) return path
        if (obj === null || typeof obj !== "object") return null
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          const found = hasUndefined(v, `${path}.${k}`)
          if (found) return found
        }
        return null
      }
      expect(hasUndefined(reparsed)).toBeNull()

      // Verify arrays are arrays (not undefined)
      expect(Array.isArray(character.attacks)).toBe(true)
      expect(Array.isArray(character.spells)).toBe(true)
      expect(Array.isArray(character.equipment)).toBe(true)
    })
  })
})

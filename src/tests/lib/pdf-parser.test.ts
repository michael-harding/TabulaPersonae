import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  parseIntField,
  parseCheckbox,
  parseClassLevel,
  parseSpeedField,
  parseDamageTypeField,
  parseProficienciesLang,
  parseSpellcastingAbility,
  countCheckedDeathSaves,
  decodeDndbeyondHexString,
  splitIntoSections,
  parseFeaturesTraitsText,
  parseActionsText,
  mapFieldsToCharacter,
  mergeWithDefault,
  normalizeCastingTime,
} from "@/lib/pdf-parser"

vi.mock("pdf-lib", () => ({
  PDFDocument: { load: vi.fn() },
  PDFName: { of: vi.fn((s: string) => s) },
  PDFArray: class {},
}))

describe("pdf-parser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("parseIntField", () => {
    it("parses plain numbers", () => expect(parseIntField("15")).toBe(15))
    it("strips + prefix", () => expect(parseIntField("+4")).toBe(4))
    it("handles negative numbers", () => expect(parseIntField("-2")).toBe(-2))
    it("returns 0 for blank string", () => expect(parseIntField("")).toBe(0))
    it("returns 0 for undefined", () => expect(parseIntField(undefined)).toBe(0))
    it("returns 0 for non-numeric", () => expect(parseIntField("abc")).toBe(0))
    it("strips ft. suffix", () => expect(parseIntField("30 ft.")).toBe(30))
  })

  describe("parseCheckbox", () => {
    it("returns true for 'Yes'", () => expect(parseCheckbox("Yes")).toBe(true))
    it("returns true for 'yes'", () => expect(parseCheckbox("yes")).toBe(true))
    it("returns true for boolean true", () => expect(parseCheckbox(true)).toBe(true))
    it("returns true for 'on'", () => expect(parseCheckbox("on")).toBe(true))
    it("returns false for 'Off'", () => expect(parseCheckbox("Off")).toBe(false))
    it("returns false for boolean false", () => expect(parseCheckbox(false)).toBe(false))
    it("returns false for undefined", () => expect(parseCheckbox(undefined)).toBe(false))
    it("returns false for empty string", () => expect(parseCheckbox("")).toBe(false))
  })

  describe("parseClassLevel", () => {
    it("splits 'Paladin 2' into class and level", () => {
      expect(parseClassLevel("Paladin 2")).toEqual({ class: "Paladin", level: 2 })
    })
    it("handles multi-word class names", () => {
      expect(parseClassLevel("Eldritch Knight Fighter 10")).toEqual({ class: "Eldritch Knight Fighter", level: 10 })
    })
    it("returns level 1 when no number is present", () => {
      expect(parseClassLevel("Fighter")).toEqual({ class: "Fighter", level: 1 })
    })
    it("handles empty string", () => {
      expect(parseClassLevel("")).toEqual({ class: "", level: 1 })
    })
    it("handles level 20", () => {
      expect(parseClassLevel("Wizard 20")).toEqual({ class: "Wizard", level: 20 })
    })
  })

  describe("parseSpeedField", () => {
    it("parses plain number", () => expect(parseSpeedField("30")).toBe(30))
    it("strips ft. suffix", () => expect(parseSpeedField("30 ft.")).toBe(30))
    it("strips walking annotation", () => expect(parseSpeedField("30 ft. (Walking)")).toBe(30))
    it("returns 30 for undefined", () => expect(parseSpeedField(undefined)).toBe(30))
    it("returns 30 for blank string", () => expect(parseSpeedField("")).toBe(30))
    it("parses non-standard speed", () => expect(parseSpeedField("35 ft.")).toBe(35))
  })

  describe("parseDamageTypeField", () => {
    it("splits damage and type", () => {
      expect(parseDamageTypeField("1d8+2 Slashing")).toEqual({ damage: "1d8+2", damageType: "Slashing" })
    })
    it("handles fire damage", () => {
      expect(parseDamageTypeField("2d6 fire")).toEqual({ damage: "2d6", damageType: "fire" })
    })
    it("handles no damage type", () => {
      expect(parseDamageTypeField("1d6")).toEqual({ damage: "1d6", damageType: "" })
    })
    it("returns empty strings for undefined", () => {
      expect(parseDamageTypeField(undefined)).toEqual({ damage: "", damageType: "" })
    })
    it("returns empty strings for blank string", () => {
      expect(parseDamageTypeField("")).toEqual({ damage: "", damageType: "" })
    })
  })

  describe("parseProficienciesLang", () => {
    it("classifies known languages", () => {
      const result = parseProficienciesLang("Common, Elvish, Orc")
      expect(result.languages).toEqual(["Common", "Elvish", "Orc"])
      expect(result.otherProficiencies).toEqual([])
    })
    it("classifies unknown tokens as proficiencies", () => {
      const result = parseProficienciesLang("Longswords, Shields")
      expect(result.languages).toEqual([])
      expect(result.otherProficiencies).toEqual(["Longswords", "Shields"])
    })
    it("handles mixed separators", () => {
      const result = parseProficienciesLang("Common\nDwarvish, Smith's Tools")
      expect(result.languages).toContain("Common")
      expect(result.languages).toContain("Dwarvish")
      expect(result.otherProficiencies).toContain("Smith's Tools")
    })
    it("returns empty arrays for undefined", () => {
      expect(parseProficienciesLang(undefined)).toEqual({ languages: [], otherProficiencies: [] })
    })
    it("returns empty arrays for blank string", () => {
      expect(parseProficienciesLang("")).toEqual({ languages: [], otherProficiencies: [] })
    })
    it("is case-insensitive for language matching", () => {
      const result = parseProficienciesLang("COMMON, elvish")
      expect(result.languages).toEqual(["COMMON", "elvish"])
    })
    it("parses D&D Beyond sectioned format", () => {
      const raw = "=== ARMOR ===\nHeavy Armor\n=== LANGUAGES ===\nCommon, Orc"
      const result = parseProficienciesLang(raw)
      expect(result.languages).toContain("Common")
      expect(result.languages).toContain("Orc")
      expect(result.otherProficiencies).toContain("Heavy Armor")
    })
  })

  describe("parseSpellcastingAbility", () => {
    it("normalizes full name", () => expect(parseSpellcastingAbility("Intelligence")).toBe("intelligence"))
    it("normalizes abbreviation INT", () => expect(parseSpellcastingAbility("INT")).toBe("intelligence"))
    it("normalizes abbreviation WIS", () => expect(parseSpellcastingAbility("WIS")).toBe("wisdom"))
    it("normalizes abbreviation CHA", () => expect(parseSpellcastingAbility("CHA")).toBe("charisma"))
    it("returns empty string for unrecognized", () => expect(parseSpellcastingAbility("FOO")).toBe(""))
    it("returns empty string for undefined", () => expect(parseSpellcastingAbility(undefined)).toBe(""))
  })

  describe("normalizeCastingTime", () => {
    it("normalizes 'A' to '1 action'", () => expect(normalizeCastingTime("A")).toBe("1 action"))
    it("normalizes 'Action' to '1 action'", () => expect(normalizeCastingTime("Action")).toBe("1 action"))
    it("normalizes '1 A' to '1 action'", () => expect(normalizeCastingTime("1 A")).toBe("1 action"))
    it("normalizes '1A' to '1 action'", () => expect(normalizeCastingTime("1A")).toBe("1 action"))
    it("normalizes '1 Action' to '1 action'", () => expect(normalizeCastingTime("1 Action")).toBe("1 action"))
    it("normalizes 'BA' to '1 bonus action'", () => expect(normalizeCastingTime("BA")).toBe("1 bonus action"))
    it("normalizes 'Bonus Action' to '1 bonus action'", () => expect(normalizeCastingTime("Bonus Action")).toBe("1 bonus action"))
    it("normalizes '1 BA' to '1 bonus action'", () => expect(normalizeCastingTime("1 BA")).toBe("1 bonus action"))
    it("normalizes '1BA' to '1 bonus action'", () => expect(normalizeCastingTime("1BA")).toBe("1 bonus action"))
    it("normalizes '1 Bonus Action' to '1 bonus action'", () => expect(normalizeCastingTime("1 Bonus Action")).toBe("1 bonus action"))
    it("normalizes 'R' to '1 reaction'", () => expect(normalizeCastingTime("R")).toBe("1 reaction"))
    it("normalizes 'Reaction' to '1 reaction'", () => expect(normalizeCastingTime("Reaction")).toBe("1 reaction"))
    it("normalizes '1 R' to '1 reaction'", () => expect(normalizeCastingTime("1 R")).toBe("1 reaction"))
    it("normalizes '1R' to '1 reaction'", () => expect(normalizeCastingTime("1R")).toBe("1 reaction"))
    it("passes through already-normalized values", () => expect(normalizeCastingTime("1 action")).toBe("1 action"))
    it("passes through unrecognized values unchanged", () => expect(normalizeCastingTime("1 minute")).toBe("1 minute"))
    it("passes through empty string unchanged", () => expect(normalizeCastingTime("")).toBe(""))
  })

  describe("countCheckedDeathSaves", () => {
    it("counts 3 checked boxes", () => {
      const fields = { "Death Save Success 1": true, "Death Save Success 2": true, "Death Save Success 3": true }
      expect(countCheckedDeathSaves(fields, "Death Save Success")).toBe(3)
    })
    it("counts 1 checked box", () => {
      const fields = { "Death Save Failure 1": "Yes", "Death Save Failure 2": "Off", "Death Save Failure 3": "Off" }
      expect(countCheckedDeathSaves(fields, "Death Save Failure")).toBe(1)
    })
    it("counts 0 when none checked", () => {
      const fields = { "Death Save Success 1": false, "Death Save Success 2": false, "Death Save Success 3": false }
      expect(countCheckedDeathSaves(fields, "Death Save Success")).toBe(0)
    })
    it("handles missing fields", () => {
      expect(countCheckedDeathSaves({}, "Death Save Success")).toBe(0)
    })
  })

  describe("decodeDndbeyondHexString", () => {
    it("decodes FEFF UTF-16 BE hex string to 'P'", () => {
      // FEFF (BOM) + 0050 = U+0050 = "P"
      expect(decodeDndbeyondHexString("FEFF0050")).toBe("P")
    })
    it("decodes FEFF2022 to bullet character", () => {
      // U+2022 = •
      expect(decodeDndbeyondHexString("FEFF2022")).toBe("•")
    })
    it("returns raw string if no FEFF prefix", () => {
      expect(decodeDndbeyondHexString("Hello")).toBe("Hello")
    })
    it("returns raw string if not valid hex", () => {
      expect(decodeDndbeyondHexString("NotHex!")).toBe("NotHex!")
    })
    it("handles multi-character decoded string", () => {
      // FEFF + 0050 (P) + 0061 (a) + 006C (l) + 0061 (a) + 0064 (d) + 0069 (i) + 006E (n)
      const result = decodeDndbeyondHexString("FEFF00500061006C006100640069006E")
      expect(result).toBe("Paladin")
    })
  })

  describe("mapFieldsToCharacter", () => {
    describe("identity fields", () => {
      it("maps CharacterName", () => {
        const result = mapFieldsToCharacter({ CharacterName: "Urush Greenshield" })
        expect(result.name).toBe("Urush Greenshield")
      })
      it("strips [player:...] suffix from CharacterName", () => {
        const result = mapFieldsToCharacter({ CharacterName: "Urush Greenshield [player: Michael]" })
        expect(result.name).toBe("Urush Greenshield")
      })
      it("maps CLASS  LEVEL (double space) splitting class and level", () => {
        // D&D Beyond uses double space between CLASS and LEVEL
        const result = mapFieldsToCharacter({ "CLASS  LEVEL": "Paladin 2" })
        expect(result.class).toBe("Paladin")
        expect(result.level).toBe(2)
      })
      it("maps BACKGROUND, RACE, ALIGNMENT (all caps)", () => {
        const result = mapFieldsToCharacter({ BACKGROUND: "Acolyte", RACE: "Orc", ALIGNMENT: "Chaotic Good" })
        expect(result.background).toBe("Acolyte")
        expect(result.race).toBe("Orc")
        expect(result.alignment).toBe("Chaotic Good")
      })
      it("maps EXPERIENCE POINTS", () => {
        const result = mapFieldsToCharacter({ "EXPERIENCE POINTS": "360" })
        expect(result.experiencePoints).toBe(360)
      })
    })

    describe("ability scores", () => {
      it("maps all 6 ability scores", () => {
        const result = mapFieldsToCharacter({
          STR: "15", DEX: "10", CON: "13", INT: "12", WIS: "10", CHA: "15",
        })
        expect(result.abilityScores).toEqual({
          strength: 15, dexterity: 10, constitution: 13,
          intelligence: 12, wisdom: 10, charisma: 15,
        })
      })
    })

    describe("saving throws", () => {
      // D&D Beyond uses StrProf, ChaProf, etc. — non-empty = proficient, empty = not
      it("marks proficient when field is non-empty ('P')", () => {
        const result = mapFieldsToCharacter({ ChaProf: "P", StrProf: "" })
        expect(result.savingThrows?.charisma).toBe(true)
        expect(result.savingThrows?.strength).toBe(false)
      })
      it("marks proficient when field is bullet-encoded (FEFF2022)", () => {
        const result = mapFieldsToCharacter({ WisProf: "FEFF2022" })
        expect(result.savingThrows?.wisdom).toBe(true)
      })
    })

    describe("skills", () => {
      // D&D Beyond uses AthleticsProf, AcrobaticsProf, etc. — "P" = proficient, "E" = expertise
      it("marks proficient skills", () => {
        const result = mapFieldsToCharacter({ AthleticsProf: "P", AcrobaticsProf: "" })
        expect(result.skills?.athletics).toEqual({ proficient: true, expertise: false })
        expect(result.skills?.acrobatics).toEqual({ proficient: false, expertise: false })
      })
      it("marks expertise when field is 'E'", () => {
        const result = mapFieldsToCharacter({ ArcanaProf: "E" })
        expect(result.skills?.arcana).toEqual({ proficient: true, expertise: true })
      })
      it("does not include skills when no skill fields present", () => {
        const result = mapFieldsToCharacter({ CharacterName: "Test" })
        expect(result.skills).toBeUndefined()
      })
    })

    describe("combat stats", () => {
      it("maps AC and Speed", () => {
        const result = mapFieldsToCharacter({ AC: "18", Speed: "30 ft. (Walking)" })
        expect(result.armorClass).toBe(18)
        expect(result.speed).toBe(30)
      })
      it("maps initiative from 'Init' field", () => {
        // D&D Beyond uses "Init" not "Initiative"
        const result = mapFieldsToCharacter({ Init: "+0" })
        expect(result.initiative).toBe(0)
      })
      it("maps HP fields (MaxHP, CurrentHP, TempHP)", () => {
        // D&D Beyond uses MaxHP/CurrentHP/TempHP, not HPMax/HPCurrent/HPTemp
        const result = mapFieldsToCharacter({ MaxHP: "18", CurrentHP: "14", TempHP: "5" })
        expect(result.hitPoints?.maximum).toBe(18)
        expect(result.hitPoints?.current).toBe(14)
        expect(result.hitPoints?.temporary).toBe(5)
      })
      it("defaults current HP to max HP when CurrentHP is blank", () => {
        const result = mapFieldsToCharacter({ MaxHP: "18", CurrentHP: "" })
        expect(result.hitPoints?.maximum).toBe(18)
        expect(result.hitPoints?.current).toBe(18)
      })
      it("skips TempHP when blank or '--'", () => {
        const blank = mapFieldsToCharacter({ TempHP: "" })
        expect(blank.hitPoints?.temporary).toBeUndefined()
        const dash = mapFieldsToCharacter({ TempHP: "--" })
        expect(dash.hitPoints?.temporary).toBeUndefined()
      })
      it("maps proficiency bonus", () => {
        const result = mapFieldsToCharacter({ ProfBonus: "+2" })
        expect(result.proficiencyBonus).toBe(2)
      })
    })

    describe("hit dice", () => {
      it("maps 'Total' field as hitDice string", () => {
        // D&D Beyond uses "Total" not "HDTotal"
        const result = mapFieldsToCharacter({ Total: "2d10" })
        expect(result.hitDice).toBe("2d10")
      })
    })

    describe("attacks", () => {
      it("builds Attack for weapon 1 using 'Wpn Name' (no number)", () => {
        // First weapon slot uses "Wpn Name", "Wpn1 AtkBonus", "Wpn1 Damage"
        const result = mapFieldsToCharacter({
          "Wpn Name": "Longsword",
          "Wpn1 AtkBonus": "+4",
          "Wpn1 Damage": "1d8+2 Slashing",
        })
        expect(result.attacks).toHaveLength(1)
        expect(result.attacks![0].name).toBe("Longsword")
        expect(result.attacks![0].attackBonus).toBe(4)
        expect(result.attacks![0].damage).toBe("1d8+2")
        expect(result.attacks![0].damageType).toBe("Slashing")
        expect(result.attacks![0].type).toBe("attack")
      })
      it("builds Attack for weapon 2 using 'Wpn Name 2'", () => {
        const result = mapFieldsToCharacter({
          "Wpn Name 2": "Handaxe",
          "Wpn2 AtkBonus": "+3",
          "Wpn2 Damage": "1d6+1 Slashing",
        })
        expect(result.attacks).toHaveLength(1)
        expect(result.attacks![0].name).toBe("Handaxe")
      })
      it("skips blank weapon name slots", () => {
        const result = mapFieldsToCharacter({
          "Wpn Name": "Longsword",
          "Wpn1 AtkBonus": "+4",
          "Wpn1 Damage": "1d8+2 Slashing",
          "Wpn Name 2": "",
          "Wpn Name 3": "",
        })
        expect(result.attacks).toHaveLength(1)
      })
      it("does not include attacks when all slots are blank", () => {
        const result = mapFieldsToCharacter({ "Wpn Name": "", "Wpn Name 2": "", "Wpn Name 3": "" })
        expect(result.attacks).toBeUndefined()
      })
    })

    describe("coins", () => {
      it("maps all coin types", () => {
        const result = mapFieldsToCharacter({ CP: "5", SP: "10", EP: "0", GP: "42", PP: "1" })
        expect(result.coins).toEqual({ cp: 5, sp: 10, ep: 0, gp: 42, pp: 1 })
      })
    })

    describe("biography fields", () => {
      it("maps physical characteristics (all caps field names)", () => {
        // D&D Beyond uses AGE, HEIGHT, WEIGHT, EYES, SKIN, HAIR (all caps)
        const result = mapFieldsToCharacter({
          AGE: "31", HEIGHT: "6ft 1in", WEIGHT: "250",
          EYES: "Green", SKIN: "Green", HAIR: "Brown",
        })
        expect(result.age).toBe("31")
        expect(result.height).toBe("6ft 1in")
        expect(result.weight).toBe("250")
        expect(result.eyes).toBe("Green")
        expect(result.skin).toBe("Green")
        expect(result.hair).toBe("Brown")
      })
      it("maps personality fields", () => {
        const result = mapFieldsToCharacter({
          PersonalityTraits: "Brave", Ideals: "Justice", Bonds: "My homeland", Flaws: "Stubborn",
        })
        expect(result.personalityTraits).toBe("Brave")
        expect(result.ideals).toBe("Justice")
        expect(result.bonds).toBe("My homeland")
        expect(result.flaws).toBe("Stubborn")
      })
      it("maps backstory and appearance ('Appearance' not 'CharacterAppearance')", () => {
        const result = mapFieldsToCharacter({ Backstory: "Born in war", Appearance: "Tall and green" })
        expect(result.backstory).toBe("Born in war")
        expect(result.appearance).toBe("Tall and green")
      })
      it("maps allies ('AlliesOrganizations' not 'AlliesOrgs')", () => {
        const result = mapFieldsToCharacter({ AlliesOrganizations: "The Shining Hand" })
        expect(result.alliesAndOrganizations).toBe("The Shining Hand")
      })
    })

    describe("features", () => {
      it("parses star items from FeaturesTraits1 into individual classFeatures", () => {
        const result = mapFieldsToCharacter({
          FeaturesTraits1: "=== CLASS FEATURES ===\n* Lay On Hands • PHB-2024 109\nYou have a healing pool.",
        })
        expect(result.classFeatures).toHaveLength(1)
        expect(result.classFeatures![0].name).toBe("Lay On Hands")
        expect(result.classFeatures![0].description).toContain("healing pool")
        expect(result.classFeatures![0].source).toBe("class-feature")
      })
      it("parses star items from FeaturesTraits2 into individual speciesTraits", () => {
        const result = mapFieldsToCharacter({
          FeaturesTraits2: "=== SPECIES TRAITS ===\n* Darkvision • PHB-2024 195\nYou can see in dim light.",
        })
        expect(result.speciesTraits).toHaveLength(1)
        expect(result.speciesTraits![0].name).toBe("Darkvision")
        expect(result.speciesTraits![0].source).toBe("species-trait")
      })
      it("detects actionKind from pipe sub-item inline patterns", () => {
        const result = mapFieldsToCharacter({
          FeaturesTraits1: "=== CLASS FEATURES ===\n* Divine Smite • PHB-2024 109\nDesc.\n   | Divine Smite: Hit • 1 Bonus Action",
        })
        expect(result.classFeatures?.some(f => f.name === "Divine Smite" && f.actionKind === "bonus-action")).toBe(true)
      })
      it("omits classFeatures when all fields have no parseable items", () => {
        const result = mapFieldsToCharacter({ FeaturesTraits1: "", Actions1: "", Actions2: "" })
        expect(result.classFeatures).toBeUndefined()
      })
    })

    describe("splitIntoSections", () => {
      it("returns one entry with null heading for text with no headings", () => {
        const sections = splitIntoSections("just some text")
        expect(sections).toHaveLength(1)
        expect(sections[0].heading).toBeNull()
        expect(sections[0].content).toBe("just some text")
      })
      it("splits on === HEADING === lines", () => {
        const sections = splitIntoSections("=== FIRST ===\ncontent1\n=== SECOND ===\ncontent2")
        expect(sections).toHaveLength(3) // preamble (empty), FIRST, SECOND
        expect(sections[1].heading).toBe("FIRST")
        expect(sections[1].content).toBe("content1")
        expect(sections[2].heading).toBe("SECOND")
        expect(sections[2].content).toBe("content2")
      })
      it("trims whitespace from heading labels", () => {
        const sections = splitIntoSections("===  PALADIN FEATURES  ===\ntext")
        expect(sections[1].heading).toBe("PALADIN FEATURES")
      })
      it("produces empty content for a heading with no body", () => {
        const sections = splitIntoSections("=== A ===\n=== B ===\ntext")
        expect(sections[1].content).toBe("")
        expect(sections[2].content).toBe("text")
      })
      it("returns single entry with empty content for empty string", () => {
        const sections = splitIntoSections("")
        expect(sections).toHaveLength(1)
        expect(sections[0].content).toBe("")
      })
    })

    describe("parseFeaturesTraitsText", () => {
      it("parses a star item into classFeatures under a FEATURES heading", () => {
        const { classFeatures } = parseFeaturesTraitsText("=== CLASS FEATURES ===\n* Lay On Hands • PHB-2024 109\nHealing pool.")
        expect(classFeatures).toHaveLength(1)
        expect(classFeatures[0].name).toBe("Lay On Hands")
        expect(classFeatures[0].source).toBe("class-feature")
        expect(classFeatures[0].description).toBe("Healing pool.")
      })
      it("routes items under a TRAITS/SPECIES heading to speciesTraits", () => {
        const { speciesTraits } = parseFeaturesTraitsText("=== ORC SPECIES TRAITS ===\n* Darkvision • PHB-2024 195\nSee in dark.")
        expect(speciesTraits).toHaveLength(1)
        expect(speciesTraits[0].name).toBe("Darkvision")
        expect(speciesTraits[0].source).toBe("species-trait")
      })
      it("routes items under a FEATS heading to feats", () => {
        const { feats } = parseFeaturesTraitsText("=== FEATS ===\n* Magic Initiate • PHB-2024 201\nLearn spells.")
        expect(feats).toHaveLength(1)
        expect(feats[0].name).toBe("Magic Initiate")
        expect(feats[0].source).toBe("feat")
      })
      it("strips source citation from name", () => {
        const { classFeatures } = parseFeaturesTraitsText("=== FEATURES ===\n* Smite • PHB-2024 110")
        expect(classFeatures[0].name).toBe("Smite")
      })
      it("includes pipe sub-items as text in the description", () => {
        const text = "=== FEATURES ===\n* Lay On Hands • PHB-2024 109\nDesc.\n   | Lay On Hands: Heal • 1 Bonus Action"
        const { classFeatures } = parseFeaturesTraitsText(text)
        expect(classFeatures[0].description).toContain("Lay On Hands: Heal")
        expect(classFeatures).toHaveLength(1) // no extra feature created from |
      })
      it("detects actionKind from bullet pipe sub-item (• Bonus Action)", () => {
        const text = "=== FEATURES ===\n* Lay On Hands • PHB-2024 109\nDesc.\n   | Lay On Hands: Heal • 1 Bonus Action"
        const { classFeatures } = parseFeaturesTraitsText(text)
        expect(classFeatures[0].actionKind).toBe("bonus-action")
      })
      it("detects actionKind from colon pipe sub-item (: 1 Action)", () => {
        const text = "=== FEATURES ===\n* Divine Smite • PHB-2024 110\nDesc.\n   | Divine Smite: Hit: 1 Action"
        const { classFeatures } = parseFeaturesTraitsText(text)
        expect(classFeatures[0].actionKind).toBe("action")
      })
      it("uses actionKind from first matching pipe sub-item", () => {
        const text = "=== FEATURES ===\n* Weapon Mastery • PHB-2024 200\nDesc.\n   | Slow: 1 Action\n   | Push: 1 Bonus Action"
        const { classFeatures } = parseFeaturesTraitsText(text)
        expect(classFeatures[0].actionKind).toBe("action")
      })
      it("leaves actionKind undefined when no pipe sub-items have action patterns", () => {
        const text = "=== FEATURES ===\n* Darkvision • PHB-2024 195\nPassive trait."
        const { speciesTraits } = parseFeaturesTraitsText("=== SPECIES TRAITS ===\n* Darkvision • PHB-2024 195\nPassive trait.")
        expect(speciesTraits[0].actionKind).toBeUndefined()
      })
      it("handles multi-section combined text (FEATURES then FEATS)", () => {
        const text = "=== PALADIN FEATURES ===\n* Smite • src\n\n=== FEATS ===\n* Alert • src"
        const { classFeatures, feats } = parseFeaturesTraitsText(text)
        expect(classFeatures[0].name).toBe("Smite")
        expect(feats[0].name).toBe("Alert")
      })
      it("discards preamble text before the first heading", () => {
        const text = "You're a Humanoid.\n=== FEATURES ===\n* Smite • src"
        const { classFeatures } = parseFeaturesTraitsText(text)
        expect(classFeatures).toHaveLength(1)
        expect(classFeatures[0].name).toBe("Smite")
      })
      it("returns empty arrays for blank input", () => {
        const result = parseFeaturesTraitsText("")
        expect(result.classFeatures).toHaveLength(0)
        expect(result.speciesTraits).toHaveLength(0)
        expect(result.feats).toHaveLength(0)
      })
      it("produces empty description for a star item with no body lines", () => {
        const { classFeatures } = parseFeaturesTraitsText("=== FEATURES ===\n* Spellcasting • PHB-2024 110")
        expect(classFeatures[0].description).toBe("")
      })
    })

    describe("parseActionsText", () => {
      it("parses bonus action items with actionKind bonus-action", () => {
        const features = parseActionsText("=== BONUS ACTIONS ===\n\nAdrenaline Rush • 2 / Short Rest\nAs a Bonus Action, dash.")
        expect(features).toHaveLength(1)
        expect(features[0].name).toBe("Adrenaline Rush")
        expect(features[0].actionKind).toBe("bonus-action")
        expect(features[0].source).toBe("class-feature")
        expect(features[0].description).toBe("As a Bonus Action, dash.")
      })
      it("parses reaction items with actionKind reaction", () => {
        const features = parseActionsText("=== REACTIONS ===\n\nShield of Faith\nReact to attacks.")
        expect(features[0].actionKind).toBe("reaction")
        expect(features[0].name).toBe("Shield of Faith")
      })
      it("skips ACTIONS section (standard game actions list)", () => {
        const features = parseActionsText("=== ACTIONS ===\nStandard Actions\n     Attack, Dodge, Dash")
        expect(features).toHaveLength(0)
      })
      it("skips SPECIAL section", () => {
        const features = parseActionsText("=== SPECIAL ===\nSome special thing")
        expect(features).toHaveLength(0)
      })
      it("extracts name before bullet from action line", () => {
        const features = parseActionsText("=== BONUS ACTIONS ===\n\nLay On Hands: Heal • Long Rest\nDescription.")
        expect(features[0].name).toBe("Lay On Hands: Heal")
      })
      it("handles items with no bullet suffix in the name line", () => {
        const features = parseActionsText("=== BONUS ACTIONS ===\n\nLay On Hands: Heal\nDescription.")
        expect(features[0].name).toBe("Lay On Hands: Heal")
      })
      it("separates multiple items by blank lines", () => {
        const text = "=== BONUS ACTIONS ===\n\nItem One\nDesc one.\n\nItem Two\nDesc two."
        const features = parseActionsText(text)
        expect(features).toHaveLength(2)
        expect(features[0].name).toBe("Item One")
        expect(features[1].name).toBe("Item Two")
      })
      it("returns empty array for blank input", () => {
        expect(parseActionsText("")).toHaveLength(0)
      })
    })

    describe("spell slots", () => {
      // D&D Beyond stores "N Slots OO..." strings in spellSlotHeader1..9
      // "O" = open slot, missing O = used slot
      it("calculates used = total - open count from spellSlotHeader", () => {
        // "4 Slots OO" = 4 total, 2 open, 2 used
        const result = mapFieldsToCharacter({ spellSlotHeader1: "4 Slots OO" })
        expect(result.spellSlots?.[1]).toEqual({ total: 4, used: 2 })
      })
      it("all slots open = zero used", () => {
        const result = mapFieldsToCharacter({ spellSlotHeader1: "2 Slots OO" })
        expect(result.spellSlots?.[1]?.used).toBe(0)
      })
      it("handles multiple slot levels", () => {
        const result = mapFieldsToCharacter({
          spellSlotHeader1: "4 Slots OOO",
          spellSlotHeader2: "3 Slots O",
        })
        expect(result.spellSlots?.[1]).toEqual({ total: 4, used: 1 })
        expect(result.spellSlots?.[2]).toEqual({ total: 3, used: 2 })
      })
    })

    describe("spellcasting", () => {
      it("maps spellCastingClass0 and spellCastingAbility0", () => {
        const result = mapFieldsToCharacter({ spellCastingClass0: "Paladin", spellCastingAbility0: "CHA" })
        expect(result.spellcastingClass).toBe("Paladin")
        expect(result.spellcastingAbility).toBe("charisma")
      })
    })

    describe("heroicInspiration", () => {
      it("is true when Inspiration field is non-empty", () => {
        // D&D Beyond Inspiration is a button — set = non-empty, unset = empty string
        expect(mapFieldsToCharacter({ Inspiration: "Yes" }).heroicInspiration).toBe(true)
      })
      it("is false when Inspiration field is empty", () => {
        expect(mapFieldsToCharacter({ Inspiration: "" }).heroicInspiration).toBe(false)
      })
    })

    describe("unknown fields", () => {
      it("ignores unrecognized field names gracefully", () => {
        expect(() => mapFieldsToCharacter({ SomeFutureField: "value" })).not.toThrow()
      })
      it("returns partial result when many fields are missing", () => {
        const result = mapFieldsToCharacter({ CharacterName: "Test" })
        expect(result.name).toBe("Test")
        expect(result.abilityScores).toBeUndefined()
      })
    })

    describe("full character mapping", () => {
      it("maps a complete D&D Beyond field record", () => {
        const fields: Record<string, string | boolean> = {
          CharacterName: "Urush Greenshield",
          "CLASS  LEVEL": "Paladin 2",
          BACKGROUND: "Acolyte",
          RACE: "Orc",
          ALIGNMENT: "Chaotic Good",
          "EXPERIENCE POINTS": "360",
          STR: "15", DEX: "10", CON: "13", INT: "12", WIS: "10", CHA: "15",
          StrProf: "", DexProf: "", ConProf: "",
          IntProf: "", WisProf: "P", ChaProf: "P",
          AthleticsProf: "P", IntimidationProf: "P", ReligionProf: "P", InsightProf: "P",
          AC: "18", Init: "+0", Speed: "30 ft. (Walking)",
          MaxHP: "18", CurrentHP: "18", TempHP: "--",
          Total: "2d10",
          ProfBonus: "+2",
          "Wpn Name": "Longsword", "Wpn1 AtkBonus": "+4", "Wpn1 Damage": "1d8+2 Slashing",
          "Wpn Name 2": "Unarmed Strike", "Wpn2 AtkBonus": "+4", "Wpn2 Damage": "3 Bludgeoning",
          GP: "42",
          AGE: "31", HEIGHT: "6ft 1in", WEIGHT: "250",
          spellCastingClass0: "Paladin", spellCastingAbility0: "CHA",
          spellSlotHeader1: "2 Slots OO",
        }
        const result = mapFieldsToCharacter(fields)
        expect(result.name).toBe("Urush Greenshield")
        expect(result.class).toBe("Paladin")
        expect(result.level).toBe(2)
        expect(result.race).toBe("Orc")
        expect(result.background).toBe("Acolyte")
        expect(result.abilityScores?.strength).toBe(15)
        expect(result.abilityScores?.charisma).toBe(15)
        expect(result.savingThrows?.wisdom).toBe(true)
        expect(result.savingThrows?.strength).toBe(false)
        expect(result.skills?.athletics.proficient).toBe(true)
        expect(result.skills?.acrobatics.proficient).toBe(false)
        expect(result.armorClass).toBe(18)
        expect(result.initiative).toBe(0)
        expect(result.speed).toBe(30)
        expect(result.hitPoints?.maximum).toBe(18)
        expect(result.hitDice).toBe("2d10")
        expect(result.proficiencyBonus).toBe(2)
        expect(result.attacks).toHaveLength(2)
        expect(result.attacks![0].name).toBe("Longsword")
        expect(result.attacks![0].attackBonus).toBe(4)
        expect(result.coins?.gp).toBe(42)
        expect(result.spellcastingAbility).toBe("charisma")
        expect(result.spellcastingClass).toBe("Paladin")
        expect(result.spellSlots?.[1]).toEqual({ total: 2, used: 0 })
      })
    })
  })

  describe("mergeWithDefault", () => {
    it("assigns a fresh id", () => {
      const result = mergeWithDefault({ name: "Test" })
      expect(result.id).toBeTruthy()
      expect(typeof result.id).toBe("string")
    })
    it("preserves parsed fields over defaults", () => {
      const result = mergeWithDefault({ name: "Urush", level: 2 })
      expect(result.name).toBe("Urush")
      expect(result.level).toBe(2)
    })
    it("fills missing fields from createDefaultCharacter", () => {
      const result = mergeWithDefault({ name: "Urush" })
      expect(result.attacks).toEqual([])
      expect(result.spells).toEqual([])
      expect(result.proficiencyBonus).toBe(2)
    })
    it("sets edition to '2024'", () => {
      const result = mergeWithDefault({})
      expect(result.edition).toBe("2024")
    })
    it("deep-merges abilityScores", () => {
      const result = mergeWithDefault({ abilityScores: { strength: 15 } as any })
      expect(result.abilityScores.strength).toBe(15)
      expect(result.abilityScores.dexterity).toBe(10)
    })
    it("deep-merges individual skills without wiping others", () => {
      const result = mergeWithDefault({
        skills: { athletics: { proficient: true, expertise: false } } as any,
      })
      expect(result.skills.athletics.proficient).toBe(true)
      expect(result.skills.acrobatics.proficient).toBe(false)
    })
    it("deep-merges spellSlots", () => {
      const result = mergeWithDefault({ spellSlots: { 1: { total: 4, used: 2 } } as any })
      expect(result.spellSlots[1]).toEqual({ total: 4, used: 2 })
      expect(result.spellSlots[2]).toEqual({ total: 0, used: 0 })
    })
    it("merges coins", () => {
      const result = mergeWithDefault({ coins: { cp: 5, sp: 0, ep: 0, gp: 42, pp: 0 } })
      expect(result.coins?.gp).toBe(42)
      expect(result.coins?.cp).toBe(5)
    })
  })
})

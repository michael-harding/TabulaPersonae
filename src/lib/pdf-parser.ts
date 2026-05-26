import { PDFDocument, PDFName, PDFArray } from "pdf-lib"
import type { AbilityScores, ActionKind, Attack, Character, Equipment, Feature, FeatureKind, Skills, Spell } from "./character-types"
import { createDefaultCharacter } from "./character-types"

type SpellSlots = Character["spellSlots"]
type SpellSlotLevel = keyof SpellSlots

// --- Primitive parsers (exported for unit tests) ---

export function parseIntField(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^\d-]/g, "")
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

export function parseCheckbox(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value
  if (!value) return false
  const lower = value.toLowerCase()
  return lower === "yes" || lower === "on" || lower === "true"
}

export function parseClassLevel(value: string): { class: string; level: number } {
  const trimmed = value.trim()
  if (!trimmed) return { class: "", level: 1 }
  const parts = trimmed.split(/\s+/)
  const last = parts[parts.length - 1]
  const n = parseInt(last, 10)
  if (!isNaN(n) && String(n) === last && parts.length > 1) {
    return { class: parts.slice(0, -1).join(" "), level: n }
  }
  return { class: trimmed, level: 1 }
}

export function parseSpeedField(value: string | undefined): number {
  if (!value) return 30
  const match = /(\d+)/.exec(value)
  return match ? parseInt(match[1], 10) : 30
}

export function parseDamageTypeField(value: string | undefined): { damage: string; damageType: string } {
  if (!value?.trim()) return { damage: "", damageType: "" }
  const trimmed = value.trim()
  const lastSpace = trimmed.lastIndexOf(" ")
  if (lastSpace === -1) return { damage: trimmed, damageType: "" }
  return { damage: trimmed.slice(0, lastSpace), damageType: trimmed.slice(lastSpace + 1) }
}

// Splits text on === HEADING === lines. The first element has heading: null if there is
// content before the first heading. Used by parseProficienciesLang, parseFeaturesTraitsText,
// and parseActionsText so section-splitting logic lives in one place.
export function splitIntoSections(text: string): Array<{ heading: string | null; content: string }> {
  const headingRe = /^===\s*(.+?)\s*===\s*$/gm
  const parts = text.split(/^===\s*.+?\s*===\s*$/m)
  const headings = [...text.matchAll(headingRe)].map(m => m[1].trim())
  return parts.map((content, i) => ({
    heading: i === 0 ? null : headings[i - 1],
    content: content.trim(),
  }))
}

export function parseProficienciesLang(value: string | undefined): { languages: string[]; otherProficiencies: string[] } {
  if (!value?.trim()) return { languages: [], otherProficiencies: [] }

  const languages: string[] = []
  const otherProficiencies: string[] = []

  if (/===/.test(value)) {
    // D&D Beyond sectioned format: === LANGUAGES ===, === ARMOR ===, etc.
    for (const { heading, content } of splitIntoSections(value)) {
      if (!content) continue
      const tokens = content.split(/[,\n]/).map(t => t.trim()).filter(Boolean)
      if (heading?.toUpperCase().includes("LANGUAGE")) tokens.forEach(t => languages.push(t))
      else tokens.forEach(t => otherProficiencies.push(t))
    }
  } else {
    // Plain comma/newline list — classify by known D&D language names
    const DND_LANGUAGES = new Set([
      "common", "elvish", "dwarvish", "gnomish", "halfling", "orc",
      "abyssal", "celestial", "draconic", "deep speech", "infernal",
      "primordial", "sylvan", "undercommon", "giant", "goblin",
      "common sign language",
    ])
    const tokens = value.split(/[,\n]/).map(t => t.trim()).filter(Boolean)
    for (const token of tokens) {
      if (DND_LANGUAGES.has(token.toLowerCase())) languages.push(token)
      else otherProficiencies.push(token)
    }
  }

  return { languages, otherProficiencies }
}

function classifyFeatureSection(label: string): FeatureKind | null {
  const u = label.toUpperCase()
  if (/\bFEATS\b/.test(u)) return "feat"
  if (/FEATURE/.test(u)) return "class-feature"
  if (/TRAIT/.test(u) || /SPECIES/.test(u)) return "species-trait"
  return null
}

function extractStarItemName(line: string): string {
  const withoutStar = line.replace(/^\s*\*\s*/, "").trim()
  const bulletIdx = withoutStar.indexOf("•")
  return bulletIdx === -1 ? withoutStar : withoutStar.slice(0, bulletIdx).trim()
}

function buildFeatureDescription(lines: string[]): string {
  return lines
    .map(line => (/^\s*\|/.test(line) ? line.replace(/^\s*\|\s*/, "").trim() : line.trim()))
    .filter(Boolean)
    .join("\n")
}

export function parseFeaturesTraitsText(text: string): {
  classFeatures: Feature[]
  speciesTraits: Feature[]
  feats: Feature[]
} {
  const output = { classFeatures: [] as Feature[], speciesTraits: [] as Feature[], feats: [] as Feature[] }
  const kindToKey: Record<FeatureKind, keyof typeof output> = {
    "class-feature": "classFeatures",
    "species-trait": "speciesTraits",
    "feat": "feats",
  }

  let currentKind: FeatureKind | null = null
  let pendingName: string | null = null
  let pendingLines: string[] = []
  let pendingActionKind: ActionKind | undefined = undefined

  function flush() {
    if (pendingName === null || currentKind === null) return
    const name = pendingName
    const description = buildFeatureDescription(pendingLines)
    const feature: Feature = { id: crypto.randomUUID(), name, description, source: currentKind }
    if (pendingActionKind) feature.actionKind = pendingActionKind
    output[kindToKey[currentKind]].push(feature)
    pendingName = null
    pendingLines = []
    pendingActionKind = undefined
  }

  for (const { heading, content } of splitIntoSections(text)) {
    if (heading === null) continue // discard preamble before first ===
    const kind = classifyFeatureSection(heading)
    if (kind !== null) {
      flush()
      currentKind = kind
    }
    if (currentKind === null) continue

    for (const line of content.split("\n")) {
      if (/^\s*\*\s+\S/.test(line)) {
        flush()
        pendingName = extractStarItemName(line)
        pendingLines = []
      } else if (pendingName !== null) {
        if (/^\s*\|/.test(line) && pendingActionKind === undefined) {
          const kind = extractActionKind(line)
          if (kind) pendingActionKind = kind
        }
        pendingLines.push(line)
      }
    }
    flush()
  }

  return output
}

// Detects an action kind from inline patterns like "• 1 Bonus Action", ": Bonus Action",
// "• Reaction", ": 1 Action", etc. Used to annotate features from their pipe sub-items.
function extractActionKind(text: string): ActionKind | undefined {
  const m = /(?:•|:)\s*(?:\d+\s+)?(bonus\s+action|action|reaction)\s*(?:\(.*?\))?\s*$/i.exec(text.trim())
  if (!m) return undefined
  const kind = m[1].toLowerCase().replace(/\s+/, " ")
  if (kind === "bonus action") return "bonus-action"
  if (kind === "action") return "action"
  if (kind === "reaction") return "reaction"
  return undefined
}

function classifyActionSection(label: string): ActionKind | "skip" {
  const u = label.toUpperCase()
  if (u.includes("BONUS")) return "bonus-action"
  if (u.includes("REACTION")) return "reaction"
  return "skip"
}

export function parseActionsText(text: string): Feature[] {
  const features: Feature[] = []

  for (const { heading, content } of splitIntoSections(text)) {
    if (heading === null) continue
    const actionKind = classifyActionSection(heading)
    if (actionKind === "skip") continue

    // Items are separated by blank lines within the section
    const blocks = content.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) continue
      const firstLine = lines[0]
      const bulletIdx = firstLine.indexOf("•")
      const name = bulletIdx === -1 ? firstLine : firstLine.slice(0, bulletIdx).trim()
      if (!name) continue
      const description = lines.slice(1).join("\n")
      features.push({ id: crypto.randomUUID(), name, description, source: "class-feature", actionKind })
    }
  }

  return features
}

const ABILITY_ABBREVIATIONS: Record<string, keyof AbilityScores> = {
  str: "strength", dex: "dexterity", con: "constitution",
  int: "intelligence", wis: "wisdom", cha: "charisma",
}

export function parseSpellcastingAbility(value: string | undefined): keyof AbilityScores | "" {
  if (!value?.trim()) return ""
  const lower = value.trim().toLowerCase()
  const full: Array<keyof AbilityScores> = [
    "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
  ]
  if (full.includes(lower as keyof AbilityScores)) return lower as keyof AbilityScores
  return ABILITY_ABBREVIATIONS[lower] ?? ""
}

export function normalizeCastingTime(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t) return raw
  if (/^(1\s*)?b(onus)?\s*a(ction)?$/.test(t) || t === "ba") return "1 bonus action"
  if (/^(1\s*)?r(eaction)?$/.test(t)) return "1 reaction"
  if (/^(1\s*)?a(ction)?$/.test(t)) return "1 action"
  return raw
}

export function countCheckedDeathSaves(fields: Record<string, string | boolean>, prefix: string): number {
  let count = 0
  for (let i = 1; i <= 3; i++) {
    if (parseCheckbox(fields[`${prefix} ${i}`])) count++
  }
  return count
}

// --- D&D Beyond PDF-specific helpers ---

// D&D Beyond embeds long text as hex-encoded UTF-16 strings starting with FEFF (BOM).
// This also handles the "FEFF2022" pattern for bullet/proficiency markers.
export function decodeDndbeyondHexString(raw: string): string {
  const cleanHex = raw.replace(/[\s\n]/g, "")
  if (!/^[0-9A-Fa-f]+$/i.test(cleanHex) || cleanHex.length < 4 || cleanHex.length % 2 !== 0) return raw
  if (!cleanHex.toUpperCase().startsWith("FEFF")) return raw

  const bytes: number[] = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16))
  }

  // Skip BOM (first 2 bytes), decode UTF-16 BE pairs
  let result = ""
  for (let i = 2; i < bytes.length - 1; i += 2) {
    const code = (bytes[i] << 8) | bytes[i + 1]
    if (code > 0) result += String.fromCharCode(code)
  }
  return result
}

// Returns the decoded display value of a field (handles FEFF hex encoding).
// PDF text fields store line breaks as literal "\n" (two chars) — normalize to real newline.
function decodeValue(raw: string): string {
  if (!raw) return ""
  const decoded = decodeDndbeyondHexString(raw)
  return decoded.replace(/\\n/g, "\n").replace(/\\r/g, "")
}

// A proficiency field is "marked" when it has any non-empty content after decoding.
// D&D Beyond uses "P" for proficiency, "E" for expertise, or a bullet character (FEFF2022).
function isProficient(raw: string): boolean {
  return decodeValue(raw).trim().length > 0
}

function isExpertise(raw: string): boolean {
  const decoded = decodeValue(raw).trim().toUpperCase()
  return decoded === "E" || decoded === "★"
}

// Parse "N Slots OO..." → { total: N, used: (N - count of 'O') }
function parseSpellSlotHeader(raw: string): { total: number; used: number } | null {
  if (!raw) return null
  const match = /(\d+)\s+Slots?\s*([O○●]*)/i.exec(raw)
  if (!match) return null
  const total = parseInt(match[1], 10)
  const openCount = (match[2].match(/O/gi) ?? []).length
  return { total, used: Math.max(0, total - openCount) }
}

// Parse "N lb." → N (0 for "--" or blank)
function parseWeight(raw: string): number {
  if (!raw || raw.trim() === "--") return 0
  const match = /(\d+(?:\.\d+)?)/.exec(raw)
  return match ? parseFloat(match[1]) : 0
}

export function mapFieldsToCharacter(fields: Record<string, string | boolean>): Partial<Character> {
  const result: Partial<Character> = {}
  const f = (key: string): string => {
    const raw = fields[key]
    return typeof raw === "string" ? decodeValue(raw).trim() : ""
  }

  // --- Identity ---
  // CharacterName may include "[player: Michael]" suffix — strip it
  const rawName = f("CharacterName")
  const nameMatch = rawName.match(/^(.*?)\s*\[player:/i)
  const characterName = nameMatch ? nameMatch[1].trim() : rawName
  if (characterName) result.name = characterName

  // "CLASS  LEVEL" has a double space; trim normalizes the key on extraction
  const classLevel = f("CLASS  LEVEL") || f("CLASS LEVEL")
  if (classLevel) {
    const parsed = parseClassLevel(classLevel)
    if (parsed.class) result.class = parsed.class
    result.level = parsed.level
  }

  const race = f("RACE")
  if (race) result.race = race

  const background = f("BACKGROUND")
  if (background) result.background = background

  const alignment = f("ALIGNMENT")
  if (alignment) result.alignment = alignment

  const xp = f("EXPERIENCE POINTS")
  if (xp) result.experiencePoints = parseIntField(xp)

  // --- Ability scores ---
  const abilityEntries: Array<[string, keyof AbilityScores]> = [
    ["STR", "strength"], ["DEX", "dexterity"], ["CON", "constitution"],
    ["INT", "intelligence"], ["WIS", "wisdom"], ["CHA", "charisma"],
  ]
  const abilityScores: Partial<AbilityScores> = {}
  for (const [key, ability] of abilityEntries) {
    const val = f(key)
    if (val) abilityScores[ability] = parseIntField(val)
  }
  if (Object.keys(abilityScores).length > 0) result.abilityScores = abilityScores as AbilityScores

  // --- Saving throws ---
  // D&D Beyond uses "StrProf", "DexProf", etc. — non-empty = proficient
  const stProfMap: Array<[string, keyof AbilityScores]> = [
    ["StrProf", "strength"], ["DexProf", "dexterity"], ["ConProf", "constitution"],
    ["IntProf", "intelligence"], ["WisProf", "wisdom"], ["ChaProf", "charisma"],
  ]
  const savingThrows: Partial<Record<keyof AbilityScores, boolean>> = {}
  for (const [key, ability] of stProfMap) {
    const raw = fields[key] as string | undefined
    if (raw !== undefined) savingThrows[ability] = isProficient(raw)
  }
  if (Object.keys(savingThrows).length > 0) result.savingThrows = savingThrows as Character["savingThrows"]

  // --- Skills ---
  // D&D Beyond uses "AthleticsProf", "AcrobaticsProf", etc.
  const PDF_SKILL_PROF_MAP: Record<string, keyof Skills> = {
    AcrobaticsProf: "acrobatics",
    AnimalHandlingProf: "animalHandling",
    ArcanaProf: "arcana",
    AthleticsProf: "athletics",
    DeceptionProf: "deception",
    HistoryProf: "history",
    InsightProf: "insight",
    IntimidationProf: "intimidation",
    InvestigationProf: "investigation",
    MedicineProf: "medicine",
    NatureProf: "nature",
    PerceptionProf: "perception",
    PerformanceProf: "performance",
    PersuasionProf: "persuasion",
    ReligionProf: "religion",
    SleightOfHandProf: "sleightOfHand",
    StealthProf: "stealth",
    SurvivalProf: "survival",
  }
  const defaultSkill = { proficient: false, expertise: false }
  const skills: Skills = {
    acrobatics: { ...defaultSkill }, animalHandling: { ...defaultSkill }, arcana: { ...defaultSkill },
    athletics: { ...defaultSkill }, deception: { ...defaultSkill }, history: { ...defaultSkill },
    insight: { ...defaultSkill }, intimidation: { ...defaultSkill }, investigation: { ...defaultSkill },
    medicine: { ...defaultSkill }, nature: { ...defaultSkill }, perception: { ...defaultSkill },
    performance: { ...defaultSkill }, persuasion: { ...defaultSkill }, religion: { ...defaultSkill },
    sleightOfHand: { ...defaultSkill }, stealth: { ...defaultSkill }, survival: { ...defaultSkill },
  }
  let hasAnySkill = false
  for (const [pdfKey, skillKey] of Object.entries(PDF_SKILL_PROF_MAP)) {
    const raw = fields[pdfKey] as string | undefined
    if (raw !== undefined) {
      skills[skillKey] = { proficient: isProficient(raw), expertise: isExpertise(raw) }
      hasAnySkill = true
    }
  }
  if (hasAnySkill) result.skills = skills

  // --- Combat stats ---
  const ac = f("AC")
  if (ac) result.armorClass = parseIntField(ac)

  const initiative = f("Init")
  if (initiative) result.initiative = parseIntField(initiative)

  const speed = f("Speed")
  if (speed) result.speed = parseSpeedField(speed)

  const profBonus = f("ProfBonus")
  if (profBonus) result.proficiencyBonus = parseIntField(profBonus)

  const hp: Partial<Character["hitPoints"]> = {}
  const maxHP = f("MaxHP")
  if (maxHP) hp.maximum = parseIntField(maxHP)
  const currentHP = f("CurrentHP")
  if (currentHP) hp.current = parseIntField(currentHP)
  else if (hp.maximum !== undefined) hp.current = hp.maximum
  const tempHP = f("TempHP")
  if (tempHP && tempHP !== "--") hp.temporary = parseIntField(tempHP)
  if (Object.keys(hp).length > 0) result.hitPoints = hp as Character["hitPoints"]

  // "Total" is the hit dice field (e.g. "2d10")
  const hitDice = f("Total")
  if (hitDice) result.hitDice = hitDice

  // --- Weapon attacks ---
  // First weapon uses "Wpn Name", subsequent use "Wpn Name 2", "Wpn Name 3", etc.
  const attacks: Attack[] = []
  const weaponSlots = [
    { name: "Wpn Name", atk: "Wpn1 AtkBonus", dmg: "Wpn1 Damage", notes: "Wpn Notes 1" },
    { name: "Wpn Name 2", atk: "Wpn2 AtkBonus", dmg: "Wpn2 Damage", notes: "Wpn Notes 2" },
    { name: "Wpn Name 3", atk: "Wpn3 AtkBonus", dmg: "Wpn3 Damage", notes: "Wpn Notes 3" },
    { name: "Wpn Name 4", atk: "Wpn4 AtkBonus", dmg: "Wpn4 Damage", notes: "Wpn Notes 4" },
    { name: "Wpn Name 5", atk: "Wpn5 AtkBonus", dmg: "Wpn5 Damage", notes: "Wpn Notes 5" },
    { name: "Wpn Name 6", atk: "Wpn6 AtkBonus", dmg: "Wpn6 Damage", notes: "Wpn Notes 6" },
  ]
  for (const slot of weaponSlots) {
    const wpnName = f(slot.name)
    if (!wpnName) continue
    const { damage, damageType } = parseDamageTypeField(f(slot.dmg))
    const notesText = f(slot.notes)
    attacks.push({
      id: crypto.randomUUID(),
      name: wpnName,
      type: "attack",
      attackBonus: parseIntField(f(slot.atk)),
      damage,
      damageType,
      description: notesText,
    })
  }
  if (attacks.length > 0) result.attacks = attacks

  // --- Coins ---
  const coinEntries: Array<[string, keyof NonNullable<Character["coins"]>]> = [
    ["CP", "cp"], ["SP", "sp"], ["EP", "ep"], ["GP", "gp"], ["PP", "pp"],
  ]
  const coins: Partial<NonNullable<Character["coins"]>> = {}
  for (const [key, coinKey] of coinEntries) {
    const raw = f(key)
    if (raw !== undefined && raw !== "") coins[coinKey] = parseIntField(raw)
  }
  if (Object.keys(coins).length > 0) result.coins = coins as NonNullable<Character["coins"]>

  // --- Equipment ---
  const equipment: Equipment[] = []
  for (let i = 0; i <= 25; i++) {
    const eqName = f(`Eq Name${i}`)
    if (!eqName) continue
    const qty = parseIntField(f(`Eq Qty${i}`)) || 1
    const weight = parseWeight(f(`Eq Weight${i}`))
    equipment.push({
      id: crypto.randomUUID(),
      name: eqName,
      quantity: qty,
      weight,
      description: "",
      equipped: false,
      type: "other",
    })
  }
  if (equipment.length > 0) result.equipment = equipment

  // --- Proficiencies & Languages ---
  const profLang = f("ProficienciesLang")
  if (profLang) {
    const { languages, otherProficiencies } = parseProficienciesLang(profLang)
    result.languages = languages
    result.otherProficiencies = otherProficiencies
  }

  // --- Features (pages 1–3) ---
  // FeaturesTraits1/2/3 are one continuous text split across PDF pages; concatenate before parsing.
  // Actions1/2 likewise.
  const allClassFeatures: Feature[] = []
  const allSpeciesTraits: Feature[] = []
  const allFeats: Feature[] = []

  const featuresText = [f("FeaturesTraits1"), f("FeaturesTraits2"), f("FeaturesTraits3")]
    .filter(Boolean).join("\n\n")
  if (featuresText) {
    const parsed = parseFeaturesTraitsText(featuresText)
    allClassFeatures.push(...parsed.classFeatures)
    allSpeciesTraits.push(...parsed.speciesTraits)
    allFeats.push(...parsed.feats)
  }

  if (allClassFeatures.length > 0) result.classFeatures = allClassFeatures
  if (allSpeciesTraits.length > 0) result.speciesTraits = allSpeciesTraits
  if (allFeats.length > 0) result.feats = allFeats

  // --- Biography (page 3) ---
  const bioEntries: Array<[string, keyof Pick<Character, "age" | "height" | "weight" | "eyes" | "skin" | "hair" | "alignment" | "size" | "appearance" | "alliesAndOrganizations" | "personalityTraits" | "ideals" | "bonds" | "flaws" | "backstory">]> = [
    ["AGE", "age"], ["HEIGHT", "height"], ["WEIGHT", "weight"],
    ["EYES", "eyes"], ["SKIN", "skin"], ["HAIR", "hair"],
    ["ALIGNMENT", "alignment"], ["SIZE", "size"],
    ["Appearance", "appearance"],
    ["AlliesOrganizations", "alliesAndOrganizations"],
    // D&D Beyond has trailing space on "PersonalityTraits " — handled by trimming in extractPdfFields
    ["PersonalityTraits", "personalityTraits"],
    ["Ideals", "ideals"], ["Bonds", "bonds"],
    ["Flaws", "flaws"], ["Backstory", "backstory"],
  ]
  for (const [pdfKey, charKey] of bioEntries) {
    const val = f(pdfKey)
    if (val) result[charKey] = val
  }

  // --- Spellcasting (page 4) ---
  const spellcastingClass = f("spellCastingClass0")
  if (spellcastingClass) result.spellcastingClass = spellcastingClass

  const spellcastingAbility = parseSpellcastingAbility(f("spellCastingAbility0"))
  if (spellcastingAbility) result.spellcastingAbility = spellcastingAbility

  // Parse spell slots from section headers: "2 Slots OO"
  const spellSlots: Partial<SpellSlots> = {}
  for (let i = 1; i <= 9; i++) {
    const headerRaw = f(`spellSlotHeader${i}`)
    if (!headerRaw) continue
    const parsed = parseSpellSlotHeader(headerRaw)
    if (parsed && parsed.total > 0) {
      spellSlots[i as SpellSlotLevel] = parsed
    }
  }
  if (Object.keys(spellSlots).length > 0) result.spellSlots = spellSlots as SpellSlots

  // Parse individual spells
  const spells: Spell[] = []
  // Determine level ranges from section headers
  const levelBySpellIndex: Record<number, number> = {}
  let currentLevel = 0
  for (let i = 0; i <= 49; i++) {
    // Check if there's a section header before this spell
    const header = f(`spellHeader${i}`)
    if (header) {
      const levelMatch = header.match(/(\d+)(?:st|nd|rd|th)?\s*LEVEL/i)
      currentLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0
    }
    levelBySpellIndex[i] = currentLevel
    const spellName = f(`spellName${i}`)
    if (!spellName) continue
    const preparedRaw = f(`spellPrepared${i}`)
    const prepared = preparedRaw.trim().toUpperCase() === "P"
    const saveHit = f(`spellSaveHit${i}`)
    spells.push({
      id: crypto.randomUUID(),
      name: spellName,
      level: levelBySpellIndex[i],
      school: "",
      castingTime: normalizeCastingTime(f(`spellCastingTime${i}`)),
      range: f(`spellRange${i}`),
      components: f(`spellComponents${i}`),
      duration: f(`spellDuration${i}`),
      attackSave: saveHit !== "--" ? saveHit : undefined,
      description: f(`spellNotes${i}`),
      prepared,
      known: true,
    })
  }
  if (spells.length > 0) result.spells = spells

  // --- Heroic Inspiration ---
  const inspirationRaw = fields["Inspiration"] as string | undefined
  if (inspirationRaw !== undefined) result.heroicInspiration = isProficient(inspirationRaw)

  return result
}

// --- Merge helpers ---

function mergeSkills(defaults: Skills, parsed?: Partial<Skills>): Skills {
  if (!parsed) return defaults
  const result = { ...defaults }
  for (const key of Object.keys(defaults) as Array<keyof Skills>) {
    if (parsed[key]) result[key] = { ...defaults[key], ...parsed[key] }
  }
  return result
}

function mergeSpellSlots(defaults: SpellSlots, parsed?: Partial<SpellSlots>): SpellSlots {
  if (!parsed) return defaults
  const result = { ...defaults }
  for (let i = 1; i <= 9; i++) {
    const level = i as SpellSlotLevel
    if (parsed[level]) result[level] = { ...defaults[level], ...parsed[level] }
  }
  return result
}

export function mergeWithDefault(parsed: Partial<Character>): Character {
  const d = createDefaultCharacter()
  return {
    ...d,
    ...parsed,
    id: crypto.randomUUID(),
    edition: "2024",
    abilityScores: { ...d.abilityScores, ...parsed.abilityScores },
    savingThrows: { ...d.savingThrows, ...parsed.savingThrows },
    skills: mergeSkills(d.skills, parsed.skills),
    hitPoints: { ...d.hitPoints, ...parsed.hitPoints },
    deathSaves: { ...d.deathSaves, ...parsed.deathSaves },
    spellSlots: mergeSpellSlots(d.spellSlots, parsed.spellSlots),
    coins: { ...d.coins, ...parsed.coins } as NonNullable<Character["coins"]>,
  }
}

// --- PDF field extraction via Widget annotations ---
// D&D Beyond exports PDFs with character data stored in Widget annotations (not AcroForm).
// The /V key on each Widget annotation contains the field value.
async function extractPdfFields(arrayBuffer: ArrayBuffer | Uint8Array): Promise<Record<string, string>> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const { context } = doc
  const result: Record<string, string> = {}

  for (let pageIdx = 0; pageIdx < doc.getPageCount(); pageIdx++) {
    const page = doc.getPage(pageIdx)
    const annotsRef = page.node.get(PDFName.of("Annots"))
    if (!annotsRef) continue

    const annots = context.lookup(annotsRef)
    if (!(annots instanceof PDFArray)) continue

    for (let i = 0; i < annots.size(); i++) {
      try {
        const annot = context.lookup(annots.get(i)) as any
        const subtype = annot?.get?.(PDFName.of("Subtype"))?.encodedName
        if (subtype !== "/Widget") continue

        const t = annot.get(PDFName.of("T"))
        const v = annot.get(PDFName.of("V"))
        if (!t) continue

        // Trim trailing whitespace from field names (D&D Beyond has inconsistent padding)
        const name = ((t as any).value ?? (t as any).encodedName ?? "").toString().trim()
        if (!name) continue

        const rawValue = v ? ((v as any).value ?? (v as any).encodedName ?? "").toString() : ""
        result[name] = rawValue
      } catch { /* skip unreadable annotations */ }
    }
  }

  return result
}

export async function parsePdfBuffer(input: Uint8Array | ArrayBuffer): Promise<Partial<Character>> {
  const fields = await extractPdfFields(input)
  return mapFieldsToCharacter(fields)
}

export async function parsePdfCharacterSheet(file: File): Promise<Partial<Character>> {
  const arrayBuffer = await file.arrayBuffer()
  return parsePdfBuffer(arrayBuffer)
}

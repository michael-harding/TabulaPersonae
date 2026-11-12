import type { Character } from "./character-types"

// Ordinal words up to "Ninety-Ninth". Beyond that a name ends in figures ("the 100th").
const SMALL_ORDINALS = [
  "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth",
]
// Twenty / Twentieth, Thirty / Thirtieth, …
const TENS_STEMS = ["", "", "Twent", "Thirt", "Fort", "Fift", "Sixt", "Sevent", "Eight", "Ninet"]
const LAST_WORDED_ORDINAL = 99

/** The ordinal for n as it reads in a name: 2 → "Second", 21 → "Twenty-First", 100 → "100th". */
export function ordinalWord(n: number): string {
  if (n < SMALL_ORDINALS.length) return SMALL_ORDINALS[n]
  if (n <= LAST_WORDED_ORDINAL) {
    const stem = TENS_STEMS[Math.floor(n / 10)]
    const unit = n % 10
    return unit === 0 ? `${stem}ieth` : `${stem}y-${SMALL_ORDINALS[unit]}`
  }
  const lastTwo = n % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"
  return `${n}${suffix}`
}

const ORDINAL_VALUES = new Map(
  Array.from({ length: LAST_WORDED_ORDINAL }, (_, i) => [ordinalWord(i + 1).toLowerCase(), i + 1] as const),
)
const ORDINAL_SUFFIX = /^(.*\S)\s+the\s+(\S+)$/i
const FIGURES_ORDINAL = /^(\d+)(?:st|nd|rd|th)$/i

/** Splits "Frodo the Third" into "Frodo" and 3. A name without an ordinal is the first of its line. */
function splitOrdinal(name: string): { base: string; ordinal: number } {
  const match = ORDINAL_SUFFIX.exec(name)
  if (match) {
    const word = match[2].toLowerCase()
    const ordinal = ORDINAL_VALUES.get(word) ?? Number(FIGURES_ORDINAL.exec(word)?.[1] ?? NaN)
    if (ordinal >= 1) return { base: match[1], ordinal }
  }
  return { base: name, ordinal: 1 }
}

/** Names compare ignoring case and surrounding spaces, so "frodo " is the same name as "Frodo". */
const nameKey = (name: string) => name.trim().toLocaleLowerCase()

// A character read from a file may have no name at all, whatever its type says
const nameOf = (character: Pick<Character, "name">): string => (typeof character.name === "string" ? character.name : "")

/**
 * Renames imported characters whose name is already taken, so that they can be told apart:
 * a second "Frodo" becomes "Frodo the Second", the next "Frodo the Third", and so on. The ordinal
 * follows the highest one already in use, so importing "Frodo" or "Frodo the Second" alongside
 * "Frodo" and "Frodo the Second" gives "Frodo the Third". Characters earlier in the same import
 * count as taken too. Characters without a name, and those whose name is free, keep it as it is.
 */
export function distinguishImportedNames(imported: Character[], existing: readonly Pick<Character, "name">[]): Character[] {
  const taken = new Set<string>()
  // For each name without its ordinal, the highest ordinal any character has in use
  const highestOrdinal = new Map<string, number>()
  const claim = (name: string) => {
    taken.add(nameKey(name))
    const { base, ordinal } = splitOrdinal(name.trim())
    const key = nameKey(base)
    highestOrdinal.set(key, Math.max(highestOrdinal.get(key) ?? 0, ordinal))
  }
  for (const character of existing) {
    if (nameOf(character).trim()) claim(nameOf(character))
  }

  return imported.map((character) => {
    const current = nameOf(character)
    if (!current.trim()) return character
    if (!taken.has(nameKey(current))) {
      claim(current)
      return character
    }
    const { base } = splitOrdinal(current.trim())
    const name = `${base} the ${ordinalWord((highestOrdinal.get(nameKey(base)) ?? 1) + 1)}`
    claim(name)
    return { ...character, name }
  })
}

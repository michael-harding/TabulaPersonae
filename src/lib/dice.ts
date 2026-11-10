export type DieSize = 4 | 6 | 8 | 10 | 12 | 20

export const DIE_SIZES: DieSize[] = [4, 6, 8, 10, 12, 20]

export function roll(sides: DieSize): number {
  return Math.floor(Math.random() * sides) + 1
}

export function rollMany(count: number, sides: DieSize): { rolls: number[]; total: number } {
  const rolls = Array.from({ length: count }, () => roll(sides))
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) }
}

// Parses "1d8", "2d6", "d10" → { count, sides }. Returns null for invalid or unsupported die sizes.
export function parseDiceString(s: string): { count: number; sides: DieSize } | null {
  const match = s.match(/^(\d*)d(\d+)$/i)
  if (!match) return null
  const sides = parseInt(match[2], 10)
  if (!DIE_SIZES.includes(sides as DieSize)) return null
  return { count: match[1] ? parseInt(match[1], 10) : 1, sides: sides as DieSize }
}

// A signed term of a damage or gain expression: dice ("2d6"), a flat number, or anything else
// ("WIS"), which is kept as written.
type DiceTerm =
  | { kind: "dice"; count: number; sides: number }
  | { kind: "flat"; amount: number }
  | { kind: "other"; negative: boolean; text: string }

// Terms are split at each + or -; the spaces inside a term ("8d6 fire") are kept.
function parseTerms(expr: string): DiceTerm[] {
  const terms: DiceTerm[] = []
  for (const [, sign, rawBody] of expr.matchAll(/([+-]?)([^+-]+)/g)) {
    const body = rawBody.trim()
    if (!body) continue
    const factor = sign === "-" ? -1 : 1
    const dice = body.match(/^(\d*)d(\d+)$/i)
    if (dice) terms.push({ kind: "dice", count: factor * (dice[1] ? parseInt(dice[1], 10) : 1), sides: parseInt(dice[2], 10) })
    else if (/^\d+$/.test(body)) terms.push({ kind: "flat", amount: factor * parseInt(body, 10) })
    else terms.push({ kind: "other", negative: factor < 0, text: body })
  }
  return terms
}

// An expression written with spaces around its signs ("2d8 + 3") is formatted the same way
const isSpaced = (expr: string) => /\s[+-]|[+-]\s/.test(expr.trim())

function formatTerms(terms: DiceTerm[], spaced: boolean): string {
  return terms
    .filter((t) => (t.kind === "dice" ? t.count !== 0 : t.kind === "flat" ? t.amount !== 0 : true))
    .map((t, i) => {
      const negative = t.kind === "dice" ? t.count < 0 : t.kind === "flat" ? t.amount < 0 : t.negative
      const body = t.kind === "dice" ? `${Math.abs(t.count)}d${t.sides}` : t.kind === "flat" ? String(Math.abs(t.amount)) : t.text
      if (i === 0) return `${negative ? "-" : ""}${body}`
      const sign = negative ? "-" : "+"
      return spaced ? ` ${sign} ${body}` : `${sign}${body}`
    })
    .join("")
}

/**
 * A damage or gain expression scaled up by `steps` multiples of `perLevel`, as when a spell is cast
 * with a higher slot: `value` is the scaled total ("8d6" + 2 × "1d6" gives "10d6") and `added` the
 * part the steps add ("2d6"). Dice of the same size and flat numbers are combined, and a single word
 * of `base` ("WIS") is kept as written. Anything else can't be combined safely: a `base` with other
 * text ("8d6 fire") is kept exactly as written with the added part shown after it, and a `perLevel`
 * that isn't only dice and numbers is shown alongside the base rather than folded into a wrong total.
 */
export function scaleDiceExpression(base: string, perLevel: string, steps: number): { value: string; added: string } {
  if (steps <= 0 || !perLevel.trim()) return { value: base, added: "" }

  const perTerms = parseTerms(perLevel)
  if (perTerms.some((t) => t.kind === "other")) {
    const added = steps === 1 ? perLevel.trim() : `${steps}×(${perLevel.trim()})`
    return { value: `${base.trim()} + ${added}`, added }
  }

  const addedTerms = perTerms.map((t): DiceTerm =>
    t.kind === "dice" ? { ...t, count: t.count * steps } : t.kind === "flat" ? { ...t, amount: t.amount * steps } : t
  )
  const added = formatTerms(addedTerms, isSpaced(perLevel))

  const result = parseTerms(base)
  if (result.some((t) => t.kind === "other" && !/^[a-z]+$/i.test(t.text))) {
    return { value: `${base.trim()} + ${added}`, added }
  }

  for (const add of addedTerms) {
    if (add.kind === "dice") {
      const same = result.find((t) => t.kind === "dice" && t.sides === add.sides)
      if (same?.kind === "dice") {
        same.count += add.count
      } else {
        // A new die size goes after the dice already there
        const lastDice = result.findLastIndex((t) => t.kind === "dice")
        result.splice(lastDice + 1, 0, { ...add })
      }
    } else if (add.kind === "flat") {
      const flat = result.find((t) => t.kind === "flat")
      if (flat?.kind === "flat") flat.amount += add.amount
      else result.push({ ...add })
    }
  }

  return { value: formatTerms(result, isSpaced(base)), added }
}

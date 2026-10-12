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

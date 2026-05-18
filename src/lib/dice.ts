export type DieSize = 4 | 6 | 8 | 10 | 12 | 20

export const DIE_SIZES: DieSize[] = [4, 6, 8, 10, 12, 20]

export function roll(sides: DieSize): number {
  return Math.floor(Math.random() * sides) + 1
}

export const d4  = (): number => roll(4)
export const d6  = (): number => roll(6)
export const d8  = (): number => roll(8)
export const d10 = (): number => roll(10)
export const d12 = (): number => roll(12)
export const d20 = (): number => roll(20)

export function rollMany(count: number, sides: DieSize): { rolls: number[]; total: number } {
  const rolls = Array.from({ length: count }, () => roll(sides))
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) }
}

export const roll2d4  = () => rollMany(2, 4)
export const roll2d6  = () => rollMany(2, 6)
export const roll2d8  = () => rollMany(2, 8)
export const roll2d10 = () => rollMany(2, 10)
export const roll2d12 = () => rollMany(2, 12)
export const roll2d20 = () => rollMany(2, 20)

// Parses "1d8", "2d6", "d10" → { count, sides }. Returns null for invalid or unsupported die sizes.
export function parseDiceString(s: string): { count: number; sides: DieSize } | null {
  const match = s.match(/^(\d*)d(\d+)$/i)
  if (!match) return null
  const sides = parseInt(match[2], 10)
  if (!DIE_SIZES.includes(sides as DieSize)) return null
  return { count: match[1] ? parseInt(match[1], 10) : 1, sides: sides as DieSize }
}

type Coins = { cp: number; sp: number; ep: number; gp: number; pp: number }
type Denom = keyof Coins

// How many of `denom` does breaking 1 unit of `from` provide
const BREAK_RATES: Partial<Record<Denom, Partial<Record<Denom, number>>>> = {
  sp: { cp: 10 },
  ep: { cp: 50, sp: 5 },
  gp: { cp: 100, sp: 10, ep: 2 },
  pp: { cp: 1000, sp: 100, ep: 20, gp: 10 },
}

const DENOM_ORDER: Denom[] = ["cp", "sp", "ep", "gp", "pp"]

/**
 * Attempt to decrement `denom` by 1. If the value is already 0, break the
 * nearest higher denomination that has a non-zero balance and convert it into
 * `denom`, then subtract 1. Returns null if no funds are available.
 */
export function cascadeDecrement(coins: Coins, denom: Denom): Coins | null {
  if (coins[denom] > 0) {
    return { ...coins, [denom]: coins[denom] - 1 }
  }

  const denomIndex = DENOM_ORDER.indexOf(denom)
  for (let i = denomIndex + 1; i < DENOM_ORDER.length; i++) {
    const source = DENOM_ORDER[i]
    if (coins[source] > 0) {
      const rate = BREAK_RATES[source]?.[denom] ?? 0
      if (rate > 0) {
        return { ...coins, [source]: coins[source] - 1, [denom]: rate - 1 }
      }
    }
  }

  return null
}

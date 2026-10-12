import { cascadeDecrement } from "@/lib/currency-utils"

type Coins = Parameters<typeof cascadeDecrement>[0]

function makeCoins(overrides: Partial<Coins> = {}): Coins {
  return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...overrides }
}

describe("cascadeDecrement", () => {
  it("takes one coin from the denomination when it has any", () => {
    expect(cascadeDecrement(makeCoins({ gp: 3, sp: 7 }), "gp")).toEqual(makeCoins({ gp: 2, sp: 7 }))
  })

  it("does not break a larger coin while the denomination still has one", () => {
    expect(cascadeDecrement(makeCoins({ cp: 1, sp: 5 }), "cp")).toEqual(makeCoins({ cp: 0, sp: 5 }))
  })

  // Breaking one larger coin yields `rate` of the smaller; one of those is then spent.
  it.each([
    { denom: "cp", source: "sp", left: 9 },
    { denom: "cp", source: "ep", left: 49 },
    { denom: "cp", source: "gp", left: 99 },
    { denom: "cp", source: "pp", left: 999 },
    { denom: "sp", source: "ep", left: 4 },
    { denom: "sp", source: "gp", left: 9 },
    { denom: "sp", source: "pp", left: 99 },
    { denom: "ep", source: "gp", left: 1 },
    { denom: "ep", source: "pp", left: 19 },
    { denom: "gp", source: "pp", left: 9 },
  ] as const)("breaks 1 $source into $denom when $denom is empty, leaving $left", ({ denom, source, left }) => {
    expect(cascadeDecrement(makeCoins({ [source]: 2 }), denom)).toEqual(makeCoins({ [source]: 1, [denom]: left }))
  })

  it("breaks the nearest larger denomination that has a coin, skipping empty ones", () => {
    expect(cascadeDecrement(makeCoins({ gp: 1, pp: 1 }), "cp")).toEqual(makeCoins({ cp: 99, gp: 0, pp: 1 }))
  })

  it("never breaks a smaller denomination to pay for a larger one", () => {
    expect(cascadeDecrement(makeCoins({ cp: 500, sp: 50 }), "gp")).toBeNull()
  })

  it("returns null when there are no coins at all", () => {
    expect(cascadeDecrement(makeCoins(), "cp")).toBeNull()
  })

  it("returns null for the largest denomination when it is empty", () => {
    expect(cascadeDecrement(makeCoins({ gp: 10 }), "pp")).toBeNull()
  })

  it("does not modify the coins it was given", () => {
    const coins = makeCoins({ gp: 1 })
    cascadeDecrement(coins, "sp")
    expect(coins).toEqual(makeCoins({ gp: 1 }))
  })
})

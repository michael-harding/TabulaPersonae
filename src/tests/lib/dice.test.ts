import { describe, it, expect } from "vitest"

import { roll, rollMany, parseDiceString, scaleDiceExpression, DIE_SIZES, type DieSize } from "@/lib/dice"

describe("dice utilities", () => {
  describe("roll", () => {
    it.each(DIE_SIZES)("d%i always returns a value within [1, sides]", (sides) => {
      for (let i = 0; i < 100; i++) {
        const result = roll(sides as DieSize)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(sides)
      }
    })

    it.each(DIE_SIZES)("d%i always returns an integer", (sides) => {
      for (let i = 0; i < 20; i++) {
        expect(Number.isInteger(roll(sides as DieSize))).toBe(true)
      }
    })
  })

  describe("rollMany", () => {
    it("returns the correct number of rolls", () => {
      expect(rollMany(3, 6).rolls).toHaveLength(3)
      expect(rollMany(10, 8).rolls).toHaveLength(10)
    })

    it("total equals sum of rolls", () => {
      for (let i = 0; i < 20; i++) {
        const { rolls, total } = rollMany(4, 6)
        expect(total).toBe(rolls.reduce((a, b) => a + b, 0))
      }
    })

    it("all individual rolls are within [1, sides]", () => {
      const { rolls } = rollMany(20, 8)
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(8)
      }
    })

    it("returns empty rolls and total 0 for count 0", () => {
      const { rolls, total } = rollMany(0, 6)
      expect(rolls).toHaveLength(0)
      expect(total).toBe(0)
    })
  })

  describe("parseDiceString", () => {
    it("parses '1d8' → { count: 1, sides: 8 }", () => {
      expect(parseDiceString("1d8")).toEqual({ count: 1, sides: 8 })
    })

    it("parses '2d6' → { count: 2, sides: 6 }", () => {
      expect(parseDiceString("2d6")).toEqual({ count: 2, sides: 6 })
    })

    it("parses 'd10' (no count prefix) → { count: 1, sides: 10 }", () => {
      expect(parseDiceString("d10")).toEqual({ count: 1, sides: 10 })
    })

    it("parses '3d12' → { count: 3, sides: 12 }", () => {
      expect(parseDiceString("3d12")).toEqual({ count: 3, sides: 12 })
    })

    it("returns null for unsupported die size 'd7'", () => {
      expect(parseDiceString("d7")).toBeNull()
    })

    it("returns null for 'd99'", () => {
      expect(parseDiceString("d99")).toBeNull()
    })

    it("returns null for non-dice strings", () => {
      expect(parseDiceString("foo")).toBeNull()
      expect(parseDiceString("")).toBeNull()
      expect(parseDiceString("8")).toBeNull()
    })

    it("is case-insensitive", () => {
      expect(parseDiceString("1D8")).toEqual({ count: 1, sides: 8 })
    })
  })

  describe("scaleDiceExpression", () => {
    it.each([
      ["8d6", "1d6", 2, "10d6", "2d6"],
      ["3d4+3", "1d4+1", 1, "4d4+4", "1d4+1"],
      ["3d4+3", "1d4+1", 3, "6d4+6", "3d4+3"],
      ["2d8+WIS", "2d8", 1, "4d8+WIS", "2d8"],
      ["1d10", "1d6", 1, "1d10+1d6", "1d6"],
      ["2d8 + 3", "1d8", 1, "3d8 + 3", "1d8"],
      ["2d8 + WIS", "1d8 + 1", 2, "4d8 + WIS + 2", "2d8 + 2"],
      ["4d6-1", "1d6", 1, "5d6-1", "1d6"],
      ["2d6", "5", 2, "2d6+10", "10"],
    ])("%s plus %s × %i is %s, adding %s", (base, perLevel, steps, value, added) => {
      expect(scaleDiceExpression(base, perLevel, steps)).toEqual({ value, added })
    })

    it("returns the base unchanged without steps or a per-level amount", () => {
      expect(scaleDiceExpression("8d6", "1d6", 0)).toEqual({ value: "8d6", added: "" })
      expect(scaleDiceExpression("8d6", "  ", 2)).toEqual({ value: "8d6", added: "" })
    })

    // Spaces inside the text are kept, and it isn't folded into a wrong total
    it.each([
      ["8d6 fire", "1d6", 2, "8d6 fire + 2d6", "2d6"],
      ["1d8+3 fire", "1d8", 1, "1d8+3 fire + 1d8", "1d8"],
      ["2d6 + WIS mod", "1d6", 1, "2d6 + WIS mod + 1d6", "1d6"],
    ])("keeps %s as written when scaled by %s × %i: %s", (base, perLevel, steps, value, added) => {
      expect(scaleDiceExpression(base, perLevel, steps)).toEqual({ value, added })
    })

    // Never folded into a wrong total
    it("shows a per-level amount it can't combine alongside the base", () => {
      expect(scaleDiceExpression("1d8+WIS", "1d8+WIS", 1)).toEqual({ value: "1d8+WIS + 1d8+WIS", added: "1d8+WIS" })
      expect(scaleDiceExpression("1d8", "one die", 2)).toEqual({ value: "1d8 + 2×(one die)", added: "2×(one die)" })
    })
  })
})

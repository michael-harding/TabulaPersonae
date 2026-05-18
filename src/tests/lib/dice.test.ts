import { describe, it, expect } from "vitest"
import { roll, d4, d6, d8, d10, d12, d20, rollMany, parseDiceString, DIE_SIZES, type DieSize } from "@/lib/dice"

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

  describe("individual die functions", () => {
    const cases: [() => number, number][] = [
      [d4, 4], [d6, 6], [d8, 8], [d10, 10], [d12, 12], [d20, 20],
    ]
    it.each(cases)("%s returns a value in [1, %i]", (fn, max) => {
      for (let i = 0; i < 50; i++) {
        const r = fn()
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(max)
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
})

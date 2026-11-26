import { BACKGROUND_SURFACES, backgroundTone, SHEET_BACKGROUND_PRESETS, sheetBackground, SURFACE_OFFSETS } from "@/lib/sheet-background"
import { normalizeHex, oklchToHex, parseHex, toOklch } from "@/lib/sheet-color"

import { themeToken } from "./theme-tokens"

// The presets' contrast is checked in theme-contrast.test.ts, with every other theme pairing

describe("backgroundTone", () => {
  it.each([
    ["#ffffff", "light"], ["#fef9ee", "light"], ["#f8f1e3", "light"], ["#ffff00", "light"], ["#a0a0a0", "light"],
    ["#000000", "dark"], ["#180f08", "dark"], ["#00008b", "dark"], ["#505050", "dark"],
  ] as const)("calls %s %s", (hex, tone) => {
    expect(backgroundTone(hex)).toBe(tone)
  })
})

describe("sheetBackground", () => {
  it("uses the colour itself as the page background and the popover", () => {
    const { style } = sheetBackground("#f8f1e3")!
    expect(style["--background"]).toBe("#f8f1e3")
    expect(style["--popover"]).toBe("#f8f1e3")
  })

  it("sets every surface token, and nothing else", () => {
    expect(Object.keys(sheetBackground("#336699")!.style).sort()).toEqual(BACKGROUND_SURFACES.map((s) => `--${s}`).sort())
  })

  it("makes the surfaces shades of the background: its hue and chroma, at their own lightness", () => {
    for (const hex of ["#f8f1e3", "#180f08", "#336699"]) {
      const base = toOklch(parseHex(hex)!)
      const { tone, style } = sheetBackground(hex)!
      for (const surface of BACKGROUND_SURFACES) {
        const shade = toOklch(parseHex(style[`--${surface}`])!)
        expect(shade.l).toBeCloseTo(Math.min(1, Math.max(0, base.l + SURFACE_OFFSETS[tone][surface])), 2)
        if (base.c > 0.01) {
          const shifted = Math.abs(shade.h - base.h)
          expect(Math.min(shifted, 360 - shifted)).toBeLessThan(6)
        }
      }
    }
  })

  it("takes its tone from the background", () => {
    expect(sheetBackground("#f8f1e3")!.tone).toBe("light")
    expect(sheetBackground("#180f08")!.tone).toBe("dark")
  })

  it("uses a picked colour as it is, however unreadable", () => {
    expect(sheetBackground("#ff00ff")!.style["--background"]).toBe("#ff00ff")
  })

  it("accepts short and upper-case hex", () => {
    expect(sheetBackground("#FFF")).toEqual(sheetBackground("#ffffff"))
  })

  it("gives nothing, so the theme's own background applies, without a usable colour", () => {
    for (const value of [undefined, "", "parchment", "#12345"]) expect(sheetBackground(value)).toBeNull()
  })
})

// White and Black stand for the themes' own backgrounds, so the offsets must reproduce each
// theme's surfaces from them, as globals.css defines those surfaces
describe("SURFACE_OFFSETS", () => {
  it.each([["light", "White"], ["dark", "Black"]] as const)("give the %s theme's surfaces from the %s preset", (theme, name) => {
    const preset = SHEET_BACKGROUND_PRESETS.find((p) => p.name === name)!
    expect(preset.value).toBe(oklchToHex(themeToken(theme, "background")))
    const { tone, style } = sheetBackground(preset.value)!
    expect(tone).toBe(theme)
    // To within a step of 8-bit rounding: Black's hex holds the dark theme's lightness only that closely
    for (const surface of BACKGROUND_SURFACES) {
      expect(toOklch(parseHex(style[`--${surface}`])!).l, surface).toBeCloseTo(themeToken(theme, surface).l, 2)
    }
  })
})

describe("SHEET_BACKGROUND_PRESETS", () => {
  it("offers two light and two dark backgrounds", () => {
    const tones = SHEET_BACKGROUND_PRESETS.map((p) => backgroundTone(p.value))
    expect(tones.filter((t) => t === "light")).toHaveLength(2)
    expect(tones.filter((t) => t === "dark")).toHaveLength(2)
  })

  it("holds every value as six-digit lower-case hex, which is what lookups compare", () => {
    for (const { value } of SHEET_BACKGROUND_PRESETS) expect(normalizeHex(value)).toBe(value)
  })
})

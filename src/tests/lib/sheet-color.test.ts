import { readFileSync } from "fs"
import { resolve } from "path"

import { contrastRatio, oklchToHex, parseHex, SHEET_COLOR_PRESETS, sheetColorShades, sheetColorStyle, THEME_SURFACES, toOklch } from "@/lib/sheet-color"

// WCAG 1.4.3: text needs 4.5:1. A sheet colour is used as text on the page's surfaces and as the
// fill behind text in the surface colour, so each shade must reach 4.5:1 against every surface.
const AA = 4.5

function worstContrast(hex: string, theme: "light" | "dark") {
  return Math.min(...THEME_SURFACES[theme].map((surface) => contrastRatio(hex, oklchToHex(surface))))
}

describe("sheetColorShades", () => {
  const colours = [
    ...SHEET_COLOR_PRESETS.map((preset) => [preset.name, preset.hex] as const),
    ["white", "#ffffff"], ["black", "#000000"], ["pure yellow", "#ffff00"], ["pure blue", "#0000ff"],
    ["near-white grey", "#f2f2f2"], ["near-black grey", "#141414"], ["mid grey", "#777777"],
  ] as const

  for (const [name, hex] of colours) {
    it(`makes ${name} readable in both themes`, () => {
      const shades = sheetColorShades(hex)!
      expect(worstContrast(shades.light, "light")).toBeGreaterThanOrEqual(AA)
      expect(worstContrast(shades.dark, "dark")).toBeGreaterThanOrEqual(AA)
    })
  }

  it("keeps the chosen hue", () => {
    for (const { hex } of SHEET_COLOR_PRESETS) {
      const { light, dark } = sheetColorShades(hex)!
      const hue = toOklch(parseHex(hex)!).h
      for (const shade of [light, dark]) {
        const shifted = Math.abs(toOklch(parseHex(shade)!).h - hue)
        expect(Math.min(shifted, 360 - shifted)).toBeLessThan(6)
      }
    }
  })

  it("changes a colour only as far as it needs to", () => {
    // Already dark enough for the light theme, and light enough for the dark theme: both unchanged
    expect(sheetColorShades("#1d4ed8")!.light).toBe("#1d4ed8")
    expect(sheetColorShades("#fde68a")!.dark).toBe("#fde68a")
    // Adjusted, but only to just past the threshold rather than to black or white
    const light = sheetColorShades("#22c55e")!.light
    expect(worstContrast(light, "light")).toBeLessThan(AA + 0.5)
  })

  it("accepts short and upper-case hex", () => {
    expect(sheetColorShades("#ABC")).toEqual(sheetColorShades("#aabbcc"))
  })

  it("returns null for anything that is not a hex colour, so the default theme applies", () => {
    for (const value of ["", "red", "#12345", "#gggggg", "rgb(1, 2, 3)", "#1234567"]) {
      expect(sheetColorShades(value)).toBeNull()
    }
  })
})

describe("sheetColorStyle", () => {
  it("gives a sheet the shade for each theme, which globals.css applies", () => {
    const shades = sheetColorShades("#8b5cf6")!
    expect(sheetColorStyle("#8b5cf6")).toEqual({ "--sheet-primary-light": shades.light, "--sheet-primary-dark": shades.dark })
  })

  it("gives nothing, so the theme's own colour applies, without a usable sheet colour", () => {
    expect(sheetColorStyle(undefined)).toBeUndefined()
    expect(sheetColorStyle("not a colour")).toBeUndefined()
  })
})

describe("contrastRatio", () => {
  it("matches the WCAG definition at its extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5)
  })
})

// The surfaces checked against must be the ones the themes actually use
describe("THEME_SURFACES", () => {
  const css = readFileSync(resolve(__dirname, "../../globals.css"), "utf8")
  const block = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf("}", css.indexOf(`${selector} {`)))
  const lightness = (block: string, variable: string) => {
    const match = new RegExp(`--${variable}: oklch\\(([\\d.]+%?)`).exec(block)!
    return match[1].endsWith("%") ? parseFloat(match[1]) / 100 : parseFloat(match[1])
  }

  it("holds the background, card and popover lightness of each theme in globals.css", () => {
    for (const [theme, selector] of [["light", ":root"], ["dark", ".dark"]] as const) {
      const expected = ["background", "card", "popover"].map((variable) => lightness(block(selector), variable)).sort()
      expect(THEME_SURFACES[theme].map((surface) => surface.l).sort()).toEqual(expected)
    }
  })
})

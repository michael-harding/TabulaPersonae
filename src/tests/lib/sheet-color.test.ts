import { contrastRatio, normalizeHex, parseHex, readableOn, SHEET_COLOR_PRESETS, sheetColorAttributes, sheetColorShades, toOklch } from "@/lib/sheet-color"

// The presets' contrast on every theme and preset background is checked in theme-contrast.test.ts
const AA = 4.5

describe("sheetColorShades", () => {
  it.each(SHEET_COLOR_PRESETS)("gives the $name preset its own shade for each theme", (preset) => {
    expect(sheetColorShades(preset.value)).toEqual({ light: preset.light, dark: preset.dark })
  })

  it("recognises a preset however its hex is written", () => {
    expect(sheetColorShades("#EAB308")).toEqual(sheetColorShades("#eab308"))
  })

  it("uses a picked colour exactly as picked, in both themes", () => {
    // Colours the presets used to turn into other shades, and ones no theme can read
    for (const hex of ["#123456", "#ffff00", "#f2f2f2", "#141414", "#22c55f"]) {
      expect(sheetColorShades(hex)).toEqual({ light: hex, dark: hex })
    }
  })

  it("accepts short and upper-case hex, as its six-digit form", () => {
    expect(sheetColorShades("#ABC")).toEqual({ light: "#aabbcc", dark: "#aabbcc" })
  })

  it("returns null for anything that is not a hex colour, so the default theme applies", () => {
    for (const value of ["", "red", "#12345", "#gggggg", "rgb(1, 2, 3)", "#1234567"]) {
      expect(sheetColorShades(value)).toBeNull()
    }
  })
})

describe("SHEET_COLOR_PRESETS", () => {
  // Characters store the value, and those stored before presets became pairs hold these
  it("keeps the values characters already store", () => {
    expect(SHEET_COLOR_PRESETS.map((p) => p.value)).toEqual(["#22c55e", "#8b5cf6", "#ef4444", "#3b82f6", "#f97316", "#eab308"])
  })

  it("keeps each preset's hue in both its shades", () => {
    for (const { value, light, dark } of SHEET_COLOR_PRESETS) {
      const hue = toOklch(parseHex(value)!).h
      for (const shade of [light, dark]) {
        const shifted = Math.abs(toOklch(parseHex(shade)!).h - hue)
        expect(Math.min(shifted, 360 - shifted)).toBeLessThan(6)
      }
    }
  })

  it("holds every value as six-digit lower-case hex, which is what lookups compare", () => {
    for (const { value, light, dark } of SHEET_COLOR_PRESETS) {
      for (const hex of [value, light, dark]) expect(normalizeHex(hex)).toBe(hex)
    }
  })
})

describe("sheetColorAttributes", () => {
  it("gives a sheet the shade for each theme, and the attribute globals.css applies them through", () => {
    expect(sheetColorAttributes("#8b5cf6")).toEqual({
      "data-sheet-color": "",
      style: { "--sheet-primary-light": "#7a47e0", "--sheet-primary-dark": "#9c78ff" },
    })
  })

  it("gives nothing, so the theme's own colour applies, without a usable sheet colour", () => {
    expect(sheetColorAttributes(undefined)).toEqual({})
    expect(sheetColorAttributes("not a colour")).toEqual({})
  })
})

describe("normalizeHex", () => {
  it("writes a hex colour in six-digit lower case, and rejects anything else", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc")
    expect(normalizeHex(" #A1B2C3 ")).toBe("#a1b2c3")
    expect(normalizeHex("red")).toBeNull()
  })
})

describe("readableOn", () => {
  it("picks whichever of black or white stands out more", () => {
    expect(readableOn("#ffff00")).toBe("#000000")
    expect(readableOn("#00008b")).toBe("#ffffff")
  })

  it("always reaches at least 4.5:1, whatever the colour", () => {
    for (const hex of ["#777777", "#808080", "#ff0000", "#00ff00", "#0000ff", "#a8a8a8"]) {
      expect(contrastRatio(readableOn(hex), hex)).toBeGreaterThanOrEqual(AA)
    }
  })
})

describe("contrastRatio", () => {
  it("matches the WCAG definition at its extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5)
  })
})

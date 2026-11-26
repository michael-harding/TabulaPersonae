import { readdirSync, readFileSync } from "fs"
import { resolve } from "path"

import { amber } from "tailwindcss/colors"

import { SHEET_BACKGROUND_PRESETS, sheetBackground } from "@/lib/sheet-background"
import { contrastRatio, oklchToHex, SHEET_COLOR_PRESETS } from "@/lib/sheet-color"
import { SPELL_EFFECT_COLOR } from "@/lib/utils"

import tailwindConfig from "../../../tailwind.config"
import { themeToken, type Theme } from "./theme-tokens"

// ACCESSIBILITY.md §9. axe cannot evaluate contrast under jsdom, and in the browser it checks text
// only, so the theme's colour pairs are checked here directly. tests/e2e/contrast.spec.ts audits
// the same rules on the rendered page.
const TEXT = 4.5
const NON_TEXT = 3

const WHITE = "#ffffff"

/**
 * A set of tokens the page can be shown in: a theme as globals.css has it, or a preset sheet
 * background, which is its tone's theme with the surfaces replaced by shades of the background.
 */
interface Palette {
  name: string
  theme: Theme
  surfaces?: Record<string, string>
}

const palettes: Palette[] = [
  { name: "light theme", theme: "light" },
  { name: "dark theme", theme: "dark" },
  ...SHEET_BACKGROUND_PRESETS.map(({ name, value }) => {
    const { tone, style } = sheetBackground(value)!
    return { name: `${name} background`, theme: tone, surfaces: style }
  }),
]

const token = (palette: Palette, name: string) => palette.surfaces?.[`--${name}`] ?? oklchToHex(themeToken(palette.theme, name))

const textPairs: [foreground: string, background: string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
  ["primary", "background"],
  ["primary", "card"],
  ["primary", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["destructive-text", "background"],
  ["destructive-text", "card"],
]

// Input borders and the focus ring must stand out from every surface they are drawn on
const nonTextTokens = ["input", "ring"]
const surfaces = ["background", "card", "popover"]

describe.each(palettes)("$name contrast", (palette) => {
  it.each(textPairs)(`%s on %s meets ${TEXT}:1`, (foreground, background) => {
    expect(contrastRatio(token(palette, foreground), token(palette, background))).toBeGreaterThanOrEqual(TEXT)
  })

  describe.each(nonTextTokens)("--%s", (name) => {
    it.each(surfaces)(`meets ${NON_TEXT}:1 on %s`, (surface) => {
      expect(contrastRatio(token(palette, name), token(palette, surface))).toBeGreaterThanOrEqual(NON_TEXT)
    })
  })

  it(`gives the icon on an available pip ${NON_TEXT}:1 on --muted`, () => {
    expect(contrastRatio(WHITE, token(palette, "muted"))).toBeGreaterThanOrEqual(NON_TEXT)
  })

  // A preset sheet colour replaces --primary with its shade for the palette's theme. Text on it is
  // white in the light theme and the page background in the dark (globals.css, [data-sheet-color]).
  describe.each(SHEET_COLOR_PRESETS)("with the $name sheet colour", (preset) => {
    const primary = preset[palette.theme]
    const onPrimary = palette.theme === "light" ? WHITE : token(palette, "background")

    it.each(surfaces)(`meets ${TEXT}:1 as text on %s`, (surface) => {
      expect(contrastRatio(primary, token(palette, surface))).toBeGreaterThanOrEqual(TEXT)
    })

    it(`has text meeting ${TEXT}:1 on it`, () => {
      expect(contrastRatio(onPrimary, primary)).toBeGreaterThanOrEqual(TEXT)
    })
  })
})

// The status bar's spell pills use Tailwind's amber shades, read from their classes: a dark: class
// overrides the plain one in the dark theme. The bar is see-through over --background.
describe.each(palettes)("$name spell effect pills", (palette) => {
  const shade = (classes: string, property: "bg" | "text" | "border") => {
    const find = (prefix: string) => classes.split(" ").find((c) => new RegExp(`^${prefix}${property}-amber-\\d+$`).test(c))
    const found = (palette.theme === "dark" && find("dark:")) || find("")
    return found ? amber[found.split("-").pop() as keyof typeof amber] : undefined
  }

  describe.each(Object.entries(SPELL_EFFECT_COLOR))("%s", (_, classes) => {
    const bar = token(palette, "background")
    const fill = shade(classes, "bg") ?? bar

    it(`has text meeting ${TEXT}:1 on its fill`, () => {
      expect(contrastRatio(shade(classes, "text")!, fill)).toBeGreaterThanOrEqual(TEXT)
    })

    it(`has an edge meeting ${NON_TEXT}:1 against the bar`, () => {
      const edges = [shade(classes, "border"), fill].filter((c): c is string => !!c && c !== bar)
      expect(Math.max(...edges.map((edge) => contrastRatio(edge, bar)))).toBeGreaterThanOrEqual(NON_TEXT)
    })
  })
})

// The tokens hold complete colours, oklch() ones. Wrapping one in another colour function gives
// invalid CSS, which browsers drop without a warning: hsl(var(--ring)) removed every focus ring.
describe("tailwind theme colours", () => {
  const colors = (values: unknown): string[] =>
    typeof values === "string" ? [values] : Object.values(values as object).flatMap(colors)

  it("use each token as it is", () => {
    const wrapped = colors(tailwindConfig.theme?.extend?.colors).filter((value) => /^\w+\(var\(/.test(value))
    expect(wrapped).toEqual([])
  })

  // Tailwind can only add opacity to a colour it can read, and these are var()s. It emits no CSS at
  // all for bg-primary/90 and the like, so the class looks like it does something and does nothing.
  // Worse, tailwind-merge still counts it, and drops any earlier class it appears to replace.
  it("are not given an opacity, which produces no CSS", () => {
    const names = (values: object, prefix = ""): string[] => Object.entries(values).flatMap(([key, value]) => {
      const name = key === "DEFAULT" ? prefix.slice(0, -1) : prefix + key
      return typeof value === "string" ? [name] : names(value as object, `${name}-`)
    })
    const tokens = names(tailwindConfig.theme?.extend?.colors as object).sort((a, b) => b.length - a.length).join("|")
    const dead = new RegExp(`\\b(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|caret|decoration|placeholder)-(?:${tokens})/[\\d.]+`, "g")

    const src = resolve(__dirname, "../..")
    const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((file) => /\.(tsx?|css)$/.test(file) && !file.startsWith("tests"))
    const found = sources.flatMap((file) => [...readFileSync(resolve(src, file), "utf8").matchAll(dead)].map(([match]) => `${file}: ${match}`))
    expect(found).toEqual([])
  })
})

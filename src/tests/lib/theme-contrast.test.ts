import { readdirSync, readFileSync } from "fs"
import { resolve } from "path"

import { contrastRatio, oklchToHex } from "@/lib/sheet-color"

import tailwindConfig from "../../../tailwind.config"
import { themeToken, type Theme } from "./theme-tokens"

// ACCESSIBILITY.md §9. axe cannot evaluate contrast under jsdom, and in the browser it checks text
// only, so the theme's colour pairs are checked here directly. tests/e2e/contrast.spec.ts audits
// the same rules on the rendered page.
const TEXT = 4.5
const NON_TEXT = 3

const WHITE = "#ffffff"
const token = (theme: Theme, name: string) => oklchToHex(themeToken(theme, name))

const textPairs: [foreground: string, background: string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
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

describe.each(["light", "dark"] as const)("%s theme contrast", (theme) => {
  it.each(textPairs)(`%s on %s meets ${TEXT}:1`, (foreground, background) => {
    expect(contrastRatio(token(theme, foreground), token(theme, background))).toBeGreaterThanOrEqual(TEXT)
  })

  describe.each(nonTextTokens)("--%s", (name) => {
    it.each(surfaces)(`meets ${NON_TEXT}:1 on %s`, (surface) => {
      expect(contrastRatio(token(theme, name), token(theme, surface))).toBeGreaterThanOrEqual(NON_TEXT)
    })
  })

  it(`gives the icon on an available pip ${NON_TEXT}:1 on --muted`, () => {
    expect(contrastRatio(WHITE, token(theme, "muted"))).toBeGreaterThanOrEqual(NON_TEXT)
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

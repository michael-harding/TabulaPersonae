import { readFileSync } from "fs"
import { resolve } from "path"

import type { Oklch } from "@/lib/sheet-color"

const css = readFileSync(resolve(__dirname, "../../globals.css"), "utf8")
const SELECTORS = { light: ":root", dark: ".dark" } as const

export type Theme = keyof typeof SELECTORS

function themeBlock(theme: Theme): string {
  const start = css.indexOf(`${SELECTORS[theme]} {`)
  return css.slice(start, css.indexOf("}", start))
}

/** A colour token of a theme as globals.css defines it: lightness 0–1, chroma and hue. */
export function themeToken(theme: Theme, name: string): Oklch {
  const match = new RegExp(`--${name}: oklch\\(([\\d.]+%?) ([\\d.]+) ([\\d.]+)\\)`).exec(themeBlock(theme))
  if (match == null) throw new Error(`--${name} is not an oklch() colour in the ${theme} theme`)
  const [, lightness, chroma, hue] = match
  return {
    l: lightness.endsWith("%") ? parseFloat(lightness) / 100 : parseFloat(lightness),
    c: parseFloat(chroma),
    h: parseFloat(hue),
  }
}

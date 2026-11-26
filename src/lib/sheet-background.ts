// A character's sheet background replaces the theme's page colour on its sheet, and the surfaces
// laid over it (cards, popovers, wells, hover shades, borders) become shades of it. It also picks
// the sheet's text: a light background is shown with the light theme's text colours and a dark one
// with the dark theme's, whatever theme the player has chosen, since the theme's own text would
// not be readable on a background of the other kind.
//
// Only the presets are held to WCAG contrast, by unit tests. A colour the player picks is used as
// it is, and keeping it readable is up to them.

import { normalizeHex, oklchToHex, parseHex, readableOn, toOklch, type Tone } from "@/lib/sheet-color"

export interface SheetBackgroundPreset {
  name: string
  value: string
}

// White and Black are the light and dark themes' own backgrounds (oklch(1 0 0) and oklch(0.1 0 0)
// in globals.css), so with the shades below they give exactly those themes. Warm white is as warm
// as the status bar's amber-600 pill border allows (3:1 against it); Dark brown as warm as the dark
// theme's input borders allow on its card shade.
export const SHEET_BACKGROUND_PRESETS: readonly SheetBackgroundPreset[] = [
  { name: "White", value: "#ffffff" },
  { name: "Warm white", value: "#fef9ee" },
  { name: "Dark brown", value: "#180f08" },
  { name: "Black", value: "#030303" },
]

/** The surface tokens of globals.css that a sheet background sets */
export const BACKGROUND_SURFACES = ["background", "card", "popover", "well", "accent", "border"] as const
export type BackgroundSurface = (typeof BACKGROUND_SURFACES)[number]

/**
 * How far each surface's lightness (OKLCH, 0–1) sits from the background's, as globals.css has it
 * for each theme: light surfaces step darker, dark ones lighter. A unit test keeps them in step.
 */
export const SURFACE_OFFSETS: Record<Tone, Record<BackgroundSurface, number>> = {
  light: { background: 0, card: -0.02, popover: 0, well: -0.05, accent: -0.1, border: -0.1 },
  dark: { background: 0, card: 0.1, popover: 0, well: 0.12, accent: 0.15, border: 0.3 },
}

/** Light for a background that dark text stands out on more than light text does, else dark. */
export function backgroundTone(hex: string): Tone {
  return readableOn(hex) === "#000000" ? "light" : "dark"
}

export interface SheetBackground {
  tone: Tone
  /** Each surface token's value, keyed by its CSS custom property */
  style: Record<`--${BackgroundSurface}`, string>
}

/**
 * The tone and surface colours a stored sheet background gives the sheet: shades of the background,
 * keeping its hue and chroma. Null, keeping the theme's own, when it is not a hex colour.
 */
export function sheetBackground(stored: string | undefined): SheetBackground | null {
  const hex = stored == null ? null : normalizeHex(stored)
  if (hex == null) return null
  const tone = backgroundTone(hex)
  const base = toOklch(parseHex(hex)!)
  const shade = (offset: number) =>
    offset === 0 ? hex : oklchToHex({ ...base, l: Math.min(1, Math.max(0, base.l + offset)) })
  const style = Object.fromEntries(
    BACKGROUND_SURFACES.map((surface) => [`--${surface}`, shade(SURFACE_OFFSETS[tone][surface])]),
  ) as SheetBackground["style"]
  return { tone, style }
}

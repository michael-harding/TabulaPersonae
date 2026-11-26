// A character's sheet colour replaces the theme's primary colour on its sheet, where that colour is
// both text on the page's surfaces and the fill behind text in the surface colour. A colour the
// player picks is used exactly as picked, in both themes: keeping it readable is up to them. Each
// preset is a fixed pair instead, a shade for each theme, and a unit test holds both shades to
// WCAG AA (4.5:1) against every preset background (src/lib/sheet-background.ts). What is stored
// is the picked colour, or for a preset its `value`.

export type Tone = "light" | "dark"

export interface SheetColorPreset {
  name: string
  /** What a character stores when the preset is picked */
  value: string
  light: string
  dark: string
}

// The values are the colours these presets were before they became pairs, so characters that
// already have one keep it. The shades were found once, as the nearest lightness to each value
// that reaches 4.6:1 (a little over 4.5, against rounding) on every preset background.
export const SHEET_COLOR_PRESETS: readonly SheetColorPreset[] = [
  { name: "Green", value: "#22c55e", light: "#007934", dark: "#22c55e" },
  { name: "Purple", value: "#8b5cf6", light: "#7a47e0", dark: "#9c78ff" },
  { name: "Red", value: "#ef4444", light: "#ce1b28", dark: "#fe5350" },
  { name: "Blue", value: "#3b82f6", light: "#1b63d5", dark: "#488eff" },
  { name: "Orange", value: "#f97316", light: "#ae4b00", dark: "#f97316" },
  { name: "Gold", value: "#eab308", light: "#846400", dark: "#eab308" },
]

export interface Oklch { l: number; c: number; h: number }

type Rgb = [number, number, number] // linear sRGB, 0–1

/** Parses #rgb or #rrggbb (any case) into linear sRGB, or null for anything else. */
export function parseHex(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (match == null) return null
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1]
  return [0, 2, 4].map((i) => decodeGamma(parseInt(digits.slice(i, i + 2), 16) / 255)) as Rgb
}

const decodeGamma = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const encodeGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, encodeGamma(v))) * 255).toString(16).padStart(2, "0")).join("")}`
}

// OKLab, from Björn Ottosson's reference implementation (https://bottosson.github.io/posts/oklab/)
export function toOklch([r, g, b]: Rgb): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h }
}

function fromOklch({ l: L, c, h }: Oklch): Rgb {
  const A = c * Math.cos((h * Math.PI) / 180)
  const B = c * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6)

/** The colour as hex, with chroma reduced as far as needed to fit sRGB (lightness and hue kept). */
export function oklchToHex(color: Oklch): string {
  if (inGamut(fromOklch(color))) return toHex(fromOklch(color))
  let lo = 0
  let hi = color.c
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(fromOklch({ ...color, c: mid }))) lo = mid
    else hi = mid
  }
  return toHex(fromOklch({ ...color, c: lo }))
}

// WCAG 2 relative luminance and contrast ratio, of colours as rendered (8-bit hex)
const luminance = (hex: string) => {
  const [r, g, b] = parseHex(hex)!
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Black or white, whichever stands out more on the colour. */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  return contrastRatio(hex, "#000000") >= contrastRatio(hex, "#ffffff") ? "#000000" : "#ffffff"
}

/** A hex colour in its six-digit lower-case form, or null for anything that is not one. */
export function normalizeHex(hex: string): string | null {
  const rgb = parseHex(hex)
  return rgb == null ? null : toHex(rgb)
}

/**
 * The colour a stored sheet colour gives each theme: a preset's own pair, or a picked colour as it
 * is in both. Null when the stored value is not a hex colour.
 */
export function sheetColorShades(stored: string): Record<Tone, string> | null {
  const hex = normalizeHex(stored)
  if (hex == null) return null
  const preset = SHEET_COLOR_PRESETS.find((p) => p.value === hex)
  return preset == null ? { light: hex, dark: hex } : { light: preset.light, dark: preset.dark }
}

/**
 * The attributes that give a sheet its colour, which useSheetColor sets on the page and the home
 * page spreads onto each character's card: the shades, and the data-sheet-color attribute
 * globals.css applies them through. None keeps the theme's colour.
 */
export function sheetColorAttributes(hex: string | undefined): { "data-sheet-color"?: ""; style?: Record<string, string> } {
  const shades = hex == null ? null : sheetColorShades(hex)
  if (shades == null) return {}
  return { "data-sheet-color": "", style: { "--sheet-primary-light": shades.light, "--sheet-primary-dark": shades.dark } }
}

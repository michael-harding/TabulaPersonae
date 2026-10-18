// A character's sheet colour replaces the theme's primary colour on its sheet, where that colour is
// both text on the page's surfaces and the fill behind text in the surface colour. Any colour a
// player picks is turned into one shade per theme that reads at WCAG AA (4.5:1) both ways, keeping
// its hue and as much of its saturation as fits. The chosen colour itself is what is stored.

export const SHEET_COLOR_PRESETS = [
  { name: "Green", hex: "#22c55e" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Gold", hex: "#eab308" },
] as const

export interface Oklch { l: number; c: number; h: number }

/**
 * The surfaces of each theme that primary text appears on: --background, --card and --popover in
 * globals.css (a unit test keeps them in step). All are neutral greys, so lightness is enough.
 */
export const THEME_SURFACES: Record<"light" | "dark", Oklch[]> = {
  light: [{ l: 1, c: 0, h: 0 }, { l: 0.98, c: 0, h: 0 }, { l: 1, c: 0, h: 0 }],
  dark: [{ l: 0.1, c: 0, h: 0 }, { l: 0.2, c: 0, h: 0 }, { l: 0.1, c: 0, h: 0 }],
}

// A little over the 4.5:1 minimum, so rounding to 8-bit hex can never land a shade just under it
const TARGET_CONTRAST = 4.6

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

function shadeFor(hex: string, color: Oklch, theme: "light" | "dark"): string {
  const surfaces = THEME_SURFACES[theme].map(oklchToHex)
  const readable = (candidate: string) => surfaces.every((surface) => contrastRatio(candidate, surface) >= TARGET_CONTRAST)
  if (readable(hex)) return hex
  // Light surfaces need a darker shade, dark ones a lighter one. Search for the lightness nearest
  // the chosen colour's that is readable; contrast rises steadily as lightness moves away.
  let readableL = theme === "light" ? 0 : 1
  let unreadableL = color.l
  for (let i = 0; i < 24; i++) {
    const mid = (readableL + unreadableL) / 2
    if (readable(oklchToHex({ ...color, l: mid }))) readableL = mid
    else unreadableL = mid
  }
  const shade = oklchToHex({ ...color, l: readableL })
  return readable(shade) ? shade : theme === "light" ? "#000000" : "#ffffff"
}

/** The sheet colour's shade for each theme, or null when the stored value is not a hex colour. */
export function sheetColorShades(hex: string): { light: string; dark: string } | null {
  const rgb = parseHex(hex)
  if (rgb == null) return null
  const normalized = toHex(rgb)
  const color = toOklch(rgb)
  return { light: shadeFor(normalized, color, "light"), dark: shadeFor(normalized, color, "dark") }
}

/**
 * The style that gives a sheet its colour, or undefined to keep the theme's. The element also
 * needs the data-sheet-color attribute, which is what globals.css applies the shades through.
 */
export function sheetColorStyle(hex: string | undefined): Record<string, string> | undefined {
  const shades = hex == null ? null : sheetColorShades(hex)
  return shades == null ? undefined : { "--sheet-primary-light": shades.light, "--sheet-primary-dark": shades.dark }
}

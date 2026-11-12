import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ACCESSIBILITY.md: every interactive element needs a 44×44px touch target, and neighbouring
// targets must never overlap (an overlapping neighbour silently steals clicks).
//
// TOUCH_TARGET centres an invisible 44×44 `::after` hit area over an element without changing
// its visual size. Only use it where no other interactive element sits within 44px
// centre-to-centre — the pseudo-element would otherwise cover the neighbour.
export const TOUCH_TARGET =
  "relative after:absolute after:inset-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"

// TOUCH_TARGET_BOX makes the element itself at least 44×44 with its content centred. Use it for
// small icon buttons that sit next to each other (with no gap): real layout boxes can't overlap,
// so neighbours are guaranteed to be ≥44px apart centre-to-centre.
export const TOUCH_TARGET_BOX = "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"

// INLINE_LINK_TARGET makes a link in running text a 44px-tall box. It stays on one line (a link
// that wraps has a box spanning both lines, covering whatever sits beside it), and keeps its
// place in the sentence.
export const INLINE_LINK_TARGET = "inline-flex min-h-11 items-center align-middle"

// The hover highlight for a row or control. The accent background always comes with the accent
// foreground, so text on the highlight is the colour each theme pairs with it rather than whatever
// the row inherited. Use this instead of writing `hover:bg-accent` alone.
export const HOVER_ACCENT = "hover:bg-accent hover:text-accent-foreground"

// Temporary hit points' color, shared by both health bars' temp HP segment and the action cards'
// "Temp HP" gain badge so they always match. The badge's text uses its own darker shades for
// contrast; this is the fill and the border.
export const TEMP_HP_COLOR = { bar: "bg-blue-500", border: "border-blue-500" } as const

// Spells in effect, as status bar pills: solid gold while concentrating, gold outline for any other
// lasting spell. Text meets 4.5:1, and each pill's edge 3:1 against the bar, in both themes: on the
// light bar the gold fill alone is too pale, so the solid pill gets the outline's darker rim too.
// theme-contrast.test.ts checks these pairs.
export const SPELL_EFFECT_COLOR = {
  concentration: "border border-amber-600 bg-amber-400 text-amber-950 dark:border-amber-400",
  duration: "border border-amber-600 text-amber-800 dark:border-amber-400 dark:text-amber-300",
} as const

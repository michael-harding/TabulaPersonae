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
// foreground: in the light theme accent is a strong red, and body text left on it has a contrast
// ratio of about 2:1 (WCAG AA needs 4.5:1). Use this instead of writing `hover:bg-accent` alone.
export const HOVER_ACCENT = "hover:bg-accent hover:text-accent-foreground"

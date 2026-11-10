// The order of the cards in an Actions section: those shown in the section ("main"), then those set
// aside under its collapsed "More" list. Stored per section on Character.actionLayout.

import type { ActionSectionLayout } from "./character-types"

/** Where a section's cards come from. */
export type ActionCardSource = "weapon" | "spell" | "feature" | "item" | "custom"

/** A card's key in a stored layout: its source and the id of what it shows. */
export const actionCardKey = (source: ActionCardSource, id: string) => `${source}:${id}`

/** The two parts of a section. */
export type ActionCardList = "main" | "more"

/** A section's cards by key: both parts, each in order. */
export interface ActionKeyLayout {
  main: string[]
  more: string[]
}

/** A place in a section: a part, and an index in it. */
export interface ActionCardPosition {
  list: ActionCardList
  index: number
}

/**
 * A section's items split into its two parts. Each part follows the stored order; an item in
 * neither stored list (a card added since) goes at the end of main, in the order given. Keys of
 * cards that no longer exist are ignored, and a key in both lists counts as main.
 */
export function resolveLayout<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  layout: ActionSectionLayout | undefined,
): { main: T[]; more: T[] } {
  const byKey = new Map(items.map((item) => [keyOf(item), item]))
  const placed = new Set<string>()
  const take = (keys: readonly string[] | undefined) => {
    const taken: T[] = []
    for (const key of keys ?? []) {
      const item = byKey.get(key)
      if (item == null || placed.has(key)) continue
      placed.add(key)
      taken.push(item)
    }
    return taken
  }
  const main = take(layout?.main)
  const more = take(layout?.more)
  for (const item of items) {
    if (!placed.has(keyOf(item))) main.push(item)
  }
  return { main, more }
}

/**
 * The layout with the card at `from` moved to `to`. `to.index` is a place in its part once the
 * card has been taken out, and is clamped to that part.
 */
export function moveCard(layout: ActionKeyLayout, from: ActionCardPosition, to: ActionCardPosition): ActionKeyLayout {
  const next: ActionKeyLayout = { main: [...layout.main], more: [...layout.more] }
  const [key] = next[from.list].splice(from.index, 1)
  if (key == null) return layout
  const target = next[to.list]
  target.splice(Math.max(0, Math.min(to.index, target.length)), 0, key)
  return next
}

/**
 * Where "Move later" takes the card at `from`: one place on, the last card of main becoming the
 * first of More. Null for the last card of the section.
 */
export function laterPosition(layout: ActionKeyLayout, from: ActionCardPosition): ActionCardPosition | null {
  if (from.index < layout[from.list].length - 1) return { list: from.list, index: from.index + 1 }
  return from.list === "main" ? { list: "more", index: 0 } : null
}

/**
 * Where "Move earlier" takes the card at `from`: one place back, the first card of More becoming
 * the last of main. Null for the first card of the section.
 */
export function earlierPosition(layout: ActionKeyLayout, from: ActionCardPosition): ActionCardPosition | null {
  if (from.index > 0) return { list: from.list, index: from.index - 1 }
  return from.list === "more" ? { list: "main", index: layout.main.length } : null
}

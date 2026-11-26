import { render, fireEvent, screen, waitFor } from "@solidjs/testing-library"
import type { JSX } from "solid-js"

import { CONFIRM_GUARD_MS } from "@/components/ui/confirm-button"
import type { Character, SpellSlotLevel } from "@/lib/character-types"
import { makeSpellcastingFeature } from "@/lib/character-utils"

type RenderOptions = NonNullable<Parameters<typeof render>[1]>

// Takes a function, not an element: `render(() => <X />)`. The component must be created inside
// the root that cleanup() disposes; an element built at the call site is created outside it, so
// its effects and listeners would outlive the test.
const customRender = (ui: () => JSX.Element, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, options)

// Kobalte portals modal/menu/select content into body-level divs. In jsdom,
// CSS transitions never fire so portals can accumulate between tests. Identify
// portals by their contained ARIA role rather than by aria-hidden — the latter
// also matches the testing-library app container (which Kobalte marks
// aria-hidden while a modal is open) and would wrongly delete it.
//
// In an afterEach, call cleanup() first: the automatic cleanup runs after a file's own afterEach
// hooks, and disposing a component whose portal node was already removed here throws.
export function cleanupPortals() {
  const portalSelectors = ['[role="dialog"]', '[role="menu"]', '[role="listbox"]', '[role="tooltip"]']
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (portalSelectors.some((sel) => el.querySelector(sel))) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
  document.body.removeAttribute("aria-hidden")
  document.body.removeAttribute("data-scroll-locked")
  document.documentElement.removeAttribute("style")
  Array.from(document.body.children).forEach((child) => {
    ;(child as HTMLElement).removeAttribute("aria-hidden")
  })
}

// Kobalte keeps a closing popup mounted, marked data-closed, until its CSS exit animation ends,
// which jsdom never runs. This ends it, as the browser does once the animation is over: the popup
// unmounts and returns focus.
export function finishClosing(el: Element) {
  // jsdom has no AnimationEvent, so a plain event carries the animation's name (none, as jsdom
  // computes it)
  const end = new Event("animationend", { bubbles: true })
  Object.defineProperty(end, "animationName", { value: "" })
  el.dispatchEvent(end)
}

/**
 * Ends a closing Drawer's exit animations (see finishClosing): its panel's, passed in, and its
 * overlay's. Its portal, and the focus hand-back, wait for both.
 */
export function finishDrawerClosing(panel: Element) {
  finishClosing(panel)
  const overlay = document.querySelector('[data-test="drawer-overlay"]')
  if (overlay) finishClosing(overlay)
}

/** Ends a closing Modal's exit animations: its content's, passed in, and its overlay's. */
export function finishModalClosing(content: Element) {
  finishClosing(content)
  const overlay = document.querySelector('[data-test="modal-overlay"]')
  if (overlay) finishClosing(overlay)
}

/** Taps a tooltip-only element (Tooltip's `toggleOnClick`) and asserts the tooltip it shows. */
export async function expectTapTooltip(el: Element, text: string | RegExp) {
  cleanupPortals()
  fireEvent.click(el)
  await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent(text))
}

// Performs the deliberate two-click confirmation a ConfirmButton requires: arm, wait out the
// accidental-double-click guard, confirm.
export function confirmClick(el: Element) {
  fireEvent.click(el, { detail: 1 })
  const armedAt = performance.now()
  const now = vi.spyOn(performance, "now").mockReturnValue(armedAt + CONFIRM_GUARD_MS + 1)
  try {
    fireEvent.click(el, { detail: 1 })
  } finally {
    now.mockRestore()
  }
}

/**
 * The character given these spell slots, `{ level: { total, used } }`, the way the sheet gives them:
 * by a Spellcasting class feature (from level 1 on), with `used` of each level spent.
 */
export function withSpellSlots(character: Character, slots: Partial<Record<SpellSlotLevel, { total: number; used?: number }>>): Character {
  const totals: Partial<Record<SpellSlotLevel, number>> = {}
  const spent: Partial<Record<SpellSlotLevel, number>> = {}
  for (const [level, { total, used }] of Object.entries(slots) as [string, { total: number; used?: number }][]) {
    totals[Number(level) as SpellSlotLevel] = total
    if (used) spent[Number(level) as SpellSlotLevel] = used
  }
  return {
    ...character,
    classFeatures: [...(character.classFeatures ?? []), makeSpellcastingFeature({ spellSlots: totals }, 1, "")],
    spentSpellSlots: { ...character.spentSpellSlots, ...spent },
  }
}

export * from "@solidjs/testing-library"
export { customRender as render }

describe("test-utils", () => {
  it("should export testing utilities", () => {
    expect(customRender).toBeDefined()
  })
})

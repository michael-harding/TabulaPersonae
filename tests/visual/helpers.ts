import { type Page } from "@playwright/test"

import type { Character } from "../../src/lib/character-types"

/** Tall enough that no modal scrolls, so a change below its fold still shows in the screenshot. */
export const TALL = { width: 1280, height: 1600 }
/** A typical phone, below Tailwind's `sm` breakpoint, so modals render their mobile layout. */
export const PHONE = { width: 390, height: 844 }

export type Theme = "light" | "dark"

/**
 * Seeds one character (with every collapsible section on the sheet expanded) and opens its sheet,
 * optionally on a given tab and theme.
 */
export async function openSheet(page: Page, character: Character, options: { tab?: string; theme?: Theme } = {}) {
  await page.addInitScript(({ char, theme }) => {
    localStorage.setItem("dnd-characters", JSON.stringify([char]))
    localStorage.setItem("dnd-skip-auth", "true")
    if (theme != null) localStorage.setItem("theme", theme)
    localStorage.setItem(`dnd-collapsible-actions-${char.id}`, JSON.stringify(["actions", "bonus-actions", "reactions", "other"]))
    localStorage.setItem(`dnd-collapsible-spells-${char.id}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    localStorage.setItem(`dnd-collapsible-features-${char.id}`, JSON.stringify(["class-feature", "species-trait", "feat"]))
  }, { char: character, theme: options.theme })
  await page.goto(`/character/${character.id}`)
  await page.waitForLoadState("networkidle")
  if (options.tab != null) {
    await page.getByRole("tab", { name: options.tab }).click()
    await page.waitForLoadState("networkidle")
  }
}

/**
 * Moves the pointer off the last thing clicked. Otherwise whatever ends up under it (after the
 * click opened or re-laid out something) is captured in its hover style, so the baseline would
 * depend on what happens to sit at that point.
 */
export async function parkPointer(page: Page) {
  await page.mouse.move(0, 0)
}

/** The open modal. */
export function dialog(page: Page) {
  return page.getByRole("dialog")
}

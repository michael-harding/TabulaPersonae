import { type Page, type TestInfo } from "@playwright/test"

import { publicCharacter, secondCharacter, testCharacter } from "../visual/fixtures"
import type { Character } from "../../src/lib/character-types"
import { blockFirestore, createUser, seedCharacter, signIn, withUniqueId } from "./emulator"
import { openSheet, seedGuest } from "./helpers"
import { expect } from "./test"

// What contrast.spec.ts and focus-visible.spec.ts have in common: the colour arithmetic they run
// in the page, and the pages and states they audit. ACCESSIBILITY.md §9 and §4 set the rules.

type Rgba = [number, number, number, number]

/** Runs in the page, so it can only use what is inside it. */
function installContrastHelpers() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })!

  // Computed colours can be oklch(), oklab(), color-mix()… A canvas turns any of them into sRGB.
  const rgba = (color: string): Rgba => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = "#000"
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }
  const over = (top: Rgba, bottom: Rgba, alpha = top[3]): Rgba =>
    [0, 1, 2].map((i) => top[i] * alpha + bottom[i] * (1 - alpha)).concat(1) as Rgba
  const luminance = ([r, g, b]: Rgba) => {
    const channel = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  const ratio = (a: Rgba, b: Rgba) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  /** The solid colour behind an element's content, from its own and its ancestors' backgrounds. */
  const backdrop = (el: Element | null): Rgba => {
    const layers: Rgba[] = []
    for (let e = el; e != null; e = e.parentElement) {
      const layer = rgba(getComputedStyle(e).backgroundColor)
      if (layer[3] > 0) layers.push(layer)
      if (layer[3] === 1) break
    }
    return layers.reduceRight((below, layer) => over(layer, below), [255, 255, 255, 1] as Rgba)
  }
  /** An element's opacity as drawn, counting its ancestors'. */
  const opacity = (el: Element) => {
    let total = 1
    for (let e: Element | null = el; e != null; e = e.parentElement) total *= parseFloat(getComputedStyle(e).opacity)
    return total
  }
  /** Whether a person can see the element: drawn, and not a visually hidden stand-in for another. */
  const isSeen = (el: Element) => {
    const box = el.getBoundingClientRect()
    return el.checkVisibility() && box.width > 1 && box.height > 1 && opacity(el) > 0
  }
  const describe = (el: Element) =>
    el.getAttribute("data-test") ?? el.getAttribute("aria-label") ?? `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 30)}`

  /** The colours of a computed box-shadow that are drawn as a ring (its layers with a spread). */
  const ringColors = (boxShadow: string): Rgba[] => {
    if (boxShadow === "none") return []
    return boxShadow
      .split(/,(?![^(]*\))/)
      .map((layer) => {
        const color = /^\s*(\w+\([^)]*\)|#\w+|\w+)/.exec(layer)?.[1] ?? "transparent"
        const lengths = layer.slice(layer.indexOf(color) + color.length).match(/-?[\d.]+px/g) ?? []
        return { color: rgba(color), spread: parseFloat(lengths[3] ?? "0") }
      })
      .filter(({ color, spread }) => color[3] > 0 && spread > 0)
      .map(({ color }) => color)
  }

  Object.assign(window, { contrast: { rgba, over, ratio, backdrop, opacity, isSeen, describe, ringColors } })
}

type ContrastHelpers = {
  rgba: (color: string) => Rgba
  over: (top: Rgba, bottom: Rgba, alpha?: number) => Rgba
  ratio: (a: Rgba, b: Rgba) => number
  backdrop: (el: Element | null) => Rgba
  opacity: (el: Element) => number
  isSeen: (el: Element) => boolean
  describe: (el: Element) => string
  ringColors: (boxShadow: string) => Rgba[]
}

declare global {
  interface Window { contrast: ContrastHelpers }
}

/** Gives every page this test opens `window.contrast`. Call before the first navigation. */
export function useContrastHelpers(page: Page): Promise<void> {
  return page.addInitScript(installContrastHelpers)
}

export const SHEET_TABS = ["Combat", "Spells", "Features", "Inventory", "Character"]

/** A page or state to audit. `within` limits the audit to an open popup, which covers the rest. */
export interface Scene {
  name: string
  within?: string
  open: (page: Page, testInfo: TestInfo) => Promise<void>
}

async function openEveryEditor(page: Page) {
  // Each click swaps that module's edit button for save/cancel, so always take the first left
  const edits = page.locator('[role=tabpanel]:not([hidden]) [data-test$="-module-edit"]')
  while (await edits.count() > 0) await edits.first().click()
}

async function openGuestSheet(page: Page, tab: string, character: Character = testCharacter) {
  await seedGuest(page, character, { expandSections: true })
  await openSheet(page, character.id, tab)
}

const DIALOG = "[role=dialog]"

export const SCENES: Scene[] = [
  ...SHEET_TABS.map((tab): Scene => ({
    name: `character sheet ${tab} tab`,
    open: (page) => openGuestSheet(page, tab),
  })),
  ...SHEET_TABS.map((tab): Scene => ({
    name: `character sheet ${tab} tab in edit mode`,
    open: async (page) => {
      await openGuestSheet(page, tab)
      await openEveryEditor(page)
    },
  })),
  {
    name: "death saves on an unconscious character",
    open: async (page) => {
      await openGuestSheet(page, "Combat", secondCharacter)
      await expect(page.getByText("Death Saves")).toBeVisible()
    },
  },
  {
    name: "item editor",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Inventory")
      await page.locator('[data-test^="equipment-edit-"]').first().click()
      await expect(page.locator('[data-test="item-name"]')).toHaveValue("Longbow")
    },
  },
  {
    name: "Edit Spell Slots modal",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Spells")
      await page.getByRole("button", { name: /edit slots/i }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "rest modal",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Combat")
      await page.locator('[data-test="take-a-rest-button"]').click()
      await page.locator('[data-test="rest-type-short-button"]').click()
      await expect(page.locator('[data-test="rest-hit-dice"]')).toBeVisible()
    },
  },
  {
    name: "action editor",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Combat")
      await page.locator('[data-test="add-action-button"]').click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "feature editor",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Features")
      await page.locator('[data-test="add-feature-class-feature"]').click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "spell editor",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Spells")
      await page.locator('[data-test="add-spell-button"]').click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "import dialog",
    within: DIALOG,
    open: async (page) => {
      await openGuestSheet(page, "Combat")
      await page.locator('[data-test="header-menu-trigger"]').click()
      await page.getByRole("menuitem", { name: "Import Character" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "terms consent dialog",
    within: DIALOG,
    open: async (page) => {
      await page.goto("/auth")
      await page.locator('[data-test="auth-skip-button"]').click()
      await expect(page.getByRole("dialog", { name: "Terms of Use & Privacy Policy" })).toBeVisible()
    },
  },
  {
    name: "character list",
    open: async (page) => {
      await seedGuest(page, testCharacter)
      await page.goto("/")
      await expect(page.locator('[data-test="create-new-character-button"]')).toBeVisible()
    },
  },
  {
    name: "tab settings page",
    open: async (page) => {
      await seedGuest(page, testCharacter)
      await page.goto("/settings/tabs")
      await expect(page.locator('[data-test^="tab-toggle-"]').first()).toBeVisible()
    },
  },
  {
    name: "sign-in page",
    open: async (page) => {
      await page.goto("/auth")
      await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    },
  },
  ...SHEET_TABS.map((tab): Scene => ({
    name: `a shared character's public page, ${tab} tab`,
    open: async (page) => {
      // The dev-only seed for a public character (see getPublicCharacterFromFirebase)
      await page.addInitScript((character) => {
        localStorage.setItem(`dnd-public-char-${character.id}`, JSON.stringify(character))
      }, publicCharacter)
      await page.goto(`/share/${publicCharacter.id}`)
      await expect(page.getByRole("heading", { level: 1, name: publicCharacter.name })).toBeVisible()
      await page.getByRole("tab", { name: tab }).click()
    },
  })),
  {
    name: "sign-out dialog",
    within: DIALOG,
    open: async (page, testInfo) => {
      const user = await createUser(testInfo)
      const character = withUniqueId(testCharacter)
      await seedCharacter(user.uid, character)
      await signIn(page, user)
      await openSheet(page, character.id)
      // The dialog only appears with changes that have not reached the account
      await blockFirestore(page)
      await page.locator('[data-test="hp-increase-button"]').click()
      await expect(page.locator('[data-test="current-hp"]')).toHaveText("39")
      await page.locator('[data-test="header-menu-trigger"]').click()
      await page.getByRole("menuitem", { name: "Sign Out" }).click()
      await expect(page.locator('[data-test="sign-out-dialog"]')).toBeVisible()
    },
  },
  {
    name: "share link on a signed-in sheet",
    open: async (page, testInfo) => {
      const user = await createUser(testInfo)
      const character = withUniqueId(testCharacter)
      await seedCharacter(user.uid, character)
      await signIn(page, user)
      await openSheet(page, character.id, "Character")
      await page.locator('[data-test="switch-button-sheet-settings-share-switch"]').check({ force: true })
      await expect(page.locator('[data-test="share-url-input"]')).toBeVisible()
    },
  },
]

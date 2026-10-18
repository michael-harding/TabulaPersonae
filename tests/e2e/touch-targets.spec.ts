import { type Page } from "@playwright/test"

import { publicCharacter, testCharacter } from "../visual/fixtures"
import { createUser, seedCharacter, signIn, withUniqueId } from "./emulator"
import { confirmClick, openSheet, seedGuest } from "./helpers"
import { finishAnimations, test, expect } from "./test"

// ACCESSIBILITY.md §13: every interactive element needs a 44×44px touch target, and neighbouring
// targets must never overlap. jsdom has no layout, so this audits the real rendered page by
// hit-testing with elementFromPoint. Both kinds of violation fail:
//   "stolen"     — a point inside an element's own visible box resolves to a *different*
//                  interactive element: a neighbour's extended hit area sits on top of it, so a
//                  click on what the user sees lands on something else.
//   "undersized" — a point on the 44px-diameter circle centred on the element doesn't resolve to
//                  it. A circle (as WCAG 2.5.8 measures targets) rather than a square, because
//                  browsers don't hit-test the clipped corners of rounded controls — a 44×44
//                  rounded button or 44px round swatch is a full-size target.
//
// Exempt, as ACCESSIBILITY.md §13 records: tooltip-only triggers (data-sem="tooltip-trigger"),
// which reveal context for a value shown beside them and are not controls. A real control inside a
// tooltip is still audited.

const INTERACTIVE = [
  "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
  "[role=button]", "[role=tab]", "[role=checkbox]", "[role=switch]", "[role=combobox]",
  "[role=menuitem]", "[role=menuitemcheckbox]", "[role=menuitemradio]", "[role=option]", "[role=radio]", "[role=link]",
  // Kobalte's Checkbox keeps its real <input> visually hidden; the clickable thing is the root.
  "[data-sem=checkbox]",
].join(",")

interface Violation { kind: "stolen" | "undersized"; element: string; other?: string }

/**
 * Audits every interactive element on the page, or only those inside `within` — an open popup,
 * which covers whatever is beneath it.
 */
async function auditTouchTargets(page: Page, within?: string): Promise<Violation[]> {
  // A popup that is still zooming in is drawn smaller than it will be
  await finishAnimations(page)
  return page.evaluate(({ selector, within }) => {
    const TARGET = 44
    const describe = (el: Element) =>
      el.getAttribute("data-test") ?? el.getAttribute("aria-label") ?? `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 30)}`
    // A click on a <label> activates its form control, so the label's box counts as the control's.
    const owner = (el: Element | null) => {
      const label = el?.closest("label")
      if (label != null && el?.closest(selector) == null && label.control != null) return label.control
      return el?.closest(selector) ?? null
    }
    const related = (a: Element, b: Element) => a === b || a.contains(b) || b.contains(a)
    // Several of an element's probe points can fail; report each element/kind/other once.
    const seen = new Set<string>()
    const violations: Violation[] = []
    const report = (v: Violation) => {
      const key = `${v.kind}|${v.element}|${v.other ?? ""}`
      if (!seen.has(key)) { seen.add(key); violations.push(v) }
    }

    const scope = within == null ? document : document.querySelector(within)
    if (scope == null) throw new Error(`Nothing to audit: ${within} is not on the page`)
    for (const el of Array.from(scope.querySelectorAll(selector))) {
      // Tooltip-only triggers are context, not controls (see the note at the top).
      if (el.matches("[data-sem=tooltip-trigger]")) continue
      // Visually-hidden native inputs (e.g. inside a styled <label>) delegate to their label.
      if (el.closest("[aria-hidden=true], [inert]")) continue
      // Disabled controls aren't targets (and have pointer-events: none), so there's nothing to hit.
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") continue
      const style = getComputedStyle(el)
      if (style.visibility === "hidden" || style.display === "none" || el.classList.contains("sr-only")) continue
      el.scrollIntoView({ block: "center", inline: "center" })
      const r = el.getBoundingClientRect()
      // ≤1px boxes are visually-hidden inputs whose visible control is audited instead.
      if (r.width <= 1 || r.height <= 1) continue
      // A labelled input's effective target is its wrapping <label>, so centre the 44px square there.
      const wrappingLabel = el instanceof HTMLInputElement ? el.closest("label") : null
      const t = wrappingLabel?.getBoundingClientRect() ?? r
      const cx = t.left + t.width / 2
      const cy = t.top + t.height / 2

      const probe = (x: number, y: number, kind: Violation["kind"]) => {
        const hit = owner(document.elementFromPoint(x, y))
        if (hit == null) {
          if (kind === "undersized") report({ kind, element: describe(el) })
          return
        }
        if (!related(hit, el)) report({ kind, element: describe(el), other: describe(hit) })
      }

      // 1. Every point of the element's own box (5×5 grid, inset 1px).
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          probe(r.left + 1 + ((r.width - 2) * i) / 4, r.top + 1 + ((r.height - 2) * j) / 4, "stolen")
        }
      }
      // 2. Eight points on the 44px-diameter circle centred on the effective target (inset 1px).
      const radius = TARGET / 2 - 1
      for (let k = 0; k < 8; k++) {
        const angle = (k * Math.PI) / 4
        probe(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), "undersized")
      }
    }
    return violations
  }, { selector: INTERACTIVE, within })
}

function expectAccessibleTouchTargets(violations: Violation[]) {
  expect(violations).toEqual([])
}

test.describe("Touch targets", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // A fixed desktop size, except on the mobile project, which audits its own phone screen
    if (!testInfo.project.use.isMobile) await page.setViewportSize({ width: 1280, height: 900 })
    await seedGuest(page, testCharacter)
  })

  for (const tab of ["Combat", "Spells", "Features", "Inventory", "Character"]) {
    test(`@mobile character sheet ${tab} tab, view and edit mode`, async ({ page }) => {
      await openSheet(page, testCharacter.id, tab)
      const view = await auditTouchTargets(page)
      // Every EditableModule's edit button ends in "-edit"; open them all to audit edit mode.
      // Each click swaps that module's edit button for save/cancel, so always take the first left.
      const edits = page.locator('[role=tabpanel]:not([hidden]) [data-test$="-module-edit"]')
      while (await edits.count() > 0) await edits.first().click()
      const editing = await auditTouchTargets(page)
      expectAccessibleTouchTargets([...view, ...editing])
    })
  }

  test("@mobile Combat tab with exhaustion, its level stepper beside the conditions", async ({ page }) => {
    await openSheet(page, testCharacter.id)
    await page.locator('[data-test="condition-add"]').click()
    await page.getByRole("menuitem", { name: "Exhaustion" }).click()
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-test="exhaustion-level"]')).toBeVisible()
    expectAccessibleTouchTargets(await auditTouchTargets(page))
  })

  test("feature editor with a granted-skill chip", async ({ page }) => {
    await openSheet(page, testCharacter.id, "Features")
    await page.getByRole("button", { name: /add class feature/i }).click()
    const modal = page.getByRole("dialog")
    await modal.getByRole("combobox", { name: /feature type/i }).click()
    await page.getByRole("option", { name: "Skill Proficiency" }).click()
    await modal.getByRole("button", { name: "Add skill proficiency" }).click()
    await page.getByRole("menuitem", { name: "Perception" }).click()
    // Close the picker if it is still open so it doesn't cover the chip under audit.
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect(modal.getByRole("checkbox", { name: "Expertise for Perception" })).toBeVisible()
    // Includes both halves of the divided pill, each of which must meet the 44px target
    expectAccessibleTouchTargets(await auditTouchTargets(page))
  })

  test("Edit Spell Slots modal", async ({ page }) => {
    await openSheet(page, testCharacter.id, "Spells")
    await page.getByRole("button", { name: /edit slots/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    expectAccessibleTouchTargets(await auditTouchTargets(page))
  })

  test("item editor with tag pickers open", async ({ page }) => {
    await openSheet(page, testCharacter.id, "Inventory")
    // The first inventory item is a weapon (Longbow). Editing one used to throw before the
    // dialog opened (structuredClone of a store proxy), so this also guards that regression.
    await page.locator('[data-test^="equipment-edit-"]').first().click()
    await expect(page.locator('[data-test="item-name"]')).toHaveValue("Longbow")
    const modal = page.getByRole("dialog")
    await modal.locator('[data-test="modifier-group-skill-effects"]').click()
    await modal.getByRole("button", { name: "Add skill advantage" }).click()
    await page.getByRole("menuitem").first().click()
    // The picker stays open for multi-select; close it so it doesn't cover the controls below.
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect(modal.getByRole("button", { name: /^Remove / }).first()).toBeVisible()
    expectAccessibleTouchTargets(await auditTouchTargets(page))
  })

  test("tab settings page", async ({ page }) => {
    await page.goto("/settings/tabs")
    await expect(page.locator('[data-test^="tab-toggle-"]').first()).toBeVisible()
    for (const toggle of await page.locator('[data-test^="tab-toggle-"]').all()) {
      await toggle.click()
    }
    const expanded = await auditTouchTargets(page)
    // A tab being renamed, and the form for adding one
    await page.locator('[data-test="tab-rename-default-combat"]').click()
    await page.locator('[data-test="add-tab-button"]').click()
    await expect(page.locator('[data-test="new-tab-name-input"]')).toBeVisible()
    expectAccessibleTouchTargets([...expanded, ...await auditTouchTargets(page)])
  })

  test("@mobile character list, empty and with characters", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-test="create-new-character-button"]')).toBeVisible()
    const withCharacters = await auditTouchTargets(page)
    await confirmClick(page.locator(`[data-test="delete-character-button-${testCharacter.id}"]`))
    await expect(page.locator('[data-test="create-first-character-button"]')).toBeVisible()
    expectAccessibleTouchTargets([...withCharacters, ...await auditTouchTargets(page)])
  })

  test("@mobile header menu, open", async ({ page }) => {
    await openSheet(page, testCharacter.id)
    await page.locator('[data-test="header-menu-trigger"]').click()
    await expect(page.locator('[data-test="header-menu-account"]')).toBeVisible()
    expectAccessibleTouchTargets(await auditTouchTargets(page, "[role=menu]"))
  })

  // Every kind of popup list: a menu, a combobox's options and a select's options
  test("@mobile popup lists, open", async ({ page }) => {
    await openSheet(page, testCharacter.id)
    await page.locator('[data-test="condition-add"]').click()
    const conditions = await auditTouchTargets(page, "[role=menu]")
    await page.keyboard.press("Escape")

    await page.getByRole("tab", { name: "Character" }).click()
    await page.locator('[data-test="character-basic-info-module-edit"]').click()
    await page.locator('[data-test="class-combobox-toggle"]').click()
    await expect(page.getByRole("listbox")).toBeVisible()
    const classes = await auditTouchTargets(page, "[role=listbox]")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("listbox")).toHaveCount(0)

    await page.getByRole("combobox", { name: "Alignment" }).click()
    await expect(page.getByRole("listbox")).toBeVisible()
    const alignments = await auditTouchTargets(page, "[role=listbox]")
    expectAccessibleTouchTargets([...conditions, ...classes, ...alignments])
  })
})

test.describe("Touch targets, signed out", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!testInfo.project.use.isMobile) await page.setViewportSize({ width: 1280, height: 900 })
  })

  test("@mobile sign-in page, in both of its forms", async ({ page }) => {
    await page.goto("/auth")
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    const signIn = await auditTouchTargets(page)
    await page.locator('[data-test="auth-signup-tab"]').click()
    await expect(page.locator('[data-test="auth-confirm-password-input"]')).toBeVisible()
    expectAccessibleTouchTargets([...signIn, ...await auditTouchTargets(page)])
  })

  test("@mobile terms consent dialog", async ({ page }) => {
    await page.goto("/auth")
    await page.locator('[data-test="auth-skip-button"]').click()
    await expect(page.getByRole("dialog", { name: "Terms of Use & Privacy Policy" })).toBeVisible()
    expectAccessibleTouchTargets(await auditTouchTargets(page, "[role=dialog]"))
  })

  for (const path of ["/terms", "/privacy", "/418", "/no-such-page"]) {
    test(`@mobile static page ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      expectAccessibleTouchTargets(await auditTouchTargets(page))
    })
  }

  test("@mobile a shared character's public page", async ({ page }) => {
    // The dev-only seed for a public character (see getPublicCharacterFromFirebase): the page's
    // layout is what is audited here, not who may read it (sharing.spec.ts covers that)
    await page.addInitScript((character) => {
      localStorage.setItem(`dnd-public-char-${character.id}`, JSON.stringify(character))
    }, publicCharacter)
    await page.goto(`/share/${publicCharacter.id}`)
    await expect(page.getByRole("heading", { level: 1, name: publicCharacter.name })).toBeVisible()
    for (const tab of await page.getByRole("tab").all()) {
      await tab.click()
      expectAccessibleTouchTargets(await auditTouchTargets(page))
    }
  })

  test("@mobile a signed-in character sheet's header", async ({ page }, testInfo) => {
    const user = await createUser(testInfo)
    const character = withUniqueId(testCharacter)
    await seedCharacter(user.uid, character)
    await signIn(page, user)
    await openSheet(page, character.id)
    expectAccessibleTouchTargets(await auditTouchTargets(page))
  })
})

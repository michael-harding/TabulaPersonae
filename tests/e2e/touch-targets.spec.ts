import { type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { test, expect } from "./test"

// ACCESSIBILITY.md: every interactive element needs a 44×44px touch target, and neighbouring
// targets must never overlap. jsdom has no layout, so this audits the real rendered page by
// hit-testing with elementFromPoint:
//   "stolen"     — a point inside an element's own visible box resolves to a *different*
//                  interactive element: a neighbour's extended hit area sits on top of it, so a
//                  click on what the user sees lands on something else. Always a failure.
//   "undersized" — a point on the 44px-diameter circle centred on the element doesn't resolve to
//                  it. A circle (as WCAG 2.5.8 measures targets) rather than a square, because
//                  browsers don't hit-test the clipped corners of rounded controls — a 44×44
//                  rounded button or 44px round swatch is a full-size target.
//                  Reported as a test annotation, not a failure: many pre-existing controls
//                  (tab triggers, text inputs, checkboxes, links) are below 44px and are tracked
//                  separately from this overlap check.

const INTERACTIVE = [
  "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
  "[role=button]", "[role=tab]", "[role=checkbox]", "[role=switch]", "[role=combobox]",
  // Kobalte's Checkbox keeps its real <input> visually hidden; the clickable thing is the root.
  "[data-sem=checkbox]",
].join(",")

interface Violation { kind: "stolen" | "undersized"; element: string; other?: string }

async function auditTouchTargets(page: Page): Promise<Violation[]> {
  return page.evaluate((selector) => {
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

    for (const el of Array.from(document.querySelectorAll(selector))) {
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
  }, INTERACTIVE)
}

// KNOWN VIOLATIONS at phone width, found when this audit first ran on the mobile project
// (2026-10-15) and reported as blocking; fixing them changes the phone layout, which is a design
// decision. Listed exactly, so any other overlap still fails. Remove an entry once it is fixed.
//   - The header menu button (42x36, below the 44px minimum) sits flush against Take a Rest, and
//     its hit area covers Take a Rest's right edge.
//   - Combat Stats' grid is tight enough that Size covers the passive Perception toggle.
const KNOWN_PHONE_OVERLAPS = [
  { element: "take-a-rest-button", other: "header-menu-trigger" },
  { element: "passive-perception-toggle", other: "Size" },
]

function expectNoStolenClicks(violations: Violation[]) {
  const undersized = violations.filter((v) => v.kind === "undersized")
  if (undersized.length > 0) {
    test.info().annotations.push({
      type: "undersized touch targets",
      description: [...new Set(undersized.map((v) => v.element))].join(", "),
    })
  }
  const isKnown = (v: Violation) =>
    test.info().project.use.isMobile === true && KNOWN_PHONE_OVERLAPS.some((k) => k.element === v.element && k.other === v.other)
  const stolen = violations.filter((v) => v.kind === "stolen")
  const known = stolen.filter(isKnown)
  if (known.length > 0) {
    test.info().annotations.push({ type: "KNOWN touch target overlaps", description: known.map((v) => `${v.element} under ${v.other}`).join(", ") })
  }
  expect(stolen.filter((v) => !isKnown(v))).toEqual([])
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
      expectNoStolenClicks([...view, ...editing])
    })
  }

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
    expectNoStolenClicks(await auditTouchTargets(page))
    // Both halves of the divided pill must meet the 44px target.
    const undersized = test.info().annotations.find((a) => a.type === "undersized touch targets")?.description ?? ""
    expect(undersized).not.toMatch(/level-effect-0-skill-perception-(remove|check)/)
  })

  test("Edit Spell Slots modal", async ({ page }) => {
    await openSheet(page, testCharacter.id, "Spells")
    await page.getByRole("button", { name: /edit slots/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    expectNoStolenClicks(await auditTouchTargets(page))
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
    expectNoStolenClicks(await auditTouchTargets(page))
  })

  test("tab settings page", async ({ page }) => {
    await page.goto("/settings/tabs")
    await expect(page.locator('[data-test^="tab-toggle-"]').first()).toBeVisible()
    for (const toggle of await page.locator('[data-test^="tab-toggle-"]').all()) {
      await toggle.click()
    }
    expectNoStolenClicks(await auditTouchTargets(page))
  })
})

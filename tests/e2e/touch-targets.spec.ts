import { test, expect, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"

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

function expectNoStolenClicks(violations: Violation[]) {
  const undersized = violations.filter((v) => v.kind === "undersized")
  if (undersized.length > 0) {
    test.info().annotations.push({
      type: "undersized touch targets",
      description: [...new Set(undersized.map((v) => v.element))].join(", "),
    })
  }
  expect(violations.filter((v) => v.kind === "stolen")).toEqual([])
}

function setup(page: Page) {
  return page.addInitScript((data: unknown) => {
    localStorage.setItem("dnd-characters", JSON.stringify([data]))
    localStorage.setItem("dnd-skip-auth", "true")
  }, testCharacter)
}

test.describe("Touch targets", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setup(page)
  })

  for (const tab of ["Combat", "Spells", "Features", "Inventory", "Character"]) {
    test(`character sheet ${tab} tab, view and edit mode`, async ({ page }) => {
      await page.goto(`/character/${testCharacter.id}`)
      await page.waitForLoadState("networkidle")
      await page.getByRole("tab", { name: tab }).click()
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
    await page.goto(`/character/${testCharacter.id}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("tab", { name: "Features" }).click()
    await page.getByRole("button", { name: /add class feature/i }).click()
    const modal = page.getByRole("dialog")
    await modal.getByRole("button", { name: /feature type/i }).click()
    await page.getByRole("option", { name: "Skill Proficiency" }).click()
    const addSkill = modal.getByLabel(/add skill/i)
    await addSkill.fill("Perception")
    await addSkill.press("Enter")
    await expect(modal.getByRole("checkbox", { name: "Expertise for Perception" })).toBeVisible()
    expectNoStolenClicks(await auditTouchTargets(page))
    // Both halves of the divided pill must meet the 44px target.
    const undersized = test.info().annotations.find((a) => a.type === "undersized touch targets")?.description ?? ""
    expect(undersized).not.toMatch(/level-effect-0-skill-perception-(remove|check)/)
  })

  test("tab settings page", async ({ page }) => {
    await page.goto("/settings/tabs")
    await page.waitForLoadState("networkidle")
    for (const toggle of await page.locator('[data-test^="tab-toggle-"]').all()) {
      await toggle.click()
    }
    expectNoStolenClicks(await auditTouchTargets(page))
  })
})

import { test, expect, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"

// ACCESSIBILITY.md: every interactive element needs a 44×44px touch target, and neighbouring
// targets must never overlap. jsdom has no layout, so this audits the real rendered page by
// hit-testing with elementFromPoint:
//   "stolen"     — a point inside an element's own visible box resolves to a *different*
//                  interactive element: a neighbour's extended hit area sits on top of it, so a
//                  click on what the user sees lands on something else. Always a failure.
//   "undersized" — a point inside the 44×44 square centred on the element doesn't resolve to it.
//                  Reported as a test annotation, not a failure: many pre-existing controls
//                  (tab triggers, text inputs, checkboxes, links) are below 44px and are tracked
//                  separately from this overlap check.

const INTERACTIVE = [
  "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
  "[role=button]", "[role=tab]", "[role=checkbox]", "[role=switch]", "[role=combobox]",
].join(",")

interface Violation { kind: "stolen" | "undersized"; element: string; other?: string }

async function auditTouchTargets(page: Page): Promise<Violation[]> {
  return page.evaluate((selector) => {
    const TARGET = 44
    const describe = (el: Element) =>
      el.getAttribute("data-test") ?? el.getAttribute("aria-label") ?? `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 30)}`
    const owner = (el: Element | null) => el?.closest(selector) ?? null
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
      const style = getComputedStyle(el)
      if (style.visibility === "hidden" || style.display === "none" || el.classList.contains("sr-only")) continue
      el.scrollIntoView({ block: "center", inline: "center" })
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2

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
      // 2. Perimeter of the 44×44 square centred on the element (inset 1px).
      const h = TARGET / 2 - 1
      for (const [dx, dy] of [[-h, -h], [0, -h], [h, -h], [-h, 0], [h, 0], [-h, h], [0, h], [h, h]]) {
        probe(cx + dx, cy + dy, "undersized")
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

  test("tab settings page", async ({ page }) => {
    await page.goto("/settings/tabs")
    await page.waitForLoadState("networkidle")
    for (const toggle of await page.locator('[data-test^="tab-toggle-"]').all()) {
      await toggle.click()
    }
    expectNoStolenClicks(await auditTouchTargets(page))
  })
})

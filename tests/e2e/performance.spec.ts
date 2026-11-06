import { type Locator, type Page } from "@playwright/test"

import { testCharacter } from "../visual/fixtures"
import { openSheet, seedGuest } from "./helpers"
import { test, expect } from "./test"

// How long the most frequent interactions take, from the pointer going down to the DOM showing
// the result, against explicit budgets. Run in the chromium project only (see playwright.config.ts).
//
// The budgets are for the e2e dev server — unminified, with dev-only checks — and sit at about
// five times the medians measured when they were set (2026-10-15, desktop Linux): HP change
// 1.5 ms; switching to Spells 18 ms, Features 22 ms, Inventory 32 ms (first visits up to 83 ms).
// They catch regressions of several times, not small drift. Each test reports its timings as an
// annotation in the HTML report; revisit the budgets if the measuring machine changes.
const BUDGET_MS = { hpChange: 25, tabSwitch: 150 }
const RUNS = 5

/**
 * Clicks `target` and resolves with the milliseconds from its pointerdown until `done` holds in
 * the page. Timed inside the page, so Playwright's own round trips are not counted.
 */
async function timeClick(page: Page, target: Locator, done: { selector: string; text?: string }): Promise<number> {
  await page.evaluate(({ selector, text }) => {
    const finished = () => {
      const element = document.querySelector(selector)
      return element != null && (text == null || element.textContent === text)
    }
    ;(window as unknown as { __timing: Promise<number> }).__timing = new Promise<number>((resolve, reject) => {
      let start = 0
      const observer = new MutationObserver(() => {
        if (start > 0 && finished()) {
          observer.disconnect()
          resolve(performance.now() - start)
        }
      })
      document.addEventListener("pointerdown", () => {
        start = performance.now()
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
      }, { capture: true, once: true })
      setTimeout(() => reject(new Error(`"${selector}" did not show the result within 5s`)), 5000)
    })
  }, done)
  await target.click()
  return page.evaluate(() => (window as unknown as { __timing: Promise<number> }).__timing)
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

function report(name: string, timings: number[]) {
  test.info().annotations.push({ type: "timing", description: `${name}: median ${median(timings).toFixed(1)} ms of ${timings.map((t) => t.toFixed(1)).join(", ")}` })
}

test.describe("Interaction performance", () => {
  test.beforeEach(async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
  })

  test("@perf changing HP", async ({ page }) => {
    const timings: number[] = []
    // testCharacter starts at 38 of 44
    for (let run = 1; run <= RUNS; run++) {
      timings.push(await timeClick(page, page.locator('[data-test="hp-increase-button"]'), {
        selector: '[data-test="current-hp"]', text: String(38 + run),
      }))
    }
    report("HP change", timings)
    expect(median(timings)).toBeLessThan(BUDGET_MS.hpChange)
  })

  for (const { tab, id, content } of [
    { tab: "Spells", id: "default-spells", content: '[data-test="add-spell-button"]' },
    { tab: "Features", id: "default-features", content: '[data-test="add-feature-class-feature"]' },
    { tab: "Inventory", id: "default-inventory", content: '[data-test="add-equipment-button"]' },
  ]) {
    test(`@perf switching to the ${tab} tab`, async ({ page }) => {
      const timings: number[] = []
      for (let run = 0; run < RUNS; run++) {
        timings.push(await timeClick(page, page.locator(`[data-test="tab-trigger-${id}"]`), {
          selector: `[role=tabpanel]:not([hidden]) ${content}`,
        }))
        await page.locator('[data-test="tab-trigger-default-combat"]').click()
        await expect(page.locator('[data-test="ability-scores-module"]')).toBeVisible()
      }
      report(`${tab} tab`, timings)
      expect(median(timings)).toBeLessThan(BUDGET_MS.tabSwitch)
    })
  }
})

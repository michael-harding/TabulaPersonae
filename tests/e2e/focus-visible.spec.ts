import { type Page } from "@playwright/test"

import { SCENES, useContrastHelpers } from "./contrast-audit"
import { finishAnimations, test, expect } from "./test"

// ACCESSIBILITY.md §4, WCAG 2.4.7 and 1.4.11: keyboard focus must be visible. axe does not check
// this, and a screenshot of a page at rest does not show it, so this tabs through the real page
// and compares every stop focused and not. Each stop must:
//   - gain a ring or outline, on itself or on what is drawn for it (the label of a hidden input,
//     the pill of a chip), in a colour with 3:1 against what is behind it;
//   - actually change on screen, which a ring clipped by its container does not.
// Neither alone is enough: an input's pixels change on focus even when its ring is missing.

const NON_TEXT = 3
// Far above any real page, so a page whose Tab order never ends is reported rather than hanging
const MAX_STOPS = 600
const CLIP_MARGIN = 12

interface Problem {
  element: string
  problem: "no indicator" | "low contrast" | "not drawn"
  ratio?: number
}

interface Look { boxShadow: string; outline: string }

declare global {
  interface Window {
    focusAudit: { stops: Set<Element>; stop?: HTMLElement; family: Element[]; looks: Look[] }
  }
}

/** Moves to the next stop, returning false when Tab has gone off the page or back to the start. */
async function tabToNextStop(page: Page): Promise<boolean> {
  await page.keyboard.press("Tab")
  return page.evaluate(() => {
    window.focusAudit ??= { stops: new Set(), family: [], looks: [] }
    const active = document.activeElement as HTMLElement | null
    if (active == null || active === document.body || window.focusAudit.stops.has(active)) return false
    window.focusAudit.stops.add(active)
    window.focusAudit.stop = active
    return true
  })
}

/** Records how the stop and what surrounds it look while focused. */
function recordFocusedLook(page: Page) {
  return page.evaluate(() => {
    const stop = window.focusAudit.stop!
    const ancestors: Element[] = []
    for (let e = stop.parentElement; e != null && ancestors.length < 3; e = e.parentElement) ancestors.push(e)
    window.focusAudit.family = [stop, ...ancestors, ...Array.from(stop.querySelectorAll("*"))]
    window.focusAudit.looks = window.focusAudit.family.map((e) => {
      const style = getComputedStyle(e)
      return { boxShadow: style.boxShadow, outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}` }
    })
  })
}

/** With the stop blurred, finds what focus had added: the strongest ring or outline in its family. */
function findIndicator(page: Page) {
  return page.evaluate(() => {
    const { contrast, focusAudit: { family, looks, stop } } = window
    let ratio = 0
    let drawnOn: Element | null = null
    family.forEach((e, i) => {
      const style = getComputedStyle(e)
      const behind = contrast.backdrop(e.parentElement)
      const added = style.boxShadow === looks[i].boxShadow ? [] : contrast.ringColors(looks[i].boxShadow)
      const outline = `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`
      if (outline !== looks[i].outline) {
        const [outlineStyle, width, ...color] = looks[i].outline.split(" ")
        if (outlineStyle !== "none" && parseFloat(width) > 0) added.push(contrast.rgba(color.join(" ")))
      }
      for (const color of added) {
        if (color[3] === 0) continue
        const candidate = contrast.ratio(contrast.over(color, behind), behind)
        if (candidate > ratio) { ratio = candidate; drawnOn = e }
      }
    })
    const box = (drawnOn as Element | null)?.getBoundingClientRect()
    return {
      element: contrast.describe(stop!),
      ratio: Number(ratio.toFixed(2)),
      box: box == null ? null : { x: box.x, y: box.y, width: box.width, height: box.height },
    }
  })
}

/**
 * Takes focus off the stop. A dialog's focus trap puts focus straight back after a plain blur, so
 * inside one focus moves to the dialog itself.
 */
function leaveStop(page: Page) {
  return page.evaluate(() => {
    const stop = window.focusAudit.stop!
    const dialog = stop.closest<HTMLElement>("[role=dialog]")
    if (dialog != null) dialog.focus()
    else stop.blur()
  })
}

/** Puts focus back on the stop, where the next Tab carries on from. */
function returnToStop(page: Page) {
  return page.evaluate(() => window.focusAudit.stop!.focus())
}

async function auditFocus(page: Page): Promise<Problem[]> {
  const problems: Problem[] = []
  // Stops that look alike on the same surface behave alike, so only the first of each is measured
  const measured = new Set<string>()
  for (let count = 0; count < MAX_STOPS; count++) {
    if (!await tabToNextStop(page)) return problems
    const signature = await page.evaluate(() => {
      const stop = window.focusAudit.stop!
      stop.scrollIntoView({ block: "center", inline: "center" })
      return `${stop.tagName}|${stop.getAttribute("class")}|${window.contrast.backdrop(stop.parentElement).join()}`
    })
    if (measured.has(signature)) continue
    measured.add(signature)

    await finishAnimations(page)
    await recordFocusedLook(page)
    await leaveStop(page)
    await finishAnimations(page)
    const { element, ratio, box } = await findIndicator(page)
    if (box == null) {
      problems.push({ element, problem: "no indicator" })
      await returnToStop(page)
      continue
    }
    if (ratio < NON_TEXT) problems.push({ element, problem: "low contrast", ratio })

    const clip = {
      x: Math.max(0, box.x - CLIP_MARGIN),
      y: Math.max(0, box.y - CLIP_MARGIN),
      width: box.width + 2 * CLIP_MARGIN,
      height: box.height + 2 * CLIP_MARGIN,
    }
    const unfocused = await page.screenshot({ clip })
    await returnToStop(page)
    await finishAnimations(page)
    if (unfocused.equals(await page.screenshot({ clip }))) problems.push({ element, problem: "not drawn" })
  }
  throw new Error(`Tab was still finding new stops after ${MAX_STOPS}`)
}

test.describe("Keyboard focus is visible", () => {
  // A long page is pressed through one stop at a time
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await useContrastHelpers(page)
  })

  for (const scene of SCENES) {
    test(scene.name, async ({ page }, testInfo) => {
      await scene.open(page, testInfo)
      expect(await auditFocus(page)).toEqual([])
    })
  }
})

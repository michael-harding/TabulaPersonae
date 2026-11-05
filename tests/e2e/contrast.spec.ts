import { type Page } from "@playwright/test"
import axe from "axe-core"

import { SHEET_COLOR_PRESETS } from "../../src/lib/sheet-color"
import { testCharacter } from "../visual/fixtures"
import { SCENES, SHEET_TABS, useContrastHelpers } from "./contrast-audit"
import { openSheet, seedGuest } from "./helpers"
import { contrastScan, finishAnimations, test, expect } from "./test"

// ACCESSIBILITY.md §9. axe checks the contrast of text and nothing else, and it passes over what it
// cannot work out, so this audits what it leaves on the rendered page:
//   - the boundary of each form control, and each placeholder;
//   - icon-only controls;
//   - pips, whose used and available states must differ by more than colour;
//   - the sheet colour swatches, whose own colours can be anything;
//   - text, with axe, where a result it could not decide also fails;
//   - text while hovered, with axe.

const TEXT = 4.5
const NON_TEXT = 3

interface Finding {
  element: string
  check: string
  ratio?: number
}

function auditNonText(page: Page, within?: string): Promise<Finding[]> {
  return page.evaluate(({ within, TEXT, NON_TEXT }) => {
    const { backdrop, describe, isSeen, opacity, over, ratio, rgba, ringColors } = window.contrast
    const scope = within == null ? document : document.querySelector(within)
    if (scope == null) throw new Error(`Nothing to audit: ${within} is not on the page`)
    const seen = (selector: string) => Array.from(scope.querySelectorAll(selector)).filter(isSeen)
    const findings: Finding[] = []
    const require = (element: Element, check: string, measured: number, minimum: number) => {
      if (measured < minimum) findings.push({ element: describe(element), check, ratio: Number(measured.toFixed(2)) })
    }
    const isDisabled = (el: Element) => el.matches(":disabled") || el.getAttribute("aria-disabled") === "true"

    /** How well an element's border or fill stands out from what surrounds it. */
    const boundary = (el: Element) => {
      const outside = backdrop(el.parentElement)
      const style = getComputedStyle(el)
      const hasBorder = style.borderTopStyle !== "none" && parseFloat(style.borderTopWidth) > 0
      const border = hasBorder ? ratio(over(rgba(style.borderTopColor), outside), outside) : 0
      return Math.max(border, ratio(over(rgba(style.backgroundColor), outside), outside))
    }
    /** How well an icon stands out from what it is drawn on. */
    const iconContrast = (icon: Element) => {
      const behind = backdrop(icon.parentElement)
      const color = rgba(getComputedStyle(icon).color)
      return ratio(over(color, behind, color[3] * opacity(icon)), behind)
    }

    // Form controls. A combobox's input has no border of its own: the box around it draws it.
    const controls = "input:not([type=hidden],[type=color],[type=checkbox],[type=radio]),textarea,select,[role=combobox],[data-sem=checkbox] [data-test$='-control']"
    for (const control of seen(controls)) {
      if (isDisabled(control)) continue
      const height = control.getBoundingClientRect().height
      const boxes = [control]
      for (let e = control.parentElement; e != null && boxes.length < 3; e = e.parentElement) {
        if (e.getBoundingClientRect().height <= height + 8) boxes.push(e)
      }
      require(control, "control boundary", Math.max(...boxes.map(boundary)), NON_TEXT)
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        if (control.placeholder !== "") {
          const fill = backdrop(control)
          require(control, "placeholder", ratio(over(rgba(getComputedStyle(control, "::placeholder").color), fill), fill), TEXT)
        }
      }
    }

    // Icon-only controls
    for (const control of seen("button,a[href],[role=button]")) {
      if (isDisabled(control) || (control.textContent ?? "").trim() !== "") continue
      const icon = Array.from(control.querySelectorAll("svg")).find(isSeen)
      if (icon != null) require(control, "icon", iconContrast(icon), NON_TEXT)
    }

    // Pips: an icon on one state and not the other tells them apart without colour
    for (const tracker of seen("[data-sem=pip-tracker]")) {
      const hasIcon = new Map<string, boolean>()
      for (const slot of Array.from(tracker.querySelectorAll("[data-test*='-slot-']"))) {
        hasIcon.set(slot.getAttribute("aria-label")!, slot.querySelector("svg") != null)
      }
      if (hasIcon.size === 2 && new Set(hasIcon.values()).size === 1) {
        findings.push({ element: describe(tracker), check: "used and available pips differ only by colour" })
      }
    }

    // Sheet colour swatches: the player's colour may not stand out, so its boundary has to
    const swatches = [
      ...seen("[data-test^='sheet-color-preset-']").map((button) => ({ swatch: button.firstElementChild!, pressed: button.getAttribute("aria-pressed") === "true", button })),
      ...Array.from(scope.querySelectorAll("[data-test='sheet-color-custom-input']")).map((input) => ({ swatch: input.parentElement!, pressed: null, button: input })),
    ]
    for (const { swatch, pressed, button } of swatches) {
      require(button, "swatch boundary", boundary(swatch), NON_TEXT)
      const rings = ringColors(getComputedStyle(swatch).boxShadow)
      if (rings.length > 0) {
        const behind = backdrop(swatch.parentElement)
        require(button, "selected swatch ring", Math.max(...rings.map((ring) => ratio(over(ring, behind), behind))), NON_TEXT)
      }
      if (pressed != null && pressed !== (rings.length > 0)) {
        findings.push({ element: describe(button), check: "selected ring and aria-pressed disagree" })
      }
      const pipette = swatch.querySelector("svg")
      if (pipette != null) require(button, "pipette icon", iconContrast(pipette), NON_TEXT)
    }
    return findings
  }, { within, TEXT, NON_TEXT })
}

async function expectContrast(page: Page, within?: string) {
  await finishAnimations(page)
  expect(await auditNonText(page, within)).toEqual([])
  expect(await contrastScan(page, within)).toEqual({ violations: [], undecided: [] })
}

declare global {
  interface Window { axe: typeof axe }
}

/** Hovers each kind of control on the page in turn, returning the text axe finds unreadable. */
async function auditHover(page: Page) {
  await page.addScriptTag({ content: axe.source })
  const count = await page.evaluate(() => {
    const kinds = new Map<string, Element>()
    const controls = document.querySelectorAll("button,a[href],label,[role=tab],[role=button],[role=menuitem]")
    for (const control of Array.from(controls)) {
      if (!window.contrast.isSeen(control) || control.matches(":disabled")) continue
      const kind = `${control.tagName}|${control.getAttribute("class")}|${window.contrast.backdrop(control.parentElement).join()}`
      if (!kinds.has(kind)) kinds.set(kind, control)
    }
    Array.from(kinds.values()).forEach((control, i) => control.setAttribute("data-hover-audit", String(i)))
    return kinds.size
  })
  const failures: { element: string; ratio?: number; html: string }[] = []
  for (let i = 0; i < count; i++) {
    const point = await page.evaluate((i) => {
      const control = document.querySelector(`[data-hover-audit="${i}"]`)
      if (control == null) return null
      control.scrollIntoView({ block: "center", inline: "center" })
      const box = control.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, i)
    if (point == null) continue
    await page.mouse.move(point.x, point.y)
    await finishAnimations(page)
    failures.push(...await page.evaluate(async (i) => {
      const control = document.querySelector(`[data-hover-audit="${i}"]`)
      // Something else can be on top of it, and it is then not what is being hovered
      if (control == null || !control.matches(":hover")) return []
      const { violations } = await window.axe.run(control, { runOnly: ["color-contrast"] })
      return violations.flatMap(({ nodes }) => nodes.map((node) => ({
        element: window.contrast.describe(control),
        ratio: node.any[0]?.data?.contrastRatio as number | undefined,
        html: node.html,
      })))
    }, i))
  }
  return failures
}

test.describe("Contrast", () => {
  // Every test here is itself an axe scan of the state it sets up.
  test.use({ axeAfterEach: false })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await useContrastHelpers(page)
  })

  for (const scene of SCENES) {
    test(scene.name, async ({ page }, testInfo) => {
      await scene.open(page, testInfo)
      await expectContrast(page, scene.within)
    })
  }

  for (const { name, hex } of SHEET_COLOR_PRESETS) {
    test(`sheet colour ${name}, every tab`, async ({ page }) => {
      await seedGuest(page, { ...testCharacter, sheetColor: hex }, { expandSections: true })
      await openSheet(page, testCharacter.id)
      for (const tab of SHEET_TABS) {
        await page.getByRole("tab", { name: tab }).click()
        await expectContrast(page)
      }
    })
  }
})

// The stats bar is frosted glass that the sheet scrolls behind.
test.describe("Stats bar", () => {
  test.beforeEach(({ page }) => useContrastHelpers(page))

  // Translucent is not the same as looking like glass, as a heavy tint showed: the blur could hardly
  // be seen. So this looks at what is actually drawn, with a block of colour behind the bar: the block
  // has to show through clearly, and its edge has to be soft.
  test("visibly frosts what passes behind it", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
    const block = { x: 300, width: 200 }
    await page.evaluate(({ x, width }) => {
      const bar = document.querySelector("[data-sem=stats-bar]")!
      const panel = document.createElement("div")
      panel.style.cssText = `position:fixed;top:0;left:${x}px;width:${width}px;height:200px;z-index:40;background:#8b5cf6`
      bar.parentElement!.insertBefore(panel, bar)
      const hideContent = document.createElement("style")
      hideContent.textContent = "[data-sem=stats-bar] * { visibility: hidden !important }"
      document.head.appendChild(hideContent)
    }, block)
    await finishAnimations(page)
    const shot = await page.screenshot({ clip: { x: 0, y: 25, width: 700, height: 1 } })
    const colourAt = (points: number[]) => page.evaluate(async ({ png, points }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d")!
      context.drawImage(image, 0, 0)
      return points.map((x) => {
        const [r, g, b] = context.getImageData(x, 0, 1, 1).data
        return window.contrast.ratio([r, g, b, 1], [255, 255, 255, 1])
      })
    }, { png: shot.toString("base64"), points })
    const [centre, justOutside, farAway] = await colourAt([block.x + block.width / 2, block.x + block.width + 4, 650])
    const relative = (a: number, b: number) => Math.max(a, b) / Math.min(a, b)
    expect(relative(centre, farAway), "the block shows through the bar").toBeGreaterThanOrEqual(1.5)
    expect(relative(justOutside, farAway), "its colour spreads past its edge, which is the blur").toBeGreaterThanOrEqual(1.1)
  })
})

// Hover states are mostly a change of colour, so this is where a pairing goes wrong unnoticed. The
// default theme, plus the presets whose shades lose the most contrast if a fill is ever lightened.
test.describe("Contrast while hovering", () => {
  test.use({ axeAfterEach: false })
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await useContrastHelpers(page)
  })

  const colours = [{ name: "default", hex: undefined }, ...SHEET_COLOR_PRESETS.filter(({ name }) => name === "Gold" || name === "Purple")]
  for (const { name, hex } of colours) {
    for (const tab of SHEET_TABS) {
      test(`${name} sheet colour, ${tab} tab`, async ({ page }) => {
        await seedGuest(page, { ...testCharacter, sheetColor: hex }, { expandSections: true })
        await openSheet(page, testCharacter.id, tab)
        expect(await auditHover(page)).toEqual([])
      })
    }
  }
})

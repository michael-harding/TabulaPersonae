import { type Locator, type Page } from "@playwright/test"

import { publicCharacter, testCharacter, secondCharacter } from "../visual/fixtures"
import { byName, FEATURE_TYPES, MODALS, OVERLAYS, PHONE_MODALS, type ModalCase } from "../popup-cases"
import { openSheet, seedGuest } from "./helpers"
import { axeBuilder, contrastScan, finishAnimations, test, expect } from "./test"

// Every test here is itself an axe scan of the state it sets up.
test.use({ axeAfterEach: false })

async function expectNoViolations(page: Page) {
  await finishAnimations(page)
  const results = await axeBuilder(page).analyze()
  expect(results.violations).toEqual([])
}

/** Opens a page and waits for its main heading, so the scan sees it loaded. */
async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
}

test.describe("Home page", () => {
  test("empty state has no accessibility violations", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/")
    await expect(page.locator('[data-test="create-first-character-button"]')).toBeVisible()
    await expectNoViolations(page)
  })

  test("with characters has no accessibility violations", async ({ page }) => {
    await seedGuest(page, [testCharacter, secondCharacter])
    await page.goto("/")
    await expect(page.locator('[data-test="create-new-character-button"]')).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Auth page", () => {
  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/auth")
    await expect(page.locator('[data-test="auth-skip-button"]')).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Character sheet page", () => {
  test("full character sheet has no accessibility violations", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id)
    await expectNoViolations(page)
  })

  test("unconscious character has no accessibility violations", async ({ page }) => {
    await seedGuest(page, secondCharacter)
    await openSheet(page, secondCharacter.id)
    await expect(page.getByText("Death Saves")).toBeVisible()
    await expectNoViolations(page)
  })

  for (const [name, hitPoints] of [["full", { current: 44, maximum: 44, temporary: 0 }], ["half", { current: 22, maximum: 44, temporary: 0 }]] as const) {
    test(`${name} HP has no accessibility violations`, async ({ page }) => {
      await seedGuest(page, { ...testCharacter, hitPoints })
      await openSheet(page, testCharacter.id)
      await expectNoViolations(page)
    })
  }

  test("empty notes have no accessibility violations", async ({ page }) => {
    await seedGuest(page, { ...testCharacter, personalityTraits: "", ideals: "", bonds: "", flaws: "", backstory: "", notes: "" })
    await openSheet(page, testCharacter.id, "Character")
    await expectNoViolations(page)
  })

  for (const tab of ["Character", "Spells", "Inventory"]) {
    test(`${tab.toLowerCase()} tab has no accessibility violations`, async ({ page }) => {
      await seedGuest(page, testCharacter)
      await openSheet(page, testCharacter.id, tab)
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true")
      await expectNoViolations(page)
    })
  }
})

// The hover highlight uses the accent colour, a strong red in the light theme; text that kept its
// normal colour on it had a contrast ratio of 2.24:1.
test.describe("Hovered section headers", () => {
  const sectionHeaders: { tab: string; header: (page: Page) => Locator }[] = [
    { tab: "Combat", header: (page) => page.getByRole("tabpanel").getByRole("button", { name: /^Actions/ }).first() },
    { tab: "Spells", header: (page) => page.locator('[data-test^="spell-level-"][data-test$="-toggle"]').first() },
    { tab: "Features", header: (page) => page.getByRole("tabpanel").getByRole("button", { name: /^Species Traits/ }).first() },
  ]
  for (const { tab, header } of sectionHeaders) {
    test(`${tab} tab: a hovered section header has no accessibility violations`, async ({ page }) => {
      await seedGuest(page, testCharacter)
      await openSheet(page, testCharacter.id, tab)
      await header(page).hover()
      // The highlight fades in (transition-colors); finishAnimations waits for the settled colours
      await expectNoViolations(page)
    })
  }
})

// Menus are non-modal and rendered at the end of <body>. Opened from inside a modal dialog, a
// menu must stay exposed to assistive tech even though the dialog hides everything else outside it.
test.describe("A menu opened inside a dialog", () => {
  test("is reachable by role and has no accessibility violations", async ({ page }) => {
    await seedGuest(page, testCharacter)
    await openSheet(page, testCharacter.id, "Inventory")
    await page.locator('[data-test^="equipment-edit-"]').first().click()
    const modal = page.getByRole("dialog")
    await modal.locator('[data-test="modifier-group-skill-effects"]').click()
    await modal.getByRole("button", { name: "Add skill advantage" }).click()

    await expect(page.getByRole("menuitem").first()).toBeVisible()
    await expectNoViolations(page)
  })
})

// Every modal and popup is scanned (see tests/popup-cases.ts). The chromium and chromium-dark projects
// cover the themes, and the mobile project the ones tagged for a phone.
async function openModal(page: Page, modal: ModalCase) {
  await seedGuest(page, testCharacter, { expandSections: true })
  await openSheet(page, testCharacter.id, modal.tab)
  await modal.open(page)
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.mouse.move(0, 0)
}

/**
 * Scans the whole page, then gets axe's verdict on all of the open dialog's text (see contrastScan).
 * `within` narrows that to a popup open inside the dialog: it covers the text under it, which gets
 * its verdict with the popup closed.
 */
async function expectDialogClean(page: Page, within = "[role=dialog]") {
  await expectNoViolations(page)
  expect(await contrastScan(page, within)).toEqual({ violations: [], undecided: [] })
}

test.describe("Modals", () => {
  for (const modal of MODALS) {
    const tag = PHONE_MODALS.includes(modal.name) ? "@mobile " : ""
    test(`${tag}${modal.name} has no accessibility violations`, async ({ page }) => {
      await openModal(page, modal)
      await expectDialogClean(page, modal.name === "feature-add-type-open" ? "[role=listbox]" : undefined)
    })
  }

  for (const type of FEATURE_TYPES) {
    test(`feature-add-type ${type} has no accessibility violations`, async ({ page }) => {
      await openModal(page, byName("feature-add-type-open"))
      await page.getByRole("dialog").getByRole("option", { name: type, exact: true }).click()
      await expect(page.getByRole("dialog").getByRole("listbox")).toHaveCount(0)
      await page.mouse.move(0, 0)
      await expectDialogClean(page)
    })
  }

  // A phone can't fit the item form, so the modal scrolls. Scrolled, its edge cuts across text, which
  // axe cannot judge; the same form gets its verdict unscrolled, in the "item-edit-weapon" test above.
  test("@mobile item-edit-weapon scrolled to the footer has no accessibility violations", async ({ page }) => {
    await openModal(page, byName("item-edit-weapon"))
    await page.getByRole("dialog").evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expectNoViolations(page)
  })
})

test.describe("Popups", () => {
  for (const overlay of OVERLAYS) {
    const tag = overlay.name === "header-menu" ? "@mobile " : ""
    test(`${tag}${overlay.name} has no accessibility violations`, async ({ page }) => {
      await seedGuest(page, overlay.character ?? testCharacter, { expandSections: true })
      await openSheet(page, (overlay.character ?? testCharacter).id, overlay.tab)
      await expect(await overlay.open(page)).toBeVisible()
      await page.mouse.move(0, 0)
      await expectNoViolations(page)
    })
  }
})

test.describe("Tab settings page", () => {
  test("the add tab form has no accessibility violations", async ({ page }) => {
    await seedGuest(page, [])
    await page.goto("/settings/tabs")
    await page.locator('[data-test="add-tab-button"]').click()
    await expect(page.locator('[data-test="new-tab-name-input"]')).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Public share page", () => {
  const seedPublic = (page: Page, id: string, character: unknown) => page.addInitScript(({ id, character }) => {
    localStorage.setItem(`dnd-public-char-${id}`, JSON.stringify(character))
  }, { id, character })

  test("default tab has no accessibility violations", async ({ page }) => {
    await seedPublic(page, publicCharacter.id, publicCharacter)
    await page.goto(`/share/${publicCharacter.id}`)
    await expect(page.getByRole("heading", { level: 1, name: publicCharacter.name })).toBeVisible()
    await expectNoViolations(page)
  })

  test("a character that was not found has no accessibility violations", async ({ page }) => {
    await seedPublic(page, "nonexistent-char-id", null)
    await page.goto("/share/nonexistent-char-id")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expectNoViolations(page)
  })
})

test.describe("Static pages", () => {
  for (const { path, heading } of [
    { path: "/418", heading: "418" },
    { path: "/nonexistent-route-xyz", heading: "404 - Not Found" },
    { path: "/terms", heading: "Terms of Use" },
    { path: "/privacy", heading: "Privacy Policy" },
  ]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await openPage(page, path, heading)
      await expectNoViolations(page)
    })
  }
})

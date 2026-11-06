import { test, expect, type Page } from "@playwright/test"

import { testCharacter } from "./fixtures"
import { openSheet, dialog, parkPointer, TALL, PHONE, type Theme } from "./helpers"
import { byName, FEATURE_TYPES, MODALS, PHONE_MODALS, slug, type ModalCase } from "../popup-cases"

// Every modal is screenshotted open (TESTING.md "Visual Regression Coverage"). The default
// screenshot is the dialog element alone, so a change to the page behind the overlay doesn't churn
// these baselines; the "Modal shell" block screenshots the whole viewport instead, to guard the
// overlay, centring and corners that every modal shares.
//
// Not covered: the sign-out dialog. It needs a signed-in Firebase user — guest mode shows
// "Back to Login" in its place — and tests may not make real network calls (TESTING.md §5).
// src/tests/components/header-menu.test.tsx covers it.

async function openModal(page: Page, modal: ModalCase, theme?: Theme) {
  await openSheet(page, testCharacter, { tab: modal.tab, theme })
  await modal.open(page)
  await expect(dialog(page)).toBeVisible()
  await parkPointer(page)
}

test.describe("Modals — desktop", () => {
  test.use({ viewport: TALL })

  for (const modal of MODALS) {
    test(modal.name, async ({ page }) => {
      await openModal(page, modal)
      await expect(dialog(page)).toHaveScreenshot(`modal-${modal.name}.png`)
    })
  }

  test("Add Feature lists every feature type", async ({ page }) => {
    await openModal(page, byName("feature-add-type-open"))
    await expect(dialog(page).getByRole("option")).toHaveText(["None", ...FEATURE_TYPES])
  })

  for (const type of FEATURE_TYPES) {
    test(`feature-add-type ${type}`, async ({ page }) => {
      await openModal(page, byName("feature-add-type-open"))
      await dialog(page).getByRole("option", { name: type, exact: true }).click()
      await expect(dialog(page).getByRole("listbox")).toHaveCount(0)
      await parkPointer(page)
      await expect(dialog(page)).toHaveScreenshot(`modal-feature-add-type-${slug(type)}.png`)
    })
  }
})

test.describe("Modals — desktop, dark", () => {
  test.use({ viewport: TALL })

  for (const name of ["feature-add", "item-edit-weapon", "spell-edit", "rest-short"]) {
    test(name, async ({ page }) => {
      await openModal(page, byName(name), "dark")
      await expect(dialog(page)).toHaveScreenshot(`modal-${name}-dark.png`)
    })
  }
})

test.describe("Modals — phone", () => {
  test.use({ viewport: PHONE })

  for (const name of PHONE_MODALS) {
    test(name, async ({ page }) => {
      await openModal(page, byName(name))
      await expect(dialog(page)).toHaveScreenshot(`modal-${name}-phone.png`)
    })
  }

  // A phone can't fit the item form, so the modal scrolls; this guards the stacked footer at its end.
  test("item-edit-weapon scrolled to the footer", async ({ page }) => {
    await openModal(page, byName("item-edit-weapon"))
    await dialog(page).evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect(dialog(page)).toHaveScreenshot("modal-item-edit-weapon-phone-footer.png")
  })
})

test.describe("Modal shell", () => {
  for (const [size, viewport] of [["desktop", undefined], ["phone", PHONE]] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${size} — ${theme}`, async ({ page }) => {
        if (viewport != null) await page.setViewportSize(viewport)
        await openModal(page, byName("rest-short"), theme)
        await expect(page).toHaveScreenshot(`modal-shell-${size}-${theme}.png`)
      })
    }
  }
})

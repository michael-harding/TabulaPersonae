import { test, expect } from "@playwright/test"

import { openModal, dialog, parkPointer, TALL, PHONE } from "./helpers"
import { byName, featureTypeBaseline, FEATURE_TYPES_WITH_BASELINE, MODALS, PHONE_MODALS } from "../popup-cases"

// Every modal layout is screenshotted open (TESTING.md "Visual Regression Coverage"). A modal or
// feature type with the same layout as another is covered by that one's baseline, as recorded in
// tests/popup-cases.ts. The screenshot is the dialog element alone, so a change to the page behind
// the overlay doesn't churn these baselines; modal-shell.spec.ts screenshots the whole viewport, to
// guard the overlay, centring and corners that every modal shares.
//
// Not covered: the sign-out dialog. It needs a signed-in Firebase user — guest mode shows
// "Back to Login" in its place — and tests may not make real network calls (TESTING.md §5).
// src/tests/components/header-menu.test.tsx covers it.

test.describe("Modals — desktop", () => {
  test.use({ viewport: TALL })

  for (const modal of MODALS.filter((m) => m.coveredBy == null)) {
    test(modal.name, async ({ page }) => {
      await openModal(page, modal)
      await expect(dialog(page)).toHaveScreenshot(`modal-${modal.name}.png`)
    })
  }

  for (const type of FEATURE_TYPES_WITH_BASELINE) {
    test(`feature-add-type ${type}`, async ({ page }) => {
      await openModal(page, byName("feature-add-type-open"))
      await dialog(page).getByRole("option", { name: type, exact: true }).click()
      await expect(dialog(page).getByRole("listbox")).toHaveCount(0)
      await parkPointer(page)
      await expect(dialog(page)).toHaveScreenshot(`modal-${featureTypeBaseline(type)}.png`)
    })
  }
})

// One form in dark: the weapon form has every kind of input the other forms use. The modal shell
// baselines show the rest modal in dark.
test.describe("Modals — desktop, dark", () => {
  test.use({ viewport: TALL })

  test("item-edit-weapon", async ({ page }) => {
    await openModal(page, byName("item-edit-weapon"), "dark")
    await expect(dialog(page)).toHaveScreenshot("modal-item-edit-weapon-dark.png")
  })
})

test.describe("Modals — phone", () => {
  test.use({ viewport: PHONE })

  // The modal shell baselines show rest-short at phone width
  for (const name of PHONE_MODALS.filter((n) => n !== "rest-short")) {
    test(name, async ({ page }) => {
      await openModal(page, byName(name))
      await expect(dialog(page)).toHaveScreenshot(`modal-${name}-phone.png`)
    })
  }

  // A phone can't fit the item form, so the modal scrolls: the baseline above shows the sticky footer
  // over the form's middle, and this one shows the form's end clearing it.
  test("item-edit-weapon scrolled to the footer", async ({ page }) => {
    await openModal(page, byName("item-edit-weapon"))
    await dialog(page).evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect(dialog(page)).toHaveScreenshot("modal-item-edit-weapon-phone-footer.png")
  })
})

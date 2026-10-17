import { test as base, expect, type BrowserContext, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import axe from "axe-core"

// axe's best-practice `region` check wants all content inside a landmark, and by default lets
// dialogs sit outside one. Tooltips and dropdown menus are rendered at the end of <body> for the
// same reason dialogs are (so nothing clips them), and reach assistive tech through their trigger
// (aria-describedby, aria-controls), not through landmark navigation. They are added to that same
// list; the rest is axe's default.
const REGION_EXEMPT = "dialog, [role=dialog], [role=alertdialog], svg, [role=tooltip], [role=menu]"

// Check options can only be set with axe.configure, which AxeBuilder does not expose, so the
// call is appended to the axe source the builder injects into the page.
const axeSource = `${axe.source}\n;axe.configure(${JSON.stringify({
  checks: [{ id: "region", options: { regionMatcher: REGION_EXEMPT } }],
})});`

/** The axe scan every E2E spec uses, so they all apply the same rules. */
export function axeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page, axeSource })
}

/**
 * Waits for running animations and transitions to end. A popup that is fading out is still in the
 * page with its colours part-way to transparent, which axe reads as a contrast failure that no
 * user ever sees. Animations that repeat forever (a loading pulse) are not waited for.
 */
export async function finishAnimations(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(
    document.getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})),
  ))
}

// TESTING.md §8 / CONSTITUTION.md §4: axe runs against every E2E scenario. Specs import `test`
// from here instead of from @playwright/test, and each test's final page state is then scanned
// once the test itself has passed. A spec whose tests already are axe scans turns the automatic
// one off with `test.use({ axeAfterEach: false })`.
// TESTING.md §5: no test may reach real Firebase. The app is pointed at the local emulators (see
// src/lib/firebase.ts); this catches it if that ever stops being true. Matched on the host: the Auth
// emulator's own URLs contain "identitytoolkit.googleapis.com" in their path, on host 127.0.0.1.
const FIREBASE_HOSTS = /(^|\.)(googleapis\.com|firebaseio\.com|firebaseapp\.com)$/

/**
 * Blocks every request from a browser context to real Firebase, returning the URLs it blocked.
 * Every test's own context is guarded automatically; a test that opens another context guards it
 * with this and checks the list is empty.
 */
export async function guardAgainstFirebase(context: BrowserContext): Promise<string[]> {
  const reached: string[] = []
  await context.route((url) => FIREBASE_HOSTS.test(url.hostname), (route) => {
    reached.push(route.request().url())
    return route.abort("blockedbyclient")
  })
  return reached
}

export const test = base.extend<{ axeAfterEach: boolean; axeScan: void; firebaseGuard: void }>({
  firebaseGuard: [
    async ({ context }, use) => {
      const reached = await guardAgainstFirebase(context)
      await use()
      expect(reached, "requests to real Firebase (the app should only talk to the emulators)").toEqual([])
    },
    { auto: true },
  ],
  axeAfterEach: [true, { option: true }],
  axeScan: [
    async ({ page, axeAfterEach }, use, testInfo) => {
      await use()
      // A test that already failed reports its own failure; scanning its half-finished page adds noise.
      if (!axeAfterEach || testInfo.status !== testInfo.expectedStatus) return
      await finishAnimations(page)
      const results = await axeBuilder(page).analyze()
      expect(results.violations, "accessibility violations in the state this scenario ends in").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

> **Document Authority**: This document is the authoritative testing standard for this repository. It supplements `CONSTITUTION.md` §7; where the two conflict, `CONSTITUTION.md` rules.
> **Last updated:** 2026-10-15

---

# TabulaPersonae Frontend Testing Guidelines

## 1. Scope

This document governs all tests in this repository: unit, integration, visual regression, and end-to-end (E2E). It covers tooling, test structure, mock data, selectors, coverage targets, and process requirements.

---

## 2. Testing Pyramid

| Layer | Tool | Responsibility | Location |
|---|---|---|---|
| **Unit** | Vitest | Pure functions, utilities, and domain logic | `src/tests/lib/` |
| **Integration** | Vitest + @solidjs/testing-library + axe-core | Component behavior with mocked dependencies; user interactions; WCAG 2.1 AA checks on rendered components | `src/tests/components/`, `src/tests/routes/` |
| **Visual** | Playwright | Cross-browser visual regression testing | `tests/` (project root) |
| **E2E** | Playwright + axe-playwright + Firebase Local Emulator Suite | Full user flows from the browser perspective against a running app, signed-in flows against local Firebase emulators (§5); WCAG 2.1 AA checks on all pages and scenarios | `tests/e2e/` |

Unit and integration tests are fast and cover the majority of cases. Visual regression tests verify cross-browser rendering fidelity. E2E tests are reserved for scenarios that genuinely require a full running app. `src/tests/` mirrors `src/` so the test file for any module is always predictable to find.

---

## 3. Test-First Development

- Every code change must be accompanied by tests.
- Bug fixes must include a regression test that fails before the fix and passes after.
- When refactoring, existing tests must pass; add tests if coverage gaps are discovered.
- Write tests before writing implementation code (TDD order of operations).

---

## 4. Coverage Targets

- **80%** overall coverage is the minimum target.
- **90%** is the minimum target for critical modules: auth, data layer, and core domain logic.
- Maintainers must decide whether thresholds block CI merges. If enforced in CI, the thresholds and enforcement location must be documented in the CI configuration.

---

## 5. Mock Data Rules

### General requirements

- All tests must use mock data by default. Real network calls to Firebase or any third-party host are not permitted in any test.
- Firebase and external dependencies must be mocked using `vi.mock()`. Shared mocks must be defined in `src/tests/setup.tsx` and reused across tests where applicable.
- Mock data must use the types exported from `src/lib/` and must closely reflect real data shapes, including timestamps, IDs, and nested structures, so that parsing and rendering logic is exercised accurately.
- Seeded test data may be used only when the environment variable `USE_SEED_DATA=true` is set. When enabled, tests may allow controlled connections to the seeded backend; any test that depends on seed data must document why in a comment.

### Factory pattern

- Mock objects must be produced by factory functions with the signature `makeX(overrides?: Partial<X>)` that return a fully-typed, production-resembling fixture. Prefer factories over large static data blobs.
- All mock objects must satisfy the TypeScript interfaces used in the application.
- Factories must include fixtures for edge cases: error paths, empty lists, partial or invalid data, and pagination boundaries.

### E2E against the Firebase Local Emulator Suite

The `vi.mock()` rule above applies to unit and integration tests. E2E tests run the real Firebase SDK against Google's Firebase Local Emulator Suite (Auth and Firestore, from the `firebase-tools` dev dependency), so signed-in flows and `firestore.rules` are exercised as in production while nothing reaches a real Firebase project.

- **Prerequisite:** a Java runtime, JDK 21 (`java -version`). The first run downloads the emulator binaries, so it needs an internet connection once.
- **Running:** `pnpm test:e2e` starts both servers itself: the emulators (`pnpm emulators`) and the e2e dev server (`pnpm dev:e2e`, port 5174, Vite mode `e2e`). Either can be started by hand for debugging; a running one is reused locally. The emulator UI is at `http://127.0.0.1:4000`.
- **Demo project only:** the emulators run under the `demo-tabulapersonae` project id. `src/lib/firebase.ts` connects to them only on the dev server with `VITE_FIREBASE_EMULATORS=true`, and refuses a project id without the `demo-` prefix, so real configuration can never be used by a test run. A production build cannot connect to an emulator.
- **Network guard:** every E2E test fails if its browser makes any request to a `googleapis.com`, `firebaseio.com` or `firebaseapp.com` host (`tests/e2e/test.ts`). A test that opens a second browser context guards it with `guardAgainstFirebase`.
- **Isolation:** all tests share one emulator and run in parallel, so nothing is cleared during a run (`tests/e2e/global-setup.ts` clears it once at the start). Each test works under its own users (`createUser`) and gives seeded characters ids no other test uses (`withUniqueId`), both in `tests/e2e/emulator.ts`.
- **Administrator access:** `seedDoc`, `seedCharacter` and `readDoc` use the emulator's `Bearer owner` token, which bypasses `firestore.rules`. It is for test setup and assertions only; the app under test always goes through the rules.
- **Seed once:** browser storage is seeded with `seedDevice`/`seedGuest` (`tests/e2e/helpers.ts`), which write only on the first page load. A plain `addInitScript` runs again on every reload, which would undo the changes a test is checking were saved, and re-seed after a sign-out.
- **Waiting:** pages are waited for by their content, never by `networkidle` — signed in, Firestore keeps a connection open, so the network never goes idle.

### E2E test tags

- **`@mobile`** in a test's title runs it in the `mobile` project as well (a Pixel 7 profile: phone-sized, touch). Tag the core flows a player uses at the table.
- **`@perf`** marks a timing test with a budget (`tests/e2e/performance.spec.ts`). Timing tests run in the `chromium` project only.

### Keeping mocks current

When data shapes in `src/lib/` change, apply the following steps in the same changeset:

1. Update the relevant type in `src/lib/`.
2. Add or modify the factory or fixture in the test that uses it.
3. Update any shared mocks in `src/tests/setup.tsx`.
4. Run `pnpm test` and confirm all affected tests pass locally.

---

## 6. Test Selectors

- Tests must use `data-test` attributes as selectors when targeting specific UI elements.
- Tests must not rely on CSS class names, element IDs, or DOM structure as selectors.
- `data-test` values must be descriptive, unique within the page, and must be stripped from production builds.

This decouples test selectors from styling and layout decisions: a component can be restyled or restructured without breaking tests, provided `data-test` values are preserved.

---

## 7. Test Content Requirements

- Tests must assert observable behavior and side effects, not internal implementation details.
- Prefer extending or parametrizing existing tests over adding new tests that duplicate existing coverage. Add new tests only for distinct scenarios, clearer separation, or substantially improved coverage or readability.
- Tests must clean up side effects — timers, `localStorage`, global state — after each test to prevent cross-test pollution.
- Time-dependent tests must use fake timers and assert clock-driven behavior explicitly.

---

## 8. Accessibility in Tests

- axe-core must run as part of the Vitest integration test suite for every rendered UI component.
- axe-playwright must run against every Playwright E2E scenario. Visual regression tests must also include axe-playwright checks where applicable.
- Both must enforce WCAG 2.1 AA compliance. A test suite is not complete if axe checks are absent from any integration test that renders UI or any E2E scenario.

---

## 9. Visual Regression Coverage

- Every modal, and every state of a modal whose layout differs (add, edit, each form variant), must have a visual baseline.
- Every popup rendered above the page — menu, select or combobox list, popover, tooltip — must have a baseline in its open state.
- Every module with an edit mode must have a baseline in view mode and in edit mode.
- Shared overlay components must have a baseline in both themes and at phone width (390px).
- A baseline must capture the state a change would affect: a popup that opens inside a modal is captured open, inside that modal.
- A new modal, popup, or edit mode is not done until its baseline exists.

---

## 10. Flaky Test Policy

- Flaky tests must be labelled (e.g. a `flaky-test` GitHub label) and have an issue opened with reproduction steps.
- Flaky tests must be quarantined (skipped with a documented reference to the tracking issue) until the underlying cause is fixed.
- Silently skipping a flaky test is not permitted.

---

## 11. Test Skipping Policy

- Skipping any test requires explicit human approval.
- A skipped test must include a comment referencing the approval (e.g. issue number or PR).

---

## 12. Definition of Done

**A single test is done when:**
- TypeScript compilation passes with no errors.
- The linter passes with no errors or warnings.
- The test itself passes.

**A test suite is done when:**
- All tests in the suite pass.
- No tests are skipped without documented human approval.
- All UI components touched by the suite have at least one integration test.
- axe checks are present and passing for every rendered UI component and every E2E/visual scenario.
- Every modal, popup, and edit mode the suite touches has a visual baseline (§9).

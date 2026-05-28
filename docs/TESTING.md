> **Document Authority**: This document is the authoritative testing standard for this repository. It supplements `CONSTITUTION.md` §7; where the two conflict, `CONSTITUTION.md` rules.
> **Last updated:** 2026-05-28

---

# TabulaPersonae Frontend Testing Guidelines

## 1. Scope

This document governs all tests in this repository: unit, integration, and visual regression. It covers tooling, test structure, mock data, selectors, coverage targets, and process requirements.

---

## 2. Testing Pyramid

| Layer | Tool | Responsibility | Location |
|---|---|---|---|
| **Unit** | Vitest | Pure functions, utilities, and domain logic | `src/tests/lib/` |
| **Integration** | Vitest + @solidjs/testing-library + axe-core | Component behavior with mocked dependencies; user interactions; WCAG 2.1 AA checks on rendered components | `src/tests/components/`, `src/tests/routes/` |
| **Visual** | Playwright | Cross-browser visual regression testing | `tests/` (project root) |
| **E2E** | Playwright + axe-playwright | Full user flows from the browser perspective against a running app; WCAG 2.1 AA checks on all pages and scenarios *(planned)* | `tests/e2e/` |

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

## 9. Flaky Test Policy

- Flaky tests must be labelled (e.g. a `flaky-test` GitHub label) and have an issue opened with reproduction steps.
- Flaky tests must be quarantined (skipped with a documented reference to the tracking issue) until the underlying cause is fixed.
- Silently skipping a flaky test is not permitted.

---

## 10. Test Skipping Policy

- Skipping any test requires explicit human approval.
- A skipped test must include a comment referencing the approval (e.g. issue number or PR).

---

## 11. Definition of Done

**A single test is done when:**
- TypeScript compilation passes with no errors.
- The linter passes with no errors or warnings.
- The test itself passes.

**A test suite is done when:**
- All tests in the suite pass.
- No tests are skipped without documented human approval.
- All UI components touched by the suite have at least one integration test.
- axe checks are present and passing for every rendered UI component and every E2E/visual scenario.

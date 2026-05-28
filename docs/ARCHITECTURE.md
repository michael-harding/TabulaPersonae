# TabulaPersonae Frontend Architecture

This document records the architectural decisions and rationale that underpin the rules in `CONSTITUTION.md`. Where the Constitution states what is required, this document explains why. In any conflict between the two, the Constitution rules.

---

## 1. Directory Structure

```
.
├── docs/
│   ├── CONSTITUTION.md          # Rules and requirements
│   └── ARCHITECTURE.md          # This document — decisions and rationale
├── src/
│   ├── lib/                     # src/lib — Firebase, auth, storage, types, and shared utilities
│   │   ├── firebase.ts          # Firebase app initialization
│   │   ├── firebase-storage.ts  # Firebase Firestore operations
│   │   ├── auth-context.tsx     # Firebase Auth context and provider
│   │   ├── storage-manager.ts   # Local/cloud storage abstraction
│   │   ├── character-types.ts   # Shared TypeScript types (character data contract)
│   │   └── ...                  # Other utilities and helpers
│   ├── components/              # Shared, reusable UI components
│   │   └── ui/                  # Primitive UI components built on Kobalte
│   ├── hooks/                   # Shared SolidJS reactive primitives
│   ├── routes/                  # Route-level page components
│   ├── tests/                   # All tests; mirrors src/ module structure
│   │   ├── components/          # Component integration tests
│   │   │   └── ui/              # UI primitive tests
│   │   ├── lib/                 # Library/utility unit tests
│   │   ├── routes/              # Route integration tests
│   │   ├── setup.tsx            # Vitest global setup; shared mocks
│   │   └── test-utils.tsx       # Shared test utilities
│   ├── App.tsx                  # Root component
│   └── index.tsx                # Entry point
└── public/                      # Static assets
```

The `src/lib/` directory centralizes all network and storage abstractions alongside shared types and utilities. Centralizing network calls in one directory gives a single location to audit transport concerns (credentials, error handling) and makes it straightforward to mock all external dependencies in tests.

`src/components/ui/` houses Kobalte-based primitive components that are wrapped and styled before use in the app. This separation keeps the UI primitive layer independent from application logic and provides a consistent internal API over Kobalte's base components.

Tests are co-located under `src/tests/` and mirror the `src/` module structure so the test for any module is always predictable to find. The `src/tests/setup.tsx` file centralizes shared mocks so they are reused across integration tests rather than duplicated.

---

## 2. Component Model

Components are written as function components in TypeScript (`.tsx`). SolidJS compiles JSX to direct DOM operations; there is no runtime component class hierarchy or lifecycle method system. Each component file exports one primary component as its default export to make tree-shaking straightforward and imports unambiguous.

The `data-test` attribute on interactive and testable DOM nodes provides a stable selector for automated tests; its value is descriptive, unique within the page, and independent of CSS class names and DOM structure. `data-test` is stripped from production builds.

The `data-sem` attribute on the top-level DOM node of every component provides a human-readable, coarse-grained label for debugging and semantic labelling. Its value need not be unique across the document — multiple instances of the same component carry the same value. `data-sem` is stripped from production builds.

Business logic belongs in utilities or hooks, not in components. Components are responsible for rendering and event wiring; they delegate computation and data transformation to `src/lib/` or `hooks/`. This keeps components small, readable, and independently testable.

---

## 3. State Management

| Primitive                      | When to use                                              | Rationale                                                                                 |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `createSignal`                 | Local, per-component reactive state                      | Minimal overhead; scoped to the component that owns it                                    |
| `createStore`                  | Complex or nested reactive state within a single feature | Provides fine-grained updates on nested paths without replacing the whole object          |
| `createContext` + `useContext` | State shared across a feature subtree                    | Avoids prop drilling without introducing a global store                                   |
| `createResource`               | Async data fetching                                      | Binds async operations to the reactive graph; integrates with Suspense for loading states |

External state management libraries are not used because SolidJS's built-in primitives cover all required patterns. Adding a library would introduce a second reactivity model alongside SolidJS's own, creating the potential for subtle interaction bugs and increasing bundle size.

Shared reactive primitives in `hooks/` follow a `useX` naming convention (e.g., `useToast`, `useStorageManager`). This mirrors the broader SolidJS ecosystem convention and distinguishes composable hooks from raw SolidJS primitives such as `createSignal` and `createStore`.

Context definitions and their providers live in `src/lib/` alongside the abstractions they expose. `hooks/` contains composable reactive primitives — `useX` functions that return signals or derived values and can be called anywhere in the reactive graph.

---

## 4. Data Flow

```
Network abstractions (src/lib/)
      │
      │  network boundary
      │
      ▼
createResource (in feature hooks or components)
      │
      │  reactive signal / store
      │
      ▼
Feature Components
      │
      │  props / context
      │
      ▼
Shared UI Components
```

Data flows top-down through props and context. Context providers sit above the components that consume them in the tree: feature-scoped providers wrap their subtree, while cross-feature providers are placed in `App.tsx` where they are accessible to all features. This positioning means context follows the same top-down direction as props — it is not a back-channel for upward or sideways communication. Features do not reach into each other's internal state; cross-feature communication goes through shared context or state lifted to `App.tsx`. This constraint keeps coupling explicit and makes the data flow traceable.

Mutations call the relevant network abstraction and invalidate or refetch the relevant `createResource`. This keeps the reactive graph consistent with the server state without requiring a separate client-side cache layer.

---

## 5. Network Layer

All network activity is confined to `src/lib/`. No component, hook, or utility outside this directory may make network requests — whether through bare `fetch`, the Firebase SDK, or any other mechanism. Centralizing network calls in one directory gives a single location to audit transport concerns (credentials, error handling, retry logic) and makes it straightforward to mock all outbound requests in tests. HTML and CSS loading from CDNs is exempt because those requests are managed by the browser or the build tool, not by application code.

Each service or API integration must be encapsulated in its own dedicated module within `src/lib/`. The interface each module exposes to the rest of the application must be fully typed, and all network activity must originate exclusively from within this directory.

The types each network module exports are the canonical representation of that service's data contract within the frontend. Redefining or duplicating those types elsewhere would create multiple sources of truth and allow them to drift.

---

## 6. Authentication

Authentication is handled by Firebase Auth. From the frontend's perspective:

- Firebase manages authentication state and tokens internally. The frontend reads auth state through the reactive `AuthProvider` in `src/lib/auth-context.tsx`.
- Character data stored in `localStorage` during unauthenticated use is migrated to Firebase Firestore when a user signs in, then cleared from local storage to avoid duplication.
- The app supports a "skip auth" mode (persisted as `dnd-skip-auth` in `localStorage`) for offline or guest usage without a Firebase account.
- Token refresh and session management are handled entirely by the Firebase SDK; the frontend does not store or manage tokens directly.

---

## 7. Testing Strategy

### Rationale for the testing pyramid

Unit tests cover pure functions and utility logic. They require no DOM or network. Integration tests cover component behavior with mocked dependencies and run axe-core for component-level accessibility checks. Visual regression tests cover cross-browser rendering in a real browser. E2E tests will cover full user flows against a running app and run axe-playwright for page-level accessibility checks.

The split ensures that most tests are fast (unit and integration), while the slower browser-based tests cover rendering fidelity, full user flows, and page-level accessibility.

### Mock data

All tests use mock data by default. Real network calls to Firebase introduce non-determinism (the service may be unavailable, data may change, timing may vary). Tests mock Firebase and other external dependencies via `vi.mock()`. The global setup in `src/tests/setup.tsx` provides shared, stable mocks that are reused across all integration tests.

Mock data uses the types exported from `src/lib/` to ensure that mocks stay aligned with the real service contracts as those contracts evolve.

### Test selectors

Tests use `data-test` attributes as selectors when targeting specific UI elements, rather than CSS class names, element IDs, or DOM structure. This decouples test selectors from styling and layout decisions: a component can be restyled or restructured without breaking tests, as long as `data-test` values are preserved. Selector stability is a precondition for reliable automated test suites.

---

## 8. Accessibility

WCAG 2.1 AA is the target conformance level. The decision to enforce this at the component level (axe-core in integration tests) and the page level (axe-playwright in visual regression tests) reflects that different classes of accessibility violation are only detectable at different levels of composition.

Kobalte is used for interactive component primitives because it provides ARIA-correct implementations of common patterns (dialogs, dropdowns, tabs, comboboxes). Wrapping Kobalte components in `src/components/ui/` provides a stable internal API and a single place to enforce project-specific accessibility conventions on top of the Kobalte base.

Semantic HTML, keyboard navigability, focus management, and the prohibition on using color as the sole conveyor of information are architectural commitments rather than style preferences. They are enforced through axe-core/axe-playwright in the test suite so that violations are caught automatically rather than relying on manual review.

---

## 9. Security

The Content Security Policy is enforced at the server or CDN layer, not by the frontend. The frontend's responsibility is to not require `unsafe-inline` or `unsafe-eval` patterns. SolidJS's reactive primitives escape dynamic content by default, which prevents accidental HTML injection. Direct DOM manipulation via `innerHTML` or equivalent is prohibited because it bypasses this escaping.

Authentication state management is handled by the Firebase SDK. The frontend reads auth state through the reactive `AuthProvider` and never stores or manages tokens directly.

UI input validation is additive to server-side validation. The server is the authority on what data is valid; UI validation provides user feedback and reduces unnecessary round-trips, but it is not a security boundary.

Frontend dependencies are audited with `pnpm audit` before each release. Third-party packages are a supply chain attack surface; auditing identifies known vulnerabilities in the dependency tree before they reach production.

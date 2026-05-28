> **Document Authority**: This is the authoritative standard for all work in this repository. See §1 for scope and applicability.
> **Template Version:** 1.0.2
> **Last updated:** 2026-05-28

---

# TabulaPersonae Frontend Constitution

## 1. Document Authority & Scope

This document is the authoritative standard for all work in this repository. It governs every contributor and agent working on this codebase.

**Companion document**: `docs/ARCHITECTURE.md` records the architectural decisions and rationale that underpin the rules in this document. Where this document states what is required, the architecture document explains why. In any conflict between the two, this document rules.

The **Last updated** date in the document header must be updated with each amendment.

---

## 2. Scope

This document covers the frontend codebase in this repository.

**In scope:**
- All source code, tests, assets, configuration, and tooling in this repository
- `src/lib/` — the directory containing all network abstractions, storage, shared types, and utilities
- All SolidJS components, utilities, styles, and state management
- Frontend-specific testing, accessibility, and security standards

**Out of scope:**
- System architecture and cross-service design — see `ARCHITECTURE.md`
- Deployment, infrastructure, and CI/CD pipeline — see `ARCHITECTURE.md`
- Backend server code in other repositories or services — agents and contributors must not modify it
- API endpoint design and data model definitions — see `ARCHITECTURE.md`
- Versioning, release policy, and contribution workflow — see project-level documents

---

## 3. Guiding Principles

1. **Use SolidJS primitives first.** Signals, stores, `createResource`, and `createContext` are the sanctioned tools for state and data flow. External state libraries must not be introduced without a constitution amendment.

2. **One abstraction per concern.** All network calls must go through abstraction modules in `src/lib/`. Each service or API integration must have its own dedicated module within that directory. Network calls must not appear in components, hooks, utilities, or any code outside `src/lib/`. HTML and CSS loading from CDNs are not subject to this requirement.

3. **No orphaned code.** When a feature or behavior is changed or removed, all related code, types, imports, tests, and assets must be removed in the same changeset.

4. **Accessible by default.** WCAG 2.1 AA compliance is a baseline requirement, not an afterthought. Accessibility tooling must run on every component.

5. **No secrets in the repository.** No credentials, API keys, or sensitive values may appear anywhere in this repository — in source code, configuration, or committed environment files.

6. **Mock data in tests by default.** Tests must use mock data by default and must not depend on live backend state. Seeded or live-backend testing may be permitted only in explicit, documented cases (for example when `USE_SEED_DATA=true`) and requires prior human approval; any exception must be clearly documented in the test and the PR.

7. **Composable over duplicated.** Prefer shared components and utilities over copy-pasted code. Extract reusable logic into `src/lib/` or `hooks/`. Do not abstract prematurely.

8. **Rules, not suggestions.** Every standard in this document is a requirement. Use `must`, `must not`, `may`, and `may not` to express intent; avoid `should` or `consider`.

---

## 4. Frontend Tech Stack & Rationale

| Technology | Role | Constraints on use |
|---|---|---|
| **SolidJS** | UI framework | Must use SolidJS built-in primitives for state and reactivity; no external state library permitted |
| **pnpm** | Package manager | All dependency installation and script execution must use pnpm; npm and yarn must not be used; `only-allow pnpm` must be set as the `preinstall` script in `package.json` to enforce this at install time |
| **Vite** | Build tool & dev server | Configuration changes must not affect the backend or server build |
| **TypeScript** | Language | Strict mode must be enabled; `any` and `unknown` require justifying inline comments; `ts-ignore` requires an inline comment explaining why it is the best option |
| **Tailwind CSS** | Styling | Utility-first; prefer Tailwind utilities over custom CSS; use `class-variance-authority` for component variants and `tailwind-merge` for conditional class merging |
| **Vitest** | Unit & integration testing | All unit and integration tests must use Vitest |
| **Playwright** | Visual regression testing | All visual regression tests must use Playwright |
| **axe-core** | Component-level accessibility testing | Must run as part of the Vitest integration test suite against all rendered UI components |
| **axe-playwright** | Page-level accessibility testing | Must run as part of every Playwright scenario |
| **Firebase** | Authentication and cloud data persistence | Firebase Auth must be accessed through `src/lib/auth-context.tsx`; Firestore operations must go through `src/lib/firebase-storage.ts`; no direct Firebase SDK calls outside `src/lib/` |
| **Kobalte** | Accessible UI component primitives | Must be used for interactive widgets (dialogs, dropdowns, tabs, etc.); base Kobalte components must be wrapped in `src/components/ui/` before use in the app |
| **@solidjs/router** | Client-side routing | Route components live in `src/routes/`; navigation must use `useNavigate()` and `<A>` from `@solidjs/router` |

Backend and infrastructure technologies are out of scope for this document. See `ARCHITECTURE.md`.

---

## 5. Frontend Architecture

### Directory Structure

```
.
├── docs/
│   ├── CONSTITUTION.md          # This document — rules and requirements
│   ├── ARCHITECTURE.md          # Architectural decisions and rationale
│   ├── TESTING.md               # Testing standard
│   └── ACCESSIBILITY.md         # Accessibility standard
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
│   │   └── test-utils.tsx       # Shared test utilities and helpers
│   ├── App.tsx                  # Root component
│   ├── globals.css              # Global Tailwind CSS styles
│   └── index.tsx                # Entry point
└── public/                      # Static assets
```

### Component Model

- Components are function components written in TypeScript (`.tsx`).
- Component filenames use kebab-case and must match the exported component name.
- Each component file must export one primary component as its default export. Additional named exports for sub-components and types are permitted.
- Interactive and testable DOM nodes must include a `data-test` attribute whose value is descriptive and unique within the page; `data-test` is used by automated tests as a stable selector and must be stripped from production builds.
- Every new UI component must include a `data-sem` attribute on its top-level DOM node. The value must be kebab-case and human-readable; it need not be unique across the document. `data-sem` must be stripped from production builds.
- Components must not contain business logic that belongs in a utility or hook. Shared logic must be extracted to `src/lib/` or `hooks/`.

### State Management

| Primitive | When to use |
|---|---|
| `createSignal` | Local, per-component reactive state |
| `createStore` | Complex or nested reactive state within a single feature |
| `createContext` + `useContext` | State shared across a feature subtree without prop drilling |
| `createResource` | Async data fetching bound to the SolidJS reactive graph |

External state management libraries must not be used.

### Data Flow

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

- Data flows top-down through props and context.
- Mutations call the relevant network abstraction and invalidate or refetch the relevant `createResource`.
- No component may reach into another feature's internal state directly. Cross-feature communication goes through shared context or lifted state in `App.tsx`.

---

## 6. Code Quality Rules

1. TypeScript strict mode must be enabled. The build must not pass with TypeScript errors.
2. `any` types require an inline comment justifying their use.
3. `unknown` types require an inline comment justifying their use.
4. `ts-ignore` requires an inline comment explaining why it is the best option and why type-safe alternatives were insufficient.
5. `eslint-disable` and equivalent linting suppression directives require a brief inline description and explicit human-developer permission.
6. New APIs and components must have explicit type annotations.
7. Both `null` and `undefined` are undesirable and must be avoided where possible. When a nullable value cannot be avoided, `null` is preferred over `undefined`: `null` is an explicit object value that cannot arise unintentionally, which signals that the absence was deliberate. The intent behind any use of `null` or `undefined` must be justified with an inline comment.
8. Interactive and testable DOM nodes must include a `data-test` attribute whose value is descriptive and unique within the page; `data-test` is used by automated tests as a stable selector and must be stripped from production builds.
9. All new UI components must include a `data-sem` attribute on the top-level DOM node. The value must be kebab-case and human-readable; it need not be unique across the document. `data-sem` must be stripped from production builds.
10. Types representing external data contracts must be defined in and exported from `src/lib/`. They must not be redefined or duplicated elsewhere; import and use them directly.
11. Bare `fetch` must never be called outside `src/lib/`. All network calls — including those made through third-party SDKs — must go through abstraction modules in `src/lib/`. Each service or API integration must have its own dedicated module; network calls must not appear in components, hooks, utilities, or any code outside `src/lib/`.
12. Code must be written with reuse in mind. Prefer composable components, shared utilities, and abstractions that eliminate duplication. Do not over-engineer for hypothetical future requirements.
13. When a feature or behavior is removed or changed, all orphaned code, types, imports, tests, and assets must be removed in the same PR.
14. `console.log` and debug output must not be committed to source.
15. Errors must be surfaced in the UI and logged with `console.error`. The `console.error` call must include as complete an error message as practicable — the full error object, relevant context, and any available stack trace. UI error messages may be brief and user-friendly; the console is the authoritative record of the full error detail.
16. Use descriptive variable and function names; avoid abbreviations except common ones (`id`, `url`).
17. Use comments sparingly; prefer self-documenting code.
18. Imports must be ordered: external packages first, then internal absolute imports, then relative imports. Each group must be separated by a blank line.
19. `tsconfig.json` path aliases must be used for internal imports. Prefer the `@/` alias (e.g. `@/lib/utils`, `@/components/ui/button`) over deep relative paths; avoid relative paths that cross directory boundaries.
20. Lazy-load routes and heavy components where appropriate (SolidJS: via `lazy()`).
21. Shared reactive primitives in `hooks/` must be named with a `useX` prefix (e.g., `useToast`, `useStorageManager`). This convention mirrors the broader SolidJS ecosystem and distinguishes composable hooks from raw SolidJS primitives.

---

## 7. Testing Policy

**Detailed testing standard**: `docs/TESTING.md` is the authoritative testing standard for this repository. It supplements this section; where the two conflict, this document rules.

### Testing Pyramid

| Layer | Tool | Responsibility |
|---|---|---|
| **Unit** | Vitest | Pure functions, utilities, and domain logic; lives in `src/tests/lib/` |
| **Integration** | Vitest + @solidjs/testing-library + axe-core | Component behavior with mocked dependencies; user interactions; WCAG 2.1 AA checks on rendered components; lives in `src/tests/components/` and `src/tests/routes/` |
| **Visual** | Playwright | Cross-browser visual regression testing; lives in `tests/` at the project root |
| **E2E** | Playwright + axe-playwright | Full user flows from the browser perspective against a running app; WCAG 2.1 AA checks on all pages and scenarios; lives in `tests/e2e/` *(planned)* |

### Mock Data Rules

- All tests must use mock data by default. Real network calls to Firebase or any third-party host are not permitted in any test.
- Tests must mock Firebase and external dependencies using `vi.mock()`. Shared mocks must be defined in `src/tests/setup.tsx` and reused across tests where applicable.
- Mock data must use the types exported from `src/lib/` and must closely reflect real data shapes.
- Seeded test data may be used only when the environment variable `USE_SEED_DATA=true` is set. When enabled, tests may allow controlled connections to the seeded backend; any test that depends on seed data must document why in a comment.

### Test Selectors

- Tests must use `data-test` attributes as selectors when targeting specific UI elements. Tests must not rely on CSS class names, element IDs, or DOM structure as selectors.

### Definition of Done

**A single test is done when:**
- TypeScript compilation passes with no errors.
- The linter passes with no errors or warnings.
- The test itself passes.

**A test suite is done when:**
- All tests in the suite pass.
- No tests are skipped without documented human approval.
- All UI components touched by the suite have at least one integration test.

**A PR is ready to merge when:**
- All of the above are satisfied.
- `CHANGELOG.md` has been updated with a summary of every user-visible or API-visible change in the PR.

---

## 8. AI Agent Policy

Agent permissions, prohibited actions, escalation protocol, and violation handling are defined in `AGENTS.md`. That document is the single source of truth for agent rules in this repository.

---

## 9. Accessibility Standards

**Detailed accessibility standard**: `docs/ACCESSIBILITY.md` is the authoritative accessibility standard for this repository. It supplements this section; where the two conflict, this document rules.

- Target conformance level: **WCAG 2.1 AA**.
- axe-core must run as part of the Vitest integration test suite for component-level checks.
- axe-playwright must run against all Playwright scenarios.
- All interactive elements must be reachable and operable via keyboard alone.
- Focus must be managed explicitly on route transitions, modal open/close, and any dynamic content insertion.
- All images must have meaningful `alt` text. Decorative images must use `alt=""`.
- Semantic HTML elements must be used where they exist (`<button>`, `<nav>`, `<main>`, `<article>`, etc.). Generic elements (`<div>`, `<span>`) must not be used where a semantic equivalent is available.
- ARIA attributes must only be used when native HTML semantics are insufficient. ARIA must not be used to override or misrepresent native semantics.
- Color must not be the sole means of conveying information. Status indicators must use iconography or text labels in addition to color.
- Interactive elements must have a minimum touch target size of 44×44 CSS pixels.

---

## 10. Frontend Security Standards

1. No secrets, API keys, credentials, or sensitive configuration values may appear anywhere in this repository — in source code, configuration, or any environment file committed to source control.
2. `innerHTML` and any equivalent direct HTML injection must not be used. All dynamic content must be rendered through SolidJS's reactive primitives, which escape output by default.
3. Any escape-hatch equivalent to `dangerouslySetInnerHTML` must not be used without an explicit security review documented in a code comment.
4. All user input must be validated at the UI boundary before submission. UI validation is additive to server-side validation, not a replacement for it.
5. The Content Security Policy is enforced at the server or CDN layer. Frontend code must not assume the absence of a CSP, and must not use patterns that require `unsafe-inline` or `unsafe-eval`.
6. Frontend dependencies must be audited manually via `pnpm audit` before each release.

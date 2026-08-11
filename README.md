# TabulaPersonae

A D&D 5e/5.5e character sheet web app built with SolidJS and Firebase.

## Features

- **Character management** — create, edit, and switch between multiple characters
- **Full 5e sheet** — ability scores, combat stats, skills, spells, equipment/inventory (including magic items with rarity, attunement, and modifiers), actions, features, and notes
- **Feature-driven grants** — class features, species traits, backgrounds, and feats can grant spellcasting ability, hit dice/hit points, saving throw/skill/other proficiencies, size, movement speeds, senses, resistances/immunities, languages, carrying capacity, ability score bonuses, and Max HP bonuses, with level-tiered effects and tooltips naming each contributing feature
- **Customizable tabs** — arrange sheet content into user-defined tabs, each with its own set of drag-and-drop-ordered modules
- **Calculated stats with manual override** — initiative, proficiency bonus, armor class, size, movement speed, Max HP, passive perception/insight/investigation, spell save DC, and spell attack/modifier are auto-derived from character data, each with a per-field toggle for a manual value
- **Short & long rest** — track HP, hit dice, spell slot recovery, and equipment recharge (e.g. wands, charged items)
- **Markdown notes** — character notes, description fields, and action/spell descriptions render as sanitized Markdown
- **Public character sharing** — generate a read-only `/share/:id` link and QR code that works without an account
- **Import / Export** — JSON round-trip and PDF character sheet import (D&D Beyond–style PDFs), with reconciliation for conflicting or partial imports
- **Authentication** — Firebase Auth with optional guest/skip mode
- **Cloud sync** — Firestore-backed storage when signed in, localStorage fallback when offline or unauthenticated
- **Installable / offline-ready** — PWA with service worker caching
- **Dark mode** — system-aware theme toggle
- **Accessibility** — WCAG 2.1 AA target, enforced with axe-core in component tests and axe-playwright in E2E tests
- **Automated testing** — Vitest unit/integration tests, Playwright E2E and visual regression tests (Chromium + Firefox), and Vitest benchmarks

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | [SolidJS](https://solidjs.com) |
| Routing | @solidjs/router |
| Components | [Kobalte](https://kobalte.dev) |
| Styling | Tailwind CSS + tw-animate-css |
| Drag and drop | @thisbeyond/solid-dnd |
| Markdown | marked + DOMPurify |
| QR codes | qrcode |
| Backend | Firebase (Auth + Firestore) |
| PDF parsing | pdfjs-dist + pdf-lib |
| PWA | vite-plugin-pwa |
| Unit/integration tests | Vitest + @solidjs/testing-library |
| E2E & visual tests | Playwright + axe-core |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install

```bash
pnpm install
```

### Configure Firebase

Copy the example env file and fill in your Firebase project credentials:

```bash
cp env.example .env.local
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Run

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type check |
| `pnpm test` | Run unit/integration tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:bench` | Run Vitest benchmarks |
| `pnpm test:e2e` | Run Playwright E2E tests (functional + accessibility + performance) |
| `pnpm test:visual` | Run Playwright visual regression tests |
| `pnpm test:visual:update` | Update Playwright visual snapshots |
| `pnpm test:visual:chromium` | Visual tests, Chromium only |
| `pnpm test:visual:firefox` | Visual tests, Firefox only |
| `pnpm test:perf` | Run performance E2E tests only |

## License

[AGPL-3.0-or-later](LICENSE)

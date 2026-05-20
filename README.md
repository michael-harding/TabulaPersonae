# TabulaPersonae

A D&D 5e/5.5e character sheet web app built with SolidJS and Firebase.

## Features

- **Character management** — create, edit, and switch between multiple characters
- **Full 5e sheet** — ability scores, combat stats, skills, spells, equipment, actions, features, and notes
- **Short & long rest** — track HP, hit dice, and spell slot recovery
- **Import / Export** — JSON round-trip and PDF character sheet import (D&D Beyond–style PDFs)
- **Authentication** — Firebase Auth with optional guest/skip mode
- **Cloud sync** — Firestore-backed storage when signed in, localStorage fallback
- **Dark mode** — system-aware theme toggle
- **Visual regression tests** — Playwright snapshots across Chromium, Firefox, and WebKit

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | [SolidJS](https://solidjs.com) |
| Routing | @solidjs/router |
| Components | [Kobalte](https://kobalte.dev) |
| Styling | Tailwind CSS + tw-animate-css |
| Backend | Firebase (Auth + Firestore) |
| PDF parsing | pdfjs-dist + pdf-lib |
| Unit tests | Vitest + @solidjs/testing-library |
| Visual tests | Playwright |

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
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:visual` | Run Playwright visual tests |
| `pnpm test:visual:update` | Update Playwright snapshots |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type check |

## License

[AGPL-3.0-or-later](LICENSE)

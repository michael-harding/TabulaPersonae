# Changelog

All notable changes to TabulaPersonae will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-07-24

### Added
- **Markdown rendering** — character notes, description fields (appearance, personality, ideals, bonds, flaws, backstory, allies, treasure), and action/spell descriptions now render as sanitized Markdown (`marked` + `dompurify`) instead of plain pre-wrapped text
- **Calculated stats with manual override** — initiative, proficiency bonus, armor class, passive perception, passive insight, passive investigation, spell save DC, spell attack bonus, and spell modifier are now auto-derived from character data, each with a per-field toggle to switch to a manual/custom value; new `CalculatedValue` component and `useCalculatedValue` hook back this behavior
- **Hover tooltips** explaining how each calculated stat is derived, shown on ability scores, combat stats, and skills/proficiencies
- **Temporary max HP** — hit points now support a `temporaryMaximum` bonus; rest logic uses a new `getEffectiveMaxHp` helper so healing and long rest correctly cap at the boosted maximum
- Optional badge label on `ActionCard` — spell cards now derive their badge (Cantrip, 1st, 2nd, ...) from spell level automatically instead of requiring a passed-in label

### Changed
- Renamed all sheet section components to "module" terminology (`ActionsSection` → `ActionsModule`, `EditableSection` → `EditableModule`, `CombatStats` → `CombatStatsModule`, etc.) to align naming with the module registry introduced in 1.2.0; no functional/UI changes from the rename itself
- `Tooltip` component gained `triggerClass` and `triggerFocusable` props to support keyboard-accessible tooltip triggers on calculated stat values

## [1.3.0] - 2026-07-21

### Added
- **Public character sharing** — owners can toggle "Share publicly" in Sheet Settings to generate a shareable `/share/:id` URL and QR code; the link works without an account
- **Read-only mode** — a `ReadOnlyContext` propagated through every sheet component suppresses all edit controls, save buttons, and settings panels when a character is viewed publicly; a "Read-only" badge appears in the public header
- **`/share/:id` route** — `PublicCharacterSheet` page loads character data, respects the `?tab=<id>` query parameter for deep-linking to a specific tab, and updates the browser title to the character name
- **Offline support for public shares** — `getPublicCharacterFromFirebase` falls back to `getDocFromCache` when the device has no network
- **QR code generation** — share panel generates a QR code image for the share URL via the `qrcode` library
- New `isPublic` field on the `Character` type
- Updated Firestore rules: unauthenticated `get` is now allowed on characters where `isPublic == true`; `list` remains auth-gated
- Unit tests for all components updated to exercise read-only rendering paths
- Visual regression snapshots for the public share page across Chromium and Firefox in light/dark themes and all tabs (default, character, combat, features, inventory, spells)

## [1.2.0] - 2026-07-20

### Added
- **Tab Settings page** — CRUD UI for creating, renaming, reordering, and deleting character sheet tabs; accessible via the gear icon on the character sheet
- **Dynamic tab system** — character sheet tabs are now user-configurable; each tab holds a custom selection of content modules (Actions, Combat Stats, Spells, etc.)
- **Module registry** — central `MODULE_REGISTRY` maps all 10 sheet modules to labels, descriptions, and render functions; tabs reference modules by stable ID
- **Drag-and-drop module ordering** — modules within a tab can be reordered via drag handles using `@thisbeyond/solid-dnd`
- **Tab config persistence** — tab layout saved to Firestore (`userSettings/{userId}`) for signed-in users; localStorage fallback for guests; offline reads use Firestore cache
- **Tab config validation** — runtime schema guard (`isValidTabConfig`) rejects corrupt or outdated Firestore data before it can affect the UI
- New Firestore security rules for the `userSettings` collection (owner-only read/write)
- Integration and unit tests for `TabConfigProvider`, `TabSettings` page, and Firebase persistence helpers
- Visual regression snapshots for the Tab Settings page in light and dark themes (Chromium + Firefox)

## [1.1.0] - 2026-07-19

### Added
- End-to-end test suite (Playwright) covering tab navigation, HP quick-adjust, death saves, conditions, and axe-core accessibility checks across all tabs
- Performance tests for character load and interaction timing
- Vitest benchmarks for `character-utils` functions
- `NumericInput` now commits the in-progress value on Enter key press

### Changed
- Action and feature use counters now display **remaining** uses instead of uses spent; the label has been updated from "Current Uses" to "Uses Spent" in the edit dialog to reflect the stored value
- HP display logic extracted from `CombatStats` into a dedicated `useHpDisplay` hook
- `createMemo` adopted throughout `ActionsSection`, `SpellsSection`, `FeaturesSection`, and `CombatStats` to avoid redundant reactive recomputation; feature-by-kind filtering consolidated into a single memo pass; spell-by-level lookup converted to a `Map`-backed memo

### Fixed
- Spell slot reactive accessors now receive a getter function instead of a plain object, ensuring reactivity is tracked correctly when spell slots change
- Dark-theme visual snapshots regenerated to reflect HP bar geometry updates

## [1.0.0] - 2026-05-28

Initial release of TabulaPersonae, a D&D 5e/5.5e character sheet web app.

### Added

#### Character Management
- Create, edit, and delete multiple characters per account
- Character list home screen with quick navigation to any character
- Cloud sync via Firebase Firestore when signed in; localStorage fallback for offline/guest use
- Offline indicator with graceful cache retrieval when network is unavailable

#### Authentication
- Firebase Auth with email/password sign-in
- Guest/skip mode — full functionality without an account (data stored locally)
- Privacy policy and terms of use pages

#### Character Sheet — Core Stats
- Ability scores (STR/DEX/CON/INT/WIS/CHA) with modifier calculation
- Saving throws and skill proficiencies with proficiency bonus
- Passive perception, senses, and languages
- Inspiration toggle
- Armor class (including derived AC from equipped armor), initiative, and speed
- Hit points with current/max/temp tracking and an HP progress bar
- Hit dice tracking
- Death saving throw tracker using pip UI

#### Character Sheet — Actions & Spells
- Actions, bonus actions, reactions, and other action types with collapsible sections
- Weapon attacks with hit/damage calculation derived from equipped weapons
- Spell slots tracker with per-level pip UI
- Spellcasting stat, spell save DC, and spell attack modifier display
- Spell list with casting time, range, duration, components, and description
- Spell detail popover
- Short and long rest modal with HP and spell slot recovery

#### Character Sheet — Equipment & Features
- Equipment inventory with weight and currency tracking
- Weapon stats (damage, damage type, properties) and armor stats (base AC, type)
- Proficiencies: weapons, armor, tools, and languages
- Features and traits with action fields and uses tracking
- Custom abilities

#### Character Sheet — Notes
- Freeform character notes section
- Background and personality fields

#### Import / Export
- Accessible from the hamburger menu on the character list and character sheet pages
- Context-aware export: exports all characters from the All Characters page, or the current character from the character sheet
- JSON round-trip export and import for full character data
- PDF import parser for D&D Beyond–style character sheet PDFs (5e 2024 edition)
- Casting time normalization for imported spells

#### UI & Experience
- Tabbed sheet layout (Combat, Spells, Features, Inventory, Character)
- Collapsible sections with state persisted to localStorage
- Dark mode with system-aware theme toggle and manual override
- Responsive layout with mobile tab flow
- Toast notifications

#### Developer
- Unit tests with Vitest and @solidjs/testing-library
- Visual regression tests with Playwright across Chromium and Firefox
- ESLint and TypeScript strict mode
- PWA manifest with maskable icons

# Changelog

All notable changes to TabulaPersonae will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

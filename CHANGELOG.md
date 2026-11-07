# Changelog

All notable changes to TabulaPersonae will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.7.0] - 2026-11-07

### Added
- **+X weapons** — a magic weapon can now carry an Attack & Damage Bonus (e.g. 1 for a +1 longsword), set in the item editor's magic item section. It is added to the weapon's attack roll and damage on the Actions tab while the item's magic bonuses are active — that is, once attuned if it requires attunement — and is listed as "Atk & Dmg +1" in the inventory. The bonus is offered for weapons only, and changing an item's type away from Weapon removes it
- **Weapon attack breakdowns** — an equipped weapon's attack bonus and damage on the Actions tab now have tooltips that name each source, e.g. "+3 (Dexterity) + 1 (Weapon Bonus) + 2 (Prof)" and "1d8 + 3 (Dexterity) + 1 (Weapon Bonus)". A finesse weapon names the ability it actually uses. Attacks and damage entered by hand get no tooltip

### Changed
- In the item editor, the "AC & Initiative Bonus" group is now "Combat Bonuses" and also holds a weapon's Attack & Damage Bonus
- In the item and spell editors, the Save and Cancel buttons now sit at the right, with Cancel first and the save button last
- Values with a breakdown tooltip are now announced by screen readers with what they are, not just the number or letter shown: for example "Stealth +5", "Dexterity saving throw +4", "Spell Hit +5, Spell Save DC 13", "Damage 1d8+3 slashing", "Ritual" or "Advantage" rather than a bare "+5" or "R". The whole "Attack: +5 to hit" line of a weapon attack is the tooltip target, so it is read in full
- The spell Hit/DC tooltip in the stats bar now uses the same breakdown as the Actions tab, naming the spellcasting ability, e.g. "+3 (Intelligence) + 2 (Prof)"

### Fixed
- When a custom Spell Attack Bonus or Spell Save DC is set, the stats bar's tooltip now shows "Custom" for it instead of a calculated breakdown that did not add up to the value shown

## [v1.6.3] - 2026-11-06

### Added
- **Accessibility contrast audit** — the rendered app is now checked in the browser for WCAG AA contrast, in both the light and dark themes: text and placeholders against 4.5:1, and form control boundaries, icon-only buttons, color swatches and their selection ring against 3:1. It covers every character sheet tab in view and edit mode, every modal and editor, the sign-in, character list, Tab Settings and shared-character pages, each preset sheet color on every tab, and controls while hovered; the stats bar is also checked to stay solid under the system's increased-contrast setting and to visibly frost what scrolls behind it. Unit tests check every pairing of the theme's color tokens against the same ratios. Alongside it, new audits check that every control shows a visible focus outline from the keyboard and that touch targets are at least 44px, including on a phone-sized touch screen. The contrast, focus and touch-target fixes under Changed below are what these audits found
- **Broader test coverage** — end-to-end tests now run the real Firebase SDK against the Firebase Local Emulator Suite under a `demo-` project, so signed-in flows and `firestore.rules` are exercised as in production without reaching a real Firebase project; any request to a live Firebase host fails the test. New end-to-end suites cover sign-in and sign-up, the character list, editing every module, saving across modules, import and export, migrating legacy characters, short and long rests, public sharing, sign-out, cloud sync and theme persistence, and the core flows also run on a phone-sized touch screen. Visual regression baselines now cover every modal and its variants and every popup in its open state, in both themes in Chromium and Firefox, and each of them also gets an accessibility scan. Unit coverage stands at 98.7% of lines and 93.7% of branches
- **Exhaustion levels** — Exhaustion is now tracked as a level from 1 to 6 rather than as an on/off condition. Choosing it from Add Condition starts it at level 1, a stepper beside the conditions sets the level, and the effects of that level under the character's edition are listed beneath it (the 2014 cumulative table, or the 2024 rule of −2 to d20 Tests and −5 ft Speed per level). The stats bar shows it as "Exhaustion 2" and so on. A long rest now removes one level instead of clearing Exhaustion entirely. Characters saved with the Exhaustion condition are given level 1
- Available pips in usage trackers are now marked with an icon — a sparkle for feature charges, a wand for spell slots, a backpack for item uses and dice for hit dice — so used and available pips can be told apart without relying on color

### Changed
- **Size is now set only as a Species Trait** — the Size field and its custom override were removed from Combat Stats; size is granted by a "Size" Species Trait on the Features tab, like every other grant. A size entered by hand on an existing character is carried over as a "Size" Species Trait when the character loads, unless a feature already grants a size or the stored value is the old "Medium" default, which every character was saved with whether or not anyone chose it. Importing a PDF character sheet turns its Size into a "Size" Species Trait too
- A character's sheet color is now shown in a shade that stays readable against the light and dark themes, keeping its hue; the color you picked is still what is saved. The selected swatch is outlined in a theme color, and the pipette on the custom swatch stays visible on any color
- Every control now shows a visible focus outline when reached with the keyboard, including checkboxes and the edit-mode switches
- Form field borders, the focus outline, error messages in the dark theme, the Save button in edit mode and the sign-in success message now meet WCAG AA contrast, and the tinted panel backgrounds that lowered text contrast were removed. With the system's increased-contrast setting on, the stats bar has a solid background
- More controls now have a touch target of at least 44px: the sign-in form's fields, tabs, buttons and links, menu and dropdown options, the Tab Settings rename field and its buttons, and the details button on action cards. A menu taller than the space available now scrolls
- The signed-in account (or "Not Logged In") is now shown at the top of the header menu instead of beside the menu button
- Buttons and controls that repeat down a list are now named for what they act on, so screen readers can tell them apart: Cast and Upcast name the spell, Edit and Delete name the spell, Toggle attuned names the item, and the Tab Settings drag, rename and expand controls name their tab or module. The Short Rest/Long Rest choice, the Heroic Inspiration toggle and the sheet color swatches announce whether they are selected, and the details popover on an action card is named for it
- Read-only usage trackers on a shared sheet announce each pip as, for example, "Charge spent" or "Charge available" rather than as instructions to click

### Fixed
- Saving one section of the sheet no longer undoes changes made elsewhere while it was being edited — by another section's save, a rest, or controls that save straight away such as conditions and death saves. Only the fields changed in the section's form are saved
- Short and long rests now restore the uses of custom actions in the Other section
- Opening the upcast picker for a spell listed under both Bonus Actions and Reactions now opens it only in the section clicked
- Notifications are announced by screen readers exactly once, and failures are announced straight away; the notifications area can be reached by landmark navigation
- The Spell School and Casting Time fields in the spell editor, and the Type and Damage Type fields in the action editor, are now connected to their labels
- The Terms of Use consent dialog can be scrolled on a short screen, so its buttons are always reachable

## [v1.6.2] - 2026-10-12

### Added
- **Two-click confirmation for deleting and removing** — deleting a character, tab, feature, spell, equipment item or custom action, and removing a module from a tab or a level tier from a feature, now takes two clicks: the first turns the button red and reads "Confirm Delete" (or "Confirm Remove"), the second carries it out. The button reverts on its own after a few seconds, on Escape, or when you click elsewhere. This replaces the browser pop-up previously used for deleting a character, and adds a guard to the others, which had none
- **Tap-to-pin tooltips** — tapping or clicking a calculated value, granted tag or other tooltip target now pins its tooltip open, so it can be read on a touch screen and its text selected; a second tap, a tap elsewhere, or Escape closes it
- Animations and transitions are reduced to near-instant when the device is set to reduce motion
- Moving between pages now moves keyboard and screen reader focus to the new page's content
- Equipment quantity can be adjusted with −/+ buttons directly in the inventory list

### Changed
- Buttons, checkboxes, steppers, chips and other controls now have a touch target of at least 44×44px, without changing how large they look
- The collapsible Ability Score groups in the feature editor now look and behave like the groups in the item editor: each header is a full-width row at least 44px tall
- Tags and pills across the sheet (conditions, proficiencies, spell levels, item and feature attributes) now share one chip style, and every editable list of them — conditions, condition immunities, languages, proficiencies, resistances, skill advantage/disadvantage — works the same way: click a chip to remove it, and add through a single "+ Add" chip
- Skill proficiency and expertise are toggled with "Prof" and "Exp" chips instead of checkboxes when editing Skills & Proficiencies
- The Inspiration checkbox in the Basic Info header was removed; the toggle beside the character's name is now the only one
- The offline/sync indicator is now a button, so it can be reached and expanded from the keyboard and announces whether it is expanded
- An open menu no longer locks the page behind it: the page can still be scrolled, and clicking anywhere else closes the menu
- "Import Successful" now appears once the imported characters have actually been saved, rather than as soon as the file is read, so it is never followed by "Import not saved". The imported character still opens straight away
- With the app open in several tabs while signed in, every tab now works offline and shares the same offline data; previously only the first tab opened did
- Damage resistances, immunities and vulnerabilities in Skills & Proficiencies are now picked from the standard damage types, with a "Custom…" entry in the same menu for anything else (e.g. "Nonmagical Bludgeoning"). Entries saved earlier in a different case ("fire") are tidied to the standard spelling when the character loads, and duplicates that differed only by case are merged

### Fixed
- Clearing a value on a cloud-synced character (such as the sheet color) now stays cleared; previously the old value could remain in the cloud copy and come back
- Clicking an open dropdown's button a second time now closes it, instead of closing and immediately reopening it
- Switching straight from one character to another no longer carries anything across: each character keeps its own collapsed and expanded sections in Actions, Features and Spells, and edits left unsaved in Actions or Combat Stats are dropped instead of being applied to the next character
- Importing a D&D Beyond PDF whose Heroic Inspiration box is set to "Off" no longer imports the character as inspired
- If cloud sync cannot start (for example, because its configuration is missing), the app now opens signed out and works from on-device storage instead of failing to start; trying to sign in reports the problem
- The icon beside "Toggle Theme" now updates when the theme changes while the menu is open
- A save that fails is now reported with an error message instead of passing silently — this covers edits on the character sheet, new characters, imported characters and deleting a character. A character that could not be deleted reappears in the list
- Signing out now removes all of your data from the device, including the offline copy of your characters kept for use without a connection; previously that copy, and some per-character settings, stayed behind. If you have changes that have not synced yet, you are warned that they will be lost before anything is removed, including changes made in another open tab and a tab layout that could not be uploaded to your account. Other open tabs are signed out with it and reload. If the offline copy cannot be removed, nothing else is removed either and you stay signed in
- Importing a file with several characters while using the app without an account now keeps all of them; previously only the last one was saved and the app could open a "not found" page
- Signing in no longer discards characters created without an account when they cannot be added to it: they stay on the device, you are told how many, and they are tried again the next time the app loads
- Signing in no longer waits for characters created without an account to finish uploading, so the app is not left on its loading screen when the cloud cannot be reached
- Importing a character from the character sheet while offline now opens it straight away instead of appearing to do nothing
- An open suggestion list (such as Class or Species) is now announced correctly by screen readers: the field points to its list, and the list has a name
- Dropdown selects (Alignment, Item Type, Rarity, Feature Type and the rest) are now announced as a labelled choice with a named list of options, and the highlighted option is announced while moving through it with the arrow keys. Several that had no label of their own (Alignment, spell Level, Item Type, Attack Using, Armor Type, Rarity and an item's Recharge On) are now connected to the label shown beside them
- In the item editor, a weapon's Damage Type field and a shield's fixed AC Bonus are now connected to the labels shown beside them, so screen readers announce what each one is
- While a menu such as Add Condition or the header menu is open, the rest of the page is no longer hidden from screen readers while still being reachable with Tab
- Section headers in Actions, Spells and Features, and module rows in Tab Settings, keep readable text while the pointer is over them in the light theme

## [v1.6.1] - 2026-10-08

### Added
- **Skill advantage/disadvantage** — equipped items and granting features can now give advantage or disadvantage on specific skills, with a manual per-skill override; tooltips name the granting item or feature, matching the existing pattern for other calculated stats
- **Equipment "Used As Action"** — an item can be marked as usable via an Action, Bonus Action, Reaction, or Other, surfacing it alongside spells and features in the Actions tab
- **Independent charges and quantity-consumed tracking on equipment** — a magic item's rechargeable charges (spent/max, reset by short or long rest) and a consumable's per-use quantity deduction are now tracked separately, so a single item can have both (e.g. a magic potion that is both consumed by quantity and recharges on a long rest)
- **Per-level max uses for features** — a feature's use limit can scale with character level (e.g. "2 uses per level") instead of only a flat number
- Feature cards now show level, type, range, and recharge badges
- Ctrl+S (or Cmd+S) while editing a sheet section now saves and stays in edit mode; Enter saves and exits
- `Select` supports full keyboard navigation (arrow keys to highlight, Enter to select, Escape/Tab to close)

### Changed
- Exporting a character (or all characters) to JSON now refreshes calculated fields first, so an export always reflects current values instead of potentially-stale ones
- Equipment's magic-item modal was extracted into its own component with reusable modifier-group sections, for easier maintenance

### Fixed
- Ctrl+S (or Cmd+S) no longer silently does nothing when Caps Lock is on or Shift is held
- A magic item's description in the Magic Items list no longer expands the card to show the full text — long descriptions clip back to a single line as intended
- Two equipment form fields ("Uses Spent" and "Quantity Consumed") no longer collide when both are visible on the same item

## [v1.6.0] - 2026-08-11

### Added
- **Features can now grant almost anything** — a Class Feature, Species Trait, Feat, or the new Background Feature can grant spellcasting ability, hit dice/hit points (flat, per-level, or rolled), saving throw and skill proficiencies (including expertise), other proficiencies, size, walking/fly/swim/climb/burrow speed, senses (darkvision/blindsight/tremorsense/truesight), damage resistances/immunities/vulnerabilities, condition immunities, languages, carrying capacity (bonus or multiplier), ability score bonuses/floors/caps/base max, and a per-level Max HP bonus — all editable from the Features tab, with each grant showing which feature(s) it came from as a tooltip everywhere it's used
- **Background Features** — a new "Background" feature kind alongside Class Features, Species Traits, and Feats, with its own tab section and recharge-on-rest support
- **Level-tiered feature effects** — a feature can define effects at multiple character levels (e.g. a trait that improves at level 5 and again at level 11); every tier at or below the character's current level applies, so nothing needs to be re-entered as the character levels up
- **Calculated size and movement speeds** — size and walking/fly/swim/climb/burrow speed each get their own calculated-vs-custom toggle and tooltip, matching the existing pattern for AC/initiative/passive scores, with values now sourced from granting features and equipment instead of being freeform fields
- **Calculated Max HP** — Max HP is now derived from the character's Hit Points feature (flat, per-level, or rolled value per level) plus Constitution modifier per level and any Max HP Bonus features, with a manual-override toggle and a full breakdown tooltip
- Every new character starts with a default "Hit Points" Class Feature (d8 hit die) so Max HP and hit-dice spending work out of the box; the Rest modal's "spend Hit Dice" option now only appears once a character actually has a Hit Points feature
- **Legacy character migration** — characters saved before this system existed have their old `spellcastingAbility`/`hitDice` fields, and their stored speed/size/senses/AC values, converted into equivalent Features and calculated/custom flags, so nothing changes on screen for existing characters after upgrading

### Changed
- Ability scores module: saving throw proficiency and ability score max are now influenced by granting features, not just manually toggled per character; effective ability score max reflects any feature-granted base max
- Skills & Proficiencies module: saving throw and skill proficiency (including expertise) now factor in feature grants, not just the character's own checkboxes; granted-tag tooltips now name the specific granting feature or item instead of a generic "Granted by an equipped item" label
- Calculated-value tooltips across ability scores, saving throws, skills, spellcasting, and carrying capacity now consistently show each contributing term (base, proficiency, expertise, item, feature) instead of an ad hoc mix of formats
- Character class selection on the Basic Info tab no longer auto-fills a spellcasting ability — spellcasting ability is now granted exclusively through a Feature, matching how every other feature-granted stat works
- `NumericInput` only commits a value on blur/Enter if the user actually typed in the field, so legacy data that predates a since-lowered max no longer gets silently clamped by an incidental blur
- `Select` supports a `disabled` state; its dropdown now scrolls instead of clipping when it has more options than fit on screen
- New `CalculatedValueSelect` component extends the calculated/custom pattern to dropdown-style fields (used for Size and Spellcasting Ability)

## [v1.5.0] - 2026-07-28

### Added
- **Magic items** — equipment can now be flagged as magic with a rarity (common through artifact), an optional attunement requirement, and a set of modifiers (AC, initiative, ability scores with floor/cap, saving throws, resistances/immunities/vulnerabilities, condition immunities, senses, movement speeds, carrying capacity, languages, and proficiencies); modifiers from equipped (and attuned, where required) items are automatically totaled into every relevant calculated stat
- **Attunement tracking** — a configurable attunement limit (defaults to 3) with a live attuned-item count and an over-limit warning
- **Senses, resistances, and immunities on the sheet** — Skills & Proficiencies now shows darkvision/blindsight/tremorsense/truesight, damage resistances/immunities/vulnerabilities, condition immunities, and languages/proficiencies, each combining a character's own values with any granted by equipped items
- **Item-granted spells** — spells can be linked to the magic item that grants them, with an optional "Free Cast" flag for casts that don't consume a spell slot
- **Equipment recharge on rest** — items with a `rechargeOn` field now reset alongside features on short/long rest, matching existing feature-recharge behavior
- **Live AC and HP on the character list** — the Home screen now shows each character's calculated AC (accounting for equipped armor and item bonuses) and effective max HP instead of the stored raw values
- **Import reconciliation** — JSON and PDF imports now infer whether each calculated stat (AC, initiative, passive scores, spell DC/attack/modifier, carrying capacity, attunement limit) should be treated as calculated or manually overridden, by comparing the imported value against what the app would currently calculate
- **Legacy character migration** — characters saved before calculated-AC support existed are migrated to keep their stored armor class instead of silently switching to the calculated value

### Changed
- Ability score, saving throw, spell DC/attack/modifier, and carrying-capacity calculations now factor in active magic item modifiers everywhere they're used (ability scores module, actions, combat stats, rest modal, stats bar)
- `Checkbox` component gained `label`/`labelClass`/`containerClass` props so a clickable label can be rendered as a proper sibling of the control instead of by wrapping it in a native `<label>`, fixing a double-toggle bug where a real click on the visible checkbox square silently canceled itself out
- Removed the unused `magicItems` field from the `Character` type — magic items are now regular equipment entries with `magic: true`

## [v1.4.0] - 2026-07-24

### Added
- **Markdown rendering** — character notes, description fields (appearance, personality, ideals, bonds, flaws, backstory, allies, treasure), and action/spell descriptions now render as sanitized Markdown (`marked` + `dompurify`) instead of plain pre-wrapped text
- **Calculated stats with manual override** — initiative, proficiency bonus, armor class, passive perception, passive insight, passive investigation, spell save DC, spell attack bonus, and spell modifier are now auto-derived from character data, each with a per-field toggle to switch to a manual/custom value; new `CalculatedValue` component and `useCalculatedValue` hook back this behavior
- **Hover tooltips** explaining how each calculated stat is derived, shown on ability scores, combat stats, and skills/proficiencies
- **Temporary max HP** — hit points now support a `temporaryMaximum` bonus; rest logic uses a new `getEffectiveMaxHp` helper so healing and long rest correctly cap at the boosted maximum
- Optional badge label on `ActionCard` — spell cards now derive their badge (Cantrip, 1st, 2nd, ...) from spell level automatically instead of requiring a passed-in label

### Changed
- Renamed all sheet section components to "module" terminology (`ActionsSection` → `ActionsModule`, `EditableSection` → `EditableModule`, `CombatStats` → `CombatStatsModule`, etc.) to align naming with the module registry introduced in 1.2.0; no functional/UI changes from the rename itself
- `Tooltip` component gained `triggerClass` and `triggerFocusable` props to support keyboard-accessible tooltip triggers on calculated stat values

## [v1.3.0] - 2026-07-21

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

## [v1.2.0] - 2026-07-20

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

## [v1.1.0] - 2026-07-19

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

## [v1.0.0] - 2026-05-28

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

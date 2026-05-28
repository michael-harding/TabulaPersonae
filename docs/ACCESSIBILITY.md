> **Document Authority**: This document is the authoritative accessibility standard for this repository. It supplements `CONSTITUTION.md` §9; where the two conflict, `CONSTITUTION.md` rules.
> **Last updated:** 2026-05-28

---

# TabulaPersonae Frontend Accessibility Guidelines

## 1. Scope

This document governs all accessibility requirements for this repository. It expands on `CONSTITUTION.md` §9 and covers semantic HTML, interactive elements, icons, images, focus management, ARIA usage, color and contrast, motion, forms, dynamic content, touch targets, and testing requirements.

---

## 2. Conformance Target

- Target conformance level: **WCAG 2.1 AA**.
- All new components and features must meet WCAG 2.1 AA before merge.
- Where AAA criteria can be satisfied without significant additional effort, they must be pursued.

---

## 3. Semantic HTML & Landmark Regions

- Semantic HTML elements must be used where they exist. Generic elements (`<div>`, `<span>`) must not be used where a semantic equivalent is available.
- Every page must have exactly one `<main>` element.
- Landmark regions must be used to delineate page structure: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- When a page contains more than one `<nav>` element, each must have a unique `aria-label` describing its purpose (e.g. `aria-label="Primary"`, `aria-label="Breadcrumb"`).
- Heading elements (`<h1>`–`<h6>`) must form a logical hierarchy. Heading levels must not be skipped (e.g. jumping from `<h1>` to `<h3>`). Headings must not be used solely for visual styling; use a CSS class on a `<p>` or `<span>` instead.
- `<button>` must be used for actions that do not navigate. `<a>` must be used for navigation to a URL. `<div>` and `<span>` must not be used as interactive elements.
- `<button>` elements outside a `<form>` must have `type="button"` to prevent accidental form submission.
- Data tables must use `<caption>`, `<th scope="col|row">`, and `<thead>`/`<tbody>` appropriately. Tables must not be used for layout.

---

## 4. Interactive Elements & Keyboard Operability

- All interactive elements must be reachable and operable via keyboard alone.
- Tab order must follow the visual reading order of the page. `tabIndex` values other than `0` and `-1` must not be used.
- Custom interactive widgets (menus, listboxes, date pickers, carousels, etc.) must implement the keyboard interaction patterns defined in the ARIA Authoring Practices Guide (APG). Arrow keys must navigate within composite widgets; Tab must move focus out of the widget.
- No keyboard trap may exist, except in modal dialogs where focus is intentionally constrained to the dialog content. Every intentional focus trap must be documented in a code comment and must provide an explicit escape mechanism (the Escape key or a visible close control).
- Every focusable element must have a visible focus indicator. `outline: none` or `outline: 0` must not be applied globally without a replacement focus style that satisfies WCAG 2.4.11 Focus Appearance. `:focus-visible` must be used in preference to `:focus` so that the indicator is shown for keyboard navigation only.

---

## 5. Icons

- Decorative icons — icons that are redundant with adjacent visible text — must have `aria-hidden="true"` set on the icon element.
- Informative icons used without adjacent visible text must have an accessible name. The `aria-label` must be placed on the interactive parent (`<button>` or `<a>`), not on the icon itself; the icon element must have `aria-hidden="true"`.
- SVG icons must set `focusable="false"` to prevent unexpected focus in some browsers.
- Icon components must accept and forward `aria-label`, `aria-hidden`, and `role` props to their root element. Icon components must not suppress or ignore these props.
- Icon fonts that render glyphs via CSS `content` must not be used. SVG-based icons are required.

---

## 6. Images & Media

- All `<img>` elements must have an `alt` attribute.
- Informative images: `alt` must concisely describe the image's purpose or content in context.
- Decorative images: `alt=""` must be set. The `alt` attribute must not be omitted.
- Complex images (charts, diagrams, infographics): must include a long description accessible to screen reader users, provided via `aria-describedby` referencing an adjacent text element or via a visible descriptive paragraph.
- `<video>` elements must provide synchronized captions. `<audio>` elements must provide a transcript.
- Media must not auto-play. If auto-play is required by design, a visible pause control must be present and the media must begin muted unless the user has opted in to audio.

---

## 7. Focus Management

- **Route transitions**: when the route changes, focus must move to a suitable element — typically the page `<h1>` or the `<main>` element — so screen reader users are notified of the new page.
- **Modal open**: when a modal or dialog opens, focus must move to the first focusable element within it, or to the dialog container element if no focusable child is present.
- **Modal close**: when a modal or dialog closes, focus must return to the element that triggered it. Use a `ref` variable to hold a reference to the trigger element before the modal opens, and call `triggerRef.focus()` inside `onMount` of a cleanup effect or inside a `createEffect` that tracks the modal's open state.
- **Dynamically inserted content**: when content is inserted into the DOM in response to a user action (e.g. an accordion panel expands), focus must move to the first focusable element in the new content, or to the content container if no focusable element is present.
- **Non-interactive popovers and tooltips**: focus must not move to them automatically on open.
- **Interactive popovers**: when a popover contains interactive elements (e.g. a confirmation popover), focus must move to the first focusable element inside it on open, and must return to the trigger on close.
- Focus must never be moved synchronously during component initialization. All programmatic focus calls must be made inside `onMount`, `createEffect`, or an event handler.

---

## 8. ARIA Usage

- ARIA must only be used when native HTML semantics are insufficient to convey the required role, state, or property.
- ARIA must not override native semantics. Adding `role="button"` to a `<button>`, or `role="heading"` to an `<h2>`, is incorrect and must not be done.
- Every interactive ARIA widget must have an accessible name provided via `aria-label` or `aria-labelledby`.
- ARIA state attributes (`aria-expanded`, `aria-selected`, `aria-checked`, `aria-disabled`, `aria-pressed`) must be kept in sync with the component's reactive state at all times.
- `aria-disabled="true"` must be used for elements that are visually disabled but intentionally remain focusable (e.g. a button with a tooltip explaining why it is unavailable). The native `disabled` attribute must be used for form controls that must not receive focus.
- `role="presentation"` and `role="none"` must only be applied to elements whose semantic meaning is genuinely irrelevant to the user.

### Common ARIA patterns

| Pattern | Required attributes |
|---|---|
| Dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the dialog title |
| Alert dialog | `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` |
| Tabbed interface | `role="tablist"` on container; `role="tab"` + `aria-selected` + `aria-controls` on each tab; `role="tabpanel"` + `aria-labelledby` on each panel |
| Accordion | `<button aria-expanded>` on each trigger; `aria-controls` pointing to the panel element |
| Menu / menubar | `role="menu"` or `role="menubar"`; `role="menuitem"` on items; arrow-key navigation required |
| Combobox | Follow the ARIA APG combobox pattern; `aria-autocomplete`, `aria-expanded`, `aria-activedescendant` as required |
| Spinner / progress | `role="status"` with a descriptive label; `aria-busy="true"` on the container being updated |

---

## 9. Color, Contrast & Non-Color Indicators

- Normal text (below 18pt / 14pt bold): minimum contrast ratio of **4.5:1** against its background.
- Large text (18pt or larger / 14pt bold or larger): minimum contrast ratio of **3:1** against its background.
- UI components and graphical objects that convey meaning (icons, chart elements, input borders): minimum contrast ratio of **3:1** against adjacent colors.
- Placeholder text in form inputs must meet the **4.5:1** minimum contrast ratio.
- Color must not be the sole means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.
- Status indicators (success, error, warning, info) must use both a color change and an additional indicator — a descriptive text label or an icon — to communicate status.
- Links within body text must be distinguishable from surrounding non-link text by more than color alone; an underline or other non-color visual indicator must be present.
- All new or modified color pairings must be verified against the applicable contrast ratio before merge using a color contrast checker.

---

## 10. Motion & Animation

- All CSS transitions and animations must respect the `prefers-reduced-motion` media query.
- Use `@media (prefers-reduced-motion: reduce)` to disable or substantially reduce animation for users who have opted into reduced motion.
- Parallax scrolling, auto-playing carousels, and continuous looping animations must be disabled under `prefers-reduced-motion: reduce`.
- Content must not flash more than three times per second (WCAG 2.3.1). This rule has no exceptions at AA.
- Animation must not be the sole means of communicating a state change. A static visual or textual indicator must always accompany an animated state transition.

---

## 11. Forms & Input

- Every form control must have a visible, associated `<label>` using `for` matching the control's `id`.
- `aria-label` may substitute a visible label only when the design explicitly excludes one (e.g. a standalone search input with an adjacent submit button). When used, the design rationale must be documented in a code comment.
- `aria-labelledby` must be used when the label text is provided by a visible element that is not a `<label>`.
- Required fields must be marked with the `required` attribute on the control and indicated visually. The visual indicator must not rely on color alone; an asterisk with an explanatory legend is acceptable.
- Error messages must:
  1. Appear as visible text adjacent to the field in error.
  2. Be associated with the field via `aria-describedby`.
  3. Be announced to screen readers immediately on validation failure, via `aria-live="polite"` on an error container or `role="alert"` on the message element.
- Groups of related controls (radio buttons, checkboxes) must be wrapped in `<fieldset>` with a `<legend>` that describes the group.
- Appropriate `autocomplete` attribute values must be used on personal data fields (name, email, address, telephone, etc.).
- When a form is submitted with validation errors, an error summary must appear at the top of the form, announced via `role="alert"`, and receive focus.

---

## 12. Dynamic Content & Live Regions

- `aria-live="polite"` must be used for non-urgent status messages that do not interrupt the user (e.g. "3 results found", "Changes saved").
- `aria-live="assertive"` must be used for urgent messages that require immediate attention (e.g. session timeout warnings, critical error alerts). Use sparingly; assertive regions interrupt the screen reader mid-sentence.
- Live region elements must be present in the DOM before content is inserted into them. Mounting and populating a live region element in the same render cycle is not reliably announced across all screen readers.
- Loading states must be communicated by setting `aria-busy="true"` on the container being updated and by placing a descriptive status message (e.g. "Loading results…") in an `aria-live="polite"` region.
- Skeleton screens and loading spinners must include a visually hidden status message in a live region (e.g. `<span class="sr-only" aria-live="polite">Loading…</span>`).
- Toast and snackbar notifications must render into a persistent `aria-live` region. They must not auto-dismiss in fewer than 5 seconds; users must have the option to dismiss them manually.
- When content is removed from the page, a status message must not be announced unless the removal is significant and not self-evident from the preceding user action.

---

## 13. Touch Targets

- All interactive elements must have a minimum touch target size of **44×44 CSS pixels**.
- When the visual size of an element is smaller than 44×44px, the touch target must be extended via `padding` or a CSS pseudo-element without altering the visual design.
- Adjacent touch targets must have sufficient spacing so that activating one element does not inadvertently activate a neighbor.

---

## 14. Testing Requirements

- axe-core must run in the Vitest integration test suite for every rendered UI component. A component test is not complete if the axe check is absent.
- axe-playwright must run against every Playwright scenario. A scenario is not complete if the axe check is absent.
- Both axe configurations must enforce **WCAG 2.1 AA** rules. Disabling any axe rule requires an inline comment explaining the reason and explicit human approval.
- A manual keyboard walkthrough must be performed before each PR that introduces or modifies interactive UI. The walkthrough must confirm: tab order is logical, all interactive elements are reachable and operable, a visible focus indicator is present at all times, and no unintended keyboard trap exists.
- Color contrast must be verified for all new or modified color pairings before merge.
- Screen reader testing is required for complex interactive widgets (dialogs, menus, comboboxes, carousels, live region announcements). At a minimum, test with one desktop screen reader (e.g. NVDA + Chrome, or VoiceOver + Safari).

---

## 15. Definition of Done

**A component's accessibility is done when:**
- The axe-core integration test passes with no violations.
- The axe-playwright scenario passes with no violations.
- A manual keyboard walkthrough has been completed and passed.
- No axe rules have been disabled without a documented inline comment and human approval.

**A feature's accessibility is done when:**
- All components in the feature satisfy the component criteria above.
- Screen reader testing has been completed for any complex interactive widget introduced by the feature.
- Color contrast has been verified for all new or modified color pairings.
- All form error paths, loading states, and dynamic content insertions have been reviewed against §11 and §12.

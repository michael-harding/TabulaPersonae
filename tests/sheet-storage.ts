// What the app stores on a device for a character's sheet, shared by the E2E and visual suites so
// that a renamed key is changed in one place.

/**
 * The localStorage entries that open every collapsible section of a character's sheet, under the
 * keys the sections keep their state in (createPersistedSetSignal in actions-module.tsx,
 * spells-module.tsx and features-module.tsx). An init script cannot import, so these are built
 * here and passed to it.
 */
export function expandedSectionsStorage(characterId: string): Record<string, string> {
  return {
    [`dnd-collapsible-actions-${characterId}`]: JSON.stringify(["actions", "bonus-actions", "reactions", "other"]),
    [`dnd-collapsible-spells-${characterId}`]: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    [`dnd-collapsible-features-${characterId}`]: JSON.stringify(["class-feature", "species-trait", "feat"]),
  }
}

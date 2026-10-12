// Everything the app keeps in localStorage is under this prefix, apart from `theme`.
const APP_KEY_PREFIX = 'dnd-'

// Settings of the device, not of whoever is signed in. Every other app key is treated as the
// user's and removed on sign-out, so a key added later is cleared without being listed anywhere.
const DEVICE_KEYS = new Set(['dnd-terms-accepted'])

const LOCAL_CHARACTERS_KEY = 'dnd-characters'

/** Removes everything in localStorage that belongs to the signed-in user. */
export function clearLocalUserData(): void {
  // Collected first: removing an item shifts the indexes of those after it.
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  for (const key of keys) {
    // null: `localStorage.key()` returns null for an index past the end
    if (key != null && key.startsWith(APP_KEY_PREFIX) && !DEVICE_KEYS.has(key)) {
      localStorage.removeItem(key)
    }
  }
}

/**
 * Whether characters created without an account are still waiting on this device to be added to
 * the signed-in account (see uploadLocalCharacters in auth-context.tsx). They exist nowhere else.
 */
export function hasCharactersAwaitingUpload(): boolean {
  const stored = localStorage.getItem(LOCAL_CHARACTERS_KEY)
  if (!stored) return false
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    // Not readable as characters, so there is nothing that could be uploaded
    return false
  }
}

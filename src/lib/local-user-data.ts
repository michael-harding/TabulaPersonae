import type { Character } from './character-types'
import { migrateCharacters } from './character-migrations'

// Everything the app keeps in localStorage is under this prefix, apart from `theme`.
const APP_KEY_PREFIX = 'dnd-'

// Settings of the device, not of whoever is signed in. Every other app key is treated as the
// user's and removed on sign-out, so a key added later is cleared without being listed anywhere.
const DEVICE_KEYS = new Set(['dnd-terms-accepted'])

// The characters of someone using the app without an account. This module is the only one that
// reads or writes the key.
const LOCAL_CHARACTERS_KEY = 'dnd-characters'

/**
 * The characters stored on this device, brought up to the current data shape. Synchronous on
 * purpose: a caller that reads, changes and writes the list without awaiting in between cannot
 * be interleaved with another caller doing the same.
 */
export function readLocalCharacters(): Character[] {
  const stored = localStorage.getItem(LOCAL_CHARACTERS_KEY)
  if (!stored) return []
  try {
    return migrateCharacters(JSON.parse(stored))
  } catch (error) {
    console.error('Failed to read characters stored on this device:', error)
    return []
  }
}

/** Replaces the characters stored on this device. Throws if the browser refuses the write. */
export function writeLocalCharacters(characters: Character[]): void {
  localStorage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(characters))
}

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
  return readLocalCharacters().length > 0
}

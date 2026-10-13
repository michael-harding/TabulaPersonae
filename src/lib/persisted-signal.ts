import { createSignal, createEffect, on, untrack } from 'solid-js'
import type { Signal } from 'solid-js'

// `key` is an accessor because it is usually built from a character id, and the sheet swaps
// characters in place (same mounted modules, new id) — the set is then reloaded from the new key
// rather than carrying the previous character's state over.
export function createPersistedSetSignal<T extends string | number>(
  key: () => string,
  defaultValue: T[]
): Signal<Set<T>> {
  const read = (k: string) => {
    const stored = localStorage.getItem(k)
    return new Set<T>(stored ? (JSON.parse(stored) as T[]) : defaultValue)
  }

  const signal = createSignal<Set<T>>(read(untrack(key)))
  const [get, set] = signal

  createEffect(on(key, (k) => { set(read(k)) }, { defer: true }))

  // Tracks the set only, never the key: a key change must reach storage solely through the reload
  // above. Were this to re-run on the key too, nothing would guarantee it ran after the reload
  // (Solid does not keep subscribers in declaration order), and it could store the previous
  // key's set under the new key.
  createEffect(on(get, (value) => {
    localStorage.setItem(untrack(key), JSON.stringify([...value]))
  }))

  return signal
}

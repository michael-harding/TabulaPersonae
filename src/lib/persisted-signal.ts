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

  // Declared before the write below, so that on a key change the new key's set is loaded before
  // anything is written under it.
  createEffect(on(key, (k) => { set(read(k)) }, { defer: true }))

  createEffect(() => {
    localStorage.setItem(key(), JSON.stringify([...get()]))
  })

  return signal
}

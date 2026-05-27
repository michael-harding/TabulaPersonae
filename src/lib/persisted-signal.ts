import { createSignal, createEffect } from 'solid-js'
import type { Signal } from 'solid-js'

export function createPersistedSetSignal<T extends string | number>(
  key: string,
  defaultValue: T[]
): Signal<Set<T>> {
  const stored = localStorage.getItem(key)
  const initial = new Set<T>(stored ? (JSON.parse(stored) as T[]) : defaultValue)

  const signal = createSignal<Set<T>>(initial)
  const [get] = signal

  createEffect(() => {
    localStorage.setItem(key, JSON.stringify([...get()]))
  })

  return signal
}

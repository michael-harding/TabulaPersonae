import { createRoot, createSignal } from "solid-js"
import type { Signal } from "solid-js"

import { createPersistedSetSignal } from "@/lib/persisted-signal"

const KEY_A = "test-persisted-set-a"
const KEY_B = "test-persisted-set-b"

const stored = (key: string): string[] | null => {
  const raw = localStorage.getItem(key)
  return raw == null ? null : (JSON.parse(raw) as string[])
}

function setup(key: () => string, defaultValue: string[] = ["x", "y"]) {
  let signal!: Signal<Set<string>>
  const dispose = createRoot((d) => {
    signal = createPersistedSetSignal<string>(key, defaultValue)
    return d
  })
  const [get, set] = signal
  return { get, set, dispose }
}

describe("createPersistedSetSignal", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("starts from the default when nothing is stored", () => {
    const { get, dispose } = setup(() => KEY_A)
    expect([...get()]).toEqual(["x", "y"])
    dispose()
  })

  it("starts from the stored value when there is one", () => {
    localStorage.setItem(KEY_A, JSON.stringify(["y"]))
    const { get, dispose } = setup(() => KEY_A)
    expect([...get()]).toEqual(["y"])
    dispose()
  })

  it("stores an empty set rather than falling back to the default", () => {
    localStorage.setItem(KEY_A, JSON.stringify([]))
    const { get, dispose } = setup(() => KEY_A)
    expect([...get()]).toEqual([])
    dispose()
  })

  it("writes changes under its key", () => {
    const { set, dispose } = setup(() => KEY_A)
    set(new Set(["x"]))
    expect(stored(KEY_A)).toEqual(["x"])
    dispose()
  })

  describe("when the key changes", () => {
    it("loads the new key's stored value", () => {
      localStorage.setItem(KEY_B, JSON.stringify(["y"]))
      const [key, setKey] = createSignal(KEY_A)
      const { get, dispose } = setup(key)
      setKey(KEY_B)
      expect([...get()]).toEqual(["y"])
      dispose()
    })

    it("falls back to the default when the new key has nothing stored", () => {
      const [key, setKey] = createSignal(KEY_A)
      const { get, set, dispose } = setup(key)
      set(new Set(["x"]))
      setKey(KEY_B)
      expect([...get()]).toEqual(["x", "y"])
      dispose()
    })

    it("does not carry the old key's value over to the new key", () => {
      localStorage.setItem(KEY_B, JSON.stringify(["y"]))
      const [key, setKey] = createSignal(KEY_A)
      const { set, dispose } = setup(key)
      set(new Set(["x"]))
      setKey(KEY_B)
      expect(stored(KEY_A)).toEqual(["x"])
      expect(stored(KEY_B)).toEqual(["y"])
      dispose()
    })

    it("writes later changes under the new key only", () => {
      const [key, setKey] = createSignal(KEY_A)
      const { set, dispose } = setup(key)
      set(new Set(["x"]))
      setKey(KEY_B)
      set(new Set<string>())
      expect(stored(KEY_A)).toEqual(["x"])
      expect(stored(KEY_B)).toEqual([])
      dispose()
    })
  })
})

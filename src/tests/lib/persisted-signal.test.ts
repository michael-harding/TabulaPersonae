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

    // Regression: the write used to subscribe to the key as well, and relied on running after the
    // reload. Solid re-queues an effect at the end of the key's subscribers each time it re-runs,
    // so once one module's set had changed, another module's write ran before its own reload and
    // stored the previous character's set under the new character's key.
    it("keeps each character's own state when several modules share the character id", () => {
      const stateKey = (module: string, characterId: string) => `test-persisted-${module}-${characterId}`
      localStorage.setItem(stateKey("spells", "char-1"), JSON.stringify([]))
      localStorage.setItem(stateKey("spells", "char-2"), JSON.stringify(["y"]))
      const [characterId, setCharacterId] = createSignal("char-1")
      const actions = setup(() => stateKey("actions", characterId()))
      const spells = setup(() => stateKey("spells", characterId()))
      // Only the first module changes, which is what moves its write behind the second's reload
      actions.set(new Set(["x"]))

      setCharacterId("char-2")

      expect(stored(stateKey("spells", "char-2"))).toEqual(["y"])
      expect([...spells.get()]).toEqual(["y"])
      expect([...actions.get()]).toEqual(["x", "y"])
      expect(stored(stateKey("actions", "char-1"))).toEqual(["x"])
      expect(stored(stateKey("spells", "char-1"))).toEqual([])
      actions.dispose()
      spells.dispose()
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

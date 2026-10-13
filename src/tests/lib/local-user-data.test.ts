import { createDefaultCharacter } from "@/lib/character-types"
import {
  clearLocalUserData,
  hasLocalDataAwaitingUpload,
  readLocalCharacters,
  removeLocalCharacters,
  writeLocalCharacters,
} from "@/lib/local-user-data"

const CHARS_KEY = "dnd-characters"
const thorin = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const gandalf = { ...createDefaultCharacter(), id: "char-2", name: "Gandalf" }

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("clearLocalUserData", () => {
  it.each([
    ["dnd-characters", "characters created without an account"],
    ["dnd-active-character", "the legacy active-character marker"],
    ["dnd-tab-config", "tab layout"],
    ["dnd-skip-auth", "the continue-without-account flag"],
    ["dnd-last-synced-char-1", "a character's last sync time"],
    ["dnd-collapsible-actions-char-1", "collapsed sections in Actions"],
    ["dnd-collapsible-spells-char-1", "collapsed sections in Spells"],
    ["dnd-collapsible-features-char-1", "collapsed sections in Features"],
    ["dnd-public-char-char-1", "a dev-only public character seed"],
    ["dnd-something-added-later", "an app key nobody listed"],
  ])("removes %s (%s)", (key) => {
    localStorage.setItem(key, "value")

    clearLocalUserData()

    expect(localStorage.getItem(key)).toBeNull()
  })

  it.each([
    ["dnd-terms-accepted", "the device's acceptance of the terms"],
    ["theme", "the device's theme"],
    ["another-app-key", "a key that is not this app's"],
  ])("keeps %s (%s)", (key) => {
    localStorage.setItem(key, "value")

    clearLocalUserData()

    expect(localStorage.getItem(key)).toBe("value")
  })

  it("removes every user key in one call, however many there are", () => {
    for (let i = 0; i < 20; i++) localStorage.setItem(`dnd-last-synced-char-${i}`, "value")
    localStorage.setItem("dnd-terms-accepted", "true")

    clearLocalUserData()

    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem("dnd-terms-accepted")).toBe("true")
  })

  it("does nothing when there is nothing stored", () => {
    expect(() => clearLocalUserData()).not.toThrow()
    expect(localStorage.length).toBe(0)
  })
})

describe("hasLocalDataAwaitingUpload", () => {
  it.each([
    ["nothing is stored", null, false],
    ["the stored list is empty", "[]", false],
    ["the stored value is not valid JSON", "{not json", false],
    ["the stored value is not a list", '{"id":"char-1"}', false],
    ["one character is stored", '[{"id":"char-1"}]', true],
  ])("when %s", (_label, stored, expected) => {
    // null: nothing is stored under the key
    if (stored != null) localStorage.setItem("dnd-characters", stored)

    expect(hasLocalDataAwaitingUpload()).toBe(expected)
  })

  // A signed-in user's tab layout is only on the device while its upload is pending or has failed.
  it("is true when a tab layout is still stored on the device, even with no characters", () => {
    localStorage.setItem("dnd-tab-config", "{}")

    expect(hasLocalDataAwaitingUpload()).toBe(true)
  })
})

describe("readLocalCharacters", () => {
  it("returns the stored characters", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([thorin, gandalf]))

    expect(readLocalCharacters()).toEqual([thorin, gandalf])
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([
    ["nothing is stored", null],
    ["the stored list is empty", "[]"],
    ["the stored value is not a list", '{"id":"char-1"}'],
  ])("returns [] without logging when %s", (_label, stored) => {
    // null: nothing is stored under the key
    if (stored != null) localStorage.setItem(CHARS_KEY, stored)

    expect(readLocalCharacters()).toEqual([])
    expect(console.error).not.toHaveBeenCalled()
  })

  it("returns [] and logs when the stored value is not valid JSON, leaving it as it was", () => {
    localStorage.setItem(CHARS_KEY, "{not json")

    expect(readLocalCharacters()).toEqual([])

    expect(console.error).toHaveBeenCalledExactlyOnceWith("Failed to read characters stored on this device:", expect.any(SyntaxError))
    expect(localStorage.getItem(CHARS_KEY)).toBe("{not json")
  })

  it("drops entries that are not objects", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([thorin, "not a character", null]))

    expect(readLocalCharacters()).toEqual([thorin])
  })

  it("migrates a character saved by an older version", () => {
    const legacy = { ...thorin }
    delete legacy.useCalculatedArmorClass
    localStorage.setItem(CHARS_KEY, JSON.stringify([legacy]))

    expect(readLocalCharacters()[0].useCalculatedArmorClass).toBe(true)
  })
})

describe("writeLocalCharacters", () => {
  it("replaces the stored list with the one given", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([thorin]))

    writeLocalCharacters([gandalf])

    expect(readLocalCharacters()).toEqual([gandalf])
  })

  it("stores an empty list as a list, not as nothing", () => {
    writeLocalCharacters([])

    expect(localStorage.getItem(CHARS_KEY)).toBe("[]")
  })
})

describe("removeLocalCharacters", () => {
  it("removes the characters with the given ids and keeps the rest", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([thorin, gandalf]))

    removeLocalCharacters([thorin.id])

    expect(readLocalCharacters()).toEqual([gandalf])
  })

  // The store may have been cleared (sign-out) since the caller read it; it must stay cleared.
  it.each([
    ["nothing is stored", null],
    ["none of the ids is stored", JSON.stringify([gandalf])],
  ])("writes nothing when %s", (_label, stored) => {
    // null: nothing is stored under the key
    if (stored != null) localStorage.setItem(CHARS_KEY, stored)

    removeLocalCharacters([thorin.id])

    expect(localStorage.getItem(CHARS_KEY)).toBe(stored)
  })
})

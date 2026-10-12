import { clearLocalUserData, hasCharactersAwaitingUpload } from "@/lib/local-user-data"

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
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

describe("hasCharactersAwaitingUpload", () => {
  it.each([
    ["nothing is stored", null, false],
    ["the stored list is empty", "[]", false],
    ["the stored value is not valid JSON", "{not json", false],
    ["the stored value is not a list", '{"id":"char-1"}', false],
    ["one character is stored", '[{"id":"char-1"}]', true],
  ])("when %s", (_label, stored, expected) => {
    // null: nothing is stored under the key
    if (stored != null) localStorage.setItem("dnd-characters", stored)

    expect(hasCharactersAwaitingUpload()).toBe(expected)
  })
})

import { DEFAULT_TAB_CONFIG, isValidTabConfig, parseTabConfig } from "@/lib/tab-config-types"

describe("isValidTabConfig", () => {
  it("accepts the default configuration", () => {
    expect(isValidTabConfig(DEFAULT_TAB_CONFIG)).toBe(true)
  })

  it.each([
    ["a tab with no modules", { tabs: [{ id: "t1", label: "Empty", modules: [] }] }],
    ["no tabs at all", { tabs: [] }],
    ["extra fields it does not know about", { tabs: [{ id: "t1", label: "Combat", modules: ["actions"], colour: "red" }], version: 2 }],
  ])("accepts %s", (_label, config) => {
    expect(isValidTabConfig(config)).toBe(true)
  })

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "tabs"],
    ["a number", 42],
    ["an object without tabs", { notTabs: [] }],
    ["tabs that is not a list", { tabs: "combat" }],
    ["a tab that is not an object", { tabs: ["combat"] }],
    ["a tab that is null", { tabs: [null] }],
    ["a tab with no id", { tabs: [{ label: "Combat", modules: [] }] }],
    ["a tab whose id is not a string", { tabs: [{ id: 1, label: "Combat", modules: [] }] }],
    ["a tab with no label", { tabs: [{ id: "t1", modules: [] }] }],
    ["a tab whose modules is not a list", { tabs: [{ id: "t1", label: "Combat", modules: "actions" }] }],
    ["a tab naming a module that does not exist", { tabs: [{ id: "t1", label: "Combat", modules: ["actions", "dragons"] }] }],
    ["one invalid tab among valid ones", { tabs: [{ id: "t1", label: "Combat", modules: [] }, { id: "t2" }] }],
  ])("rejects %s", (_label, config) => {
    expect(isValidTabConfig(config)).toBe(false)
  })
})

describe("parseTabConfig", () => {
  it("returns a valid config as it is", () => {
    expect(parseTabConfig(DEFAULT_TAB_CONFIG)).toEqual(DEFAULT_TAB_CONFIG)
  })

  // Sheet Settings moved to the sidebar menu. A config saved before then must keep the user's own
  // tabs, rather than failing validation and falling back to the default ones.
  it("drops the retired Sheet Settings module and keeps the user's tabs", () => {
    const saved = {
      tabs: [
        { id: "mine", label: "Everything", modules: ["actions", "sheet-settings", "notes"] },
        { id: "other", label: "Spells", modules: ["spells"] },
      ],
    }
    expect(parseTabConfig(saved)).toEqual({
      tabs: [
        { id: "mine", label: "Everything", modules: ["actions", "notes"] },
        { id: "other", label: "Spells", modules: ["spells"] },
      ],
    })
  })

  it("keeps a tab that held only the retired module, now empty", () => {
    expect(parseTabConfig({ tabs: [{ id: "s", label: "Settings", modules: ["sheet-settings"] }] })).toEqual({
      tabs: [{ id: "s", label: "Settings", modules: [] }],
    })
  })

  it("does not change the data it was given", () => {
    const saved = { tabs: [{ id: "s", label: "Settings", modules: ["sheet-settings"] }] }
    parseTabConfig(saved)
    expect(saved.tabs[0].modules).toEqual(["sheet-settings"])
  })

  it("still rejects a module that never existed", () => {
    expect(parseTabConfig({ tabs: [{ id: "t", label: "T", modules: ["not-a-module"] }] })).toBeNull()
  })

  it.each([
    ["null", null],
    ["a string", "tabs"],
    ["no tabs list", { notTabs: [] }],
    ["a tab that is not an object", { tabs: [null] }],
    ["a tab without a modules list", { tabs: [{ id: "t", label: "T" }] }],
  ])("returns null for %s", (_label, data) => {
    expect(parseTabConfig(data)).toBeNull()
  })

  it("no longer lists Sheet Settings in the default tabs", () => {
    expect(DEFAULT_TAB_CONFIG.tabs.flatMap((t) => t.modules)).not.toContain("sheet-settings")
  })
})

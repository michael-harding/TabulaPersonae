import { DEFAULT_TAB_CONFIG, isValidTabConfig } from "@/lib/tab-config-types"

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

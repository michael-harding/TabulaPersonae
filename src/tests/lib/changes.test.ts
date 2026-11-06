import { applyChanges, isSameValue, pickFields } from "@/lib/changes"

describe("isSameValue", () => {
  it("compares arrays item by item and objects key by key", () => {
    expect(isSameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
    expect(isSameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false)
    expect(isSameValue([1, 2], [2, 1])).toBe(false)
  })

  // JSON drops a key holding undefined, so stored data can't tell the two apart
  it("treats a key holding undefined as absent", () => {
    expect(isSameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })

  it("does not treat an array as an object with numeric keys", () => {
    expect(isSameValue([1], { 0: 1 })).toBe(false)
  })
})

describe("applyChanges", () => {
  it("applies only what differs between before and after", () => {
    const target = { name: "Changed elsewhere", level: 3, notes: "kept" }
    expect(applyChanges(target, { name: "Old", level: 3 }, { name: "Old", level: 4 }))
      .toEqual({ name: "Changed elsewhere", level: 4, notes: "kept" })
  })

  it("merges a changed object key by key, keeping the target's other keys", () => {
    const target = { hitPoints: { current: 44, temporary: 0 } }
    expect(applyChanges(target, { hitPoints: { current: 10, temporary: 0 } }, { hitPoints: { current: 10, temporary: 5 } }))
      .toEqual({ hitPoints: { current: 44, temporary: 5 } })
  })

  it("replaces a changed array as a whole", () => {
    const target = { languages: ["Common", "Elvish"] }
    expect(applyChanges(target, { languages: ["Common"] }, { languages: ["Common", "Dwarvish"] }))
      .toEqual({ languages: ["Common", "Dwarvish"] })
  })

  it("writes a value missing from before", () => {
    expect(applyChanges({}, {}, { speed: 30 })).toEqual({ speed: 30 })
  })

  it("does not change the target", () => {
    const target = { level: 1 }
    applyChanges(target, { level: 1 }, { level: 2 })
    expect(target).toEqual({ level: 1 })
  })
})

describe("pickFields", () => {
  it("copies only the given fields", () => {
    expect(pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 })
  })
})

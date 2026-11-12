import { createDefaultCharacter, type Character } from "@/lib/character-types"
import { distinguishImportedNames, ordinalWord } from "@/lib/character-names"

const named = (name: string, id = name): Character => ({ ...createDefaultCharacter(), id, name })
const existing = (...names: string[]) => names.map((name) => ({ name }))
const namesAfterImport = (toImport: string[], already: string[]) =>
  distinguishImportedNames(toImport.map((name) => named(name)), existing(...already)).map((c) => c.name)

describe("ordinalWord", () => {
  it.each([
    [1, "First"], [2, "Second"], [3, "Third"], [4, "Fourth"], [5, "Fifth"], [8, "Eighth"], [9, "Ninth"],
    [11, "Eleventh"], [12, "Twelfth"], [19, "Nineteenth"],
    [20, "Twentieth"], [21, "Twenty-First"], [40, "Fortieth"], [42, "Forty-Second"], [80, "Eightieth"], [99, "Ninety-Ninth"],
    [100, "100th"], [101, "101st"], [102, "102nd"], [103, "103rd"], [111, "111th"], [112, "112th"], [113, "113th"], [121, "121st"],
  ])("writes %i as %s", (n, word) => {
    expect(ordinalWord(n)).toBe(word)
  })
})

describe("distinguishImportedNames", () => {
  it("keeps a name nobody else has", () => {
    expect(namesAfterImport(["Frodo"], ["Sam"])).toEqual(["Frodo"])
  })

  it("calls a second character of the same name 'the Second'", () => {
    expect(namesAfterImport(["Frodo"], ["Frodo"])).toEqual(["Frodo the Second"])
  })

  it("counts on past the highest ordinal already in use", () => {
    expect(namesAfterImport(["Frodo"], ["Frodo", "Frodo the Second"])).toEqual(["Frodo the Third"])
    expect(namesAfterImport(["Frodo"], ["Frodo", "Frodo the Third"])).toEqual(["Frodo the Fourth"])
  })

  it("does not stack ordinals when the imported name already has one", () => {
    expect(namesAfterImport(["Frodo the Second"], ["Frodo", "Frodo the Second"])).toEqual(["Frodo the Third"])
  })

  it("keeps an ordinal name whose ordinal is not taken", () => {
    expect(namesAfterImport(["Frodo the Second"], ["Frodo"])).toEqual(["Frodo the Second"])
  })

  it("counts 'the First' as the first of the line", () => {
    expect(namesAfterImport(["Frodo"], ["Frodo the First", "Frodo"])).toEqual(["Frodo the Second"])
  })

  it("reads ordinals written in figures", () => {
    expect(namesAfterImport(["Frodo"], ["Frodo", "Frodo the 100th"])).toEqual(["Frodo the 101st"])
  })

  it("goes on in words past the Nineteenth", () => {
    expect(namesAfterImport(["Frodo"], ["Frodo", "Frodo the Twentieth"])).toEqual(["Frodo the Twenty-First"])
  })

  it("leaves an epithet that is not an ordinal as part of the name", () => {
    expect(namesAfterImport(["Alexander the Great"], ["Alexander the Great"])).toEqual(["Alexander the Great the Second"])
    expect(namesAfterImport(["Alexander"], ["Alexander the Great"])).toEqual(["Alexander"])
  })

  it("treats names differing only in case or surrounding spaces as the same", () => {
    expect(namesAfterImport(["frodo "], ["Frodo"])).toEqual(["frodo the Second"])
    expect(namesAfterImport(["Frodo"], ["Frodo", "frodo THE second"])).toEqual(["Frodo the Third"])
  })

  it("tells apart characters of the same name within one import", () => {
    expect(namesAfterImport(["Frodo", "Frodo", "Frodo"], [])).toEqual(["Frodo", "Frodo the Second", "Frodo the Third"])
    expect(namesAfterImport(["Frodo", "Frodo"], ["Frodo"])).toEqual(["Frodo the Second", "Frodo the Third"])
  })

  it("leaves characters without a name unnamed", () => {
    expect(namesAfterImport(["", "  "], ["", "Frodo"])).toEqual(["", "  "])
  })

  it("leaves a character with no name at all, as a file may hold, untouched", () => {
    const nameless = { ...named("x"), name: undefined } as unknown as Character

    expect(distinguishImportedNames([nameless], existing("Frodo"))[0]).toBe(nameless)
  })

  it("changes only the name, and leaves the characters it was given untouched", () => {
    const frodo = named("Frodo", "file-1")

    const [renamed] = distinguishImportedNames([frodo], existing("Frodo"))

    expect(renamed).toEqual({ ...frodo, name: "Frodo the Second" })
    expect(frodo.name).toBe("Frodo")
  })
})

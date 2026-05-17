import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("drops falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar")
  })

  it("handles conditional object syntax", () => {
    expect(cn({ active: true, hidden: false })).toBe("active")
  })

  it("resolves tailwind conflicts — last value wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("")
  })
})

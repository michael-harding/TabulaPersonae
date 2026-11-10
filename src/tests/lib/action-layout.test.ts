import {
  actionCardKey,
  earlierPosition,
  laterPosition,
  moveCard,
  resolveLayout,
  type ActionKeyLayout,
} from "@/lib/action-layout"

const items = ["a", "b", "c", "d"]
const resolve = (layout?: { main?: string[]; more?: string[] }) => resolveLayout(items, (item) => item, layout)

describe("actionCardKey", () => {
  it("names a card by its source and id", () => {
    expect(actionCardKey("spell", "s1")).toBe("spell:s1")
  })
})

describe("resolveLayout", () => {
  it("puts every card in main, in the order given, when there's no layout", () => {
    expect(resolve()).toEqual({ main: ["a", "b", "c", "d"], more: [] })
  })

  it("follows the stored order of each part", () => {
    expect(resolve({ main: ["c", "a"], more: ["d", "b"] })).toEqual({ main: ["c", "a"], more: ["d", "b"] })
  })

  it("puts cards in neither list at the end of main, in the order given", () => {
    expect(resolve({ main: ["c"], more: ["a"] })).toEqual({ main: ["c", "b", "d"], more: ["a"] })
  })

  it("ignores keys of cards that no longer exist", () => {
    expect(resolve({ main: ["gone", "b"], more: ["also-gone", "a"] })).toEqual({ main: ["b", "c", "d"], more: ["a"] })
  })

  it("counts a key listed twice once, as main when it's in both lists", () => {
    expect(resolve({ main: ["a", "a"], more: ["a", "b", "b"] })).toEqual({ main: ["a", "c", "d"], more: ["b"] })
  })
})

describe("moveCard", () => {
  const layout: ActionKeyLayout = { main: ["a", "b", "c"], more: ["d", "e"] }

  it("moves a card within its part", () => {
    expect(moveCard(layout, { list: "main", index: 0 }, { list: "main", index: 2 })).toEqual({ main: ["b", "c", "a"], more: ["d", "e"] })
  })

  it("moves a card from main to More", () => {
    expect(moveCard(layout, { list: "main", index: 1 }, { list: "more", index: 1 })).toEqual({ main: ["a", "c"], more: ["d", "b", "e"] })
  })

  it("moves a card from More to main", () => {
    expect(moveCard(layout, { list: "more", index: 1 }, { list: "main", index: 0 })).toEqual({ main: ["e", "a", "b", "c"], more: ["d"] })
  })

  it("clamps an index past the end of the part", () => {
    expect(moveCard(layout, { list: "more", index: 0 }, { list: "main", index: 99 })).toEqual({ main: ["a", "b", "c", "d"], more: ["e"] })
  })

  it("can empty either part", () => {
    const one: ActionKeyLayout = { main: ["a"], more: [] }
    expect(moveCard(one, { list: "main", index: 0 }, { list: "more", index: 0 })).toEqual({ main: [], more: ["a"] })
  })

  it("leaves the layout as it is when there's no card at `from`", () => {
    expect(moveCard(layout, { list: "more", index: 5 }, { list: "main", index: 0 })).toBe(layout)
  })

  it("doesn't change the layout it's given", () => {
    moveCard(layout, { list: "main", index: 0 }, { list: "more", index: 0 })
    expect(layout).toEqual({ main: ["a", "b", "c"], more: ["d", "e"] })
  })
})

describe("laterPosition and earlierPosition", () => {
  const layout: ActionKeyLayout = { main: ["a", "b"], more: ["c", "d"] }

  it("step one place within a part", () => {
    expect(laterPosition(layout, { list: "main", index: 0 })).toEqual({ list: "main", index: 1 })
    expect(earlierPosition(layout, { list: "more", index: 1 })).toEqual({ list: "more", index: 0 })
  })

  it("cross the divider: the last of main goes first in More, the first of More goes last in main", () => {
    expect(laterPosition(layout, { list: "main", index: 1 })).toEqual({ list: "more", index: 0 })
    expect(earlierPosition(layout, { list: "more", index: 0 })).toEqual({ list: "main", index: 2 })
  })

  it("stop at the ends of the section", () => {
    expect(earlierPosition(layout, { list: "main", index: 0 })).toBeNull()
    expect(laterPosition(layout, { list: "more", index: 1 })).toBeNull()
  })

  it("cross into an empty part", () => {
    expect(laterPosition({ main: ["a"], more: [] }, { list: "main", index: 0 })).toEqual({ list: "more", index: 0 })
    expect(earlierPosition({ main: [], more: ["a"] }, { list: "more", index: 0 })).toEqual({ list: "main", index: 0 })
  })

  it("make the moves they describe", () => {
    const later = laterPosition(layout, { list: "main", index: 1 })!
    expect(moveCard(layout, { list: "main", index: 1 }, later)).toEqual({ main: ["a"], more: ["b", "c", "d"] })
    const earlier = earlierPosition(layout, { list: "more", index: 0 })!
    expect(moveCard(layout, { list: "more", index: 0 }, earlier)).toEqual({ main: ["a", "b", "c"], more: ["d"] })
  })
})

// solid-dnd uses browser layout and pointer APIs jsdom lacks, so a drag is delivered by calling the
// handlers a real one would call (see `drag`). Real dragging is checked in tests/e2e.

// The props of each DragDropProvider on the page, whose handlers `drag` calls
const providers = vi.hoisted(() => [] as DragHandlers[])
// The handler each item's drag starts from, by id
const activators = vi.hoisted(() => new Map<string, ReturnType<typeof vi.fn>>())

vi.mock("@thisbeyond/solid-dnd", async () => {
  const { onCleanup } = await import("solid-js")
  return {
    DragDropProvider: (props: ParentProps<DragHandlers>) => {
      providers.push(props)
      onCleanup(() => providers.splice(providers.indexOf(props), 1))
      return <>{props.children}</>
    },
    DragDropSensors: () => null,
    SortableProvider: (props: ParentProps) => <>{props.children}</>,
    createSortable: (id: string) => {
      const onpointerdown = vi.fn()
      activators.set(id, onpointerdown)
      return { ref: () => {}, transform: { x: 0, y: 0 }, dragActivators: { onpointerdown }, isActiveDraggable: false, isActiveDroppable: false }
    },
    createDroppable: () => ({ ref: () => {} }),
    closestCenter: () => null,
    maybeTransformStyle: () => ({}),
  }
})

// The part of solid-dnd's drag events that SortableGroup reads
interface DragEvent {
  draggable: { id: string }
  droppable?: { id: string } | null
}
interface DragHandlers {
  onDragStart: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDragEnd: (event: DragEvent) => void
}

/** A drag of `id`, over each droppable in `over` in turn, let go over the last (or over nothing). */
function drag(id: string, over: (string | null)[]) {
  for (const provider of providers) {
    provider.onDragStart({ draggable: { id } })
    for (const target of over) provider.onDragOver({ draggable: { id }, droppable: target == null ? null : { id: target } })
    const last = over.at(-1)
    provider.onDragEnd({ draggable: { id }, droppable: last == null ? null : { id: last } })
  }
}
/** The droppable of a list itself, which takes a drop when it's empty (see sortable.tsx). */
const listDroppable = (list: string) => `\u0000list:${list}`

import { createSignal, For, untrack, type ParentProps } from "solid-js"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"

import { SortableGroup, SortableHandle, SortableList, SortableMoveButton, createSortableItem, moveItem, type SortablePosition } from "@/components/ui/sortable"

import { cleanup, cleanupPortals, fireEvent, render, screen, waitFor } from "../../test-utils"

function Row(props: { id: string; index: number; count: number; onMove: (to: number) => void; wholeItem?: boolean }) {
  const item = createSortableItem(untrack(() => props.id))
  const name = () => props.id.toUpperCase()
  return (
    <li ref={item.ref} style={item.style()} data-test={`row-${props.id}`} onPointerDown={(e) => { if (props.wholeItem) item.onItemPointerDown(e) }}>
      <span>{name()}</span>
      <SortableMoveButton item={item} name={name()} direction="earlier" orientation="vertical"
        onMove={props.index > 0 ? () => props.onMove(props.index - 1) : undefined} />
      <SortableHandle
        item={item}
        name={name()}
        dragsWithItem={props.wholeItem}
        data-test={`handle-${props.id}`}
        menuItems={[
          { label: "Move to start", disabled: props.index === 0, onSelect: () => props.onMove(0) },
          { label: "Move to end", disabled: props.index === props.count - 1, onSelect: () => props.onMove(props.count - 1) },
        ]}
      />
      <SortableMoveButton item={item} name={name()} direction="later" orientation="vertical"
        onMove={props.index < props.count - 1 ? () => props.onMove(props.index + 1) : undefined} />
    </li>
  )
}

/** Two lists of letters, `top` and `bottom`, as a caller of SortableGroup keeps them. */
function Harness(props: { initial?: Record<string, string[]>; onMove?: (id: string, to: SortablePosition) => void; wholeItem?: boolean }) {
  const [lists, setLists] = createSignal<Record<string, string[]>>(untrack(() => props.initial) ?? { top: ["a", "b", "c"], bottom: [] })
  const listOf = (id: string) => Object.keys(lists()).find((list) => lists()[list].includes(id))!
  const move = (id: string, to: SortablePosition) => {
    props.onMove?.(id, to)
    const next = Object.fromEntries(Object.entries(lists()).map(([list, ids]) => [list, ids.filter((i) => i !== id)]))
    next[to.list].splice(to.index, 0, id)
    setLists(next)
  }
  const describe = (id: string) => `${id.toUpperCase()} moved to ${listOf(id)}, position ${lists()[listOf(id)].indexOf(id) + 1} of ${lists()[listOf(id)].length}`
  return (
    <SortableGroup onMove={move} describe={describe} data-test="letters">
      <For each={Object.keys(lists())}>
        {(list) => (
          <SortableList id={list} ids={lists()[list]} data-test={`list-${list}`}>
            <ul>
              <For each={lists()[list]}>
                {(id, index) => <Row id={id} index={index()} count={lists()[list].length} wholeItem={props.wholeItem} onMove={(to) => move(id, { list, index: to })} />}
              </For>
            </ul>
          </SortableList>
        )}
      </For>
    </SortableGroup>
  )
}

const provider = () => providers[0]
const order = (list = "top") => [...screen.getByTestId(`list-${list}`).querySelectorAll("li")].map((li) => li.dataset.test)

describe("SortableGroup", () => {
  beforeEach(() => {
    cleanup()
    cleanupPortals()
  })
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  describe("move buttons", () => {
    it("move an item one place, and are disabled at the ends of the list", () => {
      render(() => <Harness />)
      expect(screen.getByRole("button", { name: "Move A earlier" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Move C later" })).toBeDisabled()

      fireEvent.click(screen.getByRole("button", { name: "Move A later" }))
      expect(order()).toEqual(["row-b", "row-a", "row-c"])

      fireEvent.click(screen.getByRole("button", { name: "Move C earlier" }))
      expect(order()).toEqual(["row-b", "row-c", "row-a"])
    })

    it("keep focus on the button that was pressed, wherever the item now is", async () => {
      render(() => <Harness />)
      const later = screen.getByRole("button", { name: "Move A later" })
      later.focus()
      fireEvent.click(later)

      await waitFor(() => expect(screen.getByRole("button", { name: "Move A later" })).toHaveFocus())
    })

    it("move focus to the other button when the item reaches the end", async () => {
      render(() => <Harness />)
      fireEvent.click(screen.getByRole("button", { name: "Move B later" }))

      await waitFor(() => expect(screen.getByRole("button", { name: "Move B earlier" })).toHaveFocus())
    })

    it("announce where the item went", async () => {
      render(() => <Harness />)
      fireEvent.click(screen.getByRole("button", { name: "Move A later" }))

      await waitFor(() => expect(screen.getByTestId("letters-announcement")).toHaveTextContent("A moved to top, position 2 of 3"))
    })
  })

  describe("handle", () => {
    it("is named for its item and opens a menu of moves on a click", async () => {
      const user = userEvent.setup()
      render(() => <Harness />)

      await user.click(screen.getByRole("button", { name: "Reorder B" }))

      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument())
      expect(screen.getByRole("menuitem", { name: "Move to start" })).toBeInTheDocument()
      expect(screen.getByRole("menuitem", { name: "Move to end" })).toBeInTheDocument()
    })

    it.each(["{Enter}", " "])("opens its menu from the keyboard (%s)", async (key) => {
      const user = userEvent.setup()
      render(() => <Harness />)

      screen.getByRole("button", { name: "Reorder B" }).focus()
      await user.keyboard(key)

      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument())
    })

    it("disables the moves the item can't make", async () => {
      const user = userEvent.setup()
      render(() => <Harness />)

      await user.click(screen.getByRole("button", { name: "Reorder A" }))

      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Move to start" })).toHaveAttribute("aria-disabled", "true"))
      expect(screen.getByRole("menuitem", { name: "Move to end" })).not.toHaveAttribute("aria-disabled", "true")
    })

    it("moves the item from its menu, then returns focus to the handle and announces the move", async () => {
      const user = userEvent.setup()
      render(() => <Harness />)

      await user.click(screen.getByRole("button", { name: "Reorder A" }))
      await user.click(await screen.findByRole("menuitem", { name: "Move to end" }))

      expect(order()).toEqual(["row-b", "row-c", "row-a"])
      expect(screen.getByRole("button", { name: "Reorder A" })).toHaveAttribute("aria-expanded", "false")
      await waitFor(() => expect(screen.getByRole("button", { name: "Reorder A" })).toHaveFocus())
      await waitFor(() => expect(screen.getByTestId("letters-announcement")).toHaveTextContent("A moved to top, position 3 of 3"))
    })

    it("closes its menu on a second click", async () => {
      const user = userEvent.setup()
      render(() => <Harness />)
      const handle = screen.getByRole("button", { name: "Reorder B" })

      await user.click(handle)
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument())
      await user.click(handle)

      // jsdom never ends the closing animation the menu waits for before it's removed (see dropdown-menu.test.tsx)
      await waitFor(() => expect(handle).toHaveAttribute("aria-expanded", "false"))
    })
  })

  describe("dragging", () => {
    it("moves an item to where it's let go in its list", () => {
      const onMove = vi.fn()
      render(() => <Harness onMove={onMove} />)

      drag("a", ["c"])

      expect(onMove).toHaveBeenCalledExactlyOnceWith("a", { list: "top", index: 2 })
      expect(order()).toEqual(["row-b", "row-c", "row-a"])
    })

    it("moves an item into another list as soon as it's over it, so only that list makes room", () => {
      const onMove = vi.fn()
      render(() => <Harness initial={{ top: ["a", "b"], bottom: ["c", "d"] }} onMove={onMove} />)

      provider().onDragStart({ draggable: { id: "c" } })
      provider().onDragOver({ draggable: { id: "c" }, droppable: { id: "b" } })

      // Before it's let go: in the top list, where b was, and b still in the top list
      expect(onMove).toHaveBeenCalledExactlyOnceWith("c", { list: "top", index: 1 })
      expect(order("top")).toEqual(["row-a", "row-c", "row-b"])
      expect(order("bottom")).toEqual(["row-d"])

      provider().onDragEnd({ draggable: { id: "c" }, droppable: { id: "c" } })
      expect(onMove).toHaveBeenCalledOnce()
    })

    it("drops an item into an empty list by the list's own droppable", () => {
      render(() => <Harness />)

      drag("b", [listDroppable("bottom")])

      expect(order("top")).toEqual(["row-a", "row-c"])
      expect(order("bottom")).toEqual(["row-b"])
    })

    it.each([
      ["back where it started", ["b"]],
      ["over nothing", [null]],
      ["onto something not in the group", ["z"]],
    ])("moves nothing for an item let go %s", (_label, over) => {
      const onMove = vi.fn()
      render(() => <Harness onMove={onMove} />)

      drag("b", over)

      expect(onMove).not.toHaveBeenCalled()
    })

    it("announces where a dragged item went", async () => {
      render(() => <Harness />)

      drag("c", ["a"])

      await waitFor(() => expect(screen.getByTestId("letters-announcement")).toHaveTextContent("C moved to top, position 1 of 3"))
    })

    it("tells the caller which item is being dragged", () => {
      const onDragging = vi.fn()
      render(() => (
        <SortableGroup onMove={() => {}} describe={() => ""} onDragging={onDragging} data-test="g">
          <SortableList id="only" ids={["a"]}><ul><Row id="a" index={0} count={1} onMove={() => {}} /></ul></SortableList>
        </SortableGroup>
      ))

      drag("a", ["a"])

      expect(onDragging.mock.calls).toEqual([["a"], [null]])
    })
  })

  describe("dragging by the whole item", () => {
    // jsdom's pointer events don't carry a pointerType, so it's set on the event by hand
    const press = (target: Element, pointerType: string) => {
      const event = new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      Object.defineProperty(event, "pointerType", { value: pointerType })
      target.dispatchEvent(event)
    }

    it("starts a drag from any part of the item with a mouse", () => {
      render(() => <Harness wholeItem />)
      press(screen.getByText("B"), "mouse")
      expect(activators.get("b")).toHaveBeenCalledOnce()
    })

    it("leaves the item's other controls working as they are", () => {
      render(() => <Harness wholeItem />)
      press(screen.getByRole("button", { name: "Move B later" }), "mouse")
      expect(activators.get("b")).not.toHaveBeenCalled()
    })

    it("starts a touch drag only on the handle, so a swipe across the item scrolls the page", () => {
      render(() => <Harness wholeItem />)
      press(screen.getByText("B"), "touch")
      expect(activators.get("b")).not.toHaveBeenCalled()

      press(screen.getByRole("button", { name: "Reorder B" }), "touch")
      expect(activators.get("b")).toHaveBeenCalledOnce()
    })

    it("doesn't start a drag from a press in the handle's menu, which is portalled out of the item", async () => {
      const user = userEvent.setup()
      render(() => <Harness wholeItem />)
      await user.click(screen.getByRole("button", { name: "Reorder B" }))
      activators.get("b")!.mockClear()

      press(await screen.findByRole("menuitem", { name: "Move to end" }), "mouse")

      expect(activators.get("b")).not.toHaveBeenCalled()
    })

    it("starts the drag once from the handle, which doesn't start one of its own", () => {
      render(() => <Harness wholeItem />)
      press(screen.getByRole("button", { name: "Reorder B" }), "mouse")
      expect(activators.get("b")).toHaveBeenCalledOnce()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <Harness />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe("moveItem", () => {
  it("moves an item to a new index without changing the array it's given", () => {
    const items = ["a", "b", "c"]
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a"])
    expect(moveItem(items, 2, 0)).toEqual(["c", "a", "b"])
    expect(items).toEqual(["a", "b", "c"])
  })
})

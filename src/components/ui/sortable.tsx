// Reorderable lists: drag an item (by its handle, or by any part of it), or use the move buttons and
// the handle's menu, which do the same from the keyboard or with a single tap (ACCESSIBILITY.md §4:
// dragging is never the only way).
// Wraps @thisbeyond/solid-dnd, so nothing else uses it directly.

import { createContext, createEffect, createSignal, Index, onCleanup, splitProps, untrack, useContext, type JSX, type ParentProps } from "solid-js"
import { Dynamic } from "solid-js/web"
import {
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  createDroppable,
  createSortable,
  closestCenter,
  maybeTransformStyle,
} from "@thisbeyond/solid-dnd"
import type { CollisionDetector, DragEvent } from "@thisbeyond/solid-dnd"
import GripVertical from "lucide-solid/icons/grip-vertical"
import ChevronLeft from "lucide-solid/icons/chevron-left"
import ChevronRight from "lucide-solid/icons/chevron-right"
import ChevronUp from "lucide-solid/icons/chevron-up"
import ChevronDown from "lucide-solid/icons/chevron-down"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn, TOUCH_TARGET_BOX } from "@/lib/utils"

/** A control of an item, which keeps focus once the item has moved. */
export type SortableControl = "handle" | "earlier" | "later"

/** A place in a SortableGroup: a list, and an index in it. */
export interface SortablePosition {
  list: string
  index: number
}

interface SortableGroupContext {
  /**
   * After an item has moved: focuses the given control of it (see `focus`), and tells screen reader
   * users where it went.
   */
  moved: (id: string, control: SortableControl) => void
  /** Focuses the given control of an item, or the next best one if that's disabled, once the list has updated. */
  focus: (id: string, control: SortableControl) => void
  /** The value of a control's data-sortable-control attribute, which `moved` finds it by. */
  controlKey: (id: string, control: SortableControl) => string
  /** Adds a list to the group, for as long as it's on the page: its props, whose ids are read as they are when needed. */
  register: (id: string, list: { ids: string[] }) => void
}

const GroupContext = createContext<SortableGroupContext>()

const useGroup = () => {
  const context = useContext(GroupContext)
  if (!context) throw new Error("A sortable list or item must be inside a SortableGroup")
  return context
}

// Groups on one page can hold the same ids (a spell listed in two sections), so each group's
// controls are told apart by a number of its own.
let nextGroupId = 0

// The id of a list's own droppable, which takes a drop when the list is empty
const CONTAINER = "\u0000list:"
const containerId = (list: string) => `${CONTAINER}${list}`

export interface SortableGroupProps extends ParentProps {
  /**
   * Moves item `id` to `to`, whose index is a place in its list once the item has been taken out of
   * where it is. Dragging calls it as soon as an item crosses into another list, so that list makes
   * room for it, and again where it's let go.
   */
  onMove: (id: string, to: SortablePosition) => void
  /** Where an item is now, announced after each move: "Longsword moved to position 2 of 5". */
  describe: (id: string) => string
  /** With more than one list: the list a dragged item is over, by where the pointer is (viewport coordinates). */
  listAt?: (point: { x: number; y: number }) => string
  /** Told the item being dragged, and null once it's let go. */
  onDragging?: (id: string | null) => void
  /** Page-unique; prefixes the hook of the group's announcements. */
  "data-test": string
}

/**
 * One or more SortableLists whose items (each made with createSortableItem) can be dragged into a
 * new order, and from one list to another. Renders no element of its own, only a hidden live region
 * for move announcements.
 */
export function SortableGroup(props: SortableGroupProps) {
  const groupId = nextGroupId++
  const [message, setMessage] = createSignal("")
  const lists = new Map<string, { ids: string[] }>()

  const controlKey = (id: string, control: SortableControl) => `${groupId}:${control}:${id}`
  const findControl = (id: string, control: SortableControl) =>
    [...document.querySelectorAll<HTMLButtonElement>("[data-sortable-control]")].find(
      (el) => el.dataset.sortableControl === controlKey(id, control),
    )
  // Called once a move has been made, so the description is of where the item is now
  const announce = (id: string) => {
    const text = untrack(() => props.describe(id))
    // Cleared first, so the same message twice in a row is read again
    setMessage("")
    queueMicrotask(() => setMessage(text))
  }
  const focus = (id: string, control: SortableControl) => {
    // Once the list has updated: moving an element out of its place loses its focus
    queueMicrotask(() => {
      const order: SortableControl[] = control === "earlier" ? ["earlier", "later", "handle"]
        : control === "later" ? ["later", "earlier", "handle"] : ["handle"]
      for (const candidate of order) {
        const el = findControl(id, candidate)
        if (el && !el.disabled) {
          el.focus()
          return
        }
      }
    })
  }
  const context: SortableGroupContext = {
    moved: (id, control) => {
      announce(id)
      focus(id, control)
    },
    focus,
    controlKey,
    register: (id, list) => {
      lists.set(id, list)
      onCleanup(() => lists.delete(id))
    },
  }

  /** Where an item is, or a droppable (an item, or an empty list's own) would put one. */
  const positionOf = (id: string): SortablePosition | null => untrack(() => {
    if (id.startsWith(CONTAINER)) {
      const list = id.slice(CONTAINER.length)
      return { list, index: lists.get(list)?.ids.length ?? 0 }
    }
    for (const [list, { ids }] of lists) {
      const index = ids.indexOf(id)
      if (index >= 0) return { list, index }
    }
    return null
  })

  // Where the pointer is during a drag. Which list an item is over goes by the pointer, not by the
  // item's position: moving the item into another list moves its element, and for a moment solid-dnd
  // reports it a pointer step out, which near the boundary put it straight back, and so on, freezing
  // the page. The pointer doesn't move when the item does.
  let pointer: { x: number; y: number } | null = null
  const trackPointer = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY }
  }
  const stopTracking = () => {
    document.removeEventListener("pointermove", trackPointer, true)
    pointer = null
  }
  onCleanup(stopTracking)

  // Each list's items, or its own droppable when it has none, of the list the dragged item is over
  const collisionDetector: CollisionDetector = (draggable, droppables, context) => {
    const list = lists.size > 1 && props.listAt ? props.listAt(pointer ?? draggable.transformed.center) : undefined
    const inList = list == null ? droppables : droppables.filter((d) => {
      const position = positionOf(String(d.id))
      return position?.list === list
    })
    const items = inList.filter((d) => !String(d.id).startsWith(CONTAINER))
    return closestCenter(draggable, items.length > 0 ? items : inList, context)
  }

  let start: SortablePosition | null = null
  const onDragStart = ({ draggable }: DragEvent) => {
    // Captured on the document, so it's up to date before solid-dnd's own handler checks for a new list
    document.addEventListener("pointermove", trackPointer, true)
    start = positionOf(String(draggable.id))
    props.onDragging?.(String(draggable.id))
  }
  // Into another list as soon as the item is over it: the other list makes room, and its own items
  // shift within it, rather than all of them shifting as one list
  const onDragOver = ({ draggable, droppable }: DragEvent) => {
    if (!droppable) return
    const id = String(draggable.id)
    const from = positionOf(id)
    const to = positionOf(String(droppable.id))
    if (from == null || to == null || from.list === to.list) return
    props.onMove(id, to)
  }
  const onDragEnd = ({ draggable, droppable }: DragEvent) => {
    const id = String(draggable.id)
    const began = start
    start = null
    stopTracking()
    props.onDragging?.(null)
    if (droppable) {
      const from = positionOf(id)
      const to = positionOf(String(droppable.id))
      if (from != null && to != null && (from.list !== to.list || from.index !== to.index)) {
        // An empty list's own droppable is only ever the list's end, where the item already is
        if (!String(droppable.id).startsWith(CONTAINER) || from.list !== to.list) props.onMove(id, to)
      }
    }
    const now = positionOf(id)
    if (now != null && (began == null || now.list !== began.list || now.index !== began.index)) announce(id)
  }

  return (
    <GroupContext.Provider value={context}>
      <DragDropProvider onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} collisionDetector={collisionDetector}>
        <DragDropSensors />
        {props.children}
      </DragDropProvider>
      <div class="sr-only" aria-live="polite" aria-atomic="true" data-test={`${props["data-test"]}-announcement`}>{message()}</div>
    </GroupContext.Provider>
  )
}

export interface SortableListProps extends ParentProps {
  /** The list's name in its group. */
  id: string
  /** The ids of the list's items, in order. */
  ids: string[]
  class?: string
  "data-test"?: string
}

/** A list of a SortableGroup: an element holding its items, which also takes a drop when it has none. */
export function SortableList(props: SortableListProps) {
  const group = useGroup()
  group.register(untrack(() => props.id), props)
  const droppable = createDroppable(containerId(untrack(() => props.id)))
  return (
    <div ref={(el) => droppable.ref(el)} class={props.class} data-test={props["data-test"]}>
      <SortableProvider ids={props.ids}>{props.children}</SortableProvider>
    </div>
  )
}

/** An item of a SortableList: put `ref` and `style` on its element, and a SortableHandle in it. */
export interface SortableItem {
  id: string
  ref: (el: HTMLElement) => void
  style: () => JSX.CSSProperties | undefined
  /** Whether the item is being dragged. */
  isDragging: () => boolean
  /** The pointer handlers that start a drag, for a handle that is the only place a drag starts. */
  dragActivators: () => JSX.HTMLAttributes<HTMLButtonElement>
  /**
   * For an item dragged by any part of it: its element's pointerdown handler. A press on one of its
   * other controls works as that control, and a touch starts a drag only on the handle, so a swipe
   * across the item still scrolls the page.
   */
  onItemPointerDown: (e: PointerEvent) => void
}

// What a press on doesn't start a drag of the whole item: its own controls (except the handle)
const ITEM_CONTROLS = 'button, a, input, select, textarea, [role="button"], [role="menuitem"]'

/** Makes the item `id` of the enclosing SortableList draggable. Call it in the item's component. */
export function createSortableItem(id: string): SortableItem {
  const sortable = createSortable(id)
  // solid-dnd gives them as `on<event>` handlers, which an element takes as they are
  const activators = () => sortable.dragActivators as Record<string, ((e: Event) => void) | undefined>
  return {
    id,
    ref: (el) => sortable.ref(el),
    style: () => maybeTransformStyle(sortable.transform),
    isDragging: () => sortable.isActiveDraggable,
    dragActivators: () => activators() as JSX.HTMLAttributes<HTMLButtonElement>,
    onItemPointerDown: (e) => {
      const target = e.target as Element
      // Solid passes presses inside portalled content (the handle's menu) up through the item too
      if (!(e.currentTarget as Node).contains(target)) return
      const onHandle = target.closest("[data-sortable-handle]") != null
      if (!onHandle && (target.closest(ITEM_CONTROLS) != null || e.pointerType === "touch")) return
      activators().onpointerdown?.(e)
    },
  }
}

/** A choice in a handle's menu. */
export interface SortableMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
  "data-test"?: string
}

export interface SortableHandleProps {
  item: SortableItem
  /** The item's name, for the handle's label. */
  name: string
  /** Whether the whole item is dragged (see onItemPointerDown), rather than only by this handle. */
  dragsWithItem?: boolean
  /** The moves the handle's menu offers. Once one has moved the item, focus returns to its handle and the move is announced. */
  menuItems: SortableMenuItem[]
  "data-test"?: string
  class?: string
}

/**
 * The grip an item is dragged by. A click, Enter or Space opens a menu of moves instead (Move to
 * start, Move to end…), so the handle works without dragging too.
 */
export function SortableHandle(props: SortableHandleProps) {
  const list = useGroup()
  const [open, setOpen] = createSignal(false)
  // A drag ends with a click on the handle (the pointer is let go over it): that click mustn't open the menu
  let dragged = false
  createEffect(() => {
    if (props.item.isDragging()) {
      dragged = true
      setOpen(false)
    }
  })
  // Whether a menu choice moved the item: if so, focus goes to its handle wherever it now is, not
  // to where the menu was opened from (an element the move may have replaced)
  let moved = false

  // The menu's trigger. Kobalte opens a menu on a mouse press, which would open it at the start of
  // every drag, so the trigger's press handler is left out and a click opens the menu instead.
  const Grip = (gripProps: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const [local, others] = splitProps(gripProps, ["onPointerDown", "onClick", "onKeyDown"])
    return (
      <button
        type="button"
        {...others}
        {...(props.dragsWithItem ? {} : props.item.dragActivators())}
        data-sortable-handle=""
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter is the edit form's Save, which the menu's own Enter handling would swallow
          if (e.ctrlKey || e.metaKey) return
          if (typeof local.onKeyDown === "function") local.onKeyDown(e)
        }}
        onClick={(e) => {
          if (dragged) {
            dragged = false
            return
          }
          // A click made by Enter or Space: the menu's own key handling has already opened it
          if (e.detail === 0) return
          setOpen((wasOpen) => !wasOpen)
        }}
      />
    )
  }

  return (
    <DropdownMenu open={open()} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        as={Grip}
        class={cn(TOUCH_TARGET_BOX, "cursor-grab touch-none rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", props.class)}
        aria-label={`Reorder ${props.name}`}
        data-test={props["data-test"]}
        data-sortable-control={list.controlKey(props.item.id, "handle")}
      >
        <GripVertical class="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-test={props["data-test"] ? `${props["data-test"]}-menu` : undefined}
        onCloseAutoFocus={(e: Event) => {
          if (!moved) return
          moved = false
          e.preventDefault()
          list.focus(props.item.id, "handle")
        }}
      >
        {/* Index, so the items stay put while a move rebuilds the list of them */}
        <Index each={props.menuItems}>
          {(menuItem) => (
            <DropdownMenuItem
              data-test={menuItem()["data-test"]}
              disabled={menuItem().disabled}
              onSelect={() => {
                // Closed before the move, which can move the handle's own element
                setOpen(false)
                moved = true
                untrack(menuItem().onSelect)
                list.moved(props.item.id, "handle")
              }}
            >
              {menuItem().label}
            </DropdownMenuItem>
          )}
        </Index>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface SortableMoveButtonProps {
  item: SortableItem
  /** The item's name, for the button's label. */
  name: string
  direction: "earlier" | "later"
  /** Left/right arrows for a list that runs across (a grid), up/down for one that runs down. */
  orientation: "horizontal" | "vertical"
  /** Moves the item; omitted when it can't move this way. Focus then stays on the button, and the move is announced. */
  onMove?: () => void
  "data-test"?: string
  class?: string
}

/** Moves an item one place earlier or later. */
export function SortableMoveButton(props: SortableMoveButtonProps) {
  const list = useGroup()
  const icon = () => {
    const earlier = props.direction === "earlier"
    return props.orientation === "horizontal" ? (earlier ? ChevronLeft : ChevronRight) : (earlier ? ChevronUp : ChevronDown)
  }
  return (
    <button
      type="button"
      class={cn(
        TOUCH_TARGET_BOX,
        "rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        props.class,
      )}
      aria-label={`Move ${props.name} ${props.direction}`}
      data-test={props["data-test"]}
      data-sortable-control={list.controlKey(props.item.id, props.direction)}
      disabled={!props.onMove}
      onClick={() => {
        props.onMove?.()
        list.moved(props.item.id, props.direction)
      }}
    >
      <Dynamic component={icon()} class="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

/** The array with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

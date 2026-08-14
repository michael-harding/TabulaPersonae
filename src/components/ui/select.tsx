import {
  createContext,
  createSignal,
  useContext,
  JSX,
  ComponentProps,
  splitProps,
  onCleanup,
  onMount,
} from "solid-js"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Check from "lucide-solid/icons/check"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value: () => string | undefined
  onValueChange: (value: string) => void
  open: () => boolean
  setOpen: (open: boolean) => void
  placeholder: () => string | undefined
  disabled: () => boolean
  // Ordered list of currently-mounted option values, self-reported by SelectItem via
  // registerItem — reading the DOM for this instead races the props.children insertion effect
  // (the <ul>'s ref can fire before its dynamic children are actually attached).
  items: () => string[]
  registerItem: (value: string) => () => void
  // The keyboard-highlighted item. Derived rather than imperatively set on open, so it's always
  // consistent with the current items() list instead of depending on precise mount-order timing.
  activeValue: () => string | undefined
  setActiveValue: (value: string | undefined) => void
  listEl: () => HTMLUListElement | undefined
  setListEl: (el: HTMLUListElement | undefined) => void
}

const SelectContext = createContext<SelectContextType>()

function useSelect() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error("Select components must be used within <Select>")
  return ctx
}

// Shared between SelectTrigger's aria-activedescendant and SelectItem's id — option values can
// contain spaces (e.g. "Saving Throw Proficiency"), which HTML5 id attributes may not.
function optionId(value: string) {
  return `select-option-${value.replace(/\s+/g, "-")}`
}

type SelectRootProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children?: JSX.Element
  disabled?: boolean
}

export function Select(props: SelectRootProps) {
  const [open, setOpenInternal] = createSignal(false)
  const [internalValue, setInternalValue] = createSignal(props.defaultValue)
  const [items, setItems] = createSignal<string[]>([])
  const [explicitActive, setExplicitActive] = createSignal<string | undefined>(undefined)
  const [listEl, setListEl] = createSignal<HTMLUListElement>()
  const value = () => props.value ?? internalValue()

  // Falls back to the current value's item, then the first item, whenever nothing has been
  // explicitly highlighted yet (just opened, or the explicit pick scrolled out of items()).
  const activeValue = () => {
    const list = items()
    if (list.length === 0) return undefined
    const explicit = explicitActive()
    if (explicit !== undefined && list.includes(explicit)) return explicit
    const current = value()
    return current !== undefined && list.includes(current) ? current : list[0]
  }

  // Closing the popup by any path (select, outside click, Escape, Tab) also drops the explicit
  // keyboard highlight, so the next open starts fresh instead of resuming a stale pick.
  const setOpen = (next: boolean) => {
    setOpenInternal(next)
    if (!next) setExplicitActive(undefined)
  }

  const registerItem = (v: string) => {
    setItems((prev) => [...prev, v])
    return () => setItems((prev) => {
      const idx = prev.indexOf(v)
      return idx === -1 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  const onValueChange = (v: string) => {
    setInternalValue(v)
    props.onValueChange?.(v)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{
      value, onValueChange, open, setOpen,
      placeholder: () => props.placeholder, disabled: () => props.disabled ?? false,
      items, registerItem, activeValue, setActiveValue: setExplicitActive,
      listEl, setListEl,
    }}>
      <div data-sem="select" class="relative">
        {props.children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger(props: ComponentProps<"button">) {
  const [local, others] = splitProps(props, ["class", "children"])
  const ctx = useSelect()

  const moveActive = (delta: number) => {
    const list = ctx.items()
    if (list.length === 0) return
    const current = list.indexOf(ctx.activeValue() ?? "")
    const next = current === -1
      ? (delta > 0 ? 0 : list.length - 1)
      : Math.min(Math.max(current + delta, 0), list.length - 1)
    ctx.setActiveValue(list[next])
    ctx.listEl()?.querySelector<HTMLElement>(`[data-value="${CSS.escape(list[next])}"]`)?.scrollIntoView?.({ block: "nearest" })
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (ctx.disabled()) return
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!ctx.open()) {
        ctx.setOpen(true)
        return
      }
      moveActive(e.key === "ArrowDown" ? 1 : -1)
    } else if (e.key === "Enter" || e.key === " ") {
      // Only intercept once something is highlighted — otherwise let the native button click
      // (fired on Enter/Space by default) open/close the popup as usual.
      if (ctx.open() && ctx.activeValue() !== undefined) {
        e.preventDefault()
        ctx.onValueChange(ctx.activeValue()!)
      }
    } else if (e.key === "Escape") {
      if (ctx.open()) {
        e.preventDefault()
        // Stop this Escape from also closing a surrounding Modal — only the dropdown should close.
        // stopPropagation alone isn't enough: Solid delegates keydown via a single document-level
        // listener, and a Modal's own Escape handling may be a separate document-level listener on
        // the same node — only stopImmediatePropagation reliably blocks a same-node sibling listener.
        e.stopImmediatePropagation()
        ctx.setOpen(false)
      }
    } else if (e.key === "Tab") {
      if (ctx.open()) ctx.setOpen(false)
    }
  }

  return (
    <button
      type="button"
      aria-expanded={ctx.open()}
      aria-haspopup="listbox"
      aria-activedescendant={ctx.activeValue() !== undefined ? optionId(ctx.activeValue()!) : undefined}
      disabled={ctx.disabled()}
      onClick={() => !ctx.disabled() && ctx.setOpen(!ctx.open())}
      onKeyDown={handleKeyDown}
      class={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        local.class
      )}
      {...others}
    >
      {local.children}
      <ChevronDown class="h-4 w-4 opacity-50 shrink-0" />
    </button>
  )
}

export function SelectValue(props: { placeholder?: string }) {
  const ctx = useSelect()
  return (
    <span class="flex-1 text-left">
      {/* Every "" SelectItem across this app's usages represents "nothing selected" (paired with
          a "None"/"Not item-granted" label), not a real value — ?? alone wouldn't fall through to
          the placeholder for "", since "" isn't nullish. */}
      {ctx.value() || props.placeholder || ctx.placeholder() || ""}
    </span>
  )
}

export function SelectContent(props: ComponentProps<"ul">) {
  const [local, others] = splitProps(props, ["class", "children"])
  const ctx = useSelect()
  let ref!: HTMLDivElement

  const handleOutsideClick = (e: MouseEvent) => {
    if (!ref?.contains(e.target as Node)) {
      ctx.setOpen(false)
    }
  }

  onMount(() => document.addEventListener("mousedown", handleOutsideClick))
  onCleanup(() => document.removeEventListener("mousedown", handleOutsideClick))

  return (
    <div ref={ref} class="relative">
      {ctx.open() && (
        <ul
          ref={ctx.setListEl}
          role="listbox"
          class={cn(
            "absolute z-50 max-h-96 min-w-[8rem] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
            local.class
          )}
          {...others}
        >
          {local.children}
        </ul>
      )}
    </div>
  )
}

export function SelectItem(props: ComponentProps<"li"> & { value: string }) {
  const [local, others] = splitProps(props, ["class", "value", "children"])
  const ctx = useSelect()

  const unregister = ctx.registerItem(local.value)
  onCleanup(unregister)

  const isSelected = () => ctx.value() === local.value
  const isActive = () => ctx.activeValue() === local.value
  return (
    <li
      id={optionId(local.value)}
      data-value={local.value}
      role="option"
      aria-selected={isSelected()}
      onClick={() => ctx.onValueChange(local.value)}
      // mousemove, not mouseenter/mouseover: keyboard nav scrolls the list under a stationary
      // cursor, and browsers fire synthetic mouseenter on whatever ends up underneath — but only
      // real cursor movement fires mousemove, so this avoids hover silently fighting the keyboard.
      onMouseMove={() => ctx.setActiveValue(local.value)}
      class={cn(
        "menu-item relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        isActive() && "bg-accent text-accent-foreground",
        local.class
      )}
      {...others}
    >
      {isSelected() && (
        <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check class="h-4 w-4" />
        </span>
      )}
      {local.children}
    </li>
  )
}

export const SelectGroup = "optgroup" as unknown as (props: ComponentProps<"optgroup">) => JSX.Element
export const SelectLabel = (props: ComponentProps<"li">) => {
  const [local, others] = splitProps(props, ["class"])
  return <li class={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", local.class)} {...others} />
}
export const SelectSeparator = (props: ComponentProps<"li">) => {
  const [local, others] = splitProps(props, ["class"])
  return <li class={cn("-mx-1 my-1 h-px bg-muted", local.class)} role="separator" {...others} />
}

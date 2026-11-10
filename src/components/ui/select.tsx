import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  useContext,
  For,
  Show,
  JSX,
  ComponentProps,
  splitProps,
  onCleanup,
  onMount,
} from "solid-js"
import type { Component } from "solid-js"
import { Dynamic } from "solid-js/web"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Check from "lucide-solid/icons/check"

import { cn } from "@/lib/utils"

export type SelectIcon = Component<{ class?: string; "aria-hidden"?: "true" }>

export interface SelectOption {
  value: string
  /** What the list and the trigger show. Plain text, so it can appear in both places at once. */
  label: string
  /** Shown after the label, in the list and in the trigger. Decorative, so hidden from assistive technology. */
  icon?: SelectIcon
  /** Dims the option, in the list and in the trigger. Pair it with an icon or srHint: color alone carries no meaning. */
  muted?: boolean
  /** Read by screen readers after the label, e.g. why the option is muted. */
  srHint?: string
}

interface SelectContextType {
  value: () => string | undefined
  onValueChange: (value: string) => void
  open: () => boolean
  setOpen: (open: boolean) => void
  placeholder: () => string | undefined
  disabled: () => boolean
  options: () => SelectOption[]
  optionFor: (value: string | undefined) => SelectOption | undefined
  // The keyboard-highlighted value. Derived rather than imperatively set on open, so it's always
  // consistent with the current options.
  activeValue: () => string | undefined
  setActiveValue: (value: string | undefined) => void
  optionId: (value: string) => string
  listEl: () => HTMLUListElement | undefined
  setListEl: (el: HTMLUListElement | undefined) => void
  // The list's id, for the trigger's aria-controls
  listId: string
  // The trigger, which is what gives the list its accessible name
  triggerEl: () => HTMLButtonElement | undefined
  setTriggerEl: (el: HTMLButtonElement | undefined) => void
  // The element wrapping the trigger and the popup, for telling inside clicks from outside ones.
  // Held as a ref because `data-sem` is stripped from production builds and can't be queried.
  rootEl: () => HTMLDivElement | undefined
}

const SelectContext = createContext<SelectContextType>()

function useSelect() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error("Select components must be used within <Select>")
  return ctx
}

type SelectRootProps = {
  options: SelectOption[]
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
  const [explicitActive, setExplicitActive] = createSignal<string | undefined>(undefined)
  const [listEl, setListEl] = createSignal<HTMLUListElement>()
  const [rootEl, setRootEl] = createSignal<HTMLDivElement>()
  const [triggerEl, setTriggerEl] = createSignal<HTMLButtonElement>()
  const baseId = createUniqueId()
  const value = () => props.value ?? internalValue()

  const byValue = createMemo(() => new Map(props.options.map((o) => [o.value, o])))
  const optionFor = (v: string | undefined) => (v == null ? undefined : byValue().get(v))

  // Falls back to the current value's option, then the first, whenever nothing has been
  // explicitly highlighted yet (just opened, or the explicit pick is no longer an option).
  const activeValue = createMemo(() => {
    const options = props.options
    if (options.length === 0) return undefined
    const explicit = explicitActive()
    if (explicit != null && byValue().has(explicit)) return explicit
    const current = value()
    return current != null && byValue().has(current) ? current : options[0].value
  })

  // Closing the popup by any path (select, outside click, Escape, Tab) also drops the explicit
  // keyboard highlight, so the next open starts fresh instead of resuming a stale pick.
  const setOpen = (next: boolean) => {
    setOpenInternal(next)
    if (!next) setExplicitActive(undefined)
  }

  const onValueChange = (v: string) => {
    setInternalValue(v)
    props.onValueChange?.(v)
    setOpen(false)
  }

  // Scoped to this select: several selects on a page can share option values. Option values can
  // also contain spaces (e.g. "Saving Throw Proficiency"), which HTML5 id attributes may not.
  const optionId = (v: string) => `${baseId}-option-${v.replace(/\s+/g, "-")}`

  return (
    <SelectContext.Provider value={{
      value, onValueChange, open, setOpen,
      placeholder: () => props.placeholder, disabled: () => props.disabled ?? false,
      options: () => props.options, optionFor,
      activeValue, setActiveValue: setExplicitActive, optionId,
      listEl, setListEl, rootEl,
      listId: `${baseId}-list`, triggerEl, setTriggerEl,
    }}>
      <div ref={setRootEl} data-sem="select" class="relative">
        {props.children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger(props: ComponentProps<"button">) {
  const [local, others] = splitProps(props, ["class", "children", "id"])
  const ctx = useSelect()
  const fallbackId = createUniqueId()

  const moveActive = (delta: number) => {
    const options = ctx.options()
    if (options.length === 0) return
    const current = options.findIndex((o) => o.value === ctx.activeValue())
    const next = current === -1
      ? (delta > 0 ? 0 : options.length - 1)
      : Math.min(Math.max(current + delta, 0), options.length - 1)
    const nextValue = options[next].value
    ctx.setActiveValue(nextValue)
    ctx.listEl()?.querySelector<HTMLElement>(`[data-value="${CSS.escape(nextValue)}"]`)?.scrollIntoView?.({ block: "nearest" })
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
      if (ctx.open() && ctx.activeValue() != null) {
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
    // A select-only combobox (ARIA 1.2): the button keeps focus and points at the highlighted
    // option with aria-activedescendant, which the plain button role does not allow. Unlike a
    // button, a combobox is not named by its content, so every use needs a label (a <Label for>
    // or an aria-label) — the value it shows is its value, not its name.
    <button
      ref={ctx.setTriggerEl}
      type="button"
      role="combobox"
      id={local.id ?? fallbackId}
      aria-expanded={ctx.open()}
      aria-haspopup="listbox"
      aria-controls={ctx.open() ? ctx.listId : undefined}
      aria-activedescendant={ctx.open() && ctx.activeValue() != null ? ctx.optionId(ctx.activeValue()!) : undefined}
      disabled={ctx.disabled()}
      onClick={() => !ctx.disabled() && ctx.setOpen(!ctx.open())}
      onKeyDown={handleKeyDown}
      class={cn(
        "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        local.class
      )}
      {...others}
    >
      {local.children}
      <ChevronDown class="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  )
}

/** An option's label, screen-reader hint and icon, shared by the list item and the trigger. */
function OptionContent(props: { option: SelectOption }) {
  return (
    <>
      {props.option.label}
      <Show when={props.option.srHint}>{(hint) => <span class="sr-only"> {hint()}</span>}</Show>
      <Show when={props.option.icon}>
        {(icon) => <Dynamic component={icon()} class="ml-1 inline-block h-3.5 w-3.5 align-[-0.125em]" aria-hidden="true" />}
      </Show>
    </>
  )
}

export function SelectValue(props: { placeholder?: string }) {
  const ctx = useSelect()
  const selected = () => ctx.optionFor(ctx.value())
  return (
    <span class={cn("flex-1 text-left", selected()?.muted && "text-muted-foreground")}>
      <Show
        when={selected()}
        // Every "" across this app's usages represents "nothing selected", not a real value — ??
        // alone wouldn't fall through to the placeholder for "", since "" isn't nullish. A value no
        // option lists (e.g. imported data) is shown as-is rather than hidden by the placeholder.
        fallback={ctx.value() || props.placeholder || ctx.placeholder() || ""}
      >
        {(option) => <OptionContent option={option()} />}
      </Show>
    </span>
  )
}

export function SelectContent(props: Omit<ComponentProps<"ul">, "children">) {
  const [local, others] = splitProps(props, ["class"])
  const ctx = useSelect()

  // "Outside" means outside the whole select, trigger included. Counting the trigger as outside
  // made a second click on it close the list on mousedown, then reopen it on click.
  const handleOutsideClick = (e: MouseEvent) => {
    if (!ctx.rootEl()?.contains(e.target as Node)) {
      ctx.setOpen(false)
    }
  }

  onMount(() => document.addEventListener("mousedown", handleOutsideClick))
  onCleanup(() => document.removeEventListener("mousedown", handleOutsideClick))

  // The list must stay where it can be seen: inside the viewport and any scrolling container the
  // select sits in (a modal, an expanded card). Like every select it opens below the trigger,
  // left-aligned with it. Only when that doesn't fit does it move: above the trigger when there's
  // more room there, as a native select does, and aligned with the trigger's right edge when it runs
  // past the right edge (a narrow trigger near the edge of a phone screen). It never scrolls the page,
  // which would move the trigger out from under the pointer.
  const [placement, setPlacement] = createSignal({ above: false, alignEnd: false })
  createEffect(() => {
    const list = ctx.open() ? ctx.listEl() : undefined
    const trigger = ctx.triggerEl()
    if (!list || !trigger) return setPlacement({ above: false, alignEnd: false })
    const bounds = visibleBounds(ctx.rootEl() ?? trigger)
    const box = list.getBoundingClientRect()
    const triggerBox = trigger.getBoundingClientRect()
    const roomBelow = bounds.bottom - triggerBox.bottom
    const roomAbove = triggerBox.top - bounds.top
    setPlacement({
      above: box.bottom > bounds.bottom && roomAbove > roomBelow,
      alignEnd: box.right > bounds.right,
    })
  })

  return (
    // Not positioned itself, so the list is placed against the whole select: its trigger's edges
    <div>
      {/* Options mount only while open: a closed select costs one trigger, however long its list. */}
      <Show when={ctx.open()}>
        <ul
          ref={ctx.setListEl}
          id={ctx.listId}
          role="listbox"
          // Named the same way as its trigger: by the trigger's aria-label when it has one,
          // otherwise by the trigger itself, which a <Label for> names.
          aria-label={ctx.triggerEl()?.getAttribute("aria-label") ?? undefined}
          aria-labelledby={ctx.triggerEl()?.hasAttribute("aria-label") ? undefined : ctx.triggerEl()?.id}
          class={cn(
            "absolute z-50 max-h-96 min-w-[8rem] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
            placement().above && "bottom-full mb-1 mt-0",
            placement().alignEnd && "right-0",
            local.class
          )}
          {...others}
        >
          <For each={ctx.options()}>{(option) => <SelectItem option={option} />}</For>
        </ul>
      </Show>
    </div>
  )
}

/** The part of the viewport that the element's scrolling containers, if any, leave visible. */
function visibleBounds(el: Element) {
  const bounds = { top: 0, bottom: document.documentElement.clientHeight, right: document.documentElement.clientWidth }
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node)
    if (!/auto|scroll|hidden|clip/.test(overflowX + overflowY)) continue
    const box = node.getBoundingClientRect()
    bounds.top = Math.max(bounds.top, box.top)
    bounds.bottom = Math.min(bounds.bottom, box.bottom)
    bounds.right = Math.min(bounds.right, box.right)
  }
  return bounds
}

function SelectItem(props: { option: SelectOption }) {
  const ctx = useSelect()
  const isSelected = () => ctx.value() === props.option.value
  const isActive = () => ctx.activeValue() === props.option.value
  return (
    <li
      id={ctx.optionId(props.option.value)}
      data-value={props.option.value}
      role="option"
      aria-selected={isSelected()}
      onClick={() => ctx.onValueChange(props.option.value)}
      // mousemove, not mouseenter/mouseover: keyboard nav scrolls the list under a stationary
      // cursor, and browsers fire synthetic mouseenter on whatever ends up underneath — but only
      // real cursor movement fires mousemove, so this avoids hover silently fighting the keyboard.
      onMouseMove={() => ctx.setActiveValue(props.option.value)}
      class={cn(
        "menu-item relative flex min-h-11 w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        props.option.muted && "text-muted-foreground",
        isActive() && "bg-accent text-accent-foreground",
      )}
    >
      {isSelected() && (
        <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check class="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <span><OptionContent option={props.option} /></span>
    </li>
  )
}

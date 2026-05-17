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
}

const SelectContext = createContext<SelectContextType>()

function useSelect() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error("Select components must be used within <Select>")
  return ctx
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
  const [open, setOpen] = createSignal(false)
  const [internalValue, setInternalValue] = createSignal(props.defaultValue)
  const value = () => props.value ?? internalValue()

  const onValueChange = (v: string) => {
    setInternalValue(v)
    props.onValueChange?.(v)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, placeholder: () => props.placeholder }}>
      <div class="relative">
        {props.children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger(props: ComponentProps<"button">) {
  const [local, others] = splitProps(props, ["class", "children"])
  const ctx = useSelect()
  return (
    <button
      type="button"
      aria-expanded={ctx.open()}
      aria-haspopup="listbox"
      onClick={() => ctx.setOpen(!ctx.open())}
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
      {ctx.value() ?? props.placeholder ?? ctx.placeholder() ?? ""}
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
          role="listbox"
          class={cn(
            "absolute z-50 max-h-96 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
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
  const isSelected = () => ctx.value() === local.value
  return (
    <li
      role="option"
      aria-selected={isSelected()}
      onClick={() => ctx.onValueChange(local.value)}
      class={cn(
        "menu-item relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
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

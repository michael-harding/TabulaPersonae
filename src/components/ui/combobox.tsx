import { createSignal, createMemo, For, onMount, onCleanup, JSX } from "solid-js"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Check from "lucide-solid/icons/check"
import { cn } from "@/lib/utils"

type ComboboxProps = {
  value?: string
  onValueChange?: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  class?: string
}

export function Combobox(props: ComboboxProps) {
  const [inputValue, setInputValue] = createSignal(props.value ?? "")
  const [open, setOpen] = createSignal(false)
  // Only filter after the user has typed; on initial focus, show all options
  const [filtering, setFiltering] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(-1)
  let containerRef!: HTMLDivElement
  let inputRef!: HTMLInputElement
  let listRef!: HTMLUListElement

  // Sync external value changes into the input
  let prevProp = props.value
  const syncValue = () => {
    if (props.value !== prevProp) {
      prevProp = props.value
      setInputValue(props.value ?? "")
    }
  }

  const filtered = createMemo(() => {
    if (!filtering()) return props.options
    const q = inputValue().toLowerCase()
    return props.options.filter((o) => o.toLowerCase().includes(q))
  })

  const handleSelect = (option: string) => {
    setInputValue(option)
    setFiltering(false)
    setOpen(false)
    setActiveIndex(-1)
    props.onValueChange?.(option)
  }

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    syncValue()
    setInputValue(e.currentTarget.value)
    setFiltering(true)
    setOpen(true)
    setActiveIndex(-1)
  }

  const handleBlur = (e: FocusEvent) => {
    // If focus moves inside the container (clicking an option), don't commit yet
    if (containerRef.contains(e.relatedTarget as Node)) return
    setOpen(false)
    setFiltering(false)
    setActiveIndex(-1)
    const val = inputValue().trim()
    if (val !== (props.value ?? "")) {
      props.onValueChange?.(val)
    }
  }

  const scrollActiveIntoView = (index: number) => {
    if (!listRef) return
    const items = listRef.querySelectorAll("[role='option']")
    items[index]?.scrollIntoView({ block: "nearest" })
  }

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    const options = filtered()
    if (!open() && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true)
      setActiveIndex(0)
      e.preventDefault()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.min(activeIndex() + 1, options.length - 1)
      setActiveIndex(next)
      scrollActiveIntoView(next)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = Math.max(activeIndex() - 1, 0)
      setActiveIndex(prev)
      scrollActiveIntoView(prev)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex() >= 0 && activeIndex() < options.length) {
        handleSelect(options[activeIndex()])
      } else {
        // Commit typed value
        const val = inputValue().trim()
        if (val !== (props.value ?? "")) props.onValueChange?.(val)
        setOpen(false)
        setFiltering(false)
        setActiveIndex(-1)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setFiltering(false)
      setActiveIndex(-1)
    } else if (e.key === "Tab") {
      setOpen(false)
      setFiltering(false)
      setActiveIndex(-1)
    }
  }

  const handleOutsideClick = (e: MouseEvent) => {
    if (!containerRef?.contains(e.target as Node)) {
      setOpen(false)
      setFiltering(false)
      setActiveIndex(-1)
    }
  }

  onMount(() => document.addEventListener("mousedown", handleOutsideClick))
  onCleanup(() => document.removeEventListener("mousedown", handleOutsideClick))

  return (
    <div ref={containerRef} class={cn("relative", props.class)}>
      <div
        class="flex h-10 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open()}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex() >= 0 ? `combobox-option-${activeIndex()}` : undefined}
          value={inputValue()}
          onInput={handleInput}
          onFocus={() => { syncValue(); setFiltering(false); setOpen(true) }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder}
          disabled={props.disabled}
          class="flex-1 h-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={props.disabled}
          onClick={() => { inputRef.focus(); setOpen(!open()) }}
          class="px-2 flex items-center text-muted-foreground hover:text-foreground disabled:pointer-events-none"
          aria-label="Toggle options"
        >
          <ChevronDown class="h-4 w-4 opacity-50" />
        </button>
      </div>

      {open() && filtered().length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          class="absolute z-50 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md mt-1"
        >
          <For each={filtered()}>
            {(option, index) => {
              const isSelected = () => option === (props.value ?? inputValue())
              const isActive = () => index() === activeIndex()
              return (
                <li
                  id={`combobox-option-${index()}`}
                  role="option"
                  aria-selected={isSelected()}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index())}
                  onClick={() => handleSelect(option)}
                  class={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                    isActive() ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {isSelected() && (
                    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check class="h-4 w-4" />
                    </span>
                  )}
                  {option}
                </li>
              )
            }}
          </For>
        </ul>
      )}
    </div>
  )
}

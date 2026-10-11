import { createSignal, For, Show, type JSX } from "solid-js"

import { Chip } from "@/components/ui/chip"
import { ChipButton } from "@/components/ui/chip-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const REMOVE_VARIANT = {
  secondary: "removableSecondary",
  outline: "removableOutline",
  destructive: "destructive",
} as const

type ChipListEditorProps<T extends string> = {
  /** Page-unique prefix: the add chip is `${id}-add`, the text input `${id}-input`, each chip `${id}-remove-${value}`. */
  "data-test": string
  label: string
  /** Render the label as a section heading rather than a form-field label. */
  heading?: boolean
  labelClass?: string
  /** Singular noun for one value, e.g. "language" — names the controls ("Add language", "Remove language Elvish"). */
  itemLabel: string
  values: T[]
  onAdd: (value: T) => void
  onRemove: (value: T) => void
  /**
   * The closed set of values to pick from. When given, the "+ Add" chip opens a menu of them
   * (picking a value already in the list removes it); when omitted, any typed text can be added.
   */
  options?: T[]
  /** Display text for a value, when it differs from the value itself. */
  optionLabel?: (value: T) => string
  /** Placeholder for the free-text input. */
  placeholder?: string
  /** Chip colour. Defaults to "secondary". */
  variant?: keyof typeof REMOVE_VARIANT
  /** Values that come from elsewhere (a feature, an item) — shown as read-only chips after the editable ones. */
  grantedValues?: string[]
  grantedTooltip?: (value: string) => string
  /** Shown in place of the chips when there are none. */
  emptyText?: string
  /** False shows the values as display chips with no add/remove controls. Defaults to true. */
  editing?: boolean
  /** Replaces the default remove chip for a value while editing, e.g. with a CheckableChip. */
  renderChip?: (value: T) => JSX.Element
}

/**
 * The one editor for a list of values shown as chips — proficiencies, languages, resistances,
 * immunities, conditions, advantage/disadvantage. Values are removed by clicking their chip and
 * added through a single "+ Add" chip: next to the label, opening a menu, for a closed list; or
 * beside a text input for free text. With `editing` false it is the matching read-only display.
 */
export function ChipListEditor<T extends string>(props: ChipListEditorProps<T>) {
  const [newValue, setNewValue] = createSignal("")
  const editing = () => props.editing ?? true
  const variant = () => props.variant ?? "secondary"
  const text = (value: T) => props.optionLabel?.(value) ?? value
  const addLabel = () => `Add ${props.itemLabel}`
  const isEmpty = () => props.values.length === 0 && (props.grantedValues ?? []).length === 0

  const trimmed = () => newValue().trim()
  const addTyped = () => {
    const value = trimmed() as T
    if (!value || props.values.includes(value)) return
    props.onAdd(value)
    setNewValue("")
  }
  const toggle = (value: T) => (props.values.includes(value) ? props.onRemove(value) : props.onAdd(value))

  return (
    <div class={props.heading ? "space-y-3" : "space-y-1"} data-sem="chip-list-editor">
      <div class="flex items-center justify-between gap-2">
        <Show when={props.heading} fallback={<Label class={cn("text-xs", props.labelClass)}>{props.label}</Label>}>
          <h2 class={cn("font-semibold", props.labelClass)}>{props.label}</h2>
        </Show>
        <Show when={editing() && props.options}>
          {(options) => (
            <DropdownMenu>
              <Tooltip content={addLabel()}>
                <DropdownMenuTrigger
                  as={ChipButton}
                  data-test={`${props["data-test"]}-add`}
                  action="add"
                  variant="outline"
                  aria-label={addLabel()}
                >
                  Add
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent>
                <For each={options()}>
                  {(option) => (
                    <DropdownMenuItem
                      onSelect={() => toggle(option)}
                      class={props.values.includes(option) ? "text-primary font-medium" : ""}
                    >
                      {text(option)}
                      <Show when={props.values.includes(option)}>
                        <span class="ml-auto text-primary">✓</span>
                      </Show>
                    </DropdownMenuItem>
                  )}
                </For>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Show>
      </div>
      <Show when={!isEmpty() || props.emptyText}>
        <div class={cn("flex flex-wrap items-center", editing() ? "gap-x-2" : "gap-2")}>
          <Show when={isEmpty()}>
            <span class="text-sm text-muted-foreground">{props.emptyText}</span>
          </Show>
          <For each={props.values}>
            {(value) => (
              <Show when={editing()} fallback={<Chip variant={variant()}>{text(value)}</Chip>}>
                <Show
                  when={!props.renderChip}
                  fallback={props.renderChip!(value)}
                >
                  <ChipButton
                    data-test={`${props["data-test"]}-remove-${value}`}
                    action="remove"
                    variant={REMOVE_VARIANT[variant()]}
                    aria-label={`Remove ${props.itemLabel} ${text(value)}`}
                    onClick={() => props.onRemove(value)}
                  >
                    {text(value)}
                  </ChipButton>
                </Show>
              </Show>
            )}
          </For>
          <For each={props.grantedValues}>
            {(value) => (
              <Tooltip content={props.grantedTooltip?.(value) ?? "Granted automatically"} triggerFocusable>
                <Chip variant="secondary">{value}</Chip>
              </Tooltip>
            )}
          </For>
        </div>
      </Show>
      <Show when={editing() && !props.options}>
        <div class="flex items-center gap-2">
          <Input
            data-test={`${props["data-test"]}-input`}
            aria-label={`New ${props.itemLabel}`}
            placeholder={props.placeholder}
            value={newValue()}
            onInput={(e) => setNewValue(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped() } }}
            class="flex-1"
          />
          <Tooltip content={addLabel()}>
            <ChipButton
              data-test={`${props["data-test"]}-add`}
              action="add"
              variant="outline"
              aria-label={addLabel()}
              disabled={!trimmed()}
              onClick={addTyped}
            >
              Add
            </ChipButton>
          </Tooltip>
        </div>
      </Show>
    </div>
  )
}

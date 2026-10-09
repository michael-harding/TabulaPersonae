import { createSignal, For, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Reusable picker for free-text string-list fields with no fixed enum (e.g. Language, Other
// Proficiency) — an Add+Badge idiom, accepting any typed value rather than a closed list.
export function FreeTextListEditor(props: {
  label: string
  ariaLabel: string
  placeholder: string
  values: string[]
  onChange: (next: string[]) => void
  /** Page-unique; set on the text input and prefixes the remove/add button ids. */
  "data-test": string
}) {
  const [newValue, setNewValue] = createSignal('')
  const add = () => {
    const trimmed = newValue().trim()
    if (!trimmed || props.values.includes(trimmed)) return
    props.onChange([...props.values, trimmed])
    setNewValue('')
  }
  const remove = (v: string) => props.onChange(props.values.filter((x) => x !== v))
  return (
    <div class="space-y-1" data-sem="free-text-list-editor">
      <Label class="text-xs">{props.label}</Label>
      <Show when={props.values.length > 0}>
        <div class="flex flex-wrap gap-x-2 mb-2">
          <For each={props.values}>
            {(v) => (
              <ChipButton data-test={`${props["data-test"]}-remove-${v}`} action="remove" aria-label={`Remove ${v}`} onClick={() => remove(v)}>
                {v}
              </ChipButton>
            )}
          </For>
        </div>
      </Show>
      <div class="flex gap-2">
        <Input
          aria-label={props.ariaLabel}
          data-test={props["data-test"]}
          value={newValue()}
          onInput={(e) => setNewValue(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={props.placeholder}
        />
        <Button type="button" data-test={`${props["data-test"]}-add`} size="sm" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

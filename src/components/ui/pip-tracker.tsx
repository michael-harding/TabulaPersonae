import { For, Show } from "solid-js"
import type { JSX } from "solid-js"

import { Tooltip } from "@/components/ui/tooltip"

interface PipTrackerProps {
  total: number
  used: number
  onToggle: (newUsed: number) => void
  usedTitle?: string
  availableTitle?: string
  filledClass?: string
  emptyClass?: string
  filledIcon?: JSX.Element
  emptyIcon?: JSX.Element
  readOnly?: boolean
}

export function PipTracker(props: PipTrackerProps) {
  const usedTitle = () => props.usedTitle ?? "Used slot (click to restore)"
  const availableTitle = () => props.availableTitle ?? "Available slot (click to use)"
  const filledClass = () => props.filledClass ?? "bg-primary border-primary hover:bg-primary/80"
  const emptyClass = () => props.emptyClass ?? "bg-muted border-muted-foreground"
  const filledClassReadOnly = () => props.filledClass ?? "bg-primary border-primary"
  const slotTitle = (index: number) => (index < props.used ? usedTitle() : availableTitle())

  const toggle = (index: number) => {
    const newUsed = index < props.used ? props.used - 1 : props.used + 1
    props.onToggle(Math.min(Math.max(newUsed, 0), props.total))
  }

  return (
    <div data-sem="pip-tracker" class="flex flex-wrap items-center">
      <For each={Array.from({ length: props.total }, (_, i) => i)}>
        {(index) => (
          <Show
            when={!props.readOnly}
            fallback={
              <Tooltip content={slotTitle(index)} toggleOnClick>
                <span data-test={`pip-tracker-slot-${index}`} class="w-11 h-11 flex items-center justify-center" role="img" aria-label={slotTitle(index)}>
                  <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${index < props.used ? filledClassReadOnly() : emptyClass()}`}>
                    {index < props.used ? props.filledIcon : props.emptyIcon}
                  </span>
                </span>
              </Tooltip>
            }
          >
            <Tooltip content={slotTitle(index)}>
              <button
                type="button"
                data-test={`pip-tracker-slot-${index}`}
                onClick={() => toggle(index)}
                class="w-11 h-11 flex items-center justify-center"
                aria-label={slotTitle(index)}
              >
                <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${index < props.used ? filledClass() : emptyClass()}`}>
                  {index < props.used ? props.filledIcon : props.emptyIcon}
                </span>
              </button>
            </Tooltip>
          </Show>
        )}
      </For>
    </div>
  )
}

import { For, mergeProps, Show } from "solid-js"
import type { Component, JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import Sparkle from "lucide-solid/icons/sparkle"

import { Tooltip } from "@/components/ui/tooltip"

/** An icon a tracker can mark its pips with: any lucide icon. */
export type PipIcon = Component<{ class?: string; "aria-hidden"?: "true" }>

interface PipTrackerProps {
  /** Page-unique; each slot's hook is `${data-test}-slot-${index}`. */
  "data-test": string
  total: number
  used: number
  onToggle: (newUsed: number) => void
  usedTitle?: string
  availableTitle?: string
  /** What a read-only slot is called, which cannot be clicked: the titles above say how to click. */
  usedLabel?: string
  availableLabel?: string
  filledClass?: string
  emptyClass?: string
  /**
   * Marks each available pip, so colour is not all that tells it from a used one (ACCESSIBILITY.md
   * §9). A sparkle unless given another. Null is for a tracker that marks them with filledIcon.
   */
  icon?: PipIcon | null
  filledIcon?: JSX.Element
  readOnly?: boolean
}

export function PipTracker(props: PipTrackerProps) {
  const usedTitle = () => props.usedTitle ?? "Used slot (click to restore)"
  const availableTitle = () => props.availableTitle ?? "Available slot (click to use)"
  const filledClass = () => props.filledClass ?? "bg-primary border-primary hover:bg-primary/80"
  const emptyClass = () => props.emptyClass ?? "bg-muted border-muted-foreground"
  const filledClassReadOnly = () => props.filledClass ?? "bg-primary border-primary"
  const slotTitle = (index: number) => (index < props.used ? usedTitle() : availableTitle())
  const slotLabel = (index: number) => (index < props.used ? props.usedLabel ?? "Used slot" : props.availableLabel ?? "Available slot")

  // Leaving icon unset gets the sparkle; null, which mergeProps keeps, gets no icon
  const icon = mergeProps({ icon: Sparkle as PipIcon | null }, props)
  // White reads on --muted, the default available pip, in both themes (theme-contrast.test.ts)
  const availableIcon = () => (
    <Show when={icon.icon}>
      {(component) => <Dynamic component={component()} class="h-4 w-4 text-white" aria-hidden="true" />}
    </Show>
  )

  const toggle = (index: number) => {
    const newUsed = index < props.used ? props.used - 1 : props.used + 1
    props.onToggle(Math.min(Math.max(newUsed, 0), props.total))
  }

  return (
    <div data-sem="pip-tracker" data-test={props["data-test"]} class="flex flex-wrap items-center">
      <For each={Array.from({ length: props.total }, (_, i) => i)}>
        {(index) => (
          <Show
            when={!props.readOnly}
            fallback={
              <Tooltip content={slotLabel(index)} toggleOnClick>
                <span data-test={`${props["data-test"]}-slot-${index}`} class="w-11 h-11 flex items-center justify-center" role="img" aria-label={slotLabel(index)}>
                  <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${index < props.used ? filledClassReadOnly() : emptyClass()}`}>
                    {index < props.used ? props.filledIcon : availableIcon()}
                  </span>
                </span>
              </Tooltip>
            }
          >
            <Tooltip content={slotTitle(index)}>
              <button
                type="button"
                data-test={`${props["data-test"]}-slot-${index}`}
                onClick={() => toggle(index)}
                class="w-11 h-11 flex items-center justify-center"
                aria-label={slotTitle(index)}
              >
                <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${index < props.used ? filledClass() : emptyClass()}`}>
                  {index < props.used ? props.filledIcon : availableIcon()}
                </span>
              </button>
            </Tooltip>
          </Show>
        )}
      </For>
    </div>
  )
}

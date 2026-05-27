import { For } from "solid-js"
import type { JSX } from "solid-js"

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
}

export function PipTracker(props: PipTrackerProps) {
  const usedTitle = () => props.usedTitle ?? "Used slot (click to restore)"
  const availableTitle = () => props.availableTitle ?? "Available slot (click to use)"
  const filledClass = () => props.filledClass ?? "bg-primary border-primary hover:bg-primary/80"
  const emptyClass = () => props.emptyClass ?? "bg-muted border-muted-foreground"

  const toggle = (index: number) => {
    const newUsed = index < props.used ? props.used - 1 : props.used + 1
    props.onToggle(Math.min(Math.max(newUsed, 0), props.total))
  }

  return (
    <div class="flex flex-wrap items-center">
      <For each={Array.from({ length: props.total }, (_, i) => i)}>
        {(index) => (
          <button
            onClick={() => toggle(index)}
            class="w-11 h-11 flex items-center justify-center"
            title={index < props.used ? usedTitle() : availableTitle()}
          >
            <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${index < props.used ? filledClass() : emptyClass()}`}>
              {index < props.used ? props.filledIcon : props.emptyIcon}
            </span>
          </button>
        )}
      </For>
    </div>
  )
}

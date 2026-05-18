import { For } from "solid-js"

interface PipTrackerProps {
  total: number
  used: number
  onToggle: (newUsed: number) => void
  usedTitle?: string
  availableTitle?: string
}

export function PipTracker(props: PipTrackerProps) {
  const usedTitle = () => props.usedTitle ?? "Used slot (click to restore)"
  const availableTitle = () => props.availableTitle ?? "Available slot (click to use)"

  const toggle = (index: number) => {
    const newUsed = index < props.used ? props.used - 1 : props.used + 1
    props.onToggle(Math.min(newUsed, props.total))
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
            <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${index < props.used ? "bg-primary border-primary hover:bg-primary/80" : "bg-muted border-muted-foreground"}`} />
          </button>
        )}
      </For>
    </div>
  )
}

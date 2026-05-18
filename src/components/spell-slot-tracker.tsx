import { For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import Dot from "lucide-solid/icons/dot"

type SpellSlots = Character["spellSlots"]

interface SpellSlotTrackerProps {
  spellSlots: SpellSlots
  onToggle: (level: number, used: number) => void
}

function getOrdinalSuffix(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0])
}

export function SpellSlotTracker(props: SpellSlotTrackerProps) {
  const toggle = (level: number, index: number) => {
    const current = props.spellSlots[level as keyof SpellSlots]
    const newUsed = index < current.used ? current.used - 1 : current.used + 1
    props.onToggle(level, Math.min(newUsed, current.total))
  }

  return (
    <div class="flex flex-wrap gap-2">
      <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9]}>
        {(level) => {
          const slots = () => props.spellSlots[level as keyof SpellSlots]
          return (
            <Show when={slots() && slots().total > 0}>
              <div class="flex items-center gap-1 px-2 border rounded-lg">
                <span class="font-medium text-xs text-muted-foreground pr-1">{getOrdinalSuffix(level)}</span>
                <div class="flex flex-wrap items-center">
                  <For each={Array.from({ length: slots().total }, (_, i) => i)}>
                    {(index) => (
                      <button
                        onClick={() => toggle(level, index)}
                        class="w-11 h-11 flex items-center justify-center"
                        title={index < slots().used ? "Used slot (click to restore)" : "Available slot (click to use)"}
                      >
                        <span class={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${index < slots().used ? "bg-muted border-muted-foreground" : "bg-primary border-primary hover:bg-primary/80"}`}>
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          )
        }}
      </For>
    </div>
  )
}

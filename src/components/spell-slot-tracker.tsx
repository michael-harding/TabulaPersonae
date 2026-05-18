import { For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { PipTracker } from "@/components/ui/pip-tracker"

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
  return (
    <div class="flex flex-wrap gap-2">
      <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9]}>
        {(level) => {
          const slots = () => props.spellSlots[level as keyof SpellSlots]
          return (
            <Show when={slots() && slots().total > 0}>
              <div class="flex items-center gap-1 px-2 border rounded-lg">
                <span class="font-medium text-xs text-muted-foreground pr-1">{getOrdinalSuffix(level)}</span>
                <PipTracker
                  total={slots().total}
                  used={slots().used}
                  onToggle={(newUsed) => props.onToggle(level, newUsed)}
                />
              </div>
            </Show>
          )
        }}
      </For>
    </div>
  )
}

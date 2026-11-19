import { For, Show } from "solid-js"
import WandSparkles from "lucide-solid/icons/wand-sparkles"

import type { SpellSlotLevel } from "@/lib/character-types"
import { ordinal, SPELL_SLOT_LEVELS, type SpellSlotState } from "@/lib/character-utils"
import { PipTracker } from "@/components/ui/pip-tracker"
import { useReadOnly } from "@/lib/read-only-context"

interface SpellSlotTrackerProps {
  /** The character's slots at each level (see getSpellSlots). */
  slots: Record<SpellSlotLevel, SpellSlotState>
  onToggle: (level: SpellSlotLevel, used: number) => void
}

export function SpellSlotTracker(props: SpellSlotTrackerProps) {
  const isReadOnly = useReadOnly()

  return (
    <div data-sem="spell-slot-tracker" class="flex flex-wrap gap-2">
      <For each={SPELL_SLOT_LEVELS}>
        {(level) => {
          const slots = () => props.slots[level]
          return (
            <Show when={slots().total > 0}>
              <div data-test={`spell-slot-level-${level}`} class="flex items-center gap-1 px-2 border rounded-lg">
                <span class="font-medium text-xs text-muted-foreground pr-1">{ordinal(level)}</span>
                <PipTracker
                  data-test={`spell-slot-level-${level}-pips`}
                  icon={WandSparkles}
                  total={slots().total}
                  used={slots().used}
                  onToggle={(newUsed) => props.onToggle(level, newUsed)}
                  readOnly={isReadOnly}
                />
              </div>
            </Show>
          )
        }}
      </For>
    </div>
  )
}

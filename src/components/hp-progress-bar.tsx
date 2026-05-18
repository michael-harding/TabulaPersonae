import { Show } from "solid-js"
import type { Character } from "@/lib/character-types"

interface HpProgressBarProps {
  character: Character
}

export function HpProgressBar(props: HpProgressBarProps) {
  const currentHp = () => props.character.hitPoints?.current ?? 0
  const maxHp = () => props.character.hitPoints?.maximum ?? 1
  const tempHp = () => props.character.hitPoints?.temporary ?? 0
  const hpPercentage = () => Math.max(0, Math.min(100, maxHp() > 0 ? (currentHp() / maxHp()) * 100 : 0))
  const hpColor = () => {
    const pct = hpPercentage()
    if (pct >= 67) return "bg-green-500 dark:bg-green-700"
    if (pct >= 34) return "bg-yellow-500 dark:bg-yellow-600"
    return "bg-red-600"
  }
  const tempHpWidth = () => Math.min(tempHp() / maxHp() * 100, 100)
  const tempHpLeft = () => Math.min(hpPercentage(), 100 - tempHpWidth())

  return (
    <div class="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div class="w-full">
        <div class="relative h-3 w-full overflow-hidden bg-secondary/30">
          <div
            class={`absolute left-0 top-0 h-full transition-all duration-300 ${hpColor()}`}
            style={{ width: `${hpPercentage()}%` }}
          />
          <Show when={tempHp() > 0}>
            <div
              class="absolute top-0 h-full bg-blue-500 transition-all duration-300"
              style={{ left: `${tempHpLeft()}%`, width: `${tempHpWidth()}%` }}
            />
          </Show>
        </div>
        <div class="flex justify-end px-4 py-1">
          <span class="text-sm font-medium text-foreground">
            HP: {currentHp()}
            <Show when={tempHp() > 0}>
              <span class="text-blue-500">+{tempHp()}</span>
            </Show>
            /{maxHp()}
          </span>
        </div>
      </div>
    </div>
  )
}

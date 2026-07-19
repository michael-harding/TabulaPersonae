import { createMemo, type Accessor } from "solid-js"
import type { Character } from "@/lib/character-types"

export function useHpDisplay(character: Accessor<Character>) {
  const currentHp = createMemo(() => character().hitPoints?.current ?? 0)
  const maxHp = createMemo(() => character().hitPoints?.maximum ?? 1)
  const tempHp = createMemo(() => character().hitPoints?.temporary ?? 0)
  const hpPercentage = createMemo(() =>
    Math.max(0, Math.min(100, maxHp() > 0 ? (currentHp() / maxHp()) * 100 : 0))
  )
  const hpColor = createMemo(() => {
    const pct = hpPercentage()
    if (pct >= 67) return "bg-green-500 dark:bg-green-700"
    if (pct >= 34) return "bg-yellow-500 dark:bg-yellow-600"
    return "bg-red-600"
  })
  const tempHpWidth = createMemo(() => Math.min(tempHp() / maxHp() * 100, 100))
  const tempHpLeft = createMemo(() => Math.min(hpPercentage(), 100 - tempHpWidth()))
  return { currentHp, maxHp, tempHp, hpPercentage, hpColor, tempHpWidth, tempHpLeft }
}

import { Progress } from "@/components/ui/progress"
import type { Character } from "@/lib/character-types"

interface HpProgressBarProps {
  character: Character
}

export function HpProgressBar(props: HpProgressBarProps) {
  const currentHp = () => props.character.hitPoints?.current ?? 0
  const maxHp = () => props.character.hitPoints?.maximum ?? 1
  const hpPercentage = () => Math.max(0, Math.min(100, maxHp() > 0 ? (currentHp() / maxHp()) * 100 : 0))

  return (
    <div class="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div class="w-full">
        <Progress value={hpPercentage()} class="w-full h-3 hp-progress rounded-none" />
        <div class="flex justify-end px-4 py-1">
          <span class="text-sm font-medium text-foreground">
            HP: {currentHp()}/{maxHp()}
          </span>
        </div>
      </div>
    </div>
  )
}

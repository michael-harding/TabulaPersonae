import { Progress } from "@/components/ui/progress"
import type { Character } from "@/lib/character-types"

interface HpProgressBarProps {
  character: Character
}

export function HpProgressBar({ character }: HpProgressBarProps) {
  const currentHp = character.hitPoints?.current ?? 0
  const maxHp = character.hitPoints?.maximum ?? 1
  const hpPercentage = Math.max(0, Math.min(100, (maxHp > 0 ? (currentHp / maxHp) * 100 : 0)))

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="w-full">
        <Progress value={hpPercentage} className="w-full h-3 hp-progress rounded-none" />
        <div className="flex justify-end px-4 py-1">
          <span className="text-sm font-medium text-foreground">
            HP: {currentHp}/{maxHp}
          </span>
        </div>
      </div>
    </div>
  )
}

import { Show, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier } from "@/lib/character-utils"
import ShieldIcon from "lucide-solid/icons/shield"
import Zap from "lucide-solid/icons/zap"
import Sword from "lucide-solid/icons/sword"
import Heart from "lucide-solid/icons/heart"

interface StatsBarProps {
  character: Character
}

export function StatsBar(props: StatsBarProps) {
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

  const ac = () => props.character.armorClass ?? 10
  const initiative = () => props.character.initiative ?? 0
  const hasSpellcasting = () => !!props.character.spellcastingAbility
  const spellSaveDC = () => getSpellSaveDC(props.character)
  const hitBonus = () => getSpellAttackBonus(props.character)
  const conditions = () => props.character.conditions ?? []

  return (
    <div class="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* HP progress bar */}
      <div class="relative h-1.5 w-full overflow-hidden bg-secondary/30">
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

      {/* Stats row */}
      <div class="flex items-center justify-between px-4 py-2 gap-4">
        {/* Left: combat stats + conditions */}
        <div class="flex items-center gap-3 flex-wrap min-w-0">
          {/* AC */}
          <div class="flex items-center gap-1 shrink-0">
            <ShieldIcon class="h-3.5 w-3.5 text-primary" />
            <span class="text-xs text-muted-foreground">AC</span>
            <span class="text-sm font-bold">
              {ac()}
              <Show when={props.character.shield}>
                <span class="text-xs font-normal text-muted-foreground ml-0.5">+2</span>
              </Show>
            </span>
          </div>

          <div class="w-px h-4 bg-border shrink-0" />

          {/* Initiative */}
          <div class="flex items-center gap-1 shrink-0">
            <Zap class="h-3.5 w-3.5 text-primary" />
            <span class="text-xs text-muted-foreground">Init</span>
            <span class="text-sm font-bold">{formatModifier(initiative())}</span>
          </div>

          {/* Hit/DC — only if spellcasting ability set */}
          <Show when={hasSpellcasting()}>
            <div class="w-px h-4 bg-border shrink-0" />
            <div class="flex items-center gap-1 shrink-0">
              <Sword class="h-3.5 w-3.5 text-primary" />
              <span class="text-sm font-bold">{formatModifier(hitBonus())}</span>
              <span class="text-xs text-muted-foreground">Hit</span>
              <span class="text-xs text-muted-foreground mx-0.5">/</span>
              <span class="text-sm font-bold">DC {spellSaveDC()}</span>
            </div>
          </Show>

          {/* Conditions */}
          <Show when={conditions().length > 0}>
            <div class="w-px h-4 bg-border shrink-0" />
            <div class="flex items-center gap-1.5 flex-wrap">
              <For each={conditions()}>
                {(condition) => (
                  <span class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-destructive/15 text-destructive">
                    {condition}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Right: HP */}
        <div class="flex items-center gap-1.5 shrink-0">
          <Heart class="h-3.5 w-3.5 text-destructive shrink-0" />
          <span class="text-sm font-bold whitespace-nowrap">
            {currentHp()}
            <Show when={tempHp() > 0}>
              <span class="text-blue-500">+{tempHp()}</span>
            </Show>
            <span class="text-muted-foreground font-normal">/{maxHp()}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

import { Show, For, createMemo } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, getAbilityModifier, formatModifier } from "@/lib/character-utils"
import { Tooltip } from "@/components/ui/tooltip"
import { useHpDisplay } from "@/hooks/use-hp-display"
import ShieldIcon from "lucide-solid/icons/shield"
import Zap from "lucide-solid/icons/zap"
import Sword from "lucide-solid/icons/sword"
import Heart from "lucide-solid/icons/heart"

interface StatsBarProps {
  character: Character
}

export function StatsBar(props: StatsBarProps) {
  const { currentHp, maxHp, tempHp, hpPercentage, hpColor, tempHpWidth, tempHpLeft } = useHpDisplay(() => props.character)

  const ac = createMemo(() => props.character.armorClass ?? 10)
  const initiative = createMemo(() => props.character.initiative ?? 0)
  const hasSpellcasting = createMemo(() => !!props.character.spellcastingAbility)
  const spellSaveDC = createMemo(() =>
    (props.character.useCalculatedSpellSaveDC ?? true) ? getSpellSaveDC(props.character) : props.character.spellSaveDC
  )
  const hitBonus = createMemo(() =>
    (props.character.useCalculatedSpellAttackBonus ?? true) ? getSpellAttackBonus(props.character) : props.character.spellAttackBonus
  )
  const spellTooltip = createMemo(() => {
    const ability = props.character.spellcastingAbility
    if (!ability) return ""
    const score = props.character.abilityScores[ability] ?? 10
    const abilityMod = getAbilityModifier(score)
    const prof = props.character.proficiencyBonus ?? 2
    const abilityAbbr = ability.slice(0, 3).toUpperCase()
    return `Spell Hit: ${abilityAbbr} ${formatModifier(abilityMod)} + Prof +${prof} = ${formatModifier(hitBonus())} · DC: 8 + ${abilityAbbr} ${formatModifier(abilityMod)} + Prof +${prof} = ${spellSaveDC()}`
  })
  const conditions = createMemo(() => props.character.conditions ?? [])

  return (
    <div data-sem="stats-bar" class="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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
            <span class="text-sm font-bold">{ac()}</span>
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
            <Tooltip content={spellTooltip()} triggerFocusable>
              <div class="flex items-center gap-1 shrink-0">
                <Sword class="h-3.5 w-3.5 text-primary" />
                <span class="text-sm font-bold">{formatModifier(hitBonus())}</span>
                <span class="text-xs text-muted-foreground">Hit</span>
                <span class="text-xs text-muted-foreground mx-0.5">/</span>
                <span class="text-sm font-bold">DC {spellSaveDC()}</span>
              </div>
            </Tooltip>
          </Show>

          {/* Conditions */}
          <Show when={conditions().length > 0}>
            <div class="w-px h-4 bg-border shrink-0" />
            <div class="flex items-center gap-1.5 flex-wrap">
              <For each={conditions()}>
                {(condition) => (
                  <span class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
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
            <span data-test="current-hp">{currentHp()}</span>
            <Show when={tempHp() > 0}>
              <span class="text-secondary dark:text-blue-300">+{tempHp()}</span>
            </Show>
            <span class="text-muted-foreground font-normal">/{maxHp()}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

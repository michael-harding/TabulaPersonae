import { Show, For, createMemo, onCleanup, onMount } from "solid-js"
import ShieldIcon from "lucide-solid/icons/shield"
import Zap from "lucide-solid/icons/zap"
import Sword from "lucide-solid/icons/sword"
import Heart from "lucide-solid/icons/heart"

import type { Character } from "@/lib/character-types"
import { getEffectiveSpellSaveDC, getEffectiveSpellAttackBonus, getEffectiveSpellAttackTooltip, getEffectiveSpellSaveDCTooltip, formatModifier, getEffectiveValue, getEffectiveSpellcastingAbility, displayedConditions, activeSpells } from "@/lib/character-utils"
import { Tooltip } from "@/components/ui/tooltip"
import { useHpDisplay } from "@/hooks/use-hp-display"
import { cn, SPELL_EFFECT_COLOR, TEMP_HP_COLOR } from "@/lib/utils"

/**
 * The stats bar's current height, kept on the root element as this CSS variable, so that what sits
 * just below the sticky bar (the sidebar menu button on large screens) can follow it as conditions
 * and spells in effect wrap it onto more lines.
 */
export const STATS_BAR_HEIGHT_VAR = "--stats-bar-height"

// The status pills: spells in effect and conditions
const PILL = "inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full"

interface StatsBarProps {
  character: Character
}

export function StatsBar(props: StatsBarProps) {
  const { currentHp, maxHp, tempHp, hpPercentage, hpColor, tempHpWidth, tempHpLeft } = useHpDisplay(() => props.character)

  const ac = createMemo(() => getEffectiveValue(props.character, "armorClass"))
  const initiative = createMemo(() => getEffectiveValue(props.character, "initiative"))
  const hasSpellcasting = createMemo(() => !!getEffectiveSpellcastingAbility(props.character))
  const spellSaveDC = createMemo(() => getEffectiveSpellSaveDC(props.character))
  const hitBonus = createMemo(() => getEffectiveSpellAttackBonus(props.character))
  const spellTooltip = createMemo(() =>
    `Spell Hit: ${getEffectiveSpellAttackTooltip(props.character)} · DC: ${getEffectiveSpellSaveDCTooltip(props.character)}`
  )
  const conditions = createMemo(() => displayedConditions(props.character))
  const spellEffects = createMemo(() => activeSpells(props.character))

  let barRef!: HTMLDivElement
  onMount(() => {
    const root = document.documentElement
    const publish = () => root.style.setProperty(STATS_BAR_HEIGHT_VAR, `${barRef.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(publish)
      observer.observe(barRef)
      onCleanup(() => observer.disconnect())
    }
    onCleanup(() => root.style.removeProperty(STATS_BAR_HEIGHT_VAR))
  })

  return (
    <div ref={barRef} data-sem="stats-bar" data-test="stats-bar" class="sticky top-0 z-50 backdrop-blur contrast-more:bg-background border-b">
      {/* HP progress bar */}
      <div class="relative h-1.5 w-full overflow-hidden">
        <div
          class={`absolute left-0 top-0 h-full transition-all duration-300 ${hpColor()}`}
          style={{ width: `${hpPercentage()}%` }}
        />
        <Show when={tempHp() > 0}>
          <div
            class={`absolute top-0 h-full ${TEMP_HP_COLOR.bar} transition-all duration-300`}
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
            <ShieldIcon class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span class="text-xs text-muted-foreground">AC</span>
            <span class="text-sm font-bold">{ac()}</span>
          </div>

          <div class="w-px h-4 bg-border shrink-0" />

          {/* Initiative */}
          <div class="flex items-center gap-1 shrink-0">
            <Zap class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span class="text-xs text-muted-foreground">Init</span>
            <span class="text-sm font-bold">{formatModifier(initiative())}</span>
          </div>

          {/* Hit/DC — only if spellcasting ability set */}
          <Show when={hasSpellcasting()}>
            <div class="w-px h-4 bg-border shrink-0" />
            <Tooltip content={spellTooltip()} triggerFocusable triggerLabel={`Spell Hit ${formatModifier(hitBonus())}, Spell Save DC ${spellSaveDC()}`}>
              <div class="flex items-center gap-1 shrink-0">
                <Sword class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span class="text-sm font-bold">{formatModifier(hitBonus())}</span>
                <span class="text-xs text-muted-foreground">Hit</span>
                <span class="text-xs text-muted-foreground mx-0.5">/</span>
                <span class="text-sm font-bold">DC {spellSaveDC()}</span>
              </div>
            </Tooltip>
          </Show>

          {/* Spells in effect, then conditions */}
          <Show when={spellEffects().length > 0 || conditions().length > 0}>
            <div class="w-px h-4 bg-border shrink-0" />
            <div class="flex items-center gap-1.5 flex-wrap">
              <For each={spellEffects()}>
                {(spell) => (
                  // Solid while concentrating, outlined otherwise; the hidden lead-in says which to a screen reader
                  <span
                    data-test={`status-${spell.concentration ? "concentration" : "duration"}-${spell.id}`}
                    class={cn(PILL, spell.concentration ? SPELL_EFFECT_COLOR.concentration : SPELL_EFFECT_COLOR.duration)}
                  >
                    <span class="sr-only">{spell.concentration ? "Concentrating on " : "Active: "}</span>
                    {spell.name}
                  </span>
                )}
              </For>
              <For each={conditions()}>
                {(condition) => (
                  <span class={cn(PILL, "bg-destructive text-destructive-foreground")}>
                    {condition}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Right: HP */}
        <div class="flex items-center gap-1.5 shrink-0">
          <Heart class="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden="true" />
          <span class="text-sm font-bold whitespace-nowrap">
            <span data-test="current-hp">{currentHp()}</span>
            <Show when={tempHp() > 0}>
              <span data-test="temp-hp" class="text-secondary dark:text-blue-300">+{tempHp()}</span>
            </Show>
            <span class="text-muted-foreground font-normal">/{maxHp()}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

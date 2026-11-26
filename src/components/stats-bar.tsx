import { Show, For, children, createMemo, type JSX } from "solid-js"
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
 * Where the menu button floats on pages without a stats bar: exactly where the stats bar holds it
 * (below the 6px HP strip and the row's 6px padding, inside its 16px side padding), so the button
 * is in the same place on every page. Keep it in step with the layout below.
 */
export const MENU_BUTTON_FLOATING = "fixed left-4 top-3 z-40"

// The status pills: spells in effect and conditions
const PILL = "inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full"

interface StatsBarProps {
  character: Character
  /** The menu button, at the bar's left. The public sheet has none. */
  menu?: JSX.Element
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
  // Resolved once: a JSX prop is a getter that builds a new instance of the menu on every read, and
  // the bar needs it in three places
  const menu = children(() => props.menu)

  return (
    <div data-sem="stats-bar" data-test="stats-bar" class="sticky top-0 z-50 backdrop-blur contrast-more:bg-background border-b">
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

      {/* Stats row. With the menu, at least as tall as the button's 44px target, which stays at the
          top as conditions and spells wrap the row onto more lines. */}
      <div class={cn("flex items-center gap-4 px-4", menu() ? "min-h-11 py-1.5" : "py-2")}>
        <Show when={menu()}>
          <div class="shrink-0 self-start">{menu()}</div>
        </Show>
        <div class="flex min-w-0 flex-1 items-center justify-between gap-4">
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
    </div>
  )
}

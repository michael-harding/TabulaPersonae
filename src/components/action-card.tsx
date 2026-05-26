import { createSignal, Show, For } from "solid-js"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { formatModifier } from "@/lib/character-utils"
import { Popover } from "@kobalte/core/popover"
import Pencil from "lucide-solid/icons/pencil"
import ArrowBigUp from "lucide-solid/icons/arrow-big-up"
import CircleHelp from "lucide-solid/icons/circle-help"

function getOrdinalSuffix(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

export interface ActionCardProps {
  // Header
  name: string
  badgeLabel: string

  // Spell subtitle — formatted internally as "Cantrip • School" or "1st level • School"
  spellLevel?: number
  spellSchool?: string

  // Spell badge modifiers
  concentration?: boolean
  duration?: string
  ritual?: boolean

  // Stats — all optional, shown when truthy / not undefined
  castingTime?: string   // detail popover only
  attackBonus?: number   // "Attack: +5 to hit"
  range?: string
  attackSave?: string
  components?: string
  atHigherLevel?: string

  // Trigger (reactions) — shown in stats row
  trigger?: string

  // Effect pills — priority: gain > tempHp > damage
  damage?: string
  damageType?: string
  gain?: string
  tempHp?: string

  // Description — line-clamp-2 on card; full text in popover
  description?: string

  // Uses tracker
  uses?: number
  maxUses?: number
  rechargeOn?: "short-rest" | "long-rest"
  onUsesChange?: (v: number) => void

  // Spell cast buttons — mutually exclusive with uses tracker
  spellId?: string
  castable?: () => boolean
  onCast?: () => void
  upcastLevels?: () => number[]
  onCastAtLevel?: (level: number) => void
  hasHigherSlots?: () => boolean
  upcastSpellId?: () => string | null
  onUpcastSpellId?: (id: string | null) => void

  // Edit button — omit for spells and features
  onEdit?: () => void
}

export function ActionCard(props: ActionCardProps) {
  const [concentrationActive, setConcentrationActive] = createSignal(false)

  const spellSubtitle = () => {
    if (props.spellLevel === undefined) return null
    const level = props.spellLevel === 0 ? "Cantrip" : `${getOrdinalSuffix(props.spellLevel)} level`
    return props.spellSchool ? `${level} • ${props.spellSchool}` : level
  }

  const durationLabel = () => {
    if (!props.duration) return null
    const d = props.duration.replace(/^concentration,\s*/i, "")
    return d.toLowerCase() === "instantaneous" ? null : d
  }

  const pill = () => {
    if (props.gain) return { text: props.gain, color: "green" } as const
    if (props.tempHp) return { text: props.tempHp, color: "blue" } as const
    if (props.damage) return { text: props.damageType ? `${props.damage} ${props.damageType}` : props.damage, color: "red" } as const
    return null
  }

  const hasAnyStats = () =>
    props.trigger !== undefined ||
    props.attackBonus !== undefined ||
    props.range !== undefined ||
    props.attackSave !== undefined ||
    props.components !== undefined ||
    props.atHigherLevel !== undefined ||
    pill() !== null ||
    !!props.concentration ||
    durationLabel() !== null

  const hasCastButtons = () => !!props.onCast
  const hasUsesTracker = () => (props.maxUses ?? 0) > 0 && !hasCastButtons()

  return (
    <div class="p-3 border rounded-lg flex flex-col gap-2">

      {/* Row 1 — Header */}
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <div class="font-medium flex items-center gap-1">
            {props.name}
            <Popover gutter={8}>
              <Popover.Trigger
                class="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Details for ${props.name}`}
              >
                <CircleHelp class="w-4 h-4" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content class="z-50 w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95">
                  <Popover.Arrow />
                  <div class="space-y-2">
                    <div class="font-semibold text-sm">{props.name}</div>
                    <Show when={spellSubtitle()}>
                      <div class="text-xs text-muted-foreground">
                        {spellSubtitle()}
                        {props.ritual && " (ritual)"}
                        {props.concentration && " · Concentration"}
                      </div>
                    </Show>
                    <div class="text-xs space-y-1 border-t pt-2">
                      <Show when={props.castingTime}>
                        <div><span class="font-medium">Casting Time:</span> {props.castingTime}</div>
                      </Show>
                      <Show when={props.range}>
                        <div><span class="font-medium">Range:</span> {props.range}</div>
                      </Show>
                      <Show when={props.components}>
                        <div><span class="font-medium">Components:</span> {props.components}</div>
                      </Show>
                      <Show when={props.duration}>
                        <div><span class="font-medium">Duration:</span> {props.duration}</div>
                      </Show>
                      <Show when={props.attackSave}>
                        <div><span class="font-medium">Attack/Save:</span> {props.attackSave}</div>
                      </Show>
                      <Show when={props.attackBonus !== undefined}>
                        <div><span class="font-medium">Attack Bonus:</span> {formatModifier(props.attackBonus!)}</div>
                      </Show>
                      <Show when={props.damage}>
                        <div><span class="font-medium">Damage:</span> {props.damage}{props.damageType ? ` ${props.damageType}` : ""}</div>
                      </Show>
                      <Show when={props.gain}>
                        <div><span class="font-medium">Gain:</span> {props.gain}</div>
                      </Show>
                      <Show when={props.tempHp}>
                        <div><span class="font-medium">Temp HP:</span> {props.tempHp}</div>
                      </Show>
                      <Show when={props.trigger}>
                        <div><span class="font-medium">Trigger:</span> {props.trigger}</div>
                      </Show>
                      <Show when={(props.maxUses ?? 0) > 0}>
                        <div><span class="font-medium">Max Uses:</span> {props.maxUses}</div>
                      </Show>
                      <Show when={props.rechargeOn}>
                        <div><span class="font-medium">Recharge On:</span> {props.rechargeOn === "short-rest" ? "Short Rest" : "Long Rest"}</div>
                      </Show>
                    </div>
                    <Show when={props.description}>
                      <div class="text-xs border-t pt-2 leading-relaxed">{props.description}</div>
                    </Show>
                    <Show when={props.atHigherLevel}>
                      <div class="text-xs border-t pt-2">
                        <span class="font-medium">At Higher Levels:</span> {props.atHigherLevel}
                      </div>
                    </Show>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </div>
          <Show when={spellSubtitle()}>
            <div class="text-xs text-muted-foreground">{spellSubtitle()}</div>
          </Show>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" class="text-xs">{props.badgeLabel}</Badge>
          <Show when={props.onEdit}>
            <Tooltip content={`Edit ${props.name}`}>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Edit ${props.name}`}
                onClick={props.onEdit}
              >
                <Pencil class="h-4 w-4" />
              </button>
            </Tooltip>
          </Show>
        </div>
      </div>

      {/* Row 2 — Stats + pill */}
      <Show when={hasAnyStats()}>
        <div class="flex flex-wrap items-start justify-between gap-2 text-sm">
          <div class="space-y-1 flex-1">
            <Show when={props.trigger}>
              <div><strong>Trigger:</strong> {props.trigger}</div>
            </Show>
            <Show when={props.attackBonus !== undefined}>
              <div><strong>Attack:</strong> {formatModifier(props.attackBonus!)} to hit</div>
            </Show>
            <Show when={props.range}>
              <div><strong>Range:</strong> {props.range}</div>
            </Show>
            <Show when={props.attackSave}>
              <div><strong>Attack/Save:</strong> {props.attackSave}</div>
            </Show>
            <Show when={props.components}>
              <div><strong>Components:</strong> {props.components}</div>
            </Show>
            <Show when={props.atHigherLevel}>
              <div><strong>At Higher Level:</strong> {props.atHigherLevel}</div>
            </Show>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <Show when={props.concentration}>
              <Badge
                variant={concentrationActive() ? "default" : "outline"}
                class={`text-xs cursor-pointer select-none${concentrationActive() ? "" : " text-muted-foreground border-muted-foreground/40"}`}
                onClick={() => setConcentrationActive(v => !v)}
              >
                Concentration
              </Badge>
            </Show>
            <Show when={durationLabel()}>
              <Badge variant="outline" class="text-xs text-muted-foreground border-muted-foreground/40">
                {durationLabel()}
              </Badge>
            </Show>
            <Show when={pill()}>
              {(p) => {
                const colorClass = p().color === "green"
                  ? "border-green-500 text-green-700"
                  : p().color === "blue"
                  ? "border-blue-500 text-blue-700"
                  : "border-red-500 text-red-700"
                return (
                  <div class={`px-2 py-1 border-2 rounded font-semibold whitespace-nowrap text-sm ${colorClass}`}>
                    {p().text}
                  </div>
                )
              }}
            </Show>
          </div>
        </div>
      </Show>

      {/* Row 3 — Description */}
      <Show when={props.description}>
        <div class="text-xs text-muted-foreground line-clamp-2">{props.description}</div>
      </Show>

      {/* Row 4 — Footer */}
      <Show when={hasCastButtons() || hasUsesTracker()}>
        <div class="flex items-center justify-between gap-2 mt-auto">
          <Show when={hasUsesTracker()}>
            <Show
              when={(props.maxUses ?? 0) <= 5}
              fallback={
                <StepperInput
                  value={props.uses ?? 0}
                  min={0}
                  max={props.maxUses}
                  onChange={props.onUsesChange!}
                />
              }
            >
              <PipTracker
                total={props.maxUses!}
                used={props.uses ?? 0}
                onToggle={props.onUsesChange!}
                usedTitle="Charge spent (click to restore)"
                availableTitle="Charge available (click to use)"
              />
            </Show>
          </Show>
          <Show when={hasCastButtons()}>
            <div class="flex items-center gap-1 ml-auto">
              <Show when={props.upcastSpellId?.() === props.spellId && props.upcastLevels && props.upcastLevels().length > 0}>
                <div class="flex gap-1">
                  <For each={props.upcastLevels!()}>
                    {(level) => (
                      <Button
                        variant="secondary"
                        size="sm"
                        class="h-11 min-w-[44px] px-2 text-xs"
                        onClick={() => props.onCastAtLevel?.(level)}
                      >
                        {getOrdinalSuffix(level)}
                      </Button>
                    )}
                  </For>
                </div>
              </Show>
              <Button
                variant="outline"
                size="sm"
                class="h-11 px-4"
                disabled={!props.castable?.()}
                onClick={props.onCast}
              >
                Cast
              </Button>
              <Show when={!!props.atHigherLevel && props.hasHigherSlots?.()}>
                <Button
                  variant="outline"
                  size="sm"
                  class="h-11 w-11 p-0"
                  aria-label="Upcast"
                  disabled={!props.upcastLevels?.().length}
                  onClick={() => props.onUpcastSpellId?.(
                    props.upcastSpellId?.() === props.spellId ? null : (props.spellId ?? null)
                  )}
                >
                  <ArrowBigUp class="h-4 w-4" />
                </Button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

    </div>
  )
}

import { createSignal, Show, type JSX } from "solid-js"
import RefreshCw from "lucide-solid/icons/refresh-cw"
import WandSparkles from "lucide-solid/icons/wand-sparkles"
import X from "lucide-solid/icons/x"

import { useReadOnly } from "@/lib/read-only-context"
import { Chip } from "@/components/ui/chip"
import { Button } from "@/components/ui/button"
import { StatBadge, StatBadgeGroup } from "@/components/ui/stat-badge"
import { PipTracker, type PipIcon } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from "@/components/ui/popover"
import { Select, SelectContent, SelectTrigger, SelectValue, type SelectOption } from "@/components/ui/select"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { formatModifier, remainingUses, spentFromRemaining, TEMP_HP_GAIN_TYPE } from "@/lib/character-utils"
import { cn, TOUCH_TARGET_BOX } from "@/lib/utils"

function getOrdinalSuffix(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

/**
 * The list every set of action cards sits in: a grid, two cards to a row on phones and four from md
 * up. Cards in a row stretch to the tallest one's height.
 */
export function ActionCardList(props: { children: JSX.Element }) {
  return (
    // A list, so screen readers announce how many cards a section holds. role="list" because Safari
    // drops a <ul>'s list semantics once its bullets are styled away.
    <ul role="list" class="grid grid-cols-2 gap-3 md:grid-cols-4">
      {props.children}
    </ul>
  )
}

/** A spell slot level a spell can be cast with, and how many of its slots are left. */
export interface SlotLevel {
  level: number
  remaining: number
}

// What a click on the card itself ignores: anything the user can operate or focus. Not data-sem,
// which production builds strip.
const INTERACTIVE = 'button, a, input, select, textarea, label, [tabindex]:not([tabindex="-1"]), [role="button"], [role="option"], [role="listbox"]'

export interface ActionCardProps {
  /** Page-unique, and the prefix of every hook inside the card: names can repeat. */
  "data-test": string
  // Header
  name: string
  // Omit for spells — badge falls back to the spell level (Cantrip, 1st, 2nd...)
  badgeLabel?: string

  // Spell details, shown in the expanded view
  spellLevel?: number
  spellSchool?: string
  concentration?: boolean
  duration?: string
  ritual?: boolean
  castingTime?: string
  components?: string
  atHigherLevel?: string
  /** The name of the magic item that grants the spell. */
  grantedBy?: string
  /** Whether casting the spell spends no slot. */
  freeCast?: boolean

  // Feature details, shown in the expanded view
  /** The character level the feature is gained at. */
  atLevel?: number

  // Item details, shown in the expanded view
  /** The item's rarity, as shown ("Very Rare"). */
  rarity?: string
  requiresAttunement?: boolean
  /** Whether the character is attuned to an item that requires attunement. */
  attuned?: boolean
  /** How many of the item the character has. Shown when more than one. */
  quantity?: number

  // Stats
  attackBonus?: number
  /** Breakdown of a calculated attackBonus, shown as its tooltip. */
  attackBonusTooltip?: string
  range?: string
  /** The save's label ("DEX Save") when attackSaveDC is given; otherwise text shown as written. */
  attackSave?: string
  /** The DC of an attackSave that names a save ability. */
  attackSaveDC?: number
  /** Breakdown of a calculated attackSaveDC, shown as its tooltip. */
  attackSaveTooltip?: string
  // Trigger (reactions)
  trigger?: string

  // Effect badges
  damage?: string
  /** Breakdown of a calculated damage roll, shown as the damage badge's tooltip. */
  damageTooltip?: string
  damageType?: string
  damageRecurring?: boolean
  gain?: string
  gainType?: string
  gainRecurring?: boolean

  /** Markdown summary for the card face; without it the card shows the start of the description. */
  highlights?: string
  description?: string

  // Uses tracker
  uses?: number
  maxUses?: number
  rechargeOn?: "short-rest" | "long-rest"
  onUsesChange?: (v: number) => void
  /** Marks the uses tracker's available pips. The tracker's own default unless given. */
  pipIcon?: PipIcon

  // Casting — mutually exclusive with the uses tracker
  /** Whether the spell can be cast at its own level. */
  castable?: () => boolean
  /** Casts the spell with a slot of the given level. */
  onCast?: (level: number) => void
  /** The slot levels to choose from: the spell's own level and each higher one the character has. */
  slotLevels?: () => SlotLevel[]

  // Edit button — opens the entry's own add/edit form
  onEdit?: () => void

  /**
   * Makes the card reorderable (the Actions module in edit mode): the whole card is dragged, its
   * controls are replaced by the reorder controls, and it doesn't open its expanded view.
   */
  reorder?: ActionCardReorder
}

/** A reorderable card's place in its sortable list (see SortableItem), and its reorder controls. */
export interface ActionCardReorder {
  ref: (el: HTMLElement) => void
  style: () => JSX.CSSProperties | undefined
  isDragging: () => boolean
  /** Starts a drag of the card (see SortableItem.onItemPointerDown). */
  onPointerDown: (e: PointerEvent) => void
  controls: () => JSX.Element
}

export function ActionCard(props: ActionCardProps) {
  const isReadOnly = useReadOnly()
  const [concentrationActive, setConcentrationActive] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  const [cardWidth, setCardWidth] = createSignal(0)
  // undefined means the spell's own level, which every cast resets to: a higher slot is only ever
  // spent when chosen for that cast
  const [chosenLevel, setChosenLevel] = createSignal<number>()
  let cardRef!: HTMLLIElement
  let nameButtonRef: HTMLButtonElement | undefined
  let expandedRef: HTMLDivElement | undefined

  const hook = (part: string, inExpanded: boolean) => `${props["data-test"]}${inExpanded ? "-expanded" : ""}-${part}`

  const spellLevelLabel = () => {
    if (props.spellLevel == null) return null
    return props.spellLevel === 0 ? "Cantrip" : getOrdinalSuffix(props.spellLevel)
  }
  const badgeText = () => spellLevelLabel() ?? props.badgeLabel

  const durationLabel = () => {
    if (!props.duration) return null
    const d = props.duration.replace(/^concentration,\s*/i, "")
    return d.toLowerCase() === "instantaneous" ? null : d
  }

  const damageText = () => (props.damageType ? `${props.damage} ${props.damageType}` : props.damage)
  const isTempHp = () => props.gainType === TEMP_HP_GAIN_TYPE

  const hasCastButton = () => !!props.onCast && !isReadOnly
  const hasUsesTracker = () => (props.maxUses ?? 0) > 0 && !props.onCast

  const selectedLevel = () => chosenLevel() ?? props.spellLevel ?? 0
  const slotChoices = () => props.slotLevels?.() ?? []
  const hasSlotSelect = () => hasCastButton() && slotChoices().length > 1
  const canCast = () => hasSlotSelect()
    ? (slotChoices().find((l) => l.level === selectedLevel())?.remaining ?? 0) > 0
    : !!props.castable?.()
  const cast = () => {
    props.onCast?.(selectedLevel())
    setChosenLevel(undefined)
  }
  const slotOptions = (): SelectOption[] => slotChoices().map((l) => ({
    value: String(l.level),
    label: getOrdinalSuffix(l.level),
    ...(l.remaining > 0 ? { icon: WandSparkles } : { muted: true, srHint: "no slots" }),
  }))

  // A pointer shortcut only: the name is the real button, and the one keyboard and screen reader
  // users reach (ACCESSIBILITY.md §3; the whole-card click was approved as a pointer convenience).
  const handleCardClick = (e: MouseEvent) => {
    // A reorderable card is dragged, not opened
    if (props.reorder) return
    if ((e.target as Element).closest(INTERACTIVE)) return
    if (window.getSelection()?.toString()) return
    nameButtonRef?.click()
  }

  // The edit form opens once the expanded view has finished closing and handed focus back to the
  // card's name (see onCloseAutoFocus): opened sooner, that hand-back would pull focus out of the
  // open form, disarming a two-click Delete in it. The form then returns focus to the name.
  let editPending = false
  const openEdit = () => {
    editPending = true
    setExpanded(false)
  }

  // ── Pieces shared by the card face and the expanded view ─────────────────────────────────────

  const recurring = (show: boolean | undefined) => (
    <Show when={show}>
      <RefreshCw class="ml-0.5 inline-block h-3 w-3 align-[-0.125em]" aria-hidden="true" />
      <span class="sr-only">, recurs each turn</span>
    </Show>
  )

  const statBadges = (inExpanded: boolean) => (
    <Show when={props.attackBonus != null || props.attackSave || props.damage || props.gain}>
      <StatBadgeGroup>
        <Show when={props.attackBonus != null}>
          <StatBadge
            data-test={hook("attack-badge", inExpanded)}
            label="Attack"
            value={formatModifier(props.attackBonus!)}
            tooltip={props.attackBonusTooltip}
            tooltipLabel={`Attack ${formatModifier(props.attackBonus!)}`}
          />
        </Show>
        <Show when={props.attackSave}>
          <Show
            when={props.attackSaveDC != null}
            fallback={<StatBadge data-test={hook("attack-save-badge", inExpanded)} label="Attack/Save" value={props.attackSave} />}
          >
            <StatBadge
              data-test={hook("attack-save-badge", inExpanded)}
              label={props.attackSave}
              value={`DC ${props.attackSaveDC}`}
              tooltip={props.attackSaveTooltip}
              tooltipLabel={`${props.attackSave} DC ${props.attackSaveDC}`}
            />
          </Show>
        </Show>
        <Show when={props.damage}>
          <StatBadge
            data-test={hook("damage-badge", inExpanded)}
            tone="damage"
            valueFirst
            value={props.damage}
            label={<>{props.damageType || "Damage"}{recurring(props.damageRecurring)}</>}
            tooltip={props.damageTooltip}
            tooltipLabel={`Damage ${damageText()}`}
          />
        </Show>
        <Show when={props.gain}>
          <StatBadge
            data-test={hook("gain-badge", inExpanded)}
            tone={isTempHp() ? "tempHp" : "gain"}
            valueFirst
            value={props.gain}
            label={<>{props.gainType || "Gain"}{recurring(props.gainRecurring)}</>}
          />
        </Show>
      </StatBadgeGroup>
    </Show>
  )

  const statusChips = (inExpanded: boolean) => (
    <>
      <Show when={props.concentration}>
        <Chip
          variant={concentrationActive() ? "default" : "outline"}
          class={`text-xs select-none${concentrationActive() ? "" : " text-muted-foreground"}${!isReadOnly ? " cursor-pointer" : ""}`}
          data-test={hook(`concentration-badge-${concentrationActive() ? "active" : "inactive"}`, inExpanded)}
          onClick={isReadOnly ? undefined : () => setConcentrationActive(v => !v)}
        >
          Concentration
        </Chip>
      </Show>
      <Show when={durationLabel()}>
        <Chip variant="outline" class="text-xs text-muted-foreground">{durationLabel()}</Chip>
      </Show>
    </>
  )

  const hasStatList = () => !!(props.trigger || props.range)
  const statList = () => (
    <Show when={hasStatList()}>
      <ul class="min-w-24 flex-1 space-y-0.5 text-xs [overflow-wrap:anywhere]">
        <Show when={props.trigger}><li><strong>Trigger:</strong> {props.trigger}</li></Show>
        <Show when={props.range}><li><strong>Range:</strong> {props.range}</li></Show>
      </ul>
    </Show>
  )

  const controls = (inExpanded: boolean) => (
    <>
      <Show when={hasUsesTracker()}>
        <Show
          when={(props.maxUses ?? 0) <= 5}
          fallback={
            // value/onChange are inverted: display shows remaining uses, storage tracks used count
            <StepperInput data-test={hook("uses-stepper", inExpanded)}
              value={remainingUses(props.uses, props.maxUses)}
              min={0}
              max={props.maxUses}
              onChange={(v) => props.onUsesChange!(spentFromRemaining(v, props.maxUses))}
              readOnly={isReadOnly}
              aria-label={`${props.name} uses remaining`}
            />
          }
        >
          <PipTracker
            data-test={hook("uses", inExpanded)}
            icon={props.pipIcon}
            total={props.maxUses!}
            used={props.uses ?? 0}
            onToggle={props.onUsesChange!}
            usedTitle="Charge spent (click to restore)"
            availableTitle="Charge available (click to use)"
            usedLabel="Charge spent"
            availableLabel="Charge available"
            readOnly={isReadOnly}
          />
        </Show>
      </Show>
      <Show when={hasCastButton()}>
        <div class="flex flex-wrap items-center justify-end gap-1">
          <Show when={hasSlotSelect()}>
            <Select options={slotOptions()} value={String(selectedLevel())} onValueChange={(v) => setChosenLevel(Number(v))}>
              {/* No visible label: the design gives the select only the levels (ACCESSIBILITY.md §11),
                  so it is named for its spell, which tells it apart from the other cards' selects */}
              <SelectTrigger class="w-auto shrink-0 gap-1 px-1.5" aria-label={`Cast ${props.name} at level`} data-test={hook("slot-select", inExpanded)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </Show>
          <Button
            variant="outline"
            size="sm"
            class="h-11 px-3"
            data-test={hook("cast-button", inExpanded)}
            // Named for the spell: in a list of cards, "Cast" alone could be any of them
            aria-label={`Cast ${props.name}`}
            disabled={!canCast()}
            onClick={cast}
          >
            Cast
          </Button>
        </div>
      </Show>
    </>
  )

  const hasControls = () => hasUsesTracker() || hasCastButton()

  const detailRow = (label: string, value: JSX.Element) => <div><span class="font-medium">{label}:</span> {value}</div>

  return (
    <Popover
      open={expanded()}
      onOpenChange={(open) => {
        if (open) setCardWidth(cardRef.offsetWidth)
        setExpanded(open)
      }}
      // The expanded view opens over the card from its top edge, centered on it: anchored to a
      // zero-height line along the card's top rather than to the name button. When it would be cut
      // short below that line (a card near the bottom of the screen) and there's more room above,
      // it flips to open upward from the same line.
      getAnchorRect={() => {
        const r = cardRef.getBoundingClientRect()
        return { x: r.left, y: r.top, width: r.width, height: 0 }
      }}
      placement="bottom"
      gutter={0}
      overflowPadding={16}
      // Modal, so a click outside only closes it: the click never reaches what's underneath, such
      // as another card, which would open that card's expanded view
      modal
    >
      <li
        ref={(el) => {
          cardRef = el
          props.reorder?.ref(el)
        }}
        data-sem="action-card"
        data-test={props["data-test"]}
        style={props.reorder?.style()}
        class={cn(
          "flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:border-primary",
          // Opaque while it can be dragged, so a card carried over the others hides what's under it
          props.reorder ? "cursor-grab select-none bg-card" : "cursor-pointer",
          props.reorder?.isDragging() && "relative z-10 cursor-grabbing border-primary opacity-80 shadow-lg",
        )}
        onClick={handleCardClick}
        onPointerDown={(e) => props.reorder?.onPointerDown(e)}
      >
        {/* Header. The name keeps room for a full touch target (ACCESSIBILITY.md §13): in a narrow
            card a long badge wraps below it instead of squeezing it */}
        <div class="flex flex-wrap items-start gap-1">
          {/* While reorderable the card doesn't open, so its name is only its name */}
          <Show
            when={!props.reorder}
            fallback={<span class="flex min-h-11 min-w-24 flex-1 items-center font-medium leading-tight [overflow-wrap:anywhere]" data-test={hook("name", false)}>{props.name}</span>}
          >
            <PopoverTrigger
              ref={nameButtonRef}
              class="flex min-h-11 min-w-24 flex-1 items-center rounded text-left font-medium leading-tight [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-test={hook("name", false)}
            >
              {props.name}
            </PopoverTrigger>
          </Show>
          <Show when={badgeText()}>
            <Chip variant="secondary" class="ml-auto shrink-0 text-xs">{badgeText()}</Chip>
          </Show>
        </div>

        {statBadges(false)}

        {/* The chips sit beside the list when there's room, and wrap below it when there isn't.
            Beside the list they stack, Concentration above the duration; on their own they share a row */}
        <Show when={hasStatList() || props.concentration || durationLabel()}>
          <div class="flex flex-wrap items-start gap-2">
            {statList()}
            <Show when={props.concentration || durationLabel()}>
              <div class={cn("ml-auto flex gap-1", hasStatList() ? "flex-col items-end" : "flex-wrap justify-end")}>{statusChips(false)}</div>
            </Show>
          </div>
        </Show>

        <Show
          when={props.highlights}
          fallback={<Show when={props.description}><div class="text-xs line-clamp-2">{props.description}</div></Show>}
        >
          {(highlights) => <MarkdownContent text={highlights()} class="text-xs" />}
        </Show>

        <Show
          when={props.reorder}
          fallback={
            <Show when={hasControls()}>
              <div class="mt-auto flex flex-wrap items-center justify-end gap-2">{controls(false)}</div>
            </Show>
          }
        >
          {(reorder) => (
            // Into the card's padding, so the three 44px controls fit a phone-width card on one row
            <div class="-mx-2 -mb-2 mt-auto flex items-center justify-between" data-test={hook("reorder", false)}>
              {reorder().controls()}
            </div>
          )}
        </Show>
      </li>

      <PopoverContent
        motion="fade"
        data-test={`${props["data-test"]}-expanded`}
        // Styled as the card itself, with the border the card shows on hover
        class="max-h-[var(--kb-popper-content-available-height)] w-[min(36rem,calc(100vw-2rem))] origin-[var(--kb-popper-content-transform-origin)] overflow-y-auto border-primary bg-card p-4 text-card-foreground"
        style={{ "min-width": `${cardWidth()}px` }}
        ref={expandedRef}
        // Focus goes to the view itself, named by its title, rather than to its first control: the
        // close button, which would light up with a focus ring on every pointer open
        onOpenAutoFocus={(e: Event) => {
          e.preventDefault()
          // Without scrolling: the view is already placed over the card, where the user is looking
          expandedRef?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={() => {
          if (!editPending) return
          editPending = false
          const onEdit = props.onEdit
          // After the popover's own focus hand-back, which follows this handler
          if (onEdit) queueMicrotask(onEdit)
        }}
      >
        <div class="space-y-3">
          <div class="flex items-start gap-2">
            <PopoverTitle as="h2" class="min-w-0 flex-1 font-semibold leading-tight">{props.name}</PopoverTitle>
            <Show when={badgeText()}>
              <Chip variant="secondary" class="mt-1 shrink-0 text-xs">{badgeText()}</Chip>
            </Show>
            <button
              type="button"
              class={cn(TOUCH_TARGET_BOX, "-mr-2 -mt-2 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
              aria-label={`Close ${props.name}`}
              data-test={hook("close", true)}
              onClick={() => setExpanded(false)}
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {statBadges(true)}

          <Show when={props.concentration || durationLabel() || props.ritual || props.freeCast}>
            <div class="flex flex-wrap gap-1">
              {statusChips(true)}
              <Show when={props.ritual}><Chip variant="outline" class="text-xs text-muted-foreground">Ritual</Chip></Show>
              <Show when={props.freeCast}><Chip variant="outline" class="text-xs text-muted-foreground">Free Cast</Chip></Show>
            </div>
          </Show>

          <div class="space-y-1 text-xs">
            <Show when={props.spellSchool}>{detailRow("School", props.spellSchool)}</Show>
            <Show when={props.grantedBy}>{detailRow("Granted By", props.grantedBy)}</Show>
            <Show when={props.atLevel}>{detailRow("At Level", props.atLevel)}</Show>
            <Show when={props.rarity}>{detailRow("Rarity", props.rarity)}</Show>
            <Show when={props.requiresAttunement}>{detailRow("Attunement", props.attuned ? "Attuned" : "Required, not attuned")}</Show>
            <Show when={(props.quantity ?? 0) > 1}>{detailRow("Quantity", props.quantity)}</Show>
            <Show when={props.castingTime}>{detailRow("Casting Time", props.castingTime)}</Show>
            <Show when={props.range}>{detailRow("Range", props.range)}</Show>
            <Show when={props.components}>{detailRow("Components", props.components)}</Show>
            <Show when={props.duration}>{detailRow("Duration", props.duration)}</Show>
            <Show when={props.trigger}>{detailRow("Trigger", props.trigger)}</Show>
            <Show when={props.damageRecurring}>{detailRow("Damage", `${damageText()}, recurs each turn`)}</Show>
            <Show when={props.gainRecurring}>{detailRow("Gain", `${props.gain}${props.gainType ? ` ${props.gainType}` : ""}, recurs each turn`)}</Show>
            <Show when={(props.maxUses ?? 0) > 0}>{detailRow("Max Uses", props.maxUses)}</Show>
            <Show when={props.rechargeOn}>{detailRow("Recharge On", props.rechargeOn === "short-rest" ? "Short Rest" : "Long Rest")}</Show>
          </div>

          <Show when={props.highlights}>
            {(highlights) => <MarkdownContent text={highlights()} class="text-xs" />}
          </Show>
          <Show when={props.description}>
            <div class="border-t pt-2">
              <MarkdownContent text={props.description!} class="text-xs leading-relaxed" />
            </div>
          </Show>
          <Show when={props.atHigherLevel}>
            <div class="border-t pt-2 text-xs">
              <span class="font-medium">At Higher Levels:</span> {props.atHigherLevel}
            </div>
          </Show>

          <Show when={hasControls() || (props.onEdit && !isReadOnly)}>
            <div class="flex flex-wrap items-center gap-2 border-t pt-3">
              <Show when={props.onEdit && !isReadOnly}>
                <Button variant="outline" size="sm" class="h-11 px-4" data-test={hook("edit-button", true)} aria-label={`Edit ${props.name}`} onClick={openEdit}>
                  Edit
                </Button>
              </Show>
              <div class="ml-auto flex flex-wrap items-center justify-end gap-2">{controls(true)}</div>
            </div>
          </Show>
        </div>
      </PopoverContent>
    </Popover>
  )
}

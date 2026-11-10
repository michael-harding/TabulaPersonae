import { createSignal, createMemo, For, Show, untrack, type JSX } from "solid-js"
import Sword from "lucide-solid/icons/sword"
import Plus from "lucide-solid/icons/plus"
import Clock from "lucide-solid/icons/clock"
import Target from "lucide-solid/icons/target"
import Shield from "lucide-solid/icons/shield"
import Sparkles from "lucide-solid/icons/sparkles"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Backpack from "lucide-solid/icons/backpack"

import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { Character, ActionKind, ActionType, ActionSectionKey, ActionSectionLayout, Attack, Equipment, Feature, Spell, OtherAction } from "@/lib/character-types"
import { getEffectiveSpellSaveDC, getEffectiveSpellAttackBonus, getEffectiveSpellSaveDCTooltip, getEffectiveSpellAttackTooltip, spellSaveLabel, safeFeatures, getEquippedWeaponAttacks, effectiveMaxUses, effectiveEquipmentMaxUses, effectiveEquipmentUses, hasChargesTracking, FEATURE_KIND_LABELS, ACTION_KIND_LABELS, RECHARGE_ON_OPTIONS, activeSpells, isSustainedSpell, withSpellActivated, withSpellEnded, withSpells, isSpellReady } from "@/lib/character-utils"
import { EditableModule } from "@/components/editable-module"
import { useModuleEdit } from "@/hooks/use-module-edit"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Chip } from "@/components/ui/chip"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"
import { ActionCard, ActionCardList, type ActionCardReorder, type SlotLevel } from "@/components/action-card"
import { SortableGroup, SortableHandle, SortableList, SortableMoveButton, createSortableItem, type SortablePosition } from "@/components/ui/sortable"
import { actionCardKey, earlierPosition, laterPosition, moveCard, resolveLayout, type ActionCardPosition, type ActionKeyLayout } from "@/lib/action-layout"
import { SpellEditModal } from "@/components/spell-edit-modal"
import { FeatureEditModal } from "@/components/features-module"
import { EquipmentItemModal, RARITY_OPTIONS } from "@/components/equipment-item-modal"
import { DamageFields, GainFields } from "@/components/effect-fields"
import { useReadOnly } from "@/lib/read-only-context"
import { cn, HOVER_ACCENT } from "@/lib/utils"

interface ActionsModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "attack", label: "Attack" },
  { value: "ability", label: "Ability" },
  { value: "other", label: "Other" },
]

export const ACTION_TYPE_LABEL: Record<string, string> = {
  attack: "Attack",
  ability: "Ability",
  "class-feature": "Class Feature",
  feat: "Feat",
  "species-ability": "Species Ability",
  other: "Other",
  weapon: "Attack",
  spell: "Ability",
}


interface ActionFormData {
  name: string
  type: string
  attackBonus: number
  damage: string
  damageType: string
  damageRecurring: boolean
  gain: string
  gainType: string
  gainRecurring: boolean
  range: string
  trigger: string
  uses: number
  maxUses: number
  rechargeOn: '' | 'short-rest' | 'long-rest'
  highlights: string
  description: string
}

interface ActionFormProps {
  kind: ActionKind
  initialData?: Partial<ActionFormData>
  onSubmit: (data: ActionFormData) => void
  onDelete?: () => void
  onCancel: () => void
}

const ACTION_TYPE_LABELS = ACTION_TYPES.map((t) => t.label)

function ActionForm(props: ActionFormProps) {
  const kindLabel = () => ACTION_KIND_LABELS[props.kind]
  const isEditing = () => !!props.initialData?.name
  const [formData, setFormData] = createSignal<ActionFormData>({
    name: props.initialData?.name ?? "",
    type: props.initialData?.type ?? "Ability",
    attackBonus: props.initialData?.attackBonus ?? 0,
    damage: props.initialData?.damage ?? "",
    damageType: props.initialData?.damageType ?? "Slashing",
    damageRecurring: props.initialData?.damageRecurring ?? false,
    gain: props.initialData?.gain ?? "",
    gainType: props.initialData?.gainType ?? "",
    gainRecurring: props.initialData?.gainRecurring ?? false,
    range: props.initialData?.range ?? "",
    trigger: props.initialData?.trigger ?? "",
    uses: props.initialData?.uses ?? 0,
    maxUses: props.initialData?.maxUses ?? 0,
    rechargeOn: props.initialData?.rechargeOn ?? "",
    highlights: props.initialData?.highlights ?? "",
    description: props.initialData?.description ?? "",
  })

  const handleSubmit = () => {
    if (!formData().name.trim()) return
    if (props.kind === "reaction" && !formData().trigger.trim()) return
    props.onSubmit(formData())
  }

  return (
    <div class="space-y-4">
      <div>
        <Label for="action-name">{kindLabel()} Name</Label>
        <Input id="action-name" autofocus value={formData().name}
          onInput={(e) => setFormData(p => ({ ...p, name: e.currentTarget.value }))}
          placeholder={props.kind === "reaction" ? "e.g., Shield, Opportunity Attack" : props.kind === "bonus-action" ? "e.g., Second Wind, Cunning Action" : "e.g., Lay on Hands, Breath Weapon"} />
      </div>

      <div>
        <Label for="action-type">Type</Label>
        <Combobox id="action-type" value={formData().type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))} options={ACTION_TYPE_LABELS} />
      </div>

      <Show when={props.kind === "reaction"}>
        <div>
          <Label for="action-trigger">Trigger</Label>
          <Input id="action-trigger" value={formData().trigger}
            onInput={(e) => setFormData(p => ({ ...p, trigger: e.currentTarget.value }))}
            placeholder="e.g., When a creature moves out of your reach" />
        </div>
      </Show>

      <Show when={formData().type.toLowerCase() === "attack"}>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <Label for="action-attack-bonus">Attack Bonus</Label>
            <NumericInput id="action-attack-bonus" value={formData().attackBonus}
              onChange={(v) => setFormData(p => ({ ...p, attackBonus: v }))} placeholder="+5" />
          </div>
        </div>
        <DamageFields idPrefix="action" value={formData()} onChange={(patch) => setFormData(p => ({ ...p, ...patch }))} placeholder="e.g. 1d8+3" />
      </Show>

      <GainFields idPrefix="action" value={formData()} onChange={(patch) => setFormData(p => ({ ...p, ...patch }))} placeholder="e.g. 1d8" />

      <div>
        <Label for="action-range">Range</Label>
        <Input id="action-range" value={formData().range}
          onInput={(e) => setFormData(p => ({ ...p, range: e.currentTarget.value }))}
          placeholder="5 ft, 30 ft, Touch, Self" />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for="action-uses">Uses Spent</Label>
          <NumericInput id="action-uses" min={0} value={formData().uses}
            onChange={(v) => setFormData(p => ({ ...p, uses: v }))} />
        </div>
        <div>
          <Label for="action-max-uses">Max Uses (0 = unlimited)</Label>
          <NumericInput id="action-max-uses" min={0} value={formData().maxUses}
            onChange={(v) => setFormData(p => ({ ...p, maxUses: v, uses: 0 }))} />
        </div>
      </div>

      <div>
        <Label for="action-recharge">Recharge On</Label>
        <Select options={RECHARGE_ON_OPTIONS} value={formData().rechargeOn} onValueChange={(v) => setFormData(p => ({ ...p, rechargeOn: v as '' | 'short-rest' | 'long-rest' }))}>
          <SelectTrigger id="action-recharge"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent />
        </Select>
      </div>

      <div>
        <Label for="action-highlights">Highlights</Label>
        <Textarea id="action-highlights" value={formData().highlights}
          onInput={(e) => setFormData(p => ({ ...p, highlights: e.currentTarget.value }))}
          placeholder="Shown on the action card (Markdown)" rows={2} />
      </div>

      <div>
        <Label for="action-description">Description</Label>
        <Textarea id="action-description" value={formData().description}
          onInput={(e) => setFormData(p => ({ ...p, description: e.currentTarget.value }))}
          placeholder={`Describe what this ${kindLabel().toLowerCase()} does...`} rows={3} />
      </div>

      <div class="flex gap-2 justify-end">
        <Show when={props.onDelete}>
          <ConfirmButton data-test="action-form-delete" variant="destructive" verb="Delete" onConfirm={() => props.onDelete?.()} class="mr-auto">Delete</ConfirmButton>
        </Show>
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>{isEditing() ? "Save" : "Add"} {kindLabel()}</Button>
      </div>
    </div>
  )
}

/** The character's list a feature is stored in. */
function featureField(feature: Feature): 'classFeatures' | 'speciesTraits' | 'feats' | 'backgroundFeatures' {
  return feature.source === 'class-feature' ? 'classFeatures'
    : feature.source === 'species-trait' ? 'speciesTraits'
    : feature.source === 'background' ? 'backgroundFeatures' : 'feats'
}

// Each accessor reads the spell's level when called: an edit keeps the same spell object (the store
// reconciles by id), so the card isn't redrawn when the level changes.
function createSpellAccessors(spell: Spell, getSpellSlots: () => Character['spellSlots']) {
  const slots = () => getSpellSlots()[spell.level as keyof Character['spellSlots']]
  // A cantrip or a free cast spends no slot
  const canCast = () => spell.level === 0 || !!spell.freeCast || (!!slots() && slots().used < slots().total)
  const higherLevels = () => ([2,3,4,5,6,7,8,9] as const)
    .filter(l => l > spell.level)
    .filter(l => (getSpellSlots()[l]?.total ?? 0) > 0)
  // Whether the character has any slot level above the spell's, spent or not
  const hasHigherSlots = () => higherLevels().length > 0
  // The spell's own level and each higher level the character has slots of, with what's left
  const slotLevels = (): SlotLevel[] => [spell.level, ...higherLevels()].map((level) => {
    const s = getSpellSlots()[level as keyof Character['spellSlots']]
    return { level, remaining: s ? Math.max(0, s.total - s.used) : 0 }
  })
  return { canCast, slotLevels, hasHigherSlots }
}

type ActionSection = 'actions' | 'bonus-actions' | 'reactions' | 'other'

type StoredAction = ActionFormData & { id: string }

// The fields this module's edit form shows (see useModuleEdit for how Save writes them): edit mode
// is where the cards of each section are reordered and set aside under "More".
type ActionsDraft = Pick<Character, 'actionLayout'>

const toDraft = (character: Character): ActionsDraft => ({ actionLayout: character.actionLayout })

/** A card of an Actions section: its layout key, its name, what it shows, and how it's drawn. */
interface SectionEntry {
  key: string
  name: string
  /** What the card shows: the card is redrawn when this changes. */
  value: object
  render: (reorder?: ActionCardReorder) => JSX.Element
}

interface ActionSectionBodyProps {
  section: ActionSectionKey
  /** The section's cards, in their default order. */
  entries: SectionEntry[]
  layout: ActionSectionLayout | undefined
  editing: boolean
  /** The name of the section's "More" list: "More actions". */
  moreTitle: string
  moreOpen: boolean
  onMoreOpenChange: (open: boolean) => void
  onLayoutChange: (layout: ActionKeyLayout) => void
}

/**
 * A section's cards: those shown, then those set aside under its "More" list, collapsed. In edit
 * mode both are shown, and cards are moved in and between them by dragging, the move buttons, or
 * the menu of a card's drag handle.
 */
function ActionSectionBody(props: ActionSectionBodyProps) {
  const byKey = createMemo(() => new Map(props.entries.map((entry) => [entry.key, entry])))
  const keys = createMemo((): ActionKeyLayout => {
    const { main, more } = resolveLayout(props.entries, (entry) => entry.key, props.layout)
    return { main: main.map((entry) => entry.key), more: more.map((entry) => entry.key) }
  })
  const hook = (part: string) => `actions-${props.section}-${part}`
  let divider: HTMLDivElement | undefined

  const position = (key: string): ActionCardPosition => {
    const index = keys().main.indexOf(key)
    return index >= 0 ? { list: "main", index } : { list: "more", index: keys().more.indexOf(key) }
  }
  const move = (key: string, to: ActionCardPosition) => props.onLayoutChange(moveCard(keys(), position(key), to))
  const nameOf = (key: string) => byKey().get(key)?.name ?? key

  const describe = (key: string) => {
    const { list, index } = position(key)
    return `${nameOf(key)} moved to ${list === "more" ? `${props.moreTitle}, ` : ""}position ${index + 1} of ${keys()[list].length}`
  }

  // A dragged card is over More once the pointer is below the "More" heading
  const listAt = (point: { y: number }) => (divider && point.y > divider.getBoundingClientRect().top ? "more" : "main")
  const onMove = (key: string, to: SortablePosition) => move(key, { list: to.list === "more" ? "more" : "main", index: to.index })
  const [dragging, setDragging] = createSignal<string | null>(null)
  const draggingInMore = () => {
    const key = dragging()
    return key != null && keys().more.includes(key)
  }

  // The card for `key`, redrawn when what it shows changes
  const card = (key: string, reorder?: ActionCardReorder) => (
    <Show when={byKey().get(key)?.value} keyed>
      {(value) => untrack(() => {
        const entry = byKey().get(key)
        return entry?.value === value ? entry.render(reorder) : null
      })}
    </Show>
  )

  const SortableCard = (cardProps: { cardKey: string }) => {
    const key = untrack(() => cardProps.cardKey)
    const item = createSortableItem(key)
    const name = () => nameOf(key)
    const earlier = () => earlierPosition(keys(), position(key))
    const later = () => laterPosition(keys(), position(key))
    // Start and end are of the part the card is in; the other part takes it at the end nearest the divider
    const lastIndex = () => keys()[position(key).list].length - 1
    const toStart = () => move(key, { list: position(key).list, index: 0 })
    const toEnd = () => move(key, { list: position(key).list, index: lastIndex() })
    const menuItems = () => [
      { label: "Move to start", disabled: position(key).index === 0, onSelect: toStart, "data-test": hook(`card-${key}-move-start`) },
      { label: "Move to end", disabled: position(key).index === lastIndex(), onSelect: toEnd, "data-test": hook(`card-${key}-move-end`) },
      position(key).list === "main"
        ? { label: "Move to More", onSelect: () => move(key, { list: "more", index: 0 }), "data-test": hook(`card-${key}-move-to-more`) }
        : { label: "Move to main", onSelect: () => move(key, { list: "main", index: keys().main.length }), "data-test": hook(`card-${key}-move-to-main`) },
    ]
    return card(key, {
      ref: item.ref,
      style: item.style,
      isDragging: item.isDragging,
      onPointerDown: item.onItemPointerDown,
      controls: () => (
        <>
          <SortableMoveButton item={item} name={name()} direction="earlier" orientation="horizontal"
            onMove={earlier() ? () => move(key, earlier()!) : undefined} data-test={hook(`card-${key}-earlier`)} />
          <SortableHandle item={item} name={name()} dragsWithItem menuItems={menuItems()} data-test={hook(`card-${key}-handle`)} />
          <SortableMoveButton item={item} name={name()} direction="later" orientation="horizontal"
            onMove={later() ? () => move(key, later()!) : undefined} data-test={hook(`card-${key}-later`)} />
        </>
      ),
    })
  }

  const dropHint = (text: string, part: string, bordered: boolean) => (
    <div data-test={hook(part)} class={cn("p-4 text-center text-sm text-muted-foreground", bordered && "rounded-md border border-dashed")}>{text}</div>
  )

  return (
    <Show
      when={props.editing}
      fallback={
        <>
          <Show when={keys().main.length > 0}>
            <ActionCardList><For each={keys().main}>{(key) => card(key)}</For></ActionCardList>
          </Show>
          <Show when={keys().more.length > 0}>
            <Collapsible open={props.moreOpen} onOpenChange={props.onMoreOpenChange} class={keys().main.length > 0 ? "mt-3" : undefined}>
              <CollapsibleTrigger data-test={hook("more-toggle")} class={cn("flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-colors", HOVER_ACCENT)}>
                <span>{props.moreTitle}</span>
                <Chip variant="secondary">{keys().more.length}</Chip>
                <ChevronDown class="ml-auto h-4 w-4 transition-transform ui-expanded:rotate-180" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent class="mt-2">
                <ActionCardList><For each={keys().more}>{(key) => card(key)}</For></ActionCardList>
              </CollapsibleContent>
            </Collapsible>
          </Show>
        </>
      }
    >
      <SortableGroup onMove={onMove} describe={describe} listAt={listAt} onDragging={setDragging} data-test={hook("sortable")}>
        <SortableList id="main" ids={keys().main}>
          <Show when={keys().main.length > 0} fallback={dropHint("Move cards here to show them in this section.", "main-empty", true)}>
            <ActionCardList><For each={keys().main}>{(key) => <SortableCard cardKey={key} />}</For></ActionCardList>
          </Show>
        </SortableList>
        <div ref={divider} data-test={hook("more-heading")} class="mb-2 mt-4 flex min-h-11 items-center gap-2 border-t px-3 pt-2 text-sm font-medium text-muted-foreground">
          <span>{props.moreTitle}</span>
          <Chip variant="secondary">{keys().more.length}</Chip>
        </div>
        {/* Marked as where set-aside cards go, and lit up while a card is dragged over it */}
        <SortableList
          id="more"
          ids={keys().more}
          data-test={hook("more-list")}
          class={cn(
            "rounded-lg border border-dashed p-2 transition-colors",
            draggingInMore() && "border-primary bg-accent",
          )}
        >
          <Show when={keys().more.length > 0} fallback={dropHint("Move cards here to keep them out of the way.", "more-empty", false)}>
            <ActionCardList><For each={keys().more}>{(key) => <SortableCard cardKey={key} />}</For></ActionCardList>
          </Show>
        </SortableList>
      </SortableGroup>
    </Show>
  )
}

export function ActionsModule(props: ActionsModuleProps) {
  const isReadOnly = useReadOnly()
  const edit = useModuleEdit({
    character: () => props.character,
    toDraft,
    onUpdate: (c) => props.onUpdate(c),
  })
  const [isActionModalOpen, setIsActionModalOpen] = createSignal(false)
  const [isBonusActionModalOpen, setIsBonusActionModalOpen] = createSignal(false)
  const [isReactionModalOpen, setIsReactionModalOpen] = createSignal(false)
  const [isOtherModalOpen, setIsOtherModalOpen] = createSignal(false)

  const [editingAttack, setEditingAttack] = createSignal<StoredAction | null>(null)
  const [editingBonusAction, setEditingBonusAction] = createSignal<StoredAction | null>(null)
  const [editingReaction, setEditingReaction] = createSignal<StoredAction | null>(null)
  const [editingOther, setEditingOther] = createSignal<StoredAction | null>(null)

  const openAddAction = () => { setEditingAttack(null); setIsActionModalOpen(true) }
  const openEditAction = (item: StoredAction) => { setEditingAttack(item); setIsActionModalOpen(true) }
  const closeActionModal = () => { setIsActionModalOpen(false); setEditingAttack(null) }

  const openAddBonusAction = () => { setEditingBonusAction(null); setIsBonusActionModalOpen(true) }
  const openEditBonusAction = (item: StoredAction) => { setEditingBonusAction(item); setIsBonusActionModalOpen(true) }
  const closeBonusActionModal = () => { setIsBonusActionModalOpen(false); setEditingBonusAction(null) }

  const openAddReaction = () => { setEditingReaction(null); setIsReactionModalOpen(true) }
  const openEditReaction = (item: StoredAction) => { setEditingReaction(item); setIsReactionModalOpen(true) }
  const closeReactionModal = () => { setIsReactionModalOpen(false); setEditingReaction(null) }

  const openAddOther = () => { setEditingOther(null); setIsOtherModalOpen(true) }
  const openEditOther = (item: StoredAction) => { setEditingOther(item); setIsOtherModalOpen(true) }
  const closeOtherModal = () => { setIsOtherModalOpen(false); setEditingOther(null) }
  // The spell, feature or item an action card's Edit button opened, edited in its own module's form
  const [editingSpell, setEditingSpell] = createSignal<Spell | null>(null)
  const [editingFeature, setEditingFeature] = createSignal<Feature | null>(null)
  const [editingItem, setEditingItem] = createSignal<Equipment | null>(null)
  const [expandedSections, setExpandedSections] = createPersistedSetSignal<ActionSection>(
    () => `dnd-collapsible-actions-${props.character.id}`,
    ['actions', 'bonus-actions', 'reactions', 'other']
  )
  // Which sections have their "More" list open; all closed at first, so set-aside cards stay out of the way
  const [openMore, setOpenMore] = createPersistedSetSignal<ActionSectionKey>(
    () => `dnd-collapsible-actions-more-${props.character.id}`,
    []
  )
  const toggleMore = (section: ActionSectionKey, open: boolean) => {
    setOpenMore(prev => {
      const next = new Set(prev)
      if (open) next.add(section)
      else next.delete(section)
      return next
    })
  }
  const setSectionLayout = (section: ActionSectionKey, layout: ActionKeyLayout) => {
    edit.setDraft(draft => ({ ...draft, actionLayout: { ...draft.actionLayout, [section]: layout } }))
  }
  const toggleSection = (section: ActionSection, open: boolean) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (open) next.add(section)
      else next.delete(section)
      return next
    })
  }

  const safeSpells = createMemo(() => props.character.spells || [])
  const spellSaveDC = createMemo(() => getEffectiveSpellSaveDC(props.character))
  const spellSaveDCTooltip = createMemo(() => getEffectiveSpellSaveDCTooltip(props.character))
  const spellAttackBonus = createMemo(() => getEffectiveSpellAttackBonus(props.character))
  const spellAttackTooltip = createMemo(() => getEffectiveSpellAttackTooltip(props.character))

  const equippedWeaponAttacks = createMemo(() => getEquippedWeaponAttacks(props.character))

  const allFeatures = createMemo((): Feature[] => [
    ...safeFeatures(props.character.classFeatures),
    ...safeFeatures(props.character.speciesTraits),
    ...safeFeatures(props.character.feats),
    ...safeFeatures(props.character.backgroundFeatures),
  ])
  const featuresByKind = createMemo(() => {
    const level = props.character.level ?? 1
    const actions: Feature[] = [], bonuses: Feature[] = [], reactions: Feature[] = [], others: Feature[] = []
    for (const f of allFeatures()) {
      if ((f.level ?? 1) > level) continue
      if (f.actionKind === 'action')              actions.push(f)
      else if (f.actionKind === 'bonus-action')   bonuses.push(f)
      else if (f.actionKind === 'reaction')       reactions.push(f)
      else if (f.actionKind === 'other')          others.push(f)
    }
    return { actions, bonuses, reactions, others }
  })

  const equipmentByKind = createMemo(() => {
    const actions: Equipment[] = [], bonuses: Equipment[] = [], reactions: Equipment[] = [], others: Equipment[] = []
    for (const item of props.character.equipment || []) {
      // A weapon is only used once it's in hand: one still in the pack has no actions
      if (item.type === 'weapon' && !item.equipped) continue
      if (item.actionKind === 'action')            actions.push(item)
      else if (item.actionKind === 'bonus-action') bonuses.push(item)
      else if (item.actionKind === 'reaction')     reactions.push(item)
      else if (item.actionKind === 'other')        others.push(item)
    }
    return { actions, bonuses, reactions, others }
  })

  const attackSpells = createMemo(() => safeSpells().filter((spell) =>
    isSpellReady(spell) &&
    spell.castingTime.toLowerCase().includes("1 action") &&
    !spell.castingTime.toLowerCase().includes("bonus") &&
    !spell.castingTime.toLowerCase().includes("reaction")
  ))
  const bonusActionSpells = createMemo(() => safeSpells().filter((spell) =>
    isSpellReady(spell) && spell.castingTime.toLowerCase().includes("bonus")
  ))
  const reactionSpells = createMemo(() => safeSpells().filter((spell) =>
    isSpellReady(spell) && spell.castingTime.toLowerCase().includes("reaction")
  ))

  const updateSpellSlotUsed = (level: number, used: number) => {
    props.onUpdate({
      ...props.character,
      spellSlots: {
        ...props.character.spellSlots,
        [level]: { ...props.character.spellSlots[level as keyof typeof props.character.spellSlots], used },
      },
    })
  }

  // Casting spends a slot of the chosen level (a cantrip or a free cast spends none) and puts a spell
  // that lasts in effect. One update: two would each start from the same character, and the second
  // would undo the first.
  const castSpell = (spell: Spell, level: number) => {
    const spendsSlot = spell.level > 0 && !spell.freeCast
    const sustained = isSustainedSpell(spell)
    const slots = props.character.spellSlots[level as keyof typeof props.character.spellSlots]
    if (spendsSlot && (!slots || slots.used >= slots.total)) return
    if (!spendsSlot && !sustained) return
    props.onUpdate({
      ...props.character,
      ...(spendsSlot ? { spellSlots: { ...props.character.spellSlots, [level]: { ...slots, used: slots.used + 1 } } } : {}),
      ...(sustained ? { activeSpellIds: withSpellActivated(props.character, spell) } : {}),
    })
  }
  const endSpell = (spellId: string) => {
    props.onUpdate({ ...props.character, activeSpellIds: withSpellEnded(props.character, spellId) })
  }
  const activeSpellIds = createMemo(() => new Set(activeSpells(props.character).map((spell) => spell.id)))

  // Blank optional fields are omitted rather than stored as "" or false
  const normalizeActionForm = (data: ActionFormData) => ({
    ...data,
    rechargeOn: data.rechargeOn || undefined,
    damageRecurring: (!!data.damage.trim() && data.damageRecurring) || undefined,
    gain: data.gain || undefined,
    gainType: data.gainType || undefined,
    gainRecurring: (!!data.gain.trim() && data.gainRecurring) || undefined,
    highlights: data.highlights.trim() || undefined,
  } as const)

  const handleSaveAction = (data: ActionFormData) => {
    const editing = editingAttack()
    if (editing) {
      props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).map(a => a.id === editing.id ? { ...a, ...normalizeActionForm(data) } : a) })
    } else {
      props.onUpdate({ ...props.character, attacks: [...(props.character.attacks || []), { id: crypto.randomUUID(), ...normalizeActionForm(data) }] })
    }
    closeActionModal()
  }
  const handleDeleteAttack = () => {
    const id = editingAttack()?.id
    if (!id) return
    props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).filter((a) => a.id !== id) })
    closeActionModal()
  }
  const handleSaveBonusAction = (data: ActionFormData) => {
    const editing = editingBonusAction()
    if (editing) {
      props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).map(b => b.id === editing.id ? { ...b, ...normalizeActionForm(data) } : b) })
    } else {
      props.onUpdate({ ...props.character, bonusActions: [...(props.character.bonusActions || []), { id: crypto.randomUUID(), ...normalizeActionForm(data) }] })
    }
    closeBonusActionModal()
  }
  const handleDeleteBonusAction = () => {
    const id = editingBonusAction()?.id
    if (!id) return
    props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).filter((b) => b.id !== id) })
    closeBonusActionModal()
  }
  const handleSaveReaction = (data: ActionFormData) => {
    const editing = editingReaction()
    if (editing) {
      props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).map(r => r.id === editing.id ? { ...r, ...normalizeActionForm(data) } : r) })
    } else {
      props.onUpdate({ ...props.character, reactions: [...(props.character.reactions || []), { id: crypto.randomUUID(), ...normalizeActionForm(data) }] })
    }
    closeReactionModal()
  }
  const handleDeleteReaction = () => {
    const id = editingReaction()?.id
    if (!id) return
    props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).filter((r) => r.id !== id) })
    closeReactionModal()
  }
  const handleSaveOther = (data: ActionFormData) => {
    const editing = editingOther()
    if (editing) {
      props.onUpdate({ ...props.character, otherActions: (props.character.otherActions || []).map(o => o.id === editing.id ? { ...o, ...normalizeActionForm(data) } : o) })
    } else {
      props.onUpdate({ ...props.character, otherActions: [...(props.character.otherActions || []), { id: crypto.randomUUID(), ...normalizeActionForm(data) } as OtherAction] })
    }
    closeOtherModal()
  }
  const handleDeleteOther = () => {
    const id = editingOther()?.id
    if (!id) return
    props.onUpdate({ ...props.character, otherActions: (props.character.otherActions || []).filter((o) => o.id !== id) })
    closeOtherModal()
  }
  const handleOtherUsesChange = (id: string, v: number) => {
    props.onUpdate({ ...props.character, otherActions: (props.character.otherActions || []).map(o => o.id === id ? { ...o, uses: v } : o) })
  }
  const handleAttackUsesChange = (id: string, v: number) => {
    props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).map(a => a.id === id ? { ...a, uses: v } : a) })
  }
  const handleBonusActionUsesChange = (id: string, v: number) => {
    props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).map(b => b.id === id ? { ...b, uses: v } : b) })
  }
  const handleReactionUsesChange = (id: string, v: number) => {
    props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).map(r => r.id === id ? { ...r, uses: v } : r) })
  }
  const handleFeatureUsesChange = (feature: Feature, v: number) => {
    const field = featureField(feature)
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).map(f => f.id === feature.id ? { ...f, uses: v } : f),
    })
  }
  const handleEquipmentUsesChange = (id: string, v: number) => {
    props.onUpdate({
      ...props.character,
      equipment: (props.character.equipment || []).map((item) => {
        if (item.id !== id) return item
        const clamped = Math.max(0, Math.min(v, effectiveEquipmentMaxUses(item)))
        return hasChargesTracking(item) ? { ...item, charges: clamped } : { ...item, consumedUses: clamped }
      }),
    })
  }

  // A spell cast as "1 bonus action or 1 reaction" is listed in both sections, so the section keeps
  // its test hooks apart from the other copy
  const renderSpell = (spell: Spell, section: 'action' | 'bonus' | 'reaction', reorder?: ActionCardReorder) => {
    const { canCast, slotLevels, hasHigherSlots } = createSpellAccessors(spell, () => props.character.spellSlots)
    return (
      <ActionCard
        data-test={`action-card-${section}-spell-${spell.id}`}
        name={spell.name}
        spellLevel={spell.level}
        spellSchool={spell.school}
        concentration={spell.concentration}
        duration={spell.duration}
        ritual={spell.ritual}
        castingTime={spell.castingTime}
        attackBonus={spell.attackRoll ? spellAttackBonus() : undefined}
        attackBonusTooltip={spell.attackRoll ? spellAttackTooltip() : undefined}
        // A save that starts with an ability gets the character's DC; any other text is shown as written
        attackSave={spellSaveLabel(spell.attackSave) ?? spell.attackSave}
        attackSaveDC={spellSaveLabel(spell.attackSave) ? spellSaveDC() : undefined}
        attackSaveTooltip={spellSaveLabel(spell.attackSave) ? spellSaveDCTooltip() : undefined}
        range={spell.range}
        components={spell.components}
        atHigherLevel={spell.atHigherLevel}
        grantedBy={spell.grantedBy ? equipmentById(spell.grantedBy)?.name : undefined}
        freeCast={spell.freeCast}
        damage={spell.damage}
        damageType={spell.damageType}
        damageRecurring={spell.damageRecurring}
        gain={spell.gain}
        gainType={spell.gainType}
        gainRecurring={spell.gainRecurring}
        damagePerLevel={spell.damagePerLevel}
        gainPerLevel={spell.gainPerLevel}
        highlights={spell.highlights}
        description={spell.description}
        castable={canCast}
        // A cantrip is only cast here when it lasts, to put it in effect
        onCast={spell.level > 0 || isSustainedSpell(spell) ? (level) => castSpell(spell, level) : undefined}
        active={activeSpellIds().has(spell.id)}
        onEnd={() => endSpell(spell.id)}
        // Any spell of 1st level or higher can be cast with a higher slot, gaining something or not.
        // A free cast spends no slot, so there's no level to choose.
        slotLevels={spell.level > 0 && !spell.freeCast && hasHigherSlots() ? slotLevels : undefined}
        onEdit={() => setEditingSpell(spell)}
        reorder={reorder}
      />
    )
  }

  const renderFeature = (feature: Feature, reorder?: ActionCardReorder) => (
    <ActionCard
      data-test={`action-card-feature-${feature.id}`}
      name={feature.name}
      badgeLabel={FEATURE_KIND_LABELS[feature.source] ?? feature.source}
      atLevel={feature.level}
      range={feature.range}
      attackBonus={feature.attackBonus}
      attackSave={feature.attackSave}
      damage={feature.damage}
      damageType={feature.damageType}
      damageRecurring={feature.damageRecurring}
      gain={feature.gain}
      gainType={feature.gainType}
      gainRecurring={feature.gainRecurring}
      highlights={feature.highlights}
      description={feature.description}
      uses={feature.uses ?? 0}
      maxUses={effectiveMaxUses(feature, props.character.level ?? 1)}
      rechargeOn={feature.rechargeOn}
      onUsesChange={(v) => handleFeatureUsesChange(feature, v)}
      onEdit={() => setEditingFeature(feature)}
      reorder={reorder}
    />
  )

  const renderEquipmentAction = (item: Equipment, reorder?: ActionCardReorder) => (
    <ActionCard
      data-test={`action-card-item-${item.id}`}
      pipIcon={Backpack}
      name={item.name}
      badgeLabel={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
      {...itemDetails(item)}
      damage={item.damage}
      damageType={item.damageType}
      damageRecurring={item.damageRecurring}
      gain={item.gain}
      gainType={item.gainType}
      gainRecurring={item.gainRecurring}
      highlights={item.highlights}
      description={item.description}
      uses={effectiveEquipmentUses(item)}
      maxUses={effectiveEquipmentMaxUses(item)}
      rechargeOn={item.rechargeOn}
      onUsesChange={(v) => handleEquipmentUsesChange(item.id, v)}
      onEdit={() => setEditingItem(item)}
      reorder={reorder}
    />
  )

  // The item details an item's card shows in its expanded view
  const itemDetails = (item: Equipment | null) => ({
    rarity: RARITY_OPTIONS.find((o) => o.value === item?.rarity)?.label,
    requiresAttunement: item?.requiresAttunement,
    attuned: item?.attuned,
    // A consumable without charges counts its quantity as its uses, already shown as Max Uses
    quantity: item && (item.type !== "consumable" || hasChargesTracking(item)) ? item.quantity : undefined,
  })

  // A custom action, bonus action, reaction or other ability, edited in this module's own form
  const renderCustomAction = (action: Attack, hookKind: string, onUsesChange: (v: number) => void, onEdit: () => void, reorder?: ActionCardReorder) => (
    <ActionCard
      data-test={`action-card-${hookKind}-${action.id}`}
      name={action.name}
      badgeLabel={ACTION_TYPE_LABEL[action.type] ?? action.type}
      trigger={action.trigger}
      attackBonus={action.attackBonus}
      range={action.range}
      damage={action.damage}
      damageType={action.damageType}
      damageRecurring={action.damageRecurring}
      gain={action.gain}
      gainType={action.gainType}
      gainRecurring={action.gainRecurring}
      highlights={action.highlights}
      description={action.description}
      uses={action.uses ?? 0}
      maxUses={action.maxUses ?? 0}
      rechargeOn={action.rechargeOn}
      onUsesChange={onUsesChange}
      onEdit={onEdit}
      reorder={reorder}
    />
  )

  const equipmentById = (id: string) => (props.character.equipment ?? []).find((item) => item.id === id) ?? null
  const handleSaveSpell = (saved: Spell) => {
    props.onUpdate(withSpells(props.character, safeSpells().map((s) => (s.id === saved.id ? saved : s))))
    setEditingSpell(null)
  }
  const handleSaveFeature = (saved: Feature) => {
    const field = featureField(saved)
    props.onUpdate({ ...props.character, [field]: safeFeatures(props.character[field]).map((f) => (f.id === saved.id ? saved : f)) })
    setEditingFeature(null)
  }
  const handleSaveItem = (saved: Equipment) => {
    props.onUpdate({ ...props.character, equipment: (props.character.equipment ?? []).map((item) => (item.id === saved.id ? saved : item)) })
    setEditingItem(null)
  }

  const renderWeapon = (w: ReturnType<typeof getEquippedWeaponAttacks>[number], reorder?: ActionCardReorder) => {
    const item = equipmentById(w.itemId)
    // A weapon also used as an action is this one card (see actionEntries), which tracks its uses too
    const asAction = item?.actionKind === 'action' ? item : null
    return (
      <ActionCard
        data-test={`action-card-${w.id}`}
        name={w.name}
        badgeLabel="Weapon"
        {...itemDetails(item)}
        attackBonus={w.attackBonus}
        attackBonusTooltip={w.attackBonusTooltip}
        range={w.range}
        damage={w.damage}
        damageTooltip={w.damageTooltip}
        damageType={w.damageType}
        damageRecurring={w.damageRecurring}
        highlights={w.highlights}
        description={w.description}
        pipIcon={asAction ? Backpack : undefined}
        uses={asAction ? effectiveEquipmentUses(asAction) : undefined}
        maxUses={asAction ? effectiveEquipmentMaxUses(asAction) : undefined}
        rechargeOn={asAction?.rechargeOn}
        onUsesChange={asAction ? (v) => handleEquipmentUsesChange(asAction.id, v) : undefined}
        onEdit={() => setEditingItem(equipmentById(w.itemId))}
        reorder={reorder}
      />
    )
  }

  // Each section's cards in their default order: weapons, spells, features, items, then custom ones
  const spellEntries = (spells: Spell[], section: 'action' | 'bonus' | 'reaction'): SectionEntry[] =>
    spells.map((spell) => ({ key: actionCardKey('spell', spell.id), name: spell.name, value: spell, render: (r) => renderSpell(spell, section, r) }))
  const featureEntries = (features: Feature[]): SectionEntry[] =>
    features.map((feature) => ({ key: actionCardKey('feature', feature.id), name: feature.name, value: feature, render: (r) => renderFeature(feature, r) }))
  const itemEntries = (items: Equipment[]): SectionEntry[] =>
    items.map((item) => ({ key: actionCardKey('item', item.id), name: item.name, value: item, render: (r) => renderEquipmentAction(item, r) }))
  const customEntries = (actions: Attack[], hookKind: string, onUsesChange: (id: string, v: number) => void, onEdit: (action: StoredAction) => void): SectionEntry[] =>
    actions.map((action) => ({
      key: actionCardKey('custom', action.id),
      name: action.name,
      value: action,
      render: (r) => renderCustomAction(action, hookKind, (v) => onUsesChange(action.id, v), () => onEdit(action as StoredAction), r),
    }))

  const actionEntries = createMemo((): SectionEntry[] => [
    ...equippedWeaponAttacks().map((w): SectionEntry => ({ key: actionCardKey('weapon', w.itemId), name: w.name, value: w, render: (r) => renderWeapon(w, r) })),
    ...spellEntries(attackSpells(), 'action'),
    ...featureEntries(featuresByKind().actions),
    // An equipped weapon used as an action already has its weapon card
    ...itemEntries(equipmentByKind().actions.filter((item) => !equippedWeaponAttacks().some((w) => w.itemId === item.id))),
    ...customEntries(props.character.attacks || [], "attack", handleAttackUsesChange, openEditAction),
  ])
  const bonusActionEntries = createMemo((): SectionEntry[] => [
    ...spellEntries(bonusActionSpells(), 'bonus'),
    ...featureEntries(featuresByKind().bonuses),
    ...itemEntries(equipmentByKind().bonuses),
    ...customEntries(props.character.bonusActions || [], "bonus", handleBonusActionUsesChange, openEditBonusAction),
  ])
  const reactionEntries = createMemo((): SectionEntry[] => [
    ...spellEntries(reactionSpells(), 'reaction'),
    ...featureEntries(featuresByKind().reactions),
    ...itemEntries(equipmentByKind().reactions),
    ...customEntries(props.character.reactions || [], "reaction", handleReactionUsesChange, openEditReaction),
  ])
  const otherEntries = createMemo((): SectionEntry[] => [
    ...featureEntries(featuresByKind().others),
    ...itemEntries(equipmentByKind().others),
    ...customEntries(props.character.otherActions || [], "other", handleOtherUsesChange, openEditOther),
  ])

  const sectionBody = (section: ActionSectionKey, entries: () => SectionEntry[], moreTitle: string, emptyText: string) => (
    <Show when={entries().length > 0} fallback={<div class="text-center py-4 text-muted-foreground text-sm">{emptyText}</div>}>
      <ActionSectionBody
        section={section}
        entries={entries()}
        layout={edit.merged().actionLayout?.[section]}
        editing={edit.isEditing()}
        moreTitle={moreTitle}
        moreOpen={openMore().has(section)}
        onMoreOpenChange={(open) => toggleMore(section, open)}
        onLayoutChange={(layout) => setSectionLayout(section, layout)}
      />
    </Show>
  )

  return (
    <EditableModule data-test="actions-module"
      data-sem="actions-module"
      icon={<Sword class="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Actions & Attacks"
      isEditing={edit.isEditing()}
      onEdit={edit.start}
      onSave={edit.save}
      onSaveKeepEditing={edit.commit}
      onCancel={edit.cancel}
      contentClass="space-y-6"
    >
        <div class="my-4">
          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />
        </div>

        {/* Actions */}
        <Collapsible open={expandedSections().has('actions')} onOpenChange={(open: boolean) => toggleSection('actions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Target class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Actions</span>
              <Chip variant="secondary">{actionEntries().length}</Chip>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" aria-hidden="true" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-action-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddAction}>
                <Plus class="h-3 w-3" aria-hidden="true" />
                Add Action
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            {sectionBody('action', actionEntries, "More actions", "No actions added yet.")}
          </CollapsibleContent>
        </Collapsible>

        {/* Bonus Actions */}
        <Collapsible open={expandedSections().has('bonus-actions')} onOpenChange={(open: boolean) => toggleSection('bonus-actions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Clock class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Bonus Actions</span>
              <Chip variant="secondary">{bonusActionEntries().length}</Chip>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" aria-hidden="true" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-bonus-action-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddBonusAction}>
                <Plus class="h-3 w-3" aria-hidden="true" />
                Add Bonus Action
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            {sectionBody('bonus-action', bonusActionEntries, "More bonus actions", "No bonus actions added yet.")}
          </CollapsibleContent>
        </Collapsible>

        {/* Reactions */}
        <Collapsible open={expandedSections().has('reactions')} onOpenChange={(open: boolean) => toggleSection('reactions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Shield class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Reactions</span>
              <Chip variant="secondary">{reactionEntries().length}</Chip>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" aria-hidden="true" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-reaction-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddReaction}>
                <Plus class="h-3 w-3" aria-hidden="true" />
                Add Reaction
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            {sectionBody('reaction', reactionEntries, "More reactions", "No reactions added yet.")}
          </CollapsibleContent>
        </Collapsible>

        {/* Other */}
        <Collapsible open={expandedSections().has('other')} onOpenChange={(open: boolean) => toggleSection('other', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Sparkles class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Other</span>
              <Chip variant="secondary">{otherEntries().length}</Chip>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" aria-hidden="true" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-other-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddOther}>
                <Plus class="h-3 w-3" aria-hidden="true" />
                Add Other
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            {sectionBody('other', otherEntries, "More other abilities", "No other abilities added yet.")}
          </CollapsibleContent>
        </Collapsible>

      <Modal open={isActionModalOpen()} onOpenChange={(open) => { if (!open) closeActionModal() }}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>{editingAttack() ? "Edit Action" : "Add Custom Action"}</ModalTitle></ModalHeader>
          <ActionForm kind="action" initialData={editingAttack() ?? undefined} onSubmit={handleSaveAction} onDelete={editingAttack() ? handleDeleteAttack : undefined} onCancel={closeActionModal} />
        </ModalContent>
      </Modal>

      <Modal open={isBonusActionModalOpen()} onOpenChange={(open) => { if (!open) closeBonusActionModal() }}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>{editingBonusAction() ? "Edit Bonus Action" : "Add Custom Bonus Action"}</ModalTitle></ModalHeader>
          <ActionForm kind="bonus-action" initialData={editingBonusAction() ?? undefined} onSubmit={handleSaveBonusAction} onDelete={editingBonusAction() ? handleDeleteBonusAction : undefined} onCancel={closeBonusActionModal} />
        </ModalContent>
      </Modal>

      <Modal open={isReactionModalOpen()} onOpenChange={(open) => { if (!open) closeReactionModal() }}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>{editingReaction() ? "Edit Reaction" : "Add Custom Reaction"}</ModalTitle></ModalHeader>
          <ActionForm kind="reaction" initialData={editingReaction() ?? undefined} onSubmit={handleSaveReaction} onDelete={editingReaction() ? handleDeleteReaction : undefined} onCancel={closeReactionModal} />
        </ModalContent>
      </Modal>

      <Modal open={isOtherModalOpen()} onOpenChange={(open) => { if (!open) closeOtherModal() }}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>{editingOther() ? "Edit Other Ability" : "Add Other Ability"}</ModalTitle></ModalHeader>
          <ActionForm kind="other" initialData={editingOther() ?? undefined} onSubmit={handleSaveOther} onDelete={editingOther() ? handleDeleteOther : undefined} onCancel={closeOtherModal} />
        </ModalContent>
      </Modal>

      {/* Opened by a spell, feature or item card's Edit button: the same form its own module uses */}
      <SpellEditModal
        open={editingSpell() != null}
        spell={editingSpell()}
        magicItems={(props.character.equipment ?? []).filter((item) => item.magic)}
        onSave={handleSaveSpell}
        onCancel={() => setEditingSpell(null)}
      />
      <FeatureEditModal
        open={editingFeature() != null}
        kind={editingFeature()?.source ?? 'class-feature'}
        feature={editingFeature()}
        characterLevel={props.character.level ?? 1}
        onSave={handleSaveFeature}
        onCancel={() => setEditingFeature(null)}
      />
      <EquipmentItemModal
        open={editingItem() != null}
        editingItem={editingItem()}
        onSave={handleSaveItem}
        onCancel={() => setEditingItem(null)}
      />
    </EditableModule>
  )
}

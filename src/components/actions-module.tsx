import { createSignal, createMemo, For, Show } from "solid-js"
import Sword from "lucide-solid/icons/sword"
import Plus from "lucide-solid/icons/plus"
import Clock from "lucide-solid/icons/clock"
import Target from "lucide-solid/icons/target"
import Zap from "lucide-solid/icons/zap"
import Shield from "lucide-solid/icons/shield"
import Sparkles from "lucide-solid/icons/sparkles"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Backpack from "lucide-solid/icons/backpack"

import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { Character, ActionType, Attack, Equipment, Feature, Spell, OtherAction } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, computeSpellModifier, formatModifier, formatLeadingTerm, getSpellAttackBreakdown, getSpellSaveDCBreakdown, safeFeatures, getEquippedWeaponAttacks, getEffectiveSpellcastingAbility, effectiveMaxUses, effectiveEquipmentMaxUses, effectiveEquipmentUses, hasChargesTracking, ABILITY_TITLE_CASE, FEATURE_KIND_LABELS, RECHARGE_ON_OPTIONS } from "@/lib/character-utils"
import { EditableModule } from "@/components/editable-module"
import { useModuleEdit } from "@/hooks/use-module-edit"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
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
import { ActionCard, ActionCardList, type SlotLevel } from "@/components/action-card"
import { SpellEditModal } from "@/components/spell-edit-modal"
import { FeatureEditModal } from "@/components/features-module"
import { EquipmentItemModal } from "@/components/equipment-item-modal"
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

type ActionKind = "action" | "bonus-action" | "reaction" | "other"

const KIND_LABELS: Record<ActionKind, string> = {
  action: "Action",
  "bonus-action": "Bonus Action",
  reaction: "Reaction",
  other: "Other",
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
  const kindLabel = () => KIND_LABELS[props.kind]
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

function createSpellAccessors(spell: Spell, getSpellSlots: () => Character['spellSlots']) {
  const slotKey = spell.level as keyof Character['spellSlots']
  const slots = () => getSpellSlots()[slotKey]
  const canCast = () => spell.level > 0 && (!!spell.freeCast || (!!slots() && slots().used < slots().total))
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

// The fields this module's edit form shows (see useModuleEdit for how Save writes them)
interface ActionsDraft {
  useCalculatedSpellAttackBonus: boolean
  spellAttackBonus: number
  useCalculatedSpellSaveDC: boolean
  spellSaveDC: number
  useCalculatedSpellModifier: boolean
  spellModifier: number
}

const toDraft = (c: Character): ActionsDraft => {
  const useCalculatedSpellAttackBonus = c.useCalculatedSpellAttackBonus ?? true
  const useCalculatedSpellSaveDC = c.useCalculatedSpellSaveDC ?? true
  const useCalculatedSpellModifier = c.useCalculatedSpellModifier ?? true
  return {
    useCalculatedSpellAttackBonus,
    spellAttackBonus: useCalculatedSpellAttackBonus ? getSpellAttackBonus(c) : (c.spellAttackBonus ?? getSpellAttackBonus(c)),
    useCalculatedSpellSaveDC,
    spellSaveDC: useCalculatedSpellSaveDC ? getSpellSaveDC(c) : (c.spellSaveDC ?? getSpellSaveDC(c)),
    useCalculatedSpellModifier,
    spellModifier: useCalculatedSpellModifier ? computeSpellModifier(c) : (c.spellModifier ?? computeSpellModifier(c)),
  }
}

export function ActionsModule(props: ActionsModuleProps) {
  const isReadOnly = useReadOnly()
  const edit = useModuleEdit({
    character: () => props.character,
    toDraft,
    resolve: (draft): Partial<Character> => ({
      ...draft,
      spellAttackBonus: spellAttackField.resolvedValue(),
      spellSaveDC: spellSaveDCField.resolvedValue(),
      spellModifier: spellModifierField.resolvedValue(),
    }),
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
  const toggleSection = (section: ActionSection, open: boolean) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (open) next.add(section)
      else next.delete(section)
      return next
    })
  }

  const safeSpells = createMemo(() => props.character.spells || [])
  const spellSaveDC = createMemo(() => getSpellSaveDC(props.character))
  const spellAttackBonus = createMemo(() => getSpellAttackBonus(props.character))
  const spellModifier = createMemo(() => computeSpellModifier(props.character))

  const effectiveSpellcastingAbility = createMemo(() => getEffectiveSpellcastingAbility(props.character))
  const spellAbilityLabel = createMemo(() => {
    const ability = effectiveSpellcastingAbility()
    return ability ? ABILITY_TITLE_CASE[ability] : ""
  })
  const spellModifierTooltip = createMemo(() =>
    effectiveSpellcastingAbility() ? formatLeadingTerm(spellModifier(), spellAbilityLabel()) : "No spellcasting ability set"
  )
  const spellAttackTooltip = createMemo(() => getSpellAttackBreakdown(props.character))
  const spellSaveDCTooltip = createMemo(() => getSpellSaveDCBreakdown(props.character))

  const spellAttackField = useCalculatedValue({
    useCalculated: () => (edit.isEditing() ? edit.draft().useCalculatedSpellAttackBonus : (props.character.useCalculatedSpellAttackBonus ?? true)),
    setUseCalculated: (v) => edit.setDraft((prev) => ({ ...prev, useCalculatedSpellAttackBonus: v })),
    manualValue: () => (edit.isEditing() ? edit.draft().spellAttackBonus : (props.character.spellAttackBonus ?? spellAttackBonus())),
    setManualValue: (v) => edit.setDraft((prev) => ({ ...prev, spellAttackBonus: v })),
    calculatedValue: spellAttackBonus,
    calculatedTooltip: spellAttackTooltip,
  })

  const spellModifierField = useCalculatedValue({
    useCalculated: () => (edit.isEditing() ? edit.draft().useCalculatedSpellModifier : (props.character.useCalculatedSpellModifier ?? true)),
    setUseCalculated: (v) => edit.setDraft((prev) => ({ ...prev, useCalculatedSpellModifier: v })),
    manualValue: () => (edit.isEditing() ? edit.draft().spellModifier : (props.character.spellModifier ?? spellModifier())),
    setManualValue: (v) => edit.setDraft((prev) => ({ ...prev, spellModifier: v })),
    calculatedValue: spellModifier,
    calculatedTooltip: spellModifierTooltip,
  })

  const spellSaveDCField = useCalculatedValue({
    useCalculated: () => (edit.isEditing() ? edit.draft().useCalculatedSpellSaveDC : (props.character.useCalculatedSpellSaveDC ?? true)),
    setUseCalculated: (v) => edit.setDraft((prev) => ({ ...prev, useCalculatedSpellSaveDC: v })),
    manualValue: () => (edit.isEditing() ? edit.draft().spellSaveDC : (props.character.spellSaveDC ?? spellSaveDC())),
    setManualValue: (v) => edit.setDraft((prev) => ({ ...prev, spellSaveDC: v })),
    calculatedValue: spellSaveDC,
    calculatedTooltip: spellSaveDCTooltip,
  })


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
      if (item.actionKind === 'action')            actions.push(item)
      else if (item.actionKind === 'bonus-action') bonuses.push(item)
      else if (item.actionKind === 'reaction')     reactions.push(item)
      else if (item.actionKind === 'other')        others.push(item)
    }
    return { actions, bonuses, reactions, others }
  })

  const attackSpells = createMemo(() => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) &&
    spell.castingTime.toLowerCase().includes("1 action") &&
    !spell.castingTime.toLowerCase().includes("bonus") &&
    !spell.castingTime.toLowerCase().includes("reaction")
  ))
  const bonusActionSpells = createMemo(() => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("bonus")
  ))
  const reactionSpells = createMemo(() => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("reaction")
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

  const castSpell = (level: number) => {
    const slots = props.character.spellSlots[level as keyof typeof props.character.spellSlots]
    if (!slots || slots.used >= slots.total) return
    updateSpellSlotUsed(level, slots.used + 1)
  }

  // Blank optional fields are omitted rather than stored as "" or false
  const normalizeActionForm = (data: ActionFormData) => ({
    ...data,
    rechargeOn: data.rechargeOn || undefined,
    damageRecurring: data.damageRecurring || undefined,
    gain: data.gain || undefined,
    gainType: data.gainType || undefined,
    gainRecurring: data.gainRecurring || undefined,
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
  const renderSpell = (spell: Spell, section: 'action' | 'bonus' | 'reaction') => {
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
        attackSave={spell.attackSave}
        range={spell.range}
        components={spell.components}
        atHigherLevel={spell.atHigherLevel}
        damage={spell.damage}
        damageType={spell.damageType}
        damageRecurring={spell.damageRecurring}
        gain={spell.gain}
        gainType={spell.gainType}
        gainRecurring={spell.gainRecurring}
        highlights={spell.highlights}
        description={spell.description}
        castable={canCast}
        onCast={spell.level > 0 ? (spell.freeCast ? () => {} : castSpell) : undefined}
        // A free cast spends no slot, so there's no level to choose
        slotLevels={spell.level > 0 && !spell.freeCast && spell.atHigherLevel && hasHigherSlots() ? slotLevels : undefined}
        onEdit={() => setEditingSpell(spell)}
      />
    )
  }

  const renderFeature = (feature: Feature) => (
    <ActionCard
      data-test={`action-card-feature-${feature.id}`}
      name={feature.name}
      badgeLabel={FEATURE_KIND_LABELS[feature.source] ?? feature.source}
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
    />
  )

  const renderEquipmentAction = (item: Equipment) => (
    <ActionCard
      data-test={`action-card-item-${item.id}`}
      pipIcon={Backpack}
      name={item.name}
      badgeLabel={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
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
    />
  )

  // A custom action, bonus action, reaction or other ability, edited in this module's own form
  const renderCustomAction = (action: Attack, hookKind: string, onUsesChange: (v: number) => void, onEdit: () => void) => (
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
    />
  )

  const equipmentById = (id: string) => (props.character.equipment ?? []).find((item) => item.id === id) ?? null
  const handleSaveSpell = (saved: Spell) => {
    props.onUpdate({ ...props.character, spells: safeSpells().map((s) => (s.id === saved.id ? saved : s)) })
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg">
          <div class="text-center">
            <CalculatedValue data-test="spell-attack"
              label="Spell Attack"
              labelClass="text-sm font-medium"
              icon={<Zap class="h-4 w-4 text-primary" aria-hidden="true" />}
              editable={edit.isEditing()}
              {...spellAttackField.binding()}
              format={formatModifier}
            />
          </div>
          <div class="text-center">
            <CalculatedValue data-test="spell-modifier"
              label="Spell Modifier"
              labelClass="text-sm font-medium"
              icon={<Zap class="h-4 w-4 text-primary" aria-hidden="true" />}
              editable={edit.isEditing()}
              {...spellModifierField.binding()}
              format={formatModifier}
            />
          </div>
          <div class="text-center">
            <CalculatedValue data-test="spell-save-dc"
              label="Spell Save DC"
              labelClass="text-sm font-medium"
              icon={<Shield class="h-4 w-4 text-primary" aria-hidden="true" />}
              editable={edit.isEditing()}
              {...spellSaveDCField.binding()}
            />
          </div>
        </div>

        <div class="my-4">
          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />
        </div>

        {/* Actions */}
        <Collapsible open={expandedSections().has('actions')} onOpenChange={(open: boolean) => toggleSection('actions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Target class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Actions</span>
              <Chip variant="secondary">{equippedWeaponAttacks().length + attackSpells().length + (props.character.attacks?.length ?? 0) + featuresByKind().actions.length + equipmentByKind().actions.length}</Chip>
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
            <Show
              when={equippedWeaponAttacks().length > 0 || attackSpells().length > 0 || (props.character.attacks?.length ?? 0) > 0 || featuresByKind().actions.length > 0 || equipmentByKind().actions.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No actions added yet.</div>}
            >
              <ActionCardList>
                <For each={equippedWeaponAttacks()}>
                  {(w) => (
                    <ActionCard
                      data-test={`action-card-${w.id}`}
                      name={w.name}
                      badgeLabel="Weapon"
                      attackBonus={w.attackBonus}
                      attackBonusTooltip={w.attackBonusTooltip}
                      range={w.range}
                      damage={w.damage}
                      damageTooltip={w.damageTooltip}
                      damageType={w.damageType}
                      damageRecurring={w.damageRecurring}
                      highlights={w.highlights}
                      description={w.description}
                      onEdit={() => setEditingItem(equipmentById(w.itemId))}
                    />
                  )}
                </For>
                <For each={attackSpells()}>{(spell) => renderSpell(spell, 'action')}</For>
                <For each={featuresByKind().actions}>{(feature) => renderFeature(feature)}</For>
                <For each={equipmentByKind().actions}>{(item) => renderEquipmentAction(item)}</For>
                <For each={props.character.attacks || []}>
                  {(attack) => (
                    renderCustomAction(attack, "attack", (v) => handleAttackUsesChange(attack.id, v), () => openEditAction(attack as StoredAction))
                  )}
                </For>
              </ActionCardList>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Bonus Actions */}
        <Collapsible open={expandedSections().has('bonus-actions')} onOpenChange={(open: boolean) => toggleSection('bonus-actions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Clock class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Bonus Actions</span>
              <Chip variant="secondary">{bonusActionSpells().length + (props.character.bonusActions?.length ?? 0) + featuresByKind().bonuses.length + equipmentByKind().bonuses.length}</Chip>
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
            <Show
              when={bonusActionSpells().length > 0 || (props.character.bonusActions?.length ?? 0) > 0 || featuresByKind().bonuses.length > 0 || equipmentByKind().bonuses.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No bonus actions added yet.</div>}
            >
              <ActionCardList>
                <For each={bonusActionSpells()}>{(spell) => renderSpell(spell, 'bonus')}</For>
                <For each={featuresByKind().bonuses}>{(feature) => renderFeature(feature)}</For>
                <For each={equipmentByKind().bonuses}>{(item) => renderEquipmentAction(item)}</For>
                <For each={props.character.bonusActions || []}>
                  {(bonus) => (
                    renderCustomAction(bonus, "bonus", (v) => handleBonusActionUsesChange(bonus.id, v), () => openEditBonusAction(bonus as StoredAction))
                  )}
                </For>
              </ActionCardList>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Reactions */}
        <Collapsible open={expandedSections().has('reactions')} onOpenChange={(open: boolean) => toggleSection('reactions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Shield class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Reactions</span>
              <Chip variant="secondary">{reactionSpells().length + (props.character.reactions?.length ?? 0) + featuresByKind().reactions.length + equipmentByKind().reactions.length}</Chip>
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
            <Show
              when={reactionSpells().length > 0 || (props.character.reactions?.length ?? 0) > 0 || featuresByKind().reactions.length > 0 || equipmentByKind().reactions.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No reactions added yet.</div>}
            >
              <ActionCardList>
                <For each={reactionSpells()}>{(spell) => renderSpell(spell, 'reaction')}</For>
                <For each={featuresByKind().reactions}>{(feature) => renderFeature(feature)}</For>
                <For each={equipmentByKind().reactions}>{(item) => renderEquipmentAction(item)}</For>
                <For each={props.character.reactions || []}>
                  {(reaction) => (
                    renderCustomAction(reaction, "reaction", (v) => handleReactionUsesChange(reaction.id, v), () => openEditReaction(reaction as StoredAction))
                  )}
                </For>
              </ActionCardList>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Other */}
        <Collapsible open={expandedSections().has('other')} onOpenChange={(open: boolean) => toggleSection('other', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
              <Sparkles class="h-5 w-5 text-primary" aria-hidden="true" />
              <span class="text-lg font-semibold">Other</span>
              <Chip variant="secondary">{featuresByKind().others.length + (props.character.otherActions?.length ?? 0) + equipmentByKind().others.length}</Chip>
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
            <Show
              when={featuresByKind().others.length > 0 || (props.character.otherActions?.length ?? 0) > 0 || equipmentByKind().others.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No other abilities added yet.</div>}
            >
              <ActionCardList>
                <For each={featuresByKind().others}>{(feature) => renderFeature(feature)}</For>
                <For each={equipmentByKind().others}>{(item) => renderEquipmentAction(item)}</For>
                <For each={props.character.otherActions || []}>
                  {(other) => (
                    renderCustomAction(other, "other", (v) => handleOtherUsesChange(other.id, v), () => openEditOther(other as StoredAction))
                  )}
                </For>
              </ActionCardList>
            </Show>
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

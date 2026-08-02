import { createSignal, createMemo, For, Show } from "solid-js"
import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { Character, ActionType, Feature, Spell, OtherAction } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, computeSpellModifier, formatModifier, safeFeatures, getEquippedWeaponAttacks, getEffectiveSpellcastingAbility } from "@/lib/character-utils"
import { EditableModule } from "@/components/editable-module"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import Sword from "lucide-solid/icons/sword"
import Plus from "lucide-solid/icons/plus"
import Clock from "lucide-solid/icons/clock"
import Target from "lucide-solid/icons/target"
import Zap from "lucide-solid/icons/zap"
import Shield from "lucide-solid/icons/shield"
import Sparkles from "lucide-solid/icons/sparkles"
import ChevronDown from "lucide-solid/icons/chevron-down"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"
import { ActionCard } from "@/components/action-card"
import { useReadOnly } from "@/lib/read-only-context"

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
  range: string
  trigger: string
  uses: number
  maxUses: number
  rechargeOn: '' | 'short-rest' | 'long-rest'
  description: string
}

interface ActionFormProps {
  kind: ActionKind
  initialData?: Partial<ActionFormData>
  onSubmit: (data: ActionFormData) => void
  onDelete?: () => void
  onCancel: () => void
}

const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]

const ACTION_TYPE_LABELS = ACTION_TYPES.map((t) => t.label)
const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => t.charAt(0).toUpperCase() + t.slice(1))

function ActionForm(props: ActionFormProps) {
  const kindLabel = KIND_LABELS[props.kind]
  const isEditing = () => !!props.initialData?.name
  const [formData, setFormData] = createSignal<ActionFormData>({
    name: props.initialData?.name ?? "",
    type: props.initialData?.type ?? "Ability",
    attackBonus: props.initialData?.attackBonus ?? 0,
    damage: props.initialData?.damage ?? "",
    damageType: props.initialData?.damageType ?? "Slashing",
    range: props.initialData?.range ?? "",
    trigger: props.initialData?.trigger ?? "",
    uses: props.initialData?.uses ?? 0,
    maxUses: props.initialData?.maxUses ?? 0,
    rechargeOn: props.initialData?.rechargeOn ?? "",
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
        <Label for="action-name">{kindLabel} Name</Label>
        <Input id="action-name" autofocus value={formData().name}
          onInput={(e) => setFormData(p => ({ ...p, name: e.currentTarget.value }))}
          placeholder={props.kind === "reaction" ? "e.g., Shield, Opportunity Attack" : props.kind === "bonus-action" ? "e.g., Second Wind, Cunning Action" : "e.g., Lay on Hands, Breath Weapon"} />
      </div>

      <div>
        <Label for="action-type">Type</Label>
        <Combobox value={formData().type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))} options={ACTION_TYPE_LABELS} />
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
          <div>
            <Label for="action-damage">Damage</Label>
            <Input id="action-damage" value={formData().damage}
              onInput={(e) => setFormData(p => ({ ...p, damage: e.currentTarget.value }))} placeholder="1d8+3" />
          </div>
        </div>
        <div>
          <Label for="action-damage-type">Damage Type</Label>
          <Combobox value={formData().damageType} onValueChange={(v) => setFormData(p => ({ ...p, damageType: v }))} options={DAMAGE_TYPE_OPTIONS} />
        </div>
      </Show>

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
        <Select value={formData().rechargeOn} onValueChange={(v) => setFormData(p => ({ ...p, rechargeOn: v as '' | 'short-rest' | 'long-rest' }))}>
          <SelectTrigger id="action-recharge"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="short-rest">Short Rest</SelectItem>
            <SelectItem value="long-rest">Long Rest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label for="action-description">Description</Label>
        <Textarea id="action-description" value={formData().description}
          onInput={(e) => setFormData(p => ({ ...p, description: e.currentTarget.value }))}
          placeholder={`Describe what this ${kindLabel.toLowerCase()} does...`} rows={3} />
      </div>

      <div class="flex gap-2 justify-end">
        <Show when={props.onDelete}>
          <Button variant="destructive" onClick={props.onDelete} class="mr-auto">Delete</Button>
        </Show>
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>{isEditing() ? "Save" : "Add"} {kindLabel}</Button>
      </div>
    </div>
  )
}

const FEATURE_SOURCE_LABELS: Record<string, string> = {
  'class-feature': 'Class Feature',
  'species-trait': 'Species Trait',
  'feat': 'Feat',
}

function spellAccessors(spell: Spell, getSpellSlots: () => Character['spellSlots']) {
  const slotKey = spell.level as keyof Character['spellSlots']
  const slots = () => getSpellSlots()[slotKey]
  const canCast = () => spell.level > 0 && (!!spell.freeCast || (!!slots() && slots().used < slots().total))
  const upcastLevels = () => ([2,3,4,5,6,7,8,9] as const)
    .filter(l => l > spell.level)
    .filter(l => { const s = getSpellSlots()[l]; return s && s.total > 0 && s.used < s.total })
  const hasHigherSlots = () => ([2,3,4,5,6,7,8,9] as const)
    .filter(l => l > spell.level)
    .some(l => { const s = getSpellSlots()[l]; return s && s.total > 0 })
  return { canCast, upcastLevels, hasHigherSlots }
}

type ActionSection = 'actions' | 'bonus-actions' | 'reactions' | 'other'

type StoredAction = ActionFormData & { id: string }

interface ActionsEditState {
  useCalculatedSpellAttackBonus: boolean
  spellAttackBonus: number
  useCalculatedSpellSaveDC: boolean
  spellSaveDC: number
  useCalculatedSpellModifier: boolean
  spellModifier: number
}

const toEdit = (c: Character): ActionsEditState => {
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
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))
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
  const [upcastSpellId, setUpcastSpellId] = createSignal<string | null>(null)
  const [expandedSections, setExpandedSections] = createPersistedSetSignal<ActionSection>(
    `dnd-collapsible-actions-${props.character.id}`,
    ['actions', 'bonus-actions', 'reactions', 'other']
  )
  const toggleSection = (section: ActionSection, open: boolean) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      open ? next.add(section) : next.delete(section)
      return next
    })
  }

  const safeSpells = createMemo(() => props.character.spells || [])
  const spellSaveDC = createMemo(() => getSpellSaveDC(props.character))
  const spellAttackBonus = createMemo(() => getSpellAttackBonus(props.character))
  const spellModifier = createMemo(() => computeSpellModifier(props.character))

  const effectiveSpellcastingAbility = createMemo(() => getEffectiveSpellcastingAbility(props.character))
  const spellAbilityAbbr = createMemo(() => (effectiveSpellcastingAbility() || "").slice(0, 3).toUpperCase())
  const spellModifierTooltip = createMemo(() =>
    effectiveSpellcastingAbility() ? `${spellAbilityAbbr()} ${formatModifier(spellModifier())}` : "No spellcasting ability set"
  )
  const spellAttackTooltip = createMemo(() =>
    effectiveSpellcastingAbility()
      ? `Prof +${props.character.proficiencyBonus || 2} + ${spellAbilityAbbr()} ${formatModifier(spellModifier())}`
      : "No spellcasting ability set"
  )
  const spellSaveDCTooltip = createMemo(() =>
    effectiveSpellcastingAbility()
      ? `8 + Prof +${props.character.proficiencyBonus || 2} + ${spellAbilityAbbr()} ${formatModifier(spellModifier())}`
      : "No spellcasting ability set"
  )

  const spellAttackField = useCalculatedValue({
    useCalculated: () => (isEditing() ? edited().useCalculatedSpellAttackBonus : (props.character.useCalculatedSpellAttackBonus ?? true)),
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSpellAttackBonus: v })),
    manualValue: () => (isEditing() ? edited().spellAttackBonus : (props.character.spellAttackBonus ?? spellAttackBonus())),
    setManualValue: (v) => setEdited((prev) => ({ ...prev, spellAttackBonus: v })),
    calculatedValue: spellAttackBonus,
    calculatedTooltip: spellAttackTooltip,
  })

  const spellModifierField = useCalculatedValue({
    useCalculated: () => (isEditing() ? edited().useCalculatedSpellModifier : (props.character.useCalculatedSpellModifier ?? true)),
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSpellModifier: v })),
    manualValue: () => (isEditing() ? edited().spellModifier : (props.character.spellModifier ?? spellModifier())),
    setManualValue: (v) => setEdited((prev) => ({ ...prev, spellModifier: v })),
    calculatedValue: spellModifier,
    calculatedTooltip: spellModifierTooltip,
  })

  const spellSaveDCField = useCalculatedValue({
    useCalculated: () => (isEditing() ? edited().useCalculatedSpellSaveDC : (props.character.useCalculatedSpellSaveDC ?? true)),
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSpellSaveDC: v })),
    manualValue: () => (isEditing() ? edited().spellSaveDC : (props.character.spellSaveDC ?? spellSaveDC())),
    setManualValue: (v) => setEdited((prev) => ({ ...prev, spellSaveDC: v })),
    calculatedValue: spellSaveDC,
    calculatedTooltip: spellSaveDCTooltip,
  })

  const handleSave = () => {
    const data = edited()
    const normalized = {
      ...props.character,
      useCalculatedSpellAttackBonus: data.useCalculatedSpellAttackBonus,
      spellAttackBonus: spellAttackField.resolvedValue(),
      useCalculatedSpellSaveDC: data.useCalculatedSpellSaveDC,
      spellSaveDC: spellSaveDCField.resolvedValue(),
      useCalculatedSpellModifier: data.useCalculatedSpellModifier,
      spellModifier: spellModifierField.resolvedValue(),
    }
    props.onUpdate(normalized)
    setIsEditing(false)
  }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  const equippedWeaponAttacks = createMemo(() => getEquippedWeaponAttacks(props.character))

  const allFeatures = createMemo((): Feature[] => [
    ...safeFeatures(props.character.classFeatures),
    ...safeFeatures(props.character.speciesTraits),
    ...safeFeatures(props.character.feats),
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

  const normalizeRechargeOn = (data: ActionFormData) =>
    ({ ...data, rechargeOn: data.rechargeOn || undefined } as const)

  const handleSaveAction = (data: ActionFormData) => {
    const editing = editingAttack()
    if (editing) {
      props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).map(a => a.id === editing.id ? { ...a, ...normalizeRechargeOn(data) } : a) })
    } else {
      props.onUpdate({ ...props.character, attacks: [...(props.character.attacks || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
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
      props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).map(b => b.id === editing.id ? { ...b, ...normalizeRechargeOn(data) } : b) })
    } else {
      props.onUpdate({ ...props.character, bonusActions: [...(props.character.bonusActions || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
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
      props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).map(r => r.id === editing.id ? { ...r, ...normalizeRechargeOn(data) } : r) })
    } else {
      props.onUpdate({ ...props.character, reactions: [...(props.character.reactions || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
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
      props.onUpdate({ ...props.character, otherActions: (props.character.otherActions || []).map(o => o.id === editing.id ? { ...o, ...normalizeRechargeOn(data) } : o) })
    } else {
      props.onUpdate({ ...props.character, otherActions: [...(props.character.otherActions || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) } as OtherAction] })
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
    const field = feature.source === 'class-feature' ? 'classFeatures'
      : feature.source === 'species-trait' ? 'speciesTraits' : 'feats'
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field as 'classFeatures' | 'speciesTraits' | 'feats']).map(f => f.id === feature.id ? { ...f, uses: v } : f),
    })
  }

  const renderSpell = (spell: Spell) => {
    const { canCast, upcastLevels, hasHigherSlots } = spellAccessors(spell, () => props.character.spellSlots)
    return (
      <ActionCard
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
        gain={spell.gain}
        description={spell.description}
        spellId={spell.id}
        castable={canCast}
        onCast={spell.level > 0 ? (spell.freeCast ? () => {} : () => castSpell(spell.level)) : undefined}
        upcastLevels={upcastLevels}
        onCastAtLevel={(level: number) => { castSpell(level); setUpcastSpellId(null) }}
        hasHigherSlots={hasHigherSlots}
        upcastSpellId={upcastSpellId}
        onUpcastSpellId={setUpcastSpellId}
      />
    )
  }

  const renderFeature = (feature: Feature) => (
    <ActionCard
      name={feature.name}
      badgeLabel={FEATURE_SOURCE_LABELS[feature.source] ?? feature.source}
      range={feature.range}
      description={feature.description}
      uses={feature.uses ?? 0}
      maxUses={feature.maxUses ?? 0}
      rechargeOn={feature.rechargeOn}
      onUsesChange={(v) => handleFeatureUsesChange(feature, v)}
    />
  )

  return (
    <EditableModule
      data-sem="actions-module"
      icon={<Sword class="h-5 w-5 text-primary" />}
      title="Actions & Attacks"
      isEditing={isEditing()}
      onEdit={() => { setEdited(toEdit(props.character)); setIsEditing(true) }}
      onSave={handleSave}
      onCancel={handleCancel}
      contentClass="space-y-6"
    >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div class="text-center">
            <CalculatedValue
              label="Spell Attack"
              labelClass="text-sm font-medium"
              icon={<Zap class="h-4 w-4 text-primary" />}
              editable={isEditing()}
              {...spellAttackField.binding()}
              format={formatModifier}
            />
          </div>
          <div class="text-center">
            <CalculatedValue
              label="Spell Modifier"
              labelClass="text-sm font-medium"
              icon={<Zap class="h-4 w-4 text-primary" />}
              editable={isEditing()}
              {...spellModifierField.binding()}
              format={formatModifier}
            />
          </div>
          <div class="text-center">
            <CalculatedValue
              label="Spell Save DC"
              labelClass="text-sm font-medium"
              icon={<Shield class="h-4 w-4 text-primary" />}
              editable={isEditing()}
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
            <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
              <Target class="h-5 w-5 text-primary" />
              <span class="text-lg font-semibold">Actions</span>
              <Badge variant="secondary">{equippedWeaponAttacks().length + attackSpells().length + (props.character.attacks?.length ?? 0) + featuresByKind().actions.length}</Badge>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-action-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddAction}>
                <Plus class="h-3 w-3" />
                Add Action
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            <Show
              when={equippedWeaponAttacks().length > 0 || attackSpells().length > 0 || (props.character.attacks?.length ?? 0) > 0 || featuresByKind().actions.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No actions added yet.</div>}
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <For each={equippedWeaponAttacks()}>
                  {(w) => (
                    <ActionCard
                      name={w.name}
                      badgeLabel="Weapon"
                      attackBonus={w.attackBonus}
                      range={w.range}
                      damage={w.damage}
                      damageType={w.damageType}
                      description={w.description}
                    />
                  )}
                </For>
                <For each={attackSpells()}>{(spell) => renderSpell(spell)}</For>
                <For each={featuresByKind().actions}>{(feature) => renderFeature(feature)}</For>
                <For each={props.character.attacks || []}>
                  {(attack) => (
                    <ActionCard
                      name={attack.name}
                      badgeLabel={ACTION_TYPE_LABEL[attack.type] ?? attack.type}
                      attackBonus={attack.attackBonus}
                      range={attack.range}
                      damage={attack.damage}
                      damageType={attack.damageType}
                      description={attack.description}
                      uses={attack.uses ?? 0}
                      maxUses={attack.maxUses ?? 0}
                      rechargeOn={attack.rechargeOn}
                      onUsesChange={(v) => handleAttackUsesChange(attack.id, v)}
                      onEdit={() => openEditAction(attack as StoredAction)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Bonus Actions */}
        <Collapsible open={expandedSections().has('bonus-actions')} onOpenChange={(open: boolean) => toggleSection('bonus-actions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
              <Clock class="h-5 w-5 text-primary" />
              <span class="text-lg font-semibold">Bonus Actions</span>
              <Badge variant="secondary">{bonusActionSpells().length + (props.character.bonusActions?.length ?? 0) + featuresByKind().bonuses.length}</Badge>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-bonus-action-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddBonusAction}>
                <Plus class="h-3 w-3" />
                Add Bonus Action
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            <Show
              when={bonusActionSpells().length > 0 || (props.character.bonusActions?.length ?? 0) > 0 || featuresByKind().bonuses.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No bonus actions added yet.</div>}
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <For each={bonusActionSpells()}>{(spell) => renderSpell(spell)}</For>
                <For each={featuresByKind().bonuses}>{(feature) => renderFeature(feature)}</For>
                <For each={props.character.bonusActions || []}>
                  {(bonus) => (
                    <ActionCard
                      name={bonus.name}
                      badgeLabel={ACTION_TYPE_LABEL[bonus.type] ?? bonus.type}
                      attackBonus={bonus.attackBonus}
                      range={bonus.range}
                      damage={bonus.damage}
                      damageType={bonus.damageType}
                      description={bonus.description}
                      uses={bonus.uses ?? 0}
                      maxUses={bonus.maxUses ?? 0}
                      rechargeOn={bonus.rechargeOn}
                      onUsesChange={(v) => handleBonusActionUsesChange(bonus.id, v)}
                      onEdit={() => openEditBonusAction(bonus as StoredAction)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Reactions */}
        <Collapsible open={expandedSections().has('reactions')} onOpenChange={(open: boolean) => toggleSection('reactions', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
              <Shield class="h-5 w-5 text-primary" />
              <span class="text-lg font-semibold">Reactions</span>
              <Badge variant="secondary">{reactionSpells().length + (props.character.reactions?.length ?? 0) + featuresByKind().reactions.length}</Badge>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-reaction-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddReaction}>
                <Plus class="h-3 w-3" />
                Add Reaction
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            <Show
              when={reactionSpells().length > 0 || (props.character.reactions?.length ?? 0) > 0 || featuresByKind().reactions.length > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No reactions added yet.</div>}
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <For each={reactionSpells()}>{(spell) => renderSpell(spell)}</For>
                <For each={featuresByKind().reactions}>{(feature) => renderFeature(feature)}</For>
                <For each={props.character.reactions || []}>
                  {(reaction) => (
                    <ActionCard
                      name={reaction.name}
                      badgeLabel={ACTION_TYPE_LABEL[reaction.type] ?? reaction.type}
                      trigger={reaction.trigger}
                      attackBonus={reaction.attackBonus}
                      range={reaction.range}
                      damage={reaction.damage}
                      damageType={reaction.damageType}
                      description={reaction.description}
                      uses={reaction.uses ?? 0}
                      maxUses={reaction.maxUses ?? 0}
                      rechargeOn={reaction.rechargeOn}
                      onUsesChange={(v) => handleReactionUsesChange(reaction.id, v)}
                      onEdit={() => openEditReaction(reaction as StoredAction)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </CollapsibleContent>
        </Collapsible>

        {/* Other */}
        <Collapsible open={expandedSections().has('other')} onOpenChange={(open: boolean) => toggleSection('other', open)}>
          <div class="flex items-center justify-between pr-1">
            <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
              <Sparkles class="h-5 w-5 text-primary" />
              <span class="text-lg font-semibold">Other</span>
              <Badge variant="secondary">{featuresByKind().others.length + (props.character.otherActions?.length ?? 0)}</Badge>
              <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
            </CollapsibleTrigger>
            <Show when={!isReadOnly}>
              <Button data-test="add-other-button" variant="outline" size="sm" class="gap-1 h-7 ml-2" onClick={openAddOther}>
                <Plus class="h-3 w-3" />
                Add Other
              </Button>
            </Show>
          </div>
          <CollapsibleContent class="mt-2">
            <Show
              when={featuresByKind().others.length > 0 || (props.character.otherActions?.length ?? 0) > 0}
              fallback={<div class="text-center py-4 text-muted-foreground text-sm">No other abilities added yet.</div>}
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <For each={featuresByKind().others}>{(feature) => renderFeature(feature)}</For>
                <For each={props.character.otherActions || []}>
                  {(other) => (
                    <ActionCard
                      name={other.name}
                      badgeLabel={ACTION_TYPE_LABEL[other.type] ?? other.type}
                      attackBonus={other.attackBonus}
                      range={other.range}
                      damage={other.damage}
                      damageType={other.damageType}
                      description={other.description}
                      uses={other.uses ?? 0}
                      maxUses={other.maxUses ?? 0}
                      rechargeOn={other.rechargeOn}
                      onUsesChange={(v) => handleOtherUsesChange(other.id, v)}
                      onEdit={() => openEditOther(other as StoredAction)}
                    />
                  )}
                </For>
              </div>
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
    </EditableModule>
  )
}

import { createSignal, For, Show } from "solid-js"
import type { Character, ActionType, Feature, Spell } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier, safeFeatures } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Tooltip } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Popover } from "@kobalte/core/popover"
import Sword from "lucide-solid/icons/sword"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import Clock from "lucide-solid/icons/clock"
import Target from "lucide-solid/icons/target"
import Zap from "lucide-solid/icons/zap"
import Star from "lucide-solid/icons/star"
import Shield from "lucide-solid/icons/shield"
import ArrowBigUp from "lucide-solid/icons/arrow-big-up"
import CircleHelp from "lucide-solid/icons/circle-help"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"

interface ActionsSectionProps {
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

type ActionKind = "action" | "bonus-action" | "reaction"

const KIND_LABELS: Record<ActionKind, string> = {
  action: "Action",
  "bonus-action": "Bonus Action",
  reaction: "Reaction",
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
  onSubmit: (data: ActionFormData) => void
  onCancel: () => void
}

const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]

const ACTION_TYPE_LABELS = ACTION_TYPES.map((t) => t.label)
const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => t.charAt(0).toUpperCase() + t.slice(1))

function ActionForm(props: ActionFormProps) {
  const kindLabel = KIND_LABELS[props.kind]
  const [formData, setFormData] = createSignal<ActionFormData>({
    name: "",
    type: "Ability",
    attackBonus: 0,
    damage: "",
    damageType: "Slashing",
    range: "",
    trigger: "",
    uses: 0,
    maxUses: 0,
    rechargeOn: "",
    description: "",
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
        <Input id="action-name" value={formData().name}
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
          <Label for="action-uses">Current Uses</Label>
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
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Add {kindLabel}</Button>
      </div>
    </div>
  )
}

function ActionUsesTracker(props: { uses: number; maxUses: number; onUsesChange: (v: number) => void }) {
  return (
    <Show when={props.maxUses > 0}>
      <Show
        when={props.maxUses <= 5}
        fallback={
          <StepperInput
            value={props.uses}
            min={0}
            max={props.maxUses}
            onChange={props.onUsesChange}
          />
        }
      >
        <PipTracker
          total={props.maxUses}
          used={props.uses}
          onToggle={props.onUsesChange}
          usedTitle="Charge spent (click to restore)"
          availableTitle="Charge available (click to use)"
        />
      </Show>
    </Show>
  )
}

const FEATURE_SOURCE_LABELS: Record<string, string> = {
  'class-feature': 'Class Feature',
  'species-trait': 'Species Trait',
  'feat': 'Feat',
}

function FeatureActionCard(props: { feature: Feature; onUsesChange: (v: number) => void }) {
  const sourceLabel = () => FEATURE_SOURCE_LABELS[props.feature.source] ?? props.feature.source
  return (
    <div class="p-3 border rounded-lg space-y-2">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="font-medium">{props.feature.name}</div>
          <div class="text-xs text-muted-foreground">
            {sourceLabel()}
            {props.feature.type && ` • ${ACTION_TYPE_LABEL[props.feature.type] ?? props.feature.type}`}
            {props.feature.range && ` • ${props.feature.range}`}
          </div>
        </div>
        <Badge variant="secondary" class="text-xs shrink-0 ml-2">{sourceLabel()}</Badge>
      </div>
      <Show when={props.feature.description}>
        <div class="text-xs text-muted-foreground line-clamp-2">{props.feature.description}</div>
      </Show>
      <ActionUsesTracker
        uses={props.feature.uses ?? 0}
        maxUses={props.feature.maxUses ?? 0}
        onUsesChange={props.onUsesChange}
      />
    </div>
  )
}

function SpellDetailPopover(props: { spell: Spell }) {
  return (
    <Popover gutter={8}>
      <Popover.Trigger
        class="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Details for ${props.spell.name}`}
      >
        <CircleHelp class="w-4 h-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="z-50 w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95">
          <Popover.Arrow />
          <div class="space-y-2">
            <div class="font-semibold text-sm">{props.spell.name}</div>
            <div class="text-xs text-muted-foreground">
              {props.spell.level === 0 ? "Cantrip" : `${props.spell.level === 1 ? "1st" : props.spell.level === 2 ? "2nd" : props.spell.level === 3 ? "3rd" : `${props.spell.level}th`}-level`} {props.spell.school}
              {props.spell.ritual && " (ritual)"}
              {props.spell.concentration && " · Concentration"}
            </div>
            <div class="text-xs space-y-1 border-t pt-2">
              <div><span class="font-medium">Casting Time:</span> {props.spell.castingTime}</div>
              <div><span class="font-medium">Range:</span> {props.spell.range}</div>
              <div><span class="font-medium">Components:</span> {props.spell.components}</div>
              <div><span class="font-medium">Duration:</span> {props.spell.duration}</div>
              <Show when={props.spell.attackSave}>
                <div><span class="font-medium">Attack/Save:</span> {props.spell.attackSave}</div>
              </Show>
              <Show when={props.spell.damage}>
                <div><span class="font-medium">Damage:</span> {props.spell.damage}</div>
              </Show>
              <Show when={props.spell.regain}>
                <div><span class="font-medium">Regain:</span> {props.spell.regain}</div>
              </Show>
            </div>
            <Show when={props.spell.description}>
              <div class="text-xs border-t pt-2 leading-relaxed">{props.spell.description}</div>
            </Show>
            <Show when={props.spell.atHigherLevel}>
              <div class="text-xs border-t pt-2">
                <span class="font-medium">At Higher Levels:</span> {props.spell.atHigherLevel}
              </div>
            </Show>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}

function getOrdinalSuffix(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

interface SpellCardProps {
  spell: Spell
  castable: () => boolean
  onCast?: () => void
  upcastLevels?: () => number[]
  onCastAtLevel?: (level: number) => void
  hasHigherSlots?: () => boolean
  upcastSpellId: () => string | null
  onUpcastSpellId: (id: string | null) => void
}

function SpellCard(props: SpellCardProps) {
  const [concentrationActive, setConcentrationActive] = createSignal(false)
  const spell = props.spell
  return (
    <div class="p-3 border rounded-lg flex flex-col gap-2">
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0 space-y-1">
          <div>
            <div class="font-medium flex items-center gap-1">
              {spell.name}
              <SpellDetailPopover spell={spell} />
            </div>
            <div class="text-xs text-muted-foreground">
              {spell.level > 0 ? `${getOrdinalSuffix(spell.level)} level` : "Cantrip"} • {spell.school}
            </div>
          </div>
          <div class="text-sm space-y-1">
            <Show when={spell.attackSave}><div><strong>Attack/Save:</strong> {spell.attackSave}</div></Show>
            <Show when={spell.regain}><div><strong>Regain:</strong> {spell.regain}</div></Show>
            <Show when={spell.atHigherLevel}><div><strong>At Higher Level:</strong> {spell.atHigherLevel}</div></Show>
            <div><strong>Range:</strong> {spell.range}</div>
            <div><strong>Components:</strong> {spell.components}</div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" class="text-xs">Spell</Badge>
          <Show when={spell.concentration}>
            <Badge
              variant={concentrationActive() ? "default" : "outline"}
              class={`text-xs cursor-pointer select-none${concentrationActive() ? "" : " text-muted-foreground border-muted-foreground/40"}`}
              onClick={() => setConcentrationActive(v => !v)}
            >Concentration</Badge>
          </Show>
          <Show when={spell.duration && !spell.duration.toLowerCase().includes("instantaneous")}>
            <Badge variant="outline" class="text-xs text-muted-foreground border-muted-foreground/40">
              {spell.duration.replace(/^concentration,\s*/i, "")}
            </Badge>
          </Show>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 mt-auto">
        <Show when={spell.regain}>
          <div class="px-2 py-1 border-2 border-green-500 rounded text-green-700 font-semibold whitespace-nowrap text-sm">{spell.regain}</div>
        </Show>
        <Show when={!spell.regain && spell.damage}>
          <div class="px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap text-sm">{spell.damage}</div>
        </Show>
        <Show when={spell.level > 0 && props.onCast}>
          <div class="flex items-center gap-1">
            <Show when={props.upcastSpellId() === spell.id && props.upcastLevels && props.upcastLevels().length > 0}>
              <div class="flex gap-1">
                <For each={props.upcastLevels!()}>
                  {(level) => (
                    <Button variant="secondary" size="sm" class="h-11 min-w-[44px] px-2 text-xs"
                      onClick={() => props.onCastAtLevel?.(level)}>
                      {getOrdinalSuffix(level)}
                    </Button>
                  )}
                </For>
              </div>
            </Show>
            <Button variant="outline" size="sm" class="h-11 px-4" disabled={!props.castable()} onClick={props.onCast}>Cast</Button>
            <Show when={!!spell.atHigherLevel && props.hasHigherSlots?.()}>
              <Button variant="outline" size="sm" class="h-11 w-11 p-0"
                aria-label="Upcast"
                disabled={!props.upcastLevels?.().length}
                onClick={() => props.onUpcastSpellId(props.upcastSpellId() === spell.id ? null : spell.id)}>
                <ArrowBigUp class="h-4 w-4" />
              </Button>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

export function ActionsSection(props: ActionsSectionProps) {
  const [isAddActionOpen, setIsAddActionOpen] = createSignal(false)
  const [isAddBonusActionOpen, setIsAddBonusActionOpen] = createSignal(false)
  const [isAddReactionOpen, setIsAddReactionOpen] = createSignal(false)
  const [upcastSpellId, setUpcastSpellId] = createSignal<string | null>(null)

  const safeSpells = () => props.character.spells || []
  const spellSaveDC = () => getSpellSaveDC(props.character)
  const spellAttackBonus = () => getSpellAttackBonus(props.character)

  const allFeatures = (): Feature[] => [
    ...safeFeatures(props.character.classFeatures),
    ...safeFeatures(props.character.speciesTraits),
    ...safeFeatures(props.character.feats),
  ]
  const featureActions   = () => allFeatures().filter((f) => f.actionKind === 'action')
  const featureBonuses   = () => allFeatures().filter((f) => f.actionKind === 'bonus-action')
  const featureReactions = () => allFeatures().filter((f) => f.actionKind === 'reaction')

  const attackSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) &&
    spell.castingTime.toLowerCase().includes("1 action") &&
    !spell.castingTime.toLowerCase().includes("bonus") &&
    !spell.castingTime.toLowerCase().includes("reaction")
  )
  const bonusActionSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("bonus")
  )
  const reactionSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("reaction")
  )

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

  const handleAddAction = (data: ActionFormData) => {
    props.onUpdate({ ...props.character, attacks: [...(props.character.attacks || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
    setIsAddActionOpen(false)
  }

  const handleDeleteAttack = (id: string) => {
    props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).filter((a) => a.id !== id) })
  }

  const handleAddBonusAction = (data: ActionFormData) => {
    props.onUpdate({ ...props.character, bonusActions: [...(props.character.bonusActions || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
    setIsAddBonusActionOpen(false)
  }

  const handleDeleteBonusAction = (id: string) => {
    props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).filter((b) => b.id !== id) })
  }

  const handleAddReaction = (data: ActionFormData) => {
    props.onUpdate({ ...props.character, reactions: [...(props.character.reactions || []), { id: crypto.randomUUID(), ...normalizeRechargeOn(data) }] })
    setIsAddReactionOpen(false)
  }

  const handleDeleteReaction = (id: string) => {
    props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).filter((r) => r.id !== id) })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Sword class="h-5 w-5 text-primary" />
          Actions & Attacks
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Target class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">Attack Bonus</span>
            </div>
            <div class="text-2xl font-bold text-primary">{formatModifier(spellAttackBonus())}</div>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Zap class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">Spell Save DC</span>
            </div>
            <div class="text-2xl font-bold text-primary">{spellSaveDC()}</div>
          </div>
        </div>

        {/* Spell Slot Toggles */}
        <div class="my-4">
          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />
        </div>

        {/* Actions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Target class="h-5 w-5 text-primary" />
              Actions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddActionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Action
            </Button>
          </div>

          <Show when={attackSpells().length > 0 || (props.character.attacks?.length ?? 0) > 0 || featureActions().length > 0}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={attackSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  const upcastLevels = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .filter(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 && s.used < s.total })
                  const hasHigherSlots = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .some(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 })
                  return <SpellCard spell={spell} castable={canCast} onCast={() => castSpell(spell.level)} upcastLevels={upcastLevels} onCastAtLevel={(level: number) => { castSpell(level); setUpcastSpellId(null) }} hasHigherSlots={hasHigherSlots} upcastSpellId={upcastSpellId} onUpcastSpellId={setUpcastSpellId} />
                }}
              </For>
              <For each={featureActions()}>
                {(feature) => <FeatureActionCard feature={feature} onUsesChange={(v) => handleFeatureUsesChange(feature, v)} />}
              </For>
              <For each={props.character.attacks || []}>
                {(attack) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium">{attack.name}</div>
                        <div class="text-xs text-muted-foreground">{ACTION_TYPE_LABEL[attack.type] ?? attack.type}</div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" class="text-xs">{ACTION_TYPE_LABEL[attack.type] ?? attack.type}</Badge>
                        <Tooltip content="Delete attack">
                          <button type="button" class="" aria-label="Delete Attack" onClick={() => handleDeleteAttack(attack.id)}>
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div class="flex items-start justify-between gap-2 text-sm">
                      <div class="space-y-1">
                        <Show when={attack.attackBonus !== undefined}>
                          <div><strong>Attack:</strong> {formatModifier(attack.attackBonus ?? 0)} to hit</div>
                        </Show>
                        <Show when={attack.range}>
                          <div><strong>Range:</strong> {attack.range}</div>
                        </Show>
                      </div>
                      <Show when={attack.damage}>
                        <div class="shrink-0 px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap">
                          {attack.damage} {attack.damageType}
                        </div>
                      </Show>
                    </div>
                    <Show when={attack.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{attack.description}</div>
                    </Show>
                    <ActionUsesTracker
                      uses={attack.uses ?? 0}
                      maxUses={attack.maxUses ?? 0}
                      onUsesChange={(v) => handleAttackUsesChange(attack.id, v)}
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Bonus Actions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Clock class="h-5 w-5 text-primary" />
              Bonus Actions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddBonusActionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Bonus Action
            </Button>
          </div>

          <Show when={bonusActionSpells().length > 0 || (props.character.bonusActions?.length ?? 0) > 0 || featureBonuses().length > 0}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={bonusActionSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  const upcastLevels = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .filter(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 && s.used < s.total })
                  const hasHigherSlots = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .some(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 })
                  return <SpellCard spell={spell} castable={canCast} onCast={() => castSpell(spell.level)} upcastLevels={upcastLevels} onCastAtLevel={(level: number) => { castSpell(level); setUpcastSpellId(null) }} hasHigherSlots={hasHigherSlots} upcastSpellId={upcastSpellId} onUpcastSpellId={setUpcastSpellId} />
                }}
              </For>
              <For each={featureBonuses()}>
                {(feature) => <FeatureActionCard feature={feature} onUsesChange={(v) => handleFeatureUsesChange(feature, v)} />}
              </For>
              <For each={props.character.bonusActions || []}>
                {(bonus) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium">{bonus.name}</div>
                        <div class="text-xs text-muted-foreground">{ACTION_TYPE_LABEL[bonus.type] ?? bonus.type}</div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" class="text-xs">{ACTION_TYPE_LABEL[bonus.type] ?? bonus.type}</Badge>
                        <Tooltip content="Delete bonus action">
                          <button type="button" class="" aria-label="Delete Bonus Action" onClick={() => handleDeleteBonusAction(bonus.id)}>
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div class="text-sm space-y-1">
                      <Show when={bonus.attackBonus !== undefined}>
                        <div><strong>Attack:</strong> {formatModifier(bonus.attackBonus ?? 0)} to hit</div>
                      </Show>
                      <Show when={bonus.range}>
                        <div><strong>Range:</strong> {bonus.range}</div>
                      </Show>
                      <Show when={bonus.damage}>
                        <div><strong>Damage:</strong> {bonus.damage} {bonus.damageType}</div>
                      </Show>
                    </div>
                    <ActionUsesTracker
                      uses={bonus.uses ?? 0}
                      maxUses={bonus.maxUses ?? 0}
                      onUsesChange={(v) => handleBonusActionUsesChange(bonus.id, v)}
                    />
                    <Show when={bonus.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{bonus.description}</div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Reactions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Shield class="h-5 w-5 text-primary" />
              Reactions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddReactionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Reaction
            </Button>
          </div>

          <Show when={reactionSpells().length > 0 || (props.character.reactions?.length ?? 0) > 0 || featureReactions().length > 0}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={reactionSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  const upcastLevels = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .filter(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 && s.used < s.total })
                  const hasHigherSlots = () => ([2,3,4,5,6,7,8,9] as const)
                    .filter(l => l > spell.level)
                    .some(l => { const s = props.character.spellSlots[l]; return s && s.total > 0 })
                  return <SpellCard spell={spell} castable={canCast} onCast={() => castSpell(spell.level)} upcastLevels={upcastLevels} onCastAtLevel={(level: number) => { castSpell(level); setUpcastSpellId(null) }} hasHigherSlots={hasHigherSlots} upcastSpellId={upcastSpellId} onUpcastSpellId={setUpcastSpellId} />
                }}
              </For>
              <For each={featureReactions()}>
                {(feature) => <FeatureActionCard feature={feature} onUsesChange={(v) => handleFeatureUsesChange(feature, v)} />}
              </For>
              <For each={props.character.reactions || []}>
                {(reaction) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium">{reaction.name}</div>
                        <div class="text-xs text-muted-foreground">{ACTION_TYPE_LABEL[reaction.type] ?? reaction.type}</div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" class="text-xs">{ACTION_TYPE_LABEL[reaction.type] ?? reaction.type}</Badge>
                        <Tooltip content="Delete reaction">
                          <button type="button" class="" aria-label="Delete Reaction" onClick={() => handleDeleteReaction(reaction.id)}>
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div class="text-sm space-y-1">
                      <div><strong>Trigger:</strong> {reaction.trigger}</div>
                      <Show when={reaction.attackBonus !== undefined}>
                        <div><strong>Attack:</strong> {formatModifier(reaction.attackBonus ?? 0)} to hit</div>
                      </Show>
                      <Show when={reaction.range}>
                        <div><strong>Range:</strong> {reaction.range}</div>
                      </Show>
                      <Show when={reaction.damage}>
                        <div><strong>Damage:</strong> {reaction.damage} {reaction.damageType}</div>
                      </Show>
                    </div>
                    <ActionUsesTracker
                      uses={reaction.uses ?? 0}
                      maxUses={reaction.maxUses ?? 0}
                      onUsesChange={(v) => handleReactionUsesChange(reaction.id, v)}
                    />
                    <Show when={reaction.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{reaction.description}</div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </CardContent>

      <Modal open={isAddActionOpen()} onOpenChange={setIsAddActionOpen}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>Add Custom Action</ModalTitle></ModalHeader>
          <ActionForm kind="action" onSubmit={handleAddAction} onCancel={() => setIsAddActionOpen(false)} />
        </ModalContent>
      </Modal>

      <Modal open={isAddBonusActionOpen()} onOpenChange={setIsAddBonusActionOpen}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>Add Custom Bonus Action</ModalTitle></ModalHeader>
          <ActionForm kind="bonus-action" onSubmit={handleAddBonusAction} onCancel={() => setIsAddBonusActionOpen(false)} />
        </ModalContent>
      </Modal>

      <Modal open={isAddReactionOpen()} onOpenChange={setIsAddReactionOpen}>
        <ModalContent class="max-w-md">
          <ModalHeader><ModalTitle>Add Custom Reaction</ModalTitle></ModalHeader>
          <ActionForm kind="reaction" onSubmit={handleAddReaction} onCancel={() => setIsAddReactionOpen(false)} />
        </ModalContent>
      </Modal>
    </Card>
  )
}

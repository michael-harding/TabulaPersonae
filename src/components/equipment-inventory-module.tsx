import { createSignal, createEffect, on, For, Show, type ParentProps } from "solid-js"
import type { AbilityScores, Character, Equipment, ItemModifiers, ItemRarity, SenseType } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import {
  DAMAGE_TYPE_OPTIONS,
  CONDITIONS,
  SENSE_TYPES,
  SENSE_LABELS,
  BASE_ATTUNEMENT_LIMIT,
  remainingUses,
  spentFromRemaining,
  isItemModifierActive,
  formatModifier,
  getEffectiveCarryingCapacity,
} from "@/lib/character-utils"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { cascadeDecrement } from "@/lib/currency-utils"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Tooltip } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Package from "lucide-solid/icons/package"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Save from "lucide-solid/icons/save"
import Search from "lucide-solid/icons/search"
import Scale from "lucide-solid/icons/scale"
import Gem from "lucide-solid/icons/gem"
import Coins from "lucide-solid/icons/coins"
import TriangleAlert from "lucide-solid/icons/triangle-alert"
import ChevronDown from "lucide-solid/icons/chevron-down"
import X from "lucide-solid/icons/x"
import { useReadOnly } from "@/lib/read-only-context"
import { MarkdownContent } from "@/components/ui/markdown-content"

const RARITY_OPTIONS: { value: ItemRarity; label: string }[] = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "very-rare", label: "Very Rare" },
  { value: "legendary", label: "Legendary" },
  { value: "artifact", label: "Artifact" },
]

const RECHARGE_OPTIONS: { value: "" | "short-rest" | "long-rest"; label: string }[] = [
  { value: "", label: "None" },
  { value: "short-rest", label: "Short Rest" },
  { value: "long-rest", label: "Long Rest" },
]

const ABILITY_KEYS: (keyof AbilityScores)[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA",
}
const zeroAbilityRecord = (): Record<keyof AbilityScores, number> => ({
  strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0,
})
const zeroSenseRecord = (): Record<SenseType, number> => ({
  darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0,
})
const roundToOneDecimal = (n: number): number => Math.round(n * 10) / 10

interface EquipmentInventoryModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

type EquipmentType = "weapon" | "armor" | "tool" | "consumable" | "treasure" | "other"

interface EquipmentFormData {
  name: string
  quantity: number
  weight: number
  description: string
  equipped: boolean
  type: EquipmentType
  weaponStats?: {
    damage: string
    damageType: string
    weaponRange: string
    attackAbility: "str" | "dex" | "finesse"
    proficient: boolean
  }
  armorStats?: {
    baseAC: number
    armorType: "light" | "medium" | "heavy" | "shield"
  }
  magic: boolean
  requiresAttunement: boolean
  attuned: boolean
  rarity: ItemRarity
  uses: number
  maxUses: number
  rechargeOn: "" | "short-rest" | "long-rest"
  modifierArmorClass: number
  modifierInitiative: number
  modifierSavingThrows: Record<keyof AbilityScores, number>
  modifierAbilityScores: Record<keyof AbilityScores, number>
  modifierResistances: string[]
  modifierImmunities: string[]
  modifierVulnerabilities: string[]
  modifierConditionImmunities: string[]
  modifierSenses: Record<SenseType, number>
  modifierSpeed: number
  modifierFlySpeed: number
  modifierSwimSpeed: number
  modifierClimbSpeed: number
  modifierBurrowSpeed: number
  modifierCarryingCapacityBonus: number
  modifierCarryingCapacityMultiplier: number
  modifierAbilityScoreFloors: Record<keyof AbilityScores, number>
  modifierAbilityScoreMaxCaps: Record<keyof AbilityScores, number>
  modifierLanguages: string[]
  modifierProficiencies: string[]
}

const defaultEquipmentForm: EquipmentFormData = {
  name: "",
  quantity: 1,
  weight: 0,
  description: "",
  equipped: false,
  type: "other",
  magic: false,
  requiresAttunement: true,
  attuned: false,
  rarity: "common",
  uses: 0,
  maxUses: 0,
  rechargeOn: "",
  modifierArmorClass: 0,
  modifierInitiative: 0,
  modifierSavingThrows: zeroAbilityRecord(),
  modifierAbilityScores: zeroAbilityRecord(),
  modifierResistances: [],
  modifierImmunities: [],
  modifierVulnerabilities: [],
  modifierConditionImmunities: [],
  modifierSenses: zeroSenseRecord(),
  modifierSpeed: 0,
  modifierFlySpeed: 0,
  modifierSwimSpeed: 0,
  modifierClimbSpeed: 0,
  modifierBurrowSpeed: 0,
  modifierCarryingCapacityBonus: 0,
  modifierCarryingCapacityMultiplier: 0,
  modifierAbilityScoreFloors: zeroAbilityRecord(),
  modifierAbilityScoreMaxCaps: zeroAbilityRecord(),
  modifierLanguages: [],
  modifierProficiencies: [],
}

interface EquipmentFormProps {
  initialData: EquipmentFormData
  onSubmit: (data: EquipmentFormData) => void
  onCancel: () => void
  editing: boolean
}

function anyAbilityNonZero(record: Record<keyof AbilityScores, number>): boolean {
  return ABILITY_KEYS.some((k) => record[k] !== 0)
}
function anySenseNonZero(record: Record<SenseType, number>): boolean {
  return SENSE_TYPES.some((s) => record[s] !== 0)
}
function hasAbilityScoreValues(d: EquipmentFormData): boolean {
  return anyAbilityNonZero(d.modifierAbilityScores) || anyAbilityNonZero(d.modifierAbilityScoreFloors) || anyAbilityNonZero(d.modifierAbilityScoreMaxCaps)
}
function hasSavingThrowValues(d: EquipmentFormData): boolean {
  return anyAbilityNonZero(d.modifierSavingThrows)
}
function hasResistanceValues(d: EquipmentFormData): boolean {
  return d.modifierResistances.length > 0 || d.modifierImmunities.length > 0 || d.modifierVulnerabilities.length > 0 || d.modifierConditionImmunities.length > 0
}
function hasSenseValues(d: EquipmentFormData): boolean {
  return anySenseNonZero(d.modifierSenses)
}
function hasMovementValues(d: EquipmentFormData): boolean {
  return (
    d.modifierSpeed !== 0 ||
    d.modifierFlySpeed !== 0 ||
    d.modifierSwimSpeed !== 0 ||
    d.modifierClimbSpeed !== 0 ||
    d.modifierBurrowSpeed !== 0 ||
    d.modifierCarryingCapacityBonus !== 0 ||
    d.modifierCarryingCapacityMultiplier !== 0
  )
}
function hasLanguageValues(d: EquipmentFormData): boolean {
  return d.modifierLanguages.length > 0 || d.modifierProficiencies.length > 0
}

function TagPickerField(props: { label: string; options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const toggle = (tag: string) => {
    props.onChange(
      props.selected.includes(tag) ? props.selected.filter((t) => t !== tag) : [...props.selected, tag]
    )
  }
  return (
    <div>
      <div class="flex items-center justify-between">
        <Label class="text-xs">{props.label}</Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            as="button"
            class="inline-flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:text-primary transition-colors text-muted-foreground"
            title={`Add ${props.label}`}
          >
            <Plus class="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <For each={props.options}>
              {(option) => (
                <DropdownMenuItem
                  onSelect={() => toggle(option)}
                  class={props.selected.includes(option) ? "text-primary font-medium" : ""}
                >
                  {option}
                  <Show when={props.selected.includes(option)}>
                    <span class="ml-auto text-primary">✓</span>
                  </Show>
                </DropdownMenuItem>
              )}
            </For>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div class="flex flex-wrap gap-1 mt-1 min-h-[1.25rem]">
        <Show when={props.selected.length > 0} fallback={<span class="text-xs text-muted-foreground italic">None</span>}>
          <For each={props.selected}>
            {(tag) => (
              <button
                type="button"
                onClick={() => toggle(tag)}
                class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                title="Click to remove"
              >
                {tag}
                <X class="h-2.5 w-2.5" />
              </button>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

function StringListField(props: { label: string; placeholder: string; values: string[]; onChange: (next: string[]) => void }) {
  const [newValue, setNewValue] = createSignal("")
  const add = () => {
    const trimmed = newValue().trim()
    if (!trimmed || props.values.includes(trimmed)) return
    props.onChange([...props.values, trimmed])
    setNewValue("")
  }
  const remove = (value: string) => props.onChange(props.values.filter((v) => v !== value))
  return (
    <div>
      <Label class="text-xs">{props.label}</Label>
      <div class="flex flex-wrap gap-1 mt-1 mb-2">
        <Show when={props.values.length > 0} fallback={<span class="text-xs text-muted-foreground italic">None</span>}>
          <For each={props.values}>
            {(value) => (
              <Badge variant="outline" class="gap-1 text-xs">
                {value}
                <Button variant="ghost" size="sm" aria-label={`Remove ${value}`} class="h-auto p-0 hover:bg-transparent" onClick={() => remove(value)}>
                  <X class="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
          </For>
        </Show>
      </div>
      <div class="flex gap-2">
        <Input
          placeholder={props.placeholder}
          value={newValue()}
          onInput={(e) => setNewValue(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          class="flex-1 h-8 text-xs"
        />
        <Button onClick={add} size="sm" aria-label={props.label} disabled={!newValue().trim()}>
          <Plus class="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function ModifierGroup(props: ParentProps<{ label: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  return (
    <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
      <CollapsibleTrigger class="flex w-full items-center justify-between text-xs font-medium text-muted-foreground border-t pt-2">
        <span>{props.label}</span>
        <ChevronDown class="h-3.5 w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent class="space-y-3 pt-2 pb-1">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}

const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "tool", label: "Tool" },
  { value: "consumable", label: "Consumable" },
  { value: "treasure", label: "Treasure" },
  { value: "other", label: "Other" },
]

const ATTACK_ABILITY_OPTIONS: { value: "str" | "dex" | "finesse"; label: string }[] = [
  { value: "str", label: "Strength" },
  { value: "dex", label: "Dexterity" },
  { value: "finesse", label: "Finesse (higher of STR/DEX)" },
]

const ARMOR_TYPE_OPTIONS: { value: "light" | "medium" | "heavy" | "shield"; label: string }[] = [
  { value: "light", label: "Light (base AC + full DEX)" },
  { value: "medium", label: "Medium (base AC + DEX, max +2)" },
  { value: "heavy", label: "Heavy (base AC only)" },
  { value: "shield", label: "Shield (+2 stacks with armor)" },
]

function EquipmentForm(props: EquipmentFormProps) {
  const [formData, setFormData] = createSignal<EquipmentFormData>(props.initialData)
  const [openAbilityScores, setOpenAbilityScores] = createSignal(hasAbilityScoreValues(props.initialData))
  const [openSavingThrows, setOpenSavingThrows] = createSignal(hasSavingThrowValues(props.initialData))
  const [openResistances, setOpenResistances] = createSignal(hasResistanceValues(props.initialData))
  const [openSenses, setOpenSenses] = createSignal(hasSenseValues(props.initialData))
  const [openMovement, setOpenMovement] = createSignal(hasMovementValues(props.initialData))
  const [openLanguages, setOpenLanguages] = createSignal(hasLanguageValues(props.initialData))
  createEffect(
    on(
      () => props.initialData,
      (init) => {
        setFormData(init)
        setOpenAbilityScores(hasAbilityScoreValues(init))
        setOpenSavingThrows(hasSavingThrowValues(init))
        setOpenResistances(hasResistanceValues(init))
        setOpenSenses(hasSenseValues(init))
        setOpenMovement(hasMovementValues(init))
        setOpenLanguages(hasLanguageValues(init))
      }
    )
  )

  const handleTypeChange = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      type: type as EquipmentType,
      weaponStats: type === "weapon" ? (prev.weaponStats ?? { damage: "", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true }) : undefined,
      armorStats: type === "armor" ? (prev.armorStats ?? { baseAC: 11, armorType: "light" }) : undefined,
    }))
  }

  return (
    <div class="space-y-4">
      <div>
        <Label for="item-name">Item Name</Label>
        <Input
          id="item-name"
          value={formData().name}
          onInput={(e) => setFormData((prev) => ({ ...prev, name: e.currentTarget.value }))}
          placeholder="Enter item name"
        />
      </div>

      <div>
        <Label>Item Type</Label>
        <Select value={formData().type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <For each={EQUIPMENT_TYPES}>
              {(t) => <SelectItem value={t.value}>{t.label}</SelectItem>}
            </For>
          </SelectContent>
        </Select>
      </div>

      <Show when={formData().type === "weapon"}>
        <div class="space-y-3 border rounded-md p-3 bg-muted/30">
          <p class="text-sm font-medium">Weapon Stats</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="weapon-damage">Damage Dice</Label>
              <Input
                id="weapon-damage"
                value={formData().weaponStats?.damage ?? ""}
                onInput={(e) => setFormData((prev) => ({ ...prev, weaponStats: { ...prev.weaponStats!, damage: e.currentTarget.value } }))}
                placeholder="e.g. 1d8"
              />
            </div>
            <div>
              <Label>Damage Type</Label>
              <Combobox
                value={formData().weaponStats?.damageType ?? ""}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, weaponStats: { ...prev.weaponStats!, damageType: v } }))}
                options={DAMAGE_TYPE_OPTIONS}
                placeholder="Select type"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="weapon-range">Range</Label>
              <Input
                id="weapon-range"
                value={formData().weaponStats?.weaponRange ?? ""}
                onInput={(e) => setFormData((prev) => ({ ...prev, weaponStats: { ...prev.weaponStats!, weaponRange: e.currentTarget.value } }))}
                placeholder="e.g. 5 ft"
              />
            </div>
            <div>
              <Label>Attack Using</Label>
              <Select
                value={formData().weaponStats?.attackAbility ?? "str"}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, weaponStats: { ...prev.weaponStats!, attackAbility: v as "str" | "dex" | "finesse" } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ability" />
                </SelectTrigger>
                <SelectContent>
                  <For each={ATTACK_ABILITY_OPTIONS}>
                    {(o) => <SelectItem value={o.value}>{o.label}</SelectItem>}
                  </For>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="weapon-proficient"
              checked={formData().weaponStats?.proficient ?? true}
              onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, weaponStats: { ...prev.weaponStats!, proficient: checked } }))}
            />
            <Label for="weapon-proficient">Proficient with this weapon</Label>
          </div>
        </div>
      </Show>

      <Show when={formData().type === "armor"}>
        <div class="space-y-3 border rounded-md p-3 bg-muted/30">
          <p class="text-sm font-medium">Armor Stats</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label>Armor Type</Label>
              <Select
                value={formData().armorStats?.armorType ?? "light"}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, armorStats: { ...prev.armorStats!, armorType: v as "light" | "medium" | "heavy" | "shield" } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <For each={ARMOR_TYPE_OPTIONS}>
                    {(o) => <SelectItem value={o.value}>{o.label}</SelectItem>}
                  </For>
                </SelectContent>
              </Select>
            </div>
            <Show
              when={formData().armorStats?.armorType !== "shield"}
              fallback={
                <div>
                  <Label>AC Bonus</Label>
                  <p class="text-sm text-muted-foreground mt-2">+2 (fixed)</p>
                </div>
              }
            >
              <div>
                <Label for="armor-base-ac">Base AC</Label>
                <NumericInput
                  id="armor-base-ac"
                  min={1}
                  value={formData().armorStats?.baseAC ?? 11}
                  onChange={(v) => setFormData((prev) => ({ ...prev, armorStats: { ...prev.armorStats!, baseAC: v } }))}
                />
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <div class="flex items-center space-x-2">
        <Checkbox
          id="item-magic"
          checked={formData().magic}
          onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, magic: checked }))}
        />
        <Label for="item-magic">This is a Magic Item</Label>
      </div>

      <Show when={formData().magic}>
        <div class="space-y-3">
          <p class="text-sm font-medium flex items-center gap-1">
            <Gem class="h-3.5 w-3.5" />
            Magic Item Details
          </p>
          <div>
            <Label>Rarity</Label>
            <Select
              value={formData().rarity}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, rarity: v as ItemRarity }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rarity" />
              </SelectTrigger>
              <SelectContent>
                <For each={RARITY_OPTIONS}>
                  {(r) => <SelectItem value={r.value}>{r.label}</SelectItem>}
                </For>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="item-requires-attunement"
              checked={formData().requiresAttunement}
              onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, requiresAttunement: checked, attuned: checked ? prev.attuned : false }))}
            />
            <Label for="item-requires-attunement">Requires Attunement</Label>
          </div>
          <Show when={formData().requiresAttunement}>
            <div class="flex items-center gap-2">
              <Checkbox
                id="item-attuned"
                checked={formData().attuned}
                onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, attuned: checked }))}
              />
              <Label for="item-attuned">Attuned</Label>
            </div>
          </Show>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="item-uses">Uses Spent</Label>
              <NumericInput id="item-uses" min={0} value={formData().uses}
                onChange={(v) => setFormData((prev) => ({ ...prev, uses: v }))} />
            </div>
            <div>
              <Label for="item-max-uses">Max Charges (0 = none)</Label>
              <NumericInput id="item-max-uses" min={0} value={formData().maxUses}
                onChange={(v) => setFormData((prev) => ({ ...prev, maxUses: v, uses: 0 }))} />
            </div>
          </div>
          <Show when={formData().maxUses > 0}>
            <div>
              <Label>Recharge On</Label>
              <Select
                value={formData().rechargeOn}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, rechargeOn: v as "" | "short-rest" | "long-rest" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <For each={RECHARGE_OPTIONS}>
                    {(r) => <SelectItem value={r.value}>{r.label}</SelectItem>}
                  </For>
                </SelectContent>
              </Select>
            </div>
          </Show>

          <div class="space-y-2 pt-2 border-t">
            <p class="text-xs font-medium text-muted-foreground">Bonuses (optional)</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label for="modifier-ac">AC Bonus</Label>
                <NumericInput
                  id="modifier-ac"
                  value={formData().modifierArmorClass}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierArmorClass: v }))}
                />
              </div>
              <div>
                <Label for="modifier-initiative">Initiative Bonus</Label>
                <NumericInput
                  id="modifier-initiative"
                  value={formData().modifierInitiative}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierInitiative: v }))}
                />
              </div>
            </div>
            <ModifierGroup label="Ability Scores" open={openAbilityScores()} onOpenChange={setOpenAbilityScores}>
              <div>
                <Label class="text-xs">Bonuses</Label>
                <div class="grid grid-cols-3 gap-2 mt-1">
                  <For each={ABILITY_KEYS}>
                    {(ability) => (
                      <div>
                        <Label for={`modifier-ability-${ability}`} class="text-xs">{ABILITY_LABELS[ability]}</Label>
                        <NumericInput
                          id={`modifier-ability-${ability}`}
                          value={formData().modifierAbilityScores[ability]}
                          onChange={(v) => setFormData((prev) => ({ ...prev, modifierAbilityScores: { ...prev.modifierAbilityScores, [ability]: v } }))}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </div>
              <div>
                <Label class="text-xs">Floors (sets score to at least this value)</Label>
                <div class="grid grid-cols-3 gap-2 mt-1">
                  <For each={ABILITY_KEYS}>
                    {(ability) => (
                      <div>
                        <Label for={`modifier-floor-${ability}`} class="text-xs">{ABILITY_LABELS[ability]}</Label>
                        <NumericInput
                          id={`modifier-floor-${ability}`}
                          min={0}
                          value={formData().modifierAbilityScoreFloors[ability]}
                          onChange={(v) => setFormData((prev) => ({ ...prev, modifierAbilityScoreFloors: { ...prev.modifierAbilityScoreFloors, [ability]: v } }))}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </div>
              <div>
                <Label class="text-xs">Max Caps (informational)</Label>
                <div class="grid grid-cols-3 gap-2 mt-1">
                  <For each={ABILITY_KEYS}>
                    {(ability) => (
                      <div>
                        <Label for={`modifier-cap-${ability}`} class="text-xs">{ABILITY_LABELS[ability]}</Label>
                        <NumericInput
                          id={`modifier-cap-${ability}`}
                          min={0}
                          value={formData().modifierAbilityScoreMaxCaps[ability]}
                          onChange={(v) => setFormData((prev) => ({ ...prev, modifierAbilityScoreMaxCaps: { ...prev.modifierAbilityScoreMaxCaps, [ability]: v } }))}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </ModifierGroup>

            <ModifierGroup label="Saving Throws" open={openSavingThrows()} onOpenChange={setOpenSavingThrows}>
              <div class="grid grid-cols-3 gap-2">
                <For each={ABILITY_KEYS}>
                  {(ability) => (
                    <div>
                      <Label for={`modifier-save-${ability}`} class="text-xs">{ABILITY_LABELS[ability]}</Label>
                      <NumericInput
                        id={`modifier-save-${ability}`}
                        value={formData().modifierSavingThrows[ability]}
                        onChange={(v) => setFormData((prev) => ({ ...prev, modifierSavingThrows: { ...prev.modifierSavingThrows, [ability]: v } }))}
                      />
                    </div>
                  )}
                </For>
              </div>
            </ModifierGroup>

            <ModifierGroup label="Resistances & Immunities" open={openResistances()} onOpenChange={setOpenResistances}>
              <div class="grid grid-cols-1 gap-3">
                <TagPickerField
                  label="Damage Resistances"
                  options={DAMAGE_TYPE_OPTIONS}
                  selected={formData().modifierResistances}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierResistances: v }))}
                />
                <TagPickerField
                  label="Damage Immunities"
                  options={DAMAGE_TYPE_OPTIONS}
                  selected={formData().modifierImmunities}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierImmunities: v }))}
                />
                <TagPickerField
                  label="Damage Vulnerabilities"
                  options={DAMAGE_TYPE_OPTIONS}
                  selected={formData().modifierVulnerabilities}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierVulnerabilities: v }))}
                />
                <TagPickerField
                  label="Condition Immunities"
                  options={CONDITIONS}
                  selected={formData().modifierConditionImmunities}
                  onChange={(v) => setFormData((prev) => ({ ...prev, modifierConditionImmunities: v }))}
                />
              </div>
            </ModifierGroup>

            <ModifierGroup label="Senses" open={openSenses()} onOpenChange={setOpenSenses}>
              <div class="grid grid-cols-2 gap-2">
                <For each={SENSE_TYPES}>
                  {(sense) => (
                    <div>
                      <Label for={`modifier-sense-${sense}`} class="text-xs">{SENSE_LABELS[sense]} (ft)</Label>
                      <NumericInput
                        id={`modifier-sense-${sense}`}
                        min={0}
                        value={formData().modifierSenses[sense]}
                        onChange={(v) => setFormData((prev) => ({ ...prev, modifierSenses: { ...prev.modifierSenses, [sense]: v } }))}
                      />
                    </div>
                  )}
                </For>
              </div>
            </ModifierGroup>

            <ModifierGroup label="Movement & Weight" open={openMovement()} onOpenChange={setOpenMovement}>
              <div>
                <Label class="text-xs">Movement (ft)</Label>
                <div class="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <Label for="modifier-speed" class="text-xs">Speed</Label>
                    <NumericInput id="modifier-speed" value={formData().modifierSpeed} onChange={(v) => setFormData((prev) => ({ ...prev, modifierSpeed: v }))} />
                  </div>
                  <div>
                    <Label for="modifier-fly-speed" class="text-xs">Fly</Label>
                    <NumericInput id="modifier-fly-speed" min={0} value={formData().modifierFlySpeed} onChange={(v) => setFormData((prev) => ({ ...prev, modifierFlySpeed: v }))} />
                  </div>
                  <div>
                    <Label for="modifier-swim-speed" class="text-xs">Swim</Label>
                    <NumericInput id="modifier-swim-speed" min={0} value={formData().modifierSwimSpeed} onChange={(v) => setFormData((prev) => ({ ...prev, modifierSwimSpeed: v }))} />
                  </div>
                  <div>
                    <Label for="modifier-climb-speed" class="text-xs">Climb</Label>
                    <NumericInput id="modifier-climb-speed" min={0} value={formData().modifierClimbSpeed} onChange={(v) => setFormData((prev) => ({ ...prev, modifierClimbSpeed: v }))} />
                  </div>
                  <div>
                    <Label for="modifier-burrow-speed" class="text-xs">Burrow</Label>
                    <NumericInput id="modifier-burrow-speed" min={0} value={formData().modifierBurrowSpeed} onChange={(v) => setFormData((prev) => ({ ...prev, modifierBurrowSpeed: v }))} />
                  </div>
                </div>
              </div>
              <div>
                <Label class="text-xs">Carrying Capacity</Label>
                <div class="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label for="modifier-capacity-bonus" class="text-xs">Bonus (lbs)</Label>
                    <NumericInput id="modifier-capacity-bonus" value={formData().modifierCarryingCapacityBonus} onChange={(v) => setFormData((prev) => ({ ...prev, modifierCarryingCapacityBonus: v }))} />
                  </div>
                  <div>
                    <Label for="modifier-capacity-multiplier" class="text-xs">Multiplier (0 = none)</Label>
                    <NumericInput id="modifier-capacity-multiplier" min={0} step="0.5" value={formData().modifierCarryingCapacityMultiplier} onChange={(v) => setFormData((prev) => ({ ...prev, modifierCarryingCapacityMultiplier: v }))} parser={parseFloat} />
                  </div>
                </div>
              </div>
            </ModifierGroup>

            <ModifierGroup label="Languages & Proficiencies" open={openLanguages()} onOpenChange={setOpenLanguages}>
              <StringListField
                label="Languages Granted"
                placeholder="Add language"
                values={formData().modifierLanguages}
                onChange={(v) => setFormData((prev) => ({ ...prev, modifierLanguages: v }))}
              />
              <StringListField
                label="Proficiencies Granted"
                placeholder="Add proficiency (weapons, tools, etc.)"
                values={formData().modifierProficiencies}
                onChange={(v) => setFormData((prev) => ({ ...prev, modifierProficiencies: v }))}
              />
            </ModifierGroup>
          </div>
        </div>
      </Show>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="quantity">Quantity</Label>
          <NumericInput id="quantity" min={1} value={formData().quantity} onChange={(v) => setFormData(prev => ({ ...prev, quantity: v }))} />
        </div>
        <div>
          <Label for="weight">Weight (lbs)</Label>
          <NumericInput id="weight" min={0} step="0.1" value={formData().weight} onChange={(v) => setFormData(prev => ({ ...prev, weight: v }))} parser={parseFloat} />
        </div>
      </div>

      <div>
        <Label for="description">Description</Label>
        <Textarea
          id="description"
          value={formData().description}
          onInput={(e) => setFormData((prev) => ({ ...prev, description: e.currentTarget.value }))}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox
          id="equipped"
          checked={formData().equipped}
          onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, equipped: checked }))}
        />
        <Label for="equipped">Currently equipped</Label>
      </div>

      <div class="flex gap-2 pt-4">
        <Button onClick={() => props.onSubmit(formData())} class="gap-2">
          <Save class="h-4 w-4" />
          {props.editing ? "Update Item" : "Add Item"}
        </Button>
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

export function EquipmentInventoryModule(props: EquipmentInventoryModuleProps) {
  const isReadOnly = useReadOnly()
  const [searchTerm, setSearchTerm] = createSignal("")
  const [modalOpen, setModalOpen] = createSignal(false)
  const [editingItem, setEditingItem] = createSignal<Equipment | null>(null)

  const safeEquipment = () => props.character.equipment || []
  const magicItems = () => safeEquipment().filter((item) => item.magic)
  const attunedCount = () => safeEquipment().filter((item) => item.attuned).length

  const attunementLimitField = useCalculatedValue({
    useCalculated: () => props.character.useCalculatedAttunementLimit ?? true,
    setUseCalculated: (v) => {
      const updated = { ...props.character, useCalculatedAttunementLimit: v }
      props.onUpdate(updated)
      saveCharacter(updated)
    },
    manualValue: () => props.character.attunementLimit ?? BASE_ATTUNEMENT_LIMIT,
    setManualValue: (v) => {
      const updated = { ...props.character, attunementLimit: v }
      props.onUpdate(updated)
      saveCharacter(updated)
    },
    calculatedValue: () => BASE_ATTUNEMENT_LIMIT,
    calculatedTooltip: () => "Base attunement limit",
  })
  const overAttunementLimit = () => attunedCount() > attunementLimitField.resolvedValue()

  const carryingCapacityField = useCalculatedValue({
    useCalculated: () => props.character.useCalculatedCarryingCapacity ?? true,
    setUseCalculated: (v) => {
      const updated = { ...props.character, useCalculatedCarryingCapacity: v }
      props.onUpdate(updated)
      saveCharacter(updated)
    },
    manualValue: () => props.character.carryingCapacity ?? getEffectiveCarryingCapacity(props.character),
    setManualValue: (v) => {
      const updated = { ...props.character, carryingCapacity: v }
      props.onUpdate(updated)
      saveCharacter(updated)
    },
    calculatedValue: () => getEffectiveCarryingCapacity(props.character),
    calculatedTooltip: () => "STR score x 15, plus item bonuses/multipliers",
  })
  const overCarryingCapacity = () => totalWeight() > carryingCapacityField.resolvedValue()

  const filteredEquipment = () =>
    safeEquipment().filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm().toLowerCase()),
    )
  const totalWeight = () => roundToOneDecimal(safeEquipment().reduce((total, item) => total + (item.weight || 0) * item.quantity, 0))
  const equippedItems = () => safeEquipment().filter((item) => item.equipped)

  const currentFormData = (): EquipmentFormData => {
    const item = editingItem()
    if (item) {
      return {
        name: item.name,
        quantity: item.quantity,
        weight: item.weight || 0,
        description: item.description || "",
        equipped: item.equipped || false,
        type: item.type || "other",
        weaponStats: item.weaponStats,
        armorStats: item.armorStats,
        magic: item.magic ?? false,
        requiresAttunement: item.requiresAttunement ?? true,
        attuned: item.attuned ?? false,
        rarity: item.rarity ?? "common",
        uses: item.uses ?? 0,
        maxUses: item.maxUses ?? 0,
        rechargeOn: item.rechargeOn ?? "",
        modifierArmorClass: item.modifiers?.armorClass ?? 0,
        modifierInitiative: item.modifiers?.initiative ?? 0,
        modifierSavingThrows: { ...zeroAbilityRecord(), ...item.modifiers?.savingThrows },
        modifierAbilityScores: { ...zeroAbilityRecord(), ...item.modifiers?.abilityScores },
        modifierResistances: item.modifiers?.resistances ?? [],
        modifierImmunities: item.modifiers?.immunities ?? [],
        modifierVulnerabilities: item.modifiers?.vulnerabilities ?? [],
        modifierConditionImmunities: item.modifiers?.conditionImmunities ?? [],
        modifierSenses: { ...zeroSenseRecord(), ...item.modifiers?.senses },
        modifierSpeed: item.modifiers?.speed ?? 0,
        modifierFlySpeed: item.modifiers?.flySpeed ?? 0,
        modifierSwimSpeed: item.modifiers?.swimSpeed ?? 0,
        modifierClimbSpeed: item.modifiers?.climbSpeed ?? 0,
        modifierBurrowSpeed: item.modifiers?.burrowSpeed ?? 0,
        modifierCarryingCapacityBonus: item.modifiers?.carryingCapacityBonus ?? 0,
        modifierCarryingCapacityMultiplier: item.modifiers?.carryingCapacityMultiplier ?? 0,
        modifierAbilityScoreFloors: { ...zeroAbilityRecord(), ...item.modifiers?.abilityScoreFloors },
        modifierAbilityScoreMaxCaps: { ...zeroAbilityRecord(), ...item.modifiers?.abilityScoreMaxCaps },
        modifierLanguages: item.modifiers?.languages ?? [],
        modifierProficiencies: item.modifiers?.proficiencies ?? [],
      }
    }
    return defaultEquipmentForm
  }

  const openAdd = () => { setEditingItem(null); setModalOpen(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setModalOpen(true) }
  const closeModal = () => { setEditingItem(null); setModalOpen(false) }

  const buildModifiers = (formData: EquipmentFormData): ItemModifiers | undefined => {
    if (!formData.magic) return undefined
    const modifiers: ItemModifiers = {}
    if (formData.modifierArmorClass !== 0) modifiers.armorClass = formData.modifierArmorClass
    if (formData.modifierInitiative !== 0) modifiers.initiative = formData.modifierInitiative
    const savingThrows = Object.fromEntries(
      ABILITY_KEYS.filter((a) => formData.modifierSavingThrows[a] !== 0).map((a) => [a, formData.modifierSavingThrows[a]])
    ) as Partial<Record<keyof AbilityScores, number>>
    if (Object.keys(savingThrows).length > 0) modifiers.savingThrows = savingThrows
    const abilityScores = Object.fromEntries(
      ABILITY_KEYS.filter((a) => formData.modifierAbilityScores[a] !== 0).map((a) => [a, formData.modifierAbilityScores[a]])
    ) as Partial<Record<keyof AbilityScores, number>>
    if (Object.keys(abilityScores).length > 0) modifiers.abilityScores = abilityScores

    if (formData.modifierResistances.length > 0) modifiers.resistances = formData.modifierResistances
    if (formData.modifierImmunities.length > 0) modifiers.immunities = formData.modifierImmunities
    if (formData.modifierVulnerabilities.length > 0) modifiers.vulnerabilities = formData.modifierVulnerabilities
    if (formData.modifierConditionImmunities.length > 0) modifiers.conditionImmunities = formData.modifierConditionImmunities

    const senses = Object.fromEntries(
      SENSE_TYPES.filter((s) => formData.modifierSenses[s] !== 0).map((s) => [s, formData.modifierSenses[s]])
    ) as Partial<Record<SenseType, number>>
    if (Object.keys(senses).length > 0) modifiers.senses = senses

    if (formData.modifierSpeed !== 0) modifiers.speed = formData.modifierSpeed
    if (formData.modifierFlySpeed !== 0) modifiers.flySpeed = formData.modifierFlySpeed
    if (formData.modifierSwimSpeed !== 0) modifiers.swimSpeed = formData.modifierSwimSpeed
    if (formData.modifierClimbSpeed !== 0) modifiers.climbSpeed = formData.modifierClimbSpeed
    if (formData.modifierBurrowSpeed !== 0) modifiers.burrowSpeed = formData.modifierBurrowSpeed

    if (formData.modifierCarryingCapacityBonus !== 0) modifiers.carryingCapacityBonus = formData.modifierCarryingCapacityBonus
    if (formData.modifierCarryingCapacityMultiplier !== 0) modifiers.carryingCapacityMultiplier = formData.modifierCarryingCapacityMultiplier

    const abilityScoreFloors = Object.fromEntries(
      ABILITY_KEYS.filter((a) => formData.modifierAbilityScoreFloors[a] !== 0).map((a) => [a, formData.modifierAbilityScoreFloors[a]])
    ) as Partial<Record<keyof AbilityScores, number>>
    if (Object.keys(abilityScoreFloors).length > 0) modifiers.abilityScoreFloors = abilityScoreFloors
    const abilityScoreMaxCaps = Object.fromEntries(
      ABILITY_KEYS.filter((a) => formData.modifierAbilityScoreMaxCaps[a] !== 0).map((a) => [a, formData.modifierAbilityScoreMaxCaps[a]])
    ) as Partial<Record<keyof AbilityScores, number>>
    if (Object.keys(abilityScoreMaxCaps).length > 0) modifiers.abilityScoreMaxCaps = abilityScoreMaxCaps

    if (formData.modifierLanguages.length > 0) modifiers.languages = formData.modifierLanguages
    if (formData.modifierProficiencies.length > 0) modifiers.proficiencies = formData.modifierProficiencies

    return Object.keys(modifiers).length > 0 ? modifiers : undefined
  }

  const magicFields = (formData: EquipmentFormData) => ({
    magic: formData.magic || undefined,
    requiresAttunement: formData.magic ? formData.requiresAttunement : undefined,
    attuned: formData.magic && formData.requiresAttunement ? formData.attuned : undefined,
    rarity: formData.magic ? formData.rarity : undefined,
    uses: formData.magic && formData.maxUses > 0 ? formData.uses : undefined,
    maxUses: formData.magic && formData.maxUses > 0 ? formData.maxUses : undefined,
    rechargeOn: formData.magic && formData.maxUses > 0 && formData.rechargeOn ? formData.rechargeOn : undefined,
    modifiers: buildModifiers(formData),
  })

  const handleAddItem = (formData: EquipmentFormData) => {
    if (!formData.name.trim()) return
    const newItem: Equipment = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      quantity: formData.quantity,
      weight: formData.weight,
      description: formData.description.trim(),
      equipped: formData.equipped,
      type: formData.type,
      weaponStats: formData.weaponStats,
      armorStats: formData.armorStats,
      ...magicFields(formData),
    }
    const updated = { ...props.character, equipment: [...safeEquipment(), newItem] }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeModal()
  }

  const handleUpdateItem = (formData: EquipmentFormData) => {
    const item = editingItem()
    if (!item || !formData.name.trim()) return
    const updatedItem: Equipment = {
      ...item,
      name: formData.name.trim(),
      quantity: formData.quantity,
      weight: formData.weight,
      description: formData.description.trim(),
      equipped: formData.equipped,
      type: formData.type,
      weaponStats: formData.weaponStats,
      armorStats: formData.armorStats,
      ...magicFields(formData),
    }
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((e) => (e.id === item.id ? updatedItem : e)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeModal()
  }

  const handleDeleteItem = (itemId: string) => {
    const updated = { ...props.character, equipment: safeEquipment().filter((item) => item.id !== itemId) }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const toggleEquipped = (itemId: string) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, equipped: !item.equipped } : item)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const toggleAttuned = (itemId: string) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, attuned: !item.attuned } : item)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const updateItemUses = (itemId: string, uses: number) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, uses } : item)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  return (
    <Card data-sem="equipment-inventory-module">
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Package class="h-5 w-5 text-primary" />
            Equipment & Inventory
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="gap-1">
              <Scale class="h-3 w-3" />
              {totalWeight()} lbs
            </Badge>
            <Show when={!isReadOnly}>
              <Button size="sm" class="gap-2" onClick={openAdd}>
                <Plus class="h-4 w-4" />
                Add Item
              </Button>
            </Show>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {/* Carrying Capacity */}
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Carrying Capacity: {totalWeight()} /</span>
          <CalculatedValue
            label="carrying capacity"
            editable={!isReadOnly}
            class="text-xs"
            {...carryingCapacityField.binding()}
          />
          <span>lbs</span>
          <Show when={overCarryingCapacity()}>
            <Tooltip content="Over carrying capacity">
              <TriangleAlert class="h-3.5 w-3.5 text-amber-500" aria-label="Over carrying capacity" />
            </Tooltip>
          </Show>
        </div>

        {/* Coins */}
        <div>
          <h2 class="font-semibold mb-2 text-sm flex items-center gap-2">
            <Coins class="h-4 w-4 text-primary" />
            Currency
          </h2>
          <div class="flex flex-wrap gap-2">
            {(["cp", "sp", "ep", "gp", "pp"] as const).map((denom) => (
              <div class="text-center space-y-1">
                <Label class="text-xs font-medium text-muted-foreground">{denom.toUpperCase()}</Label>
                <Show
                  when={!isReadOnly}
                  fallback={
                    <div class="h-11 w-16 flex items-center justify-center border rounded-md text-sm font-medium">
                      {props.character.coins?.[denom] ?? 0}
                    </div>
                  }
                >
                  <CurrencyInput
                    aria-label={`${denom.toUpperCase()} currency`}
                    min={0}
                    value={props.character.coins?.[denom] ?? 0}
                    onChange={(v) => {
                      const updated = { ...props.character, coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...props.character.coins, [denom]: v } }
                      props.onUpdate(updated)
                      saveCharacter(updated)
                    }}
                    onAtMin={() => {
                      const currentCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...props.character.coins }
                      const result = cascadeDecrement(currentCoins, denom)
                      if (result) {
                        const updated = { ...props.character, coins: result }
                        props.onUpdate(updated)
                        saveCharacter(updated)
                      }
                    }}
                  />
                </Show>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Magic Items */}
        <div data-sem="magic-items-section">
          <h2 class="font-semibold text-sm flex items-center gap-2 mb-2">
            <Gem class="h-4 w-4 text-primary" />
            Magic Items
          </h2>
          <div class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
            <span>{attunedCount()}/</span>
            <CalculatedValue
              label="attunement limit"
              editable={!isReadOnly}
              class="text-xs"
              {...attunementLimitField.binding()}
            />
            <span>attuned</span>
            <Show when={overAttunementLimit()}>
              <Tooltip content="Over attunement limit">
                <TriangleAlert class="h-3.5 w-3.5 text-amber-500" aria-label="Over attunement limit" />
              </Tooltip>
            </Show>
          </div>
          <Show when={magicItems().length > 0}>
            <div class="space-y-2">
              <For each={magicItems()}>
                {(item) => (
                  <div class="flex items-center justify-between border rounded-md px-3 py-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <Show when={!isReadOnly} fallback={<span class="font-medium text-sm">{item.name}</span>}>
                          <Checkbox
                            checked={item.equipped ?? false}
                            onChange={() => toggleEquipped(item.id)}
                            title="Toggle equipped"
                            aria-label={`Toggle equipped: ${item.name}`}
                            label={item.name}
                            labelClass="font-medium text-sm cursor-pointer select-none"
                          />
                        </Show>
                        <Show when={item.type && item.type !== "other"}>
                          <Badge variant="outline" class="text-xs capitalize">{item.type}</Badge>
                        </Show>
                        <Show when={item.rarity}>
                          <Badge variant="outline" class="text-xs capitalize">{item.rarity?.replace("-", " ")}</Badge>
                        </Show>
                        <Show when={item.requiresAttunement}>
                          <Show when={!isReadOnly}>
                            <Checkbox checked={item.attuned ?? false} onChange={() => toggleAttuned(item.id)} title="Toggle attuned" aria-label="Toggle attuned" />
                          </Show>
                          <Show when={item.attuned}>
                            <Badge variant="secondary" class="text-xs">Attuned</Badge>
                          </Show>
                        </Show>
                        <Show when={item.equipped}>
                          <Badge variant="secondary" class="text-xs">Equipped</Badge>
                        </Show>
                      </div>
                      <Show when={item.weaponStats}>
                        <p class="text-xs text-muted-foreground mt-1">
                          {item.weaponStats!.damage} {item.weaponStats!.damageType} · {item.weaponStats!.weaponRange}
                        </p>
                      </Show>
                      <Show when={item.armorStats}>
                        <p class="text-xs text-muted-foreground mt-1">
                          {item.armorStats!.armorType === "shield" ? "AC +2 · shield" : `AC ${item.armorStats!.baseAC} · ${item.armorStats!.armorType}`}
                        </p>
                      </Show>
                      <Show when={item.description}>
                        <p class="text-xs text-muted-foreground truncate">{item.description}</p>
                      </Show>
                      <Show when={item.modifiers}>
                        <div class={`text-xs mt-1 flex flex-wrap gap-x-2 gap-y-0.5 ${isItemModifierActive(item) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground italic"}`}>
                          <Show when={item.modifiers?.armorClass}>
                            <span>AC {formatModifier(item.modifiers!.armorClass!)}</span>
                          </Show>
                          <Show when={item.modifiers?.initiative}>
                            <span>Init {formatModifier(item.modifiers!.initiative!)}</span>
                          </Show>
                          <For each={Object.entries(item.modifiers?.savingThrows ?? {})}>
                            {([ability, bonus]) => <span>{ABILITY_LABELS[ability as keyof AbilityScores]} Save {formatModifier(bonus as number)}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScores ?? {})}>
                            {([ability, bonus]) => <span>{ABILITY_LABELS[ability as keyof AbilityScores]} {formatModifier(bonus as number)}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScoreFloors ?? {})}>
                            {([ability, floor]) => <span>{ABILITY_LABELS[ability as keyof AbilityScores]} floor {floor as number}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScoreMaxCaps ?? {})}>
                            {([ability, cap]) => <span>{ABILITY_LABELS[ability as keyof AbilityScores]} max {cap as number}</span>}
                          </For>
                          <Show when={(item.modifiers?.resistances?.length ?? 0) > 0}>
                            <span>Resist: {item.modifiers!.resistances!.join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.immunities?.length ?? 0) > 0}>
                            <span>Immune: {item.modifiers!.immunities!.join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.vulnerabilities?.length ?? 0) > 0}>
                            <span>Vulnerable: {item.modifiers!.vulnerabilities!.join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.conditionImmunities?.length ?? 0) > 0}>
                            <span>Condition Immune: {item.modifiers!.conditionImmunities!.join(", ")}</span>
                          </Show>
                          <For each={Object.entries(item.modifiers?.senses ?? {})}>
                            {([sense, ft]) => <span>{SENSE_LABELS[sense as SenseType]} +{ft as number} ft</span>}
                          </For>
                          <Show when={item.modifiers?.speed}>
                            <span>Speed {formatModifier(item.modifiers!.speed!)} ft</span>
                          </Show>
                          <Show when={item.modifiers?.flySpeed}>
                            <span>Fly {item.modifiers!.flySpeed!} ft</span>
                          </Show>
                          <Show when={item.modifiers?.swimSpeed}>
                            <span>Swim {item.modifiers!.swimSpeed!} ft</span>
                          </Show>
                          <Show when={item.modifiers?.climbSpeed}>
                            <span>Climb {item.modifiers!.climbSpeed!} ft</span>
                          </Show>
                          <Show when={item.modifiers?.burrowSpeed}>
                            <span>Burrow {item.modifiers!.burrowSpeed!} ft</span>
                          </Show>
                          <Show when={item.modifiers?.carryingCapacityBonus}>
                            <span>Capacity {formatModifier(item.modifiers!.carryingCapacityBonus!)} lbs</span>
                          </Show>
                          <Show when={item.modifiers?.carryingCapacityMultiplier}>
                            <span>Capacity x{item.modifiers!.carryingCapacityMultiplier!}</span>
                          </Show>
                          <Show when={(item.modifiers?.languages?.length ?? 0) > 0}>
                            <span>Languages: {item.modifiers!.languages!.join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.proficiencies?.length ?? 0) > 0}>
                            <span>Proficiencies: {item.modifiers!.proficiencies!.join(", ")}</span>
                          </Show>
                          <Show when={!isItemModifierActive(item)}>
                            <span>(inactive)</span>
                          </Show>
                        </div>
                      </Show>
                      <Show when={(item.maxUses ?? 0) > 0}>
                        <div class="mt-1">
                          <Show
                            when={(item.maxUses ?? 0) <= 5}
                            fallback={
                              <StepperInput
                                value={remainingUses(item.uses, item.maxUses)}
                                min={0}
                                max={item.maxUses!}
                                onChange={(v) => updateItemUses(item.id, spentFromRemaining(v, item.maxUses))}
                                readOnly={isReadOnly}
                              />
                            }
                          >
                            <PipTracker
                              total={item.maxUses!}
                              used={item.uses ?? 0}
                              onToggle={(v) => updateItemUses(item.id, v)}
                              usedTitle="Charge spent (click to restore)"
                              availableTitle="Charge available (click to use)"
                              readOnly={isReadOnly}
                            />
                          </Show>
                        </div>
                      </Show>
                    </div>
                    <Show when={!isReadOnly}>
                      <div class="flex items-center gap-1 shrink-0 ml-2">
                        <Tooltip content={`Edit ${item.name}`}>
                          <Button variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                            <Edit class="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={`Delete ${item.name}`}>
                          <Button variant="ghost" size="sm" aria-label={`Delete ${item.name}`} onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 class="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        <Separator />

        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            class="pl-10"
          />
        </div>

        <Show when={equippedItems().length > 0}>
          <div>
            <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Currently Equipped</h2>
            <div class="flex flex-wrap gap-1 mb-4">
              <For each={equippedItems()}>
                {(item) => (
                  <Badge variant="secondary" class="text-xs">
                    {item.name}{item.quantity > 1 && ` (${item.quantity})`}
                  </Badge>
                )}
              </For>
            </div>
            <Separator />
          </div>
        </Show>

        <div class="space-y-2">
          <Show
            when={filteredEquipment().length > 0}
            fallback={
              <div class="text-center py-8 text-muted-foreground">
                {searchTerm() ? "No items match your search." : "No equipment added yet."}
              </div>
            }
          >
            <For each={filteredEquipment()}>
              {(item) => (
                <div class="border rounded-lg p-3 space-y-2">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <div class="flex items-center gap-2">
                          <Show when={!isReadOnly}>
                            <Checkbox
                              checked={item.equipped || false}
                              onChange={() => toggleEquipped(item.id)}
                              title="Toggle equipped"
                              aria-label={`Toggle equipped: ${item.name}`}
                            />
                          </Show>
                          <h3
                            class={`font-medium ${isReadOnly ? "" : "cursor-pointer"}`}
                            onClick={() => !isReadOnly && toggleEquipped(item.id)}
                          >
                            {item.name}
                          </h3>
                        </div>
                        <Show when={item.type && item.type !== "other"}>
                          <Badge variant="outline" class="text-xs capitalize">{item.type}</Badge>
                        </Show>
                        <Show when={item.magic}>
                          <Badge variant="outline" class="text-xs gap-1">
                            <Gem class="h-3 w-3" />
                            Magic
                          </Badge>
                        </Show>
                        <Show when={item.equipped}>
                          <Badge variant="secondary" class="text-xs">Equipped</Badge>
                        </Show>
                      </div>
                      <Show when={item.weaponStats}>
                        <p class="text-xs text-muted-foreground mt-1">
                          {item.weaponStats!.damage} {item.weaponStats!.damageType} · {item.weaponStats!.weaponRange}
                        </p>
                      </Show>
                      <Show when={item.armorStats}>
                        <p class="text-xs text-muted-foreground mt-1">
                          {item.armorStats!.armorType === "shield" ? "AC +2 · shield" : `AC ${item.armorStats!.baseAC} · ${item.armorStats!.armorType}`}
                        </p>
                      </Show>
                      <Show when={item.description}>
                        <MarkdownContent text={item.description!} class="text-muted-foreground mt-1" />
                      </Show>
                    </div>
                    <Show when={!isReadOnly}>
                      <div class="flex items-center gap-2">
                        <Tooltip content={`Edit ${item.name}`}>
                          <Button variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                            <Edit class="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={`Delete ${item.name}`}>
                          <Button variant="ghost" size="sm" aria-label={`Delete ${item.name}`} onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 class="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </Show>
                  </div>

                  <div class="flex items-center justify-between text-sm text-muted-foreground">
                    <div class="flex items-center gap-4">
                      <div class="flex items-center gap-2">
                        <Label class="text-xs">Qty:</Label>
                        <Show
                          when={!isReadOnly}
                          fallback={<span class="w-8 text-center">{item.quantity}</span>}
                        >
                          <div class="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              class="h-6 w-6 p-0"
                            >
                              -
                            </Button>
                            <span class="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              class="h-6 w-6 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </Show>
                      </div>
                      <Show when={item.weight && item.weight > 0}>
                        <div>
                          Weight: {roundToOneDecimal((item.weight ?? 0) * item.quantity)} lbs
                          {item.quantity > 1 && ` (${item.weight} each)`}
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </CardContent>

      <Modal open={modalOpen()} onOpenChange={(open: boolean) => { if (!open) closeModal() }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{editingItem() ? "Edit Item" : "Add New Item"}</ModalTitle>
          </ModalHeader>
          <EquipmentForm
            initialData={currentFormData()}
            onSubmit={editingItem() ? handleUpdateItem : handleAddItem}
            onCancel={closeModal}
            editing={!!editingItem()}
          />
        </ModalContent>
      </Modal>
    </Card>
  )
}

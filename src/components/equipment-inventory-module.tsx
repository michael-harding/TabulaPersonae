import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { AbilityScores, Character, Equipment, ItemModifiers, ItemRarity } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { DAMAGE_TYPE_OPTIONS, BASE_ATTUNEMENT_LIMIT, remainingUses, spentFromRemaining, isItemModifierActive, formatModifier } from "@/lib/character-utils"
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
}

interface EquipmentFormProps {
  initialData: EquipmentFormData
  onSubmit: (data: EquipmentFormData) => void
  onCancel: () => void
  editing: boolean
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
  createEffect(on(() => props.initialData, (init) => setFormData(init)))

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
        <div class="space-y-3 border rounded-md p-3 bg-muted/30">
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
            <div>
              <Label class="text-xs">Saving Throw Bonuses</Label>
              <div class="grid grid-cols-3 gap-2 mt-1">
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
            </div>
            <div>
              <Label class="text-xs">Ability Score Bonuses</Label>
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
  const [prefillMagic, setPrefillMagic] = createSignal(false)

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

  const filteredEquipment = () =>
    safeEquipment().filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm().toLowerCase()),
    )
  const totalWeight = () => safeEquipment().reduce((total, item) => total + (item.weight || 0) * item.quantity, 0)
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
      }
    }
    return prefillMagic() ? { ...defaultEquipmentForm, magic: true } : defaultEquipmentForm
  }

  const openAdd = () => { setEditingItem(null); setPrefillMagic(false); setModalOpen(true) }
  const openAddMagic = () => { setEditingItem(null); setPrefillMagic(true); setModalOpen(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setModalOpen(true) }
  const closeModal = () => { setEditingItem(null); setPrefillMagic(false); setModalOpen(false) }

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
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-semibold text-sm flex items-center gap-2">
              <Gem class="h-4 w-4 text-primary" />
              Magic Items
            </h2>
            <Show when={!isReadOnly}>
              <Button variant="outline" size="sm" class="gap-1" onClick={openAddMagic}>
                <Plus class="h-3 w-3" />
                Add Magic Item
              </Button>
            </Show>
          </div>
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
                        <span class="font-medium text-sm">{item.name}</span>
                        <Show when={item.rarity}>
                          <Badge variant="outline" class="text-xs capitalize">{item.rarity?.replace("-", " ")}</Badge>
                        </Show>
                        <Show when={item.requiresAttunement}>
                          <Show when={!isReadOnly}>
                            <Checkbox checked={item.attuned ?? false} onChange={() => toggleAttuned(item.id)} title="Toggle attuned" />
                          </Show>
                          <Show when={item.attuned}>
                            <Badge variant="secondary" class="text-xs">Attuned</Badge>
                          </Show>
                        </Show>
                      </div>
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
                        <label class="flex items-center gap-2 cursor-pointer">
                          <Show when={!isReadOnly}>
                            <Checkbox
                              checked={item.equipped || false}
                              onChange={() => toggleEquipped(item.id)}
                              title="Toggle equipped"
                            />
                          </Show>
                          <h3 class="font-medium">{item.name}</h3>
                        </label>
                        <Show when={item.equipped}>
                          <Badge variant="secondary" class="text-xs">Equipped</Badge>
                        </Show>
                        <Show when={item.type && item.type !== "other"}>
                          <Badge variant="outline" class="text-xs capitalize">{item.type}</Badge>
                        </Show>
                        <Show when={item.magic}>
                          <Badge variant="outline" class="text-xs gap-1">
                            <Gem class="h-3 w-3" />
                            Magic
                          </Badge>
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
                          Weight: {(item.weight ?? 0) * item.quantity} lbs
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
            <ModalTitle>{editingItem() ? "Edit Item" : prefillMagic() ? "Add Magic Item" : "Add New Item"}</ModalTitle>
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

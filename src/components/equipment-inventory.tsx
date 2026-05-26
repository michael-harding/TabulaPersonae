import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { Character, Equipment, MagicItem } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { DAMAGE_TYPE_OPTIONS } from "@/lib/character-utils"
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
import Package from "lucide-solid/icons/package"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Save from "lucide-solid/icons/save"
import Search from "lucide-solid/icons/search"
import Scale from "lucide-solid/icons/scale"
import Gem from "lucide-solid/icons/gem"
import Coins from "lucide-solid/icons/coins"

interface EquipmentInventoryProps {
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
}

const defaultEquipmentForm: EquipmentFormData = {
  name: "",
  quantity: 1,
  weight: 0,
  description: "",
  equipped: false,
  type: "other",
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

interface MagicItemFormData {
  name: string
  description: string
  attuned: boolean
}

const defaultMagicItemForm: MagicItemFormData = {
  name: "",
  description: "",
  attuned: false,
}

interface MagicItemFormProps {
  initialData: MagicItemFormData
  onSubmit: (data: MagicItemFormData) => void
  onCancel: () => void
  editing: boolean
  attunedCount: number
}

function MagicItemForm(props: MagicItemFormProps) {
  const [formData, setFormData] = createSignal<MagicItemFormData>(props.initialData)
  createEffect(on(() => props.initialData, (init) => setFormData(init)))

  const attunedDisabled = () => !formData().attuned && props.attunedCount >= 3

  return (
    <div class="space-y-4">
      <div>
        <Label for="magic-item-name">Item Name</Label>
        <Input
          id="magic-item-name"
          value={formData().name}
          onInput={(e) => setFormData((prev) => ({ ...prev, name: e.currentTarget.value }))}
          placeholder="Enter item name"
        />
      </div>

      <div>
        <Label for="magic-item-description">Description</Label>
        <Textarea
          id="magic-item-description"
          value={formData().description}
          onInput={(e) => setFormData((prev) => ({ ...prev, description: e.currentTarget.value }))}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <Tooltip content={attunedDisabled() ? "Maximum 3 attuned items" : undefined}>
        <div class="flex items-center gap-2">
          <Checkbox
            id="magic-item-attuned"
            checked={formData().attuned}
            disabled={attunedDisabled()}
            onChange={(checked: boolean) => setFormData((prev) => ({ ...prev, attuned: checked }))}
          />
          <Label for="magic-item-attuned" class={attunedDisabled() ? "opacity-50" : ""}>Attuned</Label>
        </div>
      </Tooltip>

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

export function EquipmentInventory(props: EquipmentInventoryProps) {
  const [searchTerm, setSearchTerm] = createSignal("")
  const [modalOpen, setModalOpen] = createSignal(false)
  const [editingItem, setEditingItem] = createSignal<Equipment | null>(null)
  const [magicModalOpen, setMagicModalOpen] = createSignal(false)
  const [editingMagicItem, setEditingMagicItem] = createSignal<MagicItem | null>(null)

  const safeEquipment = () => props.character.equipment || []
  const safeMagicItems = () => props.character.magicItems ?? []
  const attunedCount = () => safeMagicItems().filter((i) => i.attuned).length

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
      }
    }
    return defaultEquipmentForm
  }

  const currentMagicFormData = (): MagicItemFormData => {
    const item = editingMagicItem()
    if (item) {
      return { name: item.name, description: item.description || "", attuned: item.attuned }
    }
    return defaultMagicItemForm
  }

  const openAdd = () => { setEditingItem(null); setModalOpen(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setModalOpen(true) }
  const closeModal = () => { setEditingItem(null); setModalOpen(false) }

  const openAddMagic = () => { setEditingMagicItem(null); setMagicModalOpen(true) }
  const openEditMagic = (item: MagicItem) => { setEditingMagicItem(item); setMagicModalOpen(true) }
  const closeMagicModal = () => { setEditingMagicItem(null); setMagicModalOpen(false) }

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

  const handleAddMagicItem = (formData: MagicItemFormData) => {
    if (!formData.name.trim()) return
    const newItem: MagicItem = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      attuned: formData.attuned,
    }
    const updated = { ...props.character, magicItems: [...safeMagicItems(), newItem] }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeMagicModal()
  }

  const handleUpdateMagicItem = (formData: MagicItemFormData) => {
    const item = editingMagicItem()
    if (!item || !formData.name.trim()) return
    const updatedItem: MagicItem = {
      ...item,
      name: formData.name.trim(),
      description: formData.description.trim(),
      attuned: formData.attuned,
    }
    const updated = {
      ...props.character,
      magicItems: safeMagicItems().map((i) => (i.id === item.id ? updatedItem : i)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeMagicModal()
  }

  const handleDeleteMagicItem = (itemId: string) => {
    const updated = { ...props.character, magicItems: safeMagicItems().filter((i) => i.id !== itemId) }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  return (
    <Card>
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
            <Button size="sm" class="gap-2" onClick={openAdd}>
              <Plus class="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {/* Coins */}
        <div>
          <h3 class="font-semibold mb-2 text-sm flex items-center gap-2">
            <Coins class="h-4 w-4 text-primary" />
            Currency
          </h3>
          <div class="flex flex-wrap gap-2">
            {(["cp", "sp", "ep", "gp", "pp"] as const).map((denom) => (
              <div class="text-center space-y-1">
                <Label class="text-xs font-medium text-muted-foreground">{denom.toUpperCase()}</Label>
                <CurrencyInput
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
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Magic Items */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm flex items-center gap-2">
              <Gem class="h-4 w-4 text-primary" />
              Magic Items
              <span class="text-xs text-muted-foreground font-normal">({attunedCount()}/3 attuned)</span>
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={openAddMagic}>
              <Plus class="h-3 w-3" />
              Add Magic Item
            </Button>
          </div>
          <Show when={safeMagicItems().length > 0}>
            <div class="space-y-2">
              <For each={safeMagicItems()}>
                {(item) => (
                  <div class="flex items-center justify-between border rounded-md px-3 py-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm">{item.name}</span>
                        <Show when={item.attuned}>
                          <Badge variant="secondary" class="text-xs">Attuned</Badge>
                        </Show>
                      </div>
                      <Show when={item.description}>
                        <p class="text-xs text-muted-foreground truncate">{item.description}</p>
                      </Show>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ml-2">
                      <Tooltip content={`Edit ${item.name}`}>
                        <Button variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEditMagic(item)}>
                          <Edit class="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={`Delete ${item.name}`}>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${item.name}`} onClick={() => handleDeleteMagicItem(item.id)}>
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
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
            <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Currently Equipped</h3>
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
                          <Checkbox
                            checked={item.equipped || false}
                            onChange={() => toggleEquipped(item.id)}
                            title="Toggle equipped"
                          />
                          <h4 class="font-medium">{item.name}</h4>
                        </label>
                        <Show when={item.equipped}>
                          <Badge variant="secondary" class="text-xs">Equipped</Badge>
                        </Show>
                        <Show when={item.type && item.type !== "other"}>
                          <Badge variant="outline" class="text-xs capitalize">{item.type}</Badge>
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
                        <p class="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </Show>
                    </div>
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
                  </div>

                  <div class="flex items-center justify-between text-sm text-muted-foreground">
                    <div class="flex items-center gap-4">
                      <div class="flex items-center gap-2">
                        <Label class="text-xs">Qty:</Label>
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

      <Modal open={magicModalOpen()} onOpenChange={(open: boolean) => { if (!open) closeMagicModal() }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{editingMagicItem() ? "Edit Magic Item" : "Add Magic Item"}</ModalTitle>
          </ModalHeader>
          <MagicItemForm
            initialData={currentMagicFormData()}
            onSubmit={editingMagicItem() ? handleUpdateMagicItem : handleAddMagicItem}
            onCancel={closeMagicModal}
            editing={!!editingMagicItem()}
            attunedCount={attunedCount()}
          />
        </ModalContent>
      </Modal>
    </Card>
  )
}

import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { Character, Equipment } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import Package from "lucide-solid/icons/package"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Save from "lucide-solid/icons/save"
import Search from "lucide-solid/icons/search"
import Scale from "lucide-solid/icons/scale"

interface EquipmentInventoryProps {
  character: Character
  onUpdate: (character: Character) => void
}

interface EquipmentFormData {
  name: string
  quantity: number
  weight: number
  description: string
  equipped: boolean
}

const defaultEquipmentForm: EquipmentFormData = {
  name: "",
  quantity: 1,
  weight: 0,
  description: "",
  equipped: false,
}

interface EquipmentFormProps {
  initialData: EquipmentFormData
  onSubmit: (data: EquipmentFormData) => void
  onCancel: () => void
  editing: boolean
}

function EquipmentForm(props: EquipmentFormProps) {
  const [formData, setFormData] = createSignal<EquipmentFormData>(props.initialData)
  createEffect(on(() => props.initialData, (init) => setFormData(init)))

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

export function EquipmentInventory(props: EquipmentInventoryProps) {
  const [searchTerm, setSearchTerm] = createSignal("")
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [editingItem, setEditingItem] = createSignal<Equipment | null>(null)

  const safeEquipment = () => props.character.equipment || []
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
      return { name: item.name, quantity: item.quantity, weight: item.weight || 0, description: item.description || "", equipped: item.equipped || false }
    }
    return defaultEquipmentForm
  }

  const openAdd = () => { setEditingItem(null); setDialogOpen(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setDialogOpen(true) }
  const closeDialog = () => { setEditingItem(null); setDialogOpen(false) }

  const handleAddItem = (formData: EquipmentFormData) => {
    if (!formData.name.trim()) return
    const newItem: Equipment = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      quantity: formData.quantity,
      weight: formData.weight,
      description: formData.description.trim(),
      equipped: formData.equipped,
      type: "other",
    }
    const updated = { ...props.character, equipment: [...safeEquipment(), newItem] }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeDialog()
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
      type: item.type || "other",
    }
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((e) => (e.id === item.id ? updatedItem : e)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
    closeDialog()
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
                      <div class="flex items-center gap-2">
                        <Checkbox
                          checked={item.equipped || false}
                          onChange={() => toggleEquipped(item.id)}
                          title="Toggle equipped"
                        />
                        <h4 class="font-medium">{item.name}</h4>
                        <Show when={item.equipped}>
                          <Badge variant="secondary" class="text-xs">Equipped</Badge>
                        </Show>
                      </div>
                      <Show when={item.description}>
                        <p class="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </Show>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                        <Edit class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 class="h-4 w-4" />
                      </Button>
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

      <Dialog open={dialogOpen()} onOpenChange={(open: boolean) => { if (!open) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem() ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            initialData={currentFormData()}
            onSubmit={editingItem() ? handleUpdateItem : handleAddItem}
            onCancel={closeDialog}
            editing={!!editingItem()}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

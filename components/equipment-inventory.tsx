"use client"

import { useState } from "react"
import type { Character, Equipment } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Package, Plus, Edit, Trash2, Save, Search, Scale } from "lucide-react"

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

export function EquipmentInventory({ character, onUpdate }: EquipmentInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState<EquipmentFormData>(defaultEquipmentForm)

  const safeEquipment = character.equipment || []

  const filteredEquipment = safeEquipment.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalWeight = safeEquipment.reduce((total, item) => total + (item.weight || 0) * item.quantity, 0)
  const equippedItems = safeEquipment.filter((item) => item.equipped)

  const handleAddItem = () => {
    if (!formData.name.trim()) return

    const newItem: Equipment = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      quantity: formData.quantity,
      weight: formData.weight,
      description: formData.description.trim(),
      equipped: formData.equipped,
      type: "other"
    }

    const updated = {
      ...character,
      equipment: [...safeEquipment, newItem],
    }
    onUpdate(updated)
    saveCharacter(updated)

    setFormData(defaultEquipmentForm)
    setIsAddDialogOpen(false)
  }

  const handleEditItem = (item: Equipment) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      quantity: item.quantity,
      weight: item.weight || 0,
      description: item.description || "",
      equipped: item.equipped || false,
    })
  }

  const handleUpdateItem = () => {
    if (!editingItem || !formData.name.trim()) return

    const updatedItem: Equipment = {
      ...editingItem,
      name: formData.name.trim(),
      quantity: formData.quantity,
      weight: formData.weight,
      description: formData.description.trim(),
      equipped: formData.equipped,
      type: editingItem.type || "other"
    }

    const updated = {
      ...character,
      equipment: safeEquipment.map((item) => (item.id === editingItem.id ? updatedItem : item)),
    }
    onUpdate(updated)
    saveCharacter(updated)

    setEditingItem(null)
    setFormData(defaultEquipmentForm)
  }

  const handleDeleteItem = (itemId: string) => {
    const updated = {
      ...character,
      equipment: safeEquipment.filter((item) => item.id !== itemId),
    }
    onUpdate(updated)
    saveCharacter(updated)
  }

  const toggleEquipped = (itemId: string) => {
    const updated = {
      ...character,
      equipment: safeEquipment.map((item) => (item.id === itemId ? { ...item, equipped: !item.equipped } : item)),
    }
    onUpdate(updated)
    saveCharacter(updated)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return

    const updated = {
      ...character,
      equipment: safeEquipment.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    }
    onUpdate(updated)
    saveCharacter(updated)
  }

  const EquipmentForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="item-name">Item Name</Label>
        <Input
          id="item-name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter item name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <Label htmlFor="weight">Weight (lbs)</Label>
          <Input
            id="weight"
            type="number"
            min="0"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData((prev) => ({ ...prev, weight: Number.parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="equipped"
          checked={formData.equipped}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, equipped: !!checked }))}
        />
        <Label htmlFor="equipped">Currently equipped</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={editingItem ? handleUpdateItem : handleAddItem} className="gap-2">
          <Save className="h-4 w-4" />
          {editingItem ? "Update Item" : "Add Item"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setEditingItem(null)
            setFormData(defaultEquipmentForm)
            setIsAddDialogOpen(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Equipment & Inventory
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Scale className="h-3 w-3" />
              {totalWeight} lbs
            </Badge>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                </DialogHeader>
                <EquipmentForm />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Equipped Items Summary */}
        {equippedItems.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Currently Equipped</h3>
            <div className="flex flex-wrap gap-1 mb-4">
              {equippedItems.map((item) => (
                <Badge key={item.id} variant="secondary" className="text-xs">
                  {item.name}
                  {item.quantity > 1 && ` (${item.quantity})`}
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Equipment List */}
        <div className="space-y-2">
          {filteredEquipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No items match your search." : "No equipment added yet."}
            </div>
          ) : (
            filteredEquipment.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={item.equipped || false}
                        onCheckedChange={() => toggleEquipped(item.id)}
                        title="Toggle equipped"
                      />
                      <h4 className="font-medium">{item.name}</h4>
                      {item.equipped && (
                        <Badge variant="secondary" className="text-xs">
                          Equipped
                        </Badge>
                      )}
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Qty:</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-6 w-6 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    {item.weight && item.weight > 0 && (
                      <div>
                        Weight: {item.weight * item.quantity} lbs
                        {item.quantity > 1 && ` (${item.weight} each)`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <EquipmentForm />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import type { Character, Spell } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier } from "@/lib/character-utils"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sparkles, Plus, Edit, Trash2, Save, Search, ChevronDown, Zap, Target, Circle, Dot, Settings } from "lucide-react"

interface SpellsSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}

interface SpellFormData {
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  prepared: boolean
}

const defaultSpellForm: SpellFormData = {
  name: "",
  level: 0,
  school: "Evocation",
  castingTime: "1 action",
  range: "Touch",
  components: "V, S",
  duration: "Instantaneous",
  description: "",
  prepared: false,
}

const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
]

const SPELL_LEVELS = [
  { value: 0, label: "Cantrip" },
  { value: 1, label: "1st Level" },
  { value: 2, label: "2nd Level" },
  { value: 3, label: "3rd Level" },
  { value: 4, label: "4th Level" },
  { value: 5, label: "5th Level" },
  { value: 6, label: "6th Level" },
  { value: 7, label: "7th Level" },
  { value: 8, label: "8th Level" },
  { value: 9, label: "9th Level" },
]

const CASTING_TIMES = [
  "1 action",
  "1 bonus action",
  "1 reaction",
  "1 minute",
  "10 minutes",
  "1 hour",
  "8 hours",
  "24 hours",
]

export function SpellsSection({ character, onUpdate }: SpellsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null)
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0]))
  const [isSpellSlotsDialogOpen, setIsSpellSlotsDialogOpen] = useState(false)

  // Update local state when character changes
  useEffect(() => {
    // Reset any local state when character changes
  }, [character.id])

  const safeSpells = character.spells || []

  const filteredSpells = safeSpells.filter(
    (spell) =>
      spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spell.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spell.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const spellsByLevel = SPELL_LEVELS.reduce(
    (acc, level) => {
      acc[level.value] = filteredSpells.filter((spell) => spell.level === level.value)
      return acc
    },
    {} as Record<number, Spell[]>,
  )

  const preparedSpells = safeSpells.filter((spell) => spell.prepared && spell.level > 0)
  const spellSaveDC = getSpellSaveDC(character)
  const spellAttackBonus = getSpellAttackBonus(character)

  const handleAddSpell = (formData: SpellFormData) => {
    if (!formData.name.trim()) return

    const newSpell: Spell = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      level: formData.level,
      school: formData.school,
      castingTime: formData.castingTime,
      range: formData.range,
      components: formData.components,
      duration: formData.duration,
      description: formData.description.trim(),
      prepared: formData.prepared,
    }

    const updated = {
      ...character,
      spells: [...safeSpells, newSpell],
    }
    onUpdate(updated)
    setIsAddDialogOpen(false)
  }

  const handleEditSpell = (spell: Spell) => {
    setEditingSpell(spell)
    setIsAddDialogOpen(false)
  }

  const handleUpdateSpell = (formData: SpellFormData) => {
    if (!editingSpell || !formData.name.trim()) return

    const updatedSpell: Spell = {
      ...editingSpell,
      name: formData.name.trim(),
      level: formData.level,
      school: formData.school,
      castingTime: formData.castingTime,
      range: formData.range,
      components: formData.components,
      duration: formData.duration,
      description: formData.description.trim(),
      prepared: formData.prepared,
    }

    const updated = {
      ...character,
      spells: safeSpells.map((spell) => (spell.id === editingSpell.id ? updatedSpell : spell)),
    }
    onUpdate(updated)
    setEditingSpell(null)
  }

  const handleDeleteSpell = (spellId: string) => {
    const updated = {
      ...character,
      spells: safeSpells.filter((spell) => spell.id !== spellId),
    }
    onUpdate(updated)
  }

  const togglePrepared = (spellId: string) => {
    const updated = {
      ...character,
      spells: safeSpells.map((spell) => (spell.id === spellId ? { ...spell, prepared: !spell.prepared } : spell)),
    }
    onUpdate(updated)
  }

  const updateSpellSlots = (level: number, field: 'total' | 'used', value: number) => {
    const updated = {
      ...character,
      spellSlots: {
        ...character.spellSlots,
        [level]: {
          ...character.spellSlots[level as keyof typeof character.spellSlots],
          [field]: Math.max(0, value)
        }
      }
    }
    onUpdate(updated)
  }

  const toggleSpellSlot = (level: number, index: number) => {
    const currentSlots = character.spellSlots[level as keyof typeof character.spellSlots]
    const newUsed = index < currentSlots.used ? currentSlots.used - 1 : index + 1
    updateSpellSlots(level, 'used', Math.min(newUsed, currentSlots.total))
  }

  const getOrdinalSuffix = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = num % 100
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
  }

  const toggleLevelExpanded = (level: number) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }


function SpellForm({
  initialData,
  onSubmit,
  onCancel,
  editing
}: {
  initialData: SpellFormData,
  onSubmit: (data: SpellFormData) => void,
  onCancel: () => void,
  editing: boolean
}) {
  const [formData, setFormData] = React.useState<SpellFormData>(initialData)

  React.useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="spell-name">Spell Name</Label>
        <Input
          id="spell-name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter spell name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="spell-level">Level</Label>
          <Select
            value={formData.level.toString()}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, level: Number.parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPELL_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value.toString()}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="spell-school">School</Label>
          <Select
            value={formData.school}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, school: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPELL_SCHOOLS.map((school) => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="casting-time">Casting Time</Label>
          <Select
            value={formData.castingTime}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, castingTime: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASTING_TIMES.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="range">Range</Label>
          <Input
            id="range"
            value={formData.range}
            onChange={(e) => setFormData((prev) => ({ ...prev, range: e.target.value }))}
            placeholder="Touch"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="components">Components</Label>
          <Input
            id="components"
            value={formData.components}
            onChange={(e) => setFormData((prev) => ({ ...prev, components: e.target.value }))}
            placeholder="V, S, M"
          />
        </div>
        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
            placeholder="Instantaneous"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Spell description and effects"
          rows={4}
        />
      </div>

      {formData.level > 0 && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="prepared"
            checked={formData.prepared}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, prepared: !!checked }))}
          />
          <Label htmlFor="prepared">Prepared</Label>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={() => onSubmit(formData)} className="gap-2">
          <Save className="h-4 w-4" />
          {editing ? "Update Spell" : "Add Spell"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Spells
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Spell
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Spell</DialogTitle>
              </DialogHeader>
              <SpellForm
                initialData={defaultSpellForm}
                onSubmit={handleAddSpell}
                onCancel={() => setIsAddDialogOpen(false)}
                editing={false}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spellcasting Stats */}
        {safeSpells.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Spell Save DC</span>
              </div>
              <div className="text-2xl font-bold text-primary">{spellSaveDC}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Spell Attack</span>
              </div>
              <div className="text-2xl font-bold text-primary">{formatModifier(spellAttackBonus)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-1">Prepared Spells</div>
              <div className="text-2xl font-bold text-primary">{preparedSpells.length}</div>
            </div>
          </div>
        )}

        {/* Spell Slots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Circle className="h-5 w-5 text-primary" />
              Spell Slots
            </h3>
            <Dialog open={isSpellSlotsDialogOpen} onOpenChange={setIsSpellSlotsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Settings className="h-3 w-3" />
                  Edit Slots
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Spell Slots</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                      const slots = character.spellSlots[level as keyof typeof character.spellSlots]

                      return (
                        <div key={level} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">Level {level}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              value={slots.total}
                              onChange={(e) => updateSpellSlots(level, 'total', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center"
                              title="Total slots"
                            />
                            <span className="text-sm text-muted-foreground">slots</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Spell Slot Toggles in Compact Flow */}
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
              const slots = character.spellSlots[level as keyof typeof character.spellSlots]
              if (slots.total === 0) return null

              return (
                <div key={level} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="font-medium text-xs text-muted-foreground">
                    {getOrdinalSuffix(level)}
                  </span>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: slots.total }, (_, index) => (
                      <button
                        key={index}
                        onClick={() => toggleSpellSlot(level, index)}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          index < slots.used
                            ? 'bg-muted border-muted-foreground'
                            : 'bg-primary border-primary hover:bg-primary/80'
                        }`}
                        title={index < slots.used ? 'Used slot (click to restore)' : 'Available slot (click to use)'}
                      >
                        {index < slots.used ? (
                          <span className="sr-only">Used</span>
                        ) : (
                          <Dot className="h-3 w-3 text-primary-foreground mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show message if no spell slots */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].every(level =>
            character.spellSlots[level as keyof typeof character.spellSlots].total === 0
          ) && (
            <div className="text-center py-4 text-muted-foreground">
              <p>No spell slots configured.</p>
              <p className="text-sm">Click "Edit Slots" to add spell slots for your character.</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search spells..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Spells by Level */}
        <div className="space-y-2">
          {safeSpells.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No spells added yet. Add your first spell to get started!
            </div>
          ) : (
            SPELL_LEVELS.map((level) => {
              const levelSpells = spellsByLevel[level.value]
              if (levelSpells.length === 0 && !searchTerm) return null

              return (
                <Collapsible
                  key={level.value}
                  open={expandedLevels.has(level.value)}
                  onOpenChange={() => toggleLevelExpanded(level.value)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{level.label}</span>
                        <Badge variant="secondary">{levelSpells.length}</Badge>
                        {level.value > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {levelSpells.filter((s) => s.prepared).length} prepared
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {levelSpells.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No {level.label.toLowerCase()} spells match your search.
                      </div>
                    ) : (
                      levelSpells.map((spell) => (
                        <div key={spell.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {spell.level > 0 && (
                                  <Checkbox
                                    checked={spell.prepared || false}
                                    onCheckedChange={() => togglePrepared(spell.id)}
                                    title="Toggle prepared"
                                  />
                                )}
                                <h4 className="font-medium">{spell.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {spell.school}
                                </Badge>
                                {spell.prepared && (
                                  <Badge variant="secondary" className="text-xs">
                                    Prepared
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                                <div>
                                  <span className="font-medium">Time:</span> {spell.castingTime}
                                </div>
                                <div>
                                  <span className="font-medium">Range:</span> {spell.range}
                                </div>
                                <div>
                                  <span className="font-medium">Components:</span> {spell.components}
                                </div>
                                <div>
                                  <span className="font-medium">Duration:</span> {spell.duration}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{spell.description}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button variant="ghost" size="sm" onClick={() => handleEditSpell(spell)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSpell(spell.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingSpell} onOpenChange={(open) => !open && setEditingSpell(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Spell</DialogTitle>
            </DialogHeader>
            <SpellForm
              initialData={editingSpell ? {
                name: editingSpell.name,
                level: editingSpell.level,
                school: editingSpell.school,
                castingTime: editingSpell.castingTime,
                range: editingSpell.range,
                components: editingSpell.components,
                duration: editingSpell.duration,
                description: editingSpell.description,
                prepared: editingSpell.prepared || false,
              } : defaultSpellForm}
              onSubmit={handleUpdateSpell}
              onCancel={() => setEditingSpell(null)}
              editing={!!editingSpell}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

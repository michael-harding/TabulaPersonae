import { createSignal, For, Show } from "solid-js"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Sparkles from "lucide-solid/icons/sparkles"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Save from "lucide-solid/icons/save"
import Search from "lucide-solid/icons/search"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Zap from "lucide-solid/icons/zap"
import Target from "lucide-solid/icons/target"
import Circle from "lucide-solid/icons/circle"
import Dot from "lucide-solid/icons/dot"
import Settings from "lucide-solid/icons/settings"

interface SpellFormData {
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  damage?: string
  attackSave?: string
  regain?: string
  description: string
  prepared: boolean
}

interface SpellsSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}

const SPELL_SCHOOLS = ["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"]

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

const CASTING_TIMES = ["1 action","1 bonus action","1 reaction","1 minute","10 minutes","1 hour","8 hours","24 hours"]

const defaultSpellForm: SpellFormData = {
  name: "",
  level: 0,
  school: "Evocation",
  castingTime: "1 action",
  range: "Touch",
  components: "V, S",
  duration: "Instantaneous",
  damage: "",
  attackSave: "",
  description: "",
  prepared: false,
  regain: "",
}

interface SpellFormProps {
  initialData: SpellFormData
  onSubmit: (data: SpellFormData) => void
  onCancel: () => void
  editing: boolean
}

function SpellForm(props: SpellFormProps) {
  const [formData, setFormData] = createSignal<SpellFormData>(props.initialData)

  return (
    <div class="space-y-4">
      <div>
        <Label for="spell-name">Spell Name</Label>
        <Input id="spell-name" value={formData().name} onInput={(e) => setFormData((p) => ({ ...p, name: e.currentTarget.value }))} placeholder="e.g. Fireball" />
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div>
          <Label for="regain">Regain</Label>
          <Input id="regain" value={formData().regain || ""} onInput={(e) => setFormData((p) => ({ ...p, regain: e.currentTarget.value }))} placeholder="e.g. Long Rest" />
        </div>
        <div>
          <Label for="spell-damage">Damage</Label>
          <Input id="spell-damage" value={formData().damage || ""} onInput={(e) => setFormData((p) => ({ ...p, damage: e.currentTarget.value }))} placeholder="e.g. 1d8+3 fire" />
        </div>
        <div>
          <Label for="attack-save">Attack/Save</Label>
          <Input id="attack-save" value={formData().attackSave || ""} onInput={(e) => setFormData((p) => ({ ...p, attackSave: e.currentTarget.value }))} placeholder="e.g. Dex Save" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="spell-level">Level</Label>
          <Select value={formData().level.toString()} onValueChange={(v: string) => setFormData((p) => ({ ...p, level: parseInt(v) }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <For each={SPELL_LEVELS}>{(level) => <SelectItem value={level.value.toString()}>{level.label}</SelectItem>}</For>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label for="spell-school">School</Label>
          <Select value={formData().school} onValueChange={(v: string) => setFormData((p) => ({ ...p, school: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <For each={SPELL_SCHOOLS}>{(school) => <SelectItem value={school}>{school}</SelectItem>}</For>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="casting-time">Casting Time</Label>
          <Select value={formData().castingTime} onValueChange={(v: string) => setFormData((p) => ({ ...p, castingTime: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <For each={CASTING_TIMES}>{(time) => <SelectItem value={time}>{time}</SelectItem>}</For>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label for="range">Range</Label>
          <Input id="range" value={formData().range} onInput={(e) => setFormData((p) => ({ ...p, range: e.currentTarget.value }))} placeholder="Touch" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="components">Components</Label>
          <Input id="components" value={formData().components} onInput={(e) => setFormData((p) => ({ ...p, components: e.currentTarget.value }))} placeholder="V, S, M" />
        </div>
        <div>
          <Label for="duration">Duration</Label>
          <Input id="duration" value={formData().duration} onInput={(e) => setFormData((p) => ({ ...p, duration: e.currentTarget.value }))} placeholder="Instantaneous" />
        </div>
      </div>

      <div>
        <Label for="description">Description</Label>
        <Textarea id="description" value={formData().description} onInput={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))} placeholder="Spell description and effects" rows={4} />
      </div>

      <Show when={formData().level > 0}>
        <div class="flex items-center space-x-2">
          <Checkbox
            id="prepared"
            checked={formData().prepared}
            onChange={(checked: boolean) => setFormData((p) => ({ ...p, prepared: checked }))}
          />
          <Label for="prepared">Prepared</Label>
        </div>
      </Show>

      <div class="flex gap-2 pt-4">
        <Button onClick={() => props.onSubmit(formData())} class="gap-2">
          <Save class="h-4 w-4" />
          {props.editing ? "Update Spell" : "Add Spell"}
        </Button>
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

export function SpellsSection(props: SpellsSectionProps) {
  const [searchTerm, setSearchTerm] = createSignal("")
  const [isAddDialogOpen, setIsAddDialogOpen] = createSignal(false)
  const [editingSpell, setEditingSpell] = createSignal<Spell | null>(null)
  const [expandedLevels, setExpandedLevels] = createSignal<Set<number>>(new Set([0]))
  const [isSpellSlotsDialogOpen, setIsSpellSlotsDialogOpen] = createSignal(false)

  const safeSpells = () => props.character.spells || []
  const filteredSpells = () =>
    safeSpells().filter(
      (spell) =>
        spell.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
        spell.school.toLowerCase().includes(searchTerm().toLowerCase()) ||
        spell.description.toLowerCase().includes(searchTerm().toLowerCase()),
    )

  const spellsByLevel = (levelValue: number) => filteredSpells().filter((spell) => spell.level === levelValue)
  const preparedSpells = () => safeSpells().filter((spell) => spell.prepared && spell.level > 0)
  const spellSaveDC = () => getSpellSaveDC(props.character)
  const spellAttackBonus = () => getSpellAttackBonus(props.character)

  const getOrdinalSuffix = (num: number): string => {
    const suffixes = ["th", "st", "nd", "rd"]
    const v = num % 100
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
  }

  const toggleLevelExpanded = (level: number, isOpen: boolean) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev)
      if (isOpen) newSet.add(level)
      else newSet.delete(level)
      return newSet
    })
  }

  const updateSpellSlots = (level: number, field: "total" | "used", value: number) => {
    const updated = {
      ...props.character,
      spellSlots: {
        ...props.character.spellSlots,
        [level]: {
          ...props.character.spellSlots[level as keyof typeof props.character.spellSlots],
          [field]: Math.max(0, value),
        },
      },
    }
    props.onUpdate(updated)
  }

  const castSpell = (level: number) => {
    const slots = props.character.spellSlots[level as keyof typeof props.character.spellSlots]
    if (!slots || slots.used >= slots.total) return
    updateSpellSlots(level, "used", slots.used + 1)
  }

  const toggleSpellSlot = (level: number, index: number) => {
    const currentSlots = props.character.spellSlots[level as keyof typeof props.character.spellSlots]
    const newUsed = index < currentSlots.used ? currentSlots.used - 1 : index + 1
    updateSpellSlots(level, "used", Math.min(newUsed, currentSlots.total))
  }

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
      damage: formData.damage,
      attackSave: formData.attackSave,
      regain: formData.regain,
    }
    const updated = { ...props.character, spells: [...safeSpells(), newSpell] }
    props.onUpdate(updated)
    saveCharacter(updated)
    setIsAddDialogOpen(false)
  }

  const handleUpdateSpell = (formData: SpellFormData) => {
    const spell = editingSpell()
    if (!spell || !formData.name.trim()) return
    const updatedSpell: Spell = {
      ...spell,
      name: formData.name.trim(),
      level: formData.level,
      school: formData.school,
      castingTime: formData.castingTime,
      range: formData.range,
      components: formData.components,
      duration: formData.duration,
      description: formData.description.trim(),
      prepared: formData.prepared,
      damage: formData.damage,
      attackSave: formData.attackSave,
      regain: formData.regain,
    }
    const updated = { ...props.character, spells: safeSpells().map((s) => (s.id === spell.id ? updatedSpell : s)) }
    props.onUpdate(updated)
    saveCharacter(updated)
    setEditingSpell(null)
  }

  const handleDeleteSpell = (spellId: string) => {
    const updated = { ...props.character, spells: safeSpells().filter((spell) => spell.id !== spellId) }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const togglePrepared = (spellId: string) => {
    const updated = {
      ...props.character,
      spells: safeSpells().map((spell) => (spell.id === spellId ? { ...spell, prepared: !spell.prepared } : spell)),
    }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const editSpellData = (): SpellFormData => {
    const spell = editingSpell()
    if (!spell) return defaultSpellForm
    return {
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      damage: spell.damage || "",
      attackSave: spell.attackSave || "",
      description: spell.description,
      prepared: spell.prepared || false,
      regain: spell.regain || "",
    }
  }

  const allSlotsEmpty = () => [1,2,3,4,5,6,7,8,9].every(
    (level) => props.character.spellSlots[level as keyof typeof props.character.spellSlots].total === 0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Sparkles class="h-5 w-5 text-primary" />
            Spells
          </div>
          <Button size="sm" class="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus class="h-4 w-4" />
            Add Spell
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Show when={safeSpells().length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div class="text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <Target class="h-4 w-4 text-primary" />
                <span class="text-sm font-medium">Spell Save DC</span>
              </div>
              <div class="text-2xl font-bold text-primary">{spellSaveDC()}</div>
            </div>
            <div class="text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <Zap class="h-4 w-4 text-primary" />
                <span class="text-sm font-medium">Spell Attack</span>
              </div>
              <div class="text-2xl font-bold text-primary">{formatModifier(spellAttackBonus())}</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium mb-1">Prepared Spells</div>
              <div class="text-2xl font-bold text-primary">{preparedSpells().length}</div>
            </div>
          </div>
        </Show>

        {/* Spell Slots */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Circle class="h-5 w-5 text-primary" />
              Spell Slots
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsSpellSlotsDialogOpen(true)}>
              <Settings class="h-3 w-3" />
              Edit Slots
            </Button>
          </div>

          <div class="flex flex-wrap gap-2">
            <For each={[1,2,3,4,5,6,7,8,9]}>
              {(level) => {
                const slots = () => props.character.spellSlots[level as keyof typeof props.character.spellSlots]
                return (
                  <Show when={slots().total > 0}>
                    <div class="flex items-center gap-2 p-2 border rounded-lg">
                      <span class="font-medium text-xs text-muted-foreground">{getOrdinalSuffix(level)}</span>
                      <div class="flex items-center gap-1">
                        <For each={Array.from({ length: slots().total }, (_, i) => i)}>
                          {(index) => (
                            <button
                              onClick={() => toggleSpellSlot(level, index)}
                              class={`w-5 h-5 rounded-full border-2 transition-colors ${index < slots().used ? "bg-muted border-muted-foreground" : "bg-primary border-primary hover:bg-primary/80"}`}
                              title={index < slots().used ? "Used slot (click to restore)" : "Available slot (click to use)"}
                            >
                              <Show when={index < slots().used}>
                                <span class="sr-only">Used</span>
                              </Show>
                              <Show when={index >= slots().used}>
                                <Dot class="h-3 w-3 text-primary-foreground mx-auto" />
                              </Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                )
              }}
            </For>
          </div>

          <Show when={allSlotsEmpty()}>
            <div class="text-center py-4 text-muted-foreground">
              <p>No spell slots configured.</p>
              <p class="text-sm">Click "Edit Slots" to add spell slots for your character.</p>
            </div>
          </Show>
        </div>

        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search spells..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            class="pl-10"
          />
        </div>

        {/* Spells by Level */}
        <div class="space-y-2">
          <Show
            when={safeSpells().length > 0}
            fallback={<div class="text-center py-8 text-muted-foreground">No spells added yet. Add your first spell to get started!</div>}
          >
            <For each={SPELL_LEVELS}>
              {(level) => {
                const levelSpells = () => spellsByLevel(level.value)
                return (
                  <Show when={levelSpells().length > 0 || searchTerm()}>
                    <Collapsible
                      open={expandedLevels().has(level.value)}
                      onOpenChange={(isOpen: boolean) => toggleLevelExpanded(level.value, isOpen)}
                    >
                      <CollapsibleTrigger class="flex w-full items-center justify-between p-3 rounded-md hover:bg-accent transition-colors">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold">{level.label}</span>
                          <Badge variant="secondary">{levelSpells().length}</Badge>
                          <Show when={level.value > 0}>
                            <Badge variant="outline" class="text-xs">
                              {levelSpells().filter((s) => s.prepared).length} prepared
                            </Badge>
                          </Show>
                        </div>
                        <ChevronDown class="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent class="space-y-2 mt-2">
                        <Show
                          when={levelSpells().length > 0}
                          fallback={<div class="text-center py-4 text-muted-foreground text-sm">No {level.label.toLowerCase()} spells match your search.</div>}
                        >
                          <For each={levelSpells()}>
                            {(spell) => (
                              <div class="border rounded-lg p-3 space-y-2">
                                <div class="flex items-start justify-between">
                                  <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                      <Show when={spell.level > 0}>
                                        <Checkbox
                                          checked={spell.prepared || false}
                                          onChange={() => togglePrepared(spell.id)}
                                          title="Toggle prepared"
                                        />
                                      </Show>
                                      <h4 class="font-medium">{spell.name}</h4>
                                      <Badge variant="outline" class="text-xs">{spell.school}</Badge>
                                      <Badge variant="outline" class="text-xs">Level: {spell.level}</Badge>
                                      <Show when={spell.prepared}>
                                        <Badge variant="secondary" class="text-xs">Prepared</Badge>
                                      </Show>
                                    </div>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                                      <Show when={spell.castingTime}><div><span class="font-medium">Time:</span> {spell.castingTime}</div></Show>
                                      <Show when={spell.range}><div><span class="font-medium">Range:</span> {spell.range}</div></Show>
                                      <Show when={spell.components}><div><span class="font-medium">Components:</span> {spell.components}</div></Show>
                                      <Show when={spell.duration}><div><span class="font-medium">Duration:</span> {spell.duration}</div></Show>
                                    </div>
                                    <div class="flex flex-wrap gap-4 mb-2">
                                      <Show when={spell.damage}><div class="text-sm font-semibold"><span class="font-medium">Damage:</span> {spell.damage}</div></Show>
                                      <Show when={spell.attackSave}><div class="text-sm font-semibold"><span class="font-medium">Attack/Save:</span> {spell.attackSave}</div></Show>
                                      <Show when={spell.regain}><div class="text-sm font-semibold"><span class="font-medium">Regain:</span> {spell.regain}</div></Show>
                                    </div>
                                    <Show when={spell.description}>
                                      <div class="mb-2">
                                        <span class="font-medium">Description:</span>
                                        <pre class="text-sm text-muted-foreground" style={{ "white-space": "pre-wrap" }}>{spell.description}</pre>
                                      </div>
                                    </Show>
                                  </div>
                                  <div class="flex items-center gap-2 ml-4">
                                    <Show when={spell.level > 0}>
                                      {() => {
                                        const slots = () => props.character.spellSlots[spell.level as keyof typeof props.character.spellSlots]
                                        const canCast = () => slots().used < slots().total
                                        return (
                                          <Button variant="outline" size="sm" disabled={!canCast()} onClick={() => castSpell(spell.level)}>
                                            Cast
                                          </Button>
                                        )
                                      }}
                                    </Show>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSpell(spell)}>
                                      <Edit class="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSpell(spell.id)}>
                                      <Trash2 class="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </For>
                        </Show>
                      </CollapsibleContent>
                    </Collapsible>
                  </Show>
                )
              }}
            </For>
          </Show>
        </div>
      </CardContent>

      {/* Add Spell Dialog */}
      <Dialog open={isAddDialogOpen()} onOpenChange={setIsAddDialogOpen}>
        <DialogContent class="max-w-2xl">
          <DialogHeader><DialogTitle>Add New Spell</DialogTitle></DialogHeader>
          <SpellForm
            initialData={defaultSpellForm}
            onSubmit={handleAddSpell}
            onCancel={() => setIsAddDialogOpen(false)}
            editing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Spell Dialog */}
      <Dialog open={!!editingSpell()} onOpenChange={(open: boolean) => { if (!open) setEditingSpell(null) }}>
        <DialogContent class="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Spell</DialogTitle></DialogHeader>
          <SpellForm
            initialData={editSpellData()}
            onSubmit={handleUpdateSpell}
            onCancel={() => setEditingSpell(null)}
            editing={true}
          />
        </DialogContent>
      </Dialog>

      {/* Spell Slots Dialog */}
      <Dialog open={isSpellSlotsDialogOpen()} onOpenChange={setIsSpellSlotsDialogOpen}>
        <DialogContent class="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Spell Slots</DialogTitle></DialogHeader>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <For each={[1,2,3,4,5,6,7,8,9]}>
                {(level) => {
                  const slots = () => props.character.spellSlots[level as keyof typeof props.character.spellSlots]
                  return (
                    <div class="flex items-center justify-between p-3 border rounded-lg">
                      <span class="font-medium">Level {level}</span>
                      <div class="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={slots().total}
                          onInput={(e) => updateSpellSlots(level, "total", parseInt(e.currentTarget.value) || 0)}
                          class="w-16 h-8 text-center"
                          title="Total slots"
                        />
                        <span class="text-sm text-muted-foreground">slots</span>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

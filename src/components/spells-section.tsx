import { createSignal, For, Show } from "solid-js"
import type { Character, Spell } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier } from "@/lib/character-utils"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
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
import Settings from "lucide-solid/icons/settings"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"

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
  gain?: string
  atHigherLevel?: string
  description: string
  prepared: boolean
  known: boolean
  concentration?: boolean
  ritual?: boolean
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
  gain: "",
  atHigherLevel: "",
  description: "",
  prepared: false,
  known: true,
  concentration: false,
  ritual: false,
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

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Label for="gain">Gain</Label>
          <Input id="gain" value={formData().gain || ""} onInput={(e) => setFormData((p) => ({ ...p, gain: e.currentTarget.value }))} placeholder="e.g. 2d4+3 healing" />
        </div>
        <div>
          <Label for="spell-damage">Damage</Label>
          <Input id="spell-damage" value={formData().damage || ""} onInput={(e) => setFormData((p) => ({ ...p, damage: e.currentTarget.value }))} placeholder="e.g. 1d8+3 fire" />
        </div>
        <div>
          <Label for="attack-save">Attack/Save</Label>
          <Input id="attack-save" value={formData().attackSave || ""} onInput={(e) => setFormData((p) => ({ ...p, attackSave: e.currentTarget.value }))} placeholder="e.g. Dex Save" />
        </div>
        <div>
          <Label for="at-higher-level">At Higher Level</Label>
          <Input id="at-higher-level" value={formData().atHigherLevel || ""} onInput={(e) => setFormData((p) => ({ ...p, atHigherLevel: e.currentTarget.value }))} placeholder="e.g. +1d6 per level" />
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
          <Combobox value={formData().school} onValueChange={(v) => setFormData((p) => ({ ...p, school: v }))} options={SPELL_SCHOOLS} />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="casting-time">Casting Time</Label>
          <Combobox value={formData().castingTime} onValueChange={(v) => setFormData((p) => ({ ...p, castingTime: v }))} options={CASTING_TIMES} />
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

      <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <Checkbox
          checked={formData().known}
          onChange={(checked: boolean) => setFormData((p) => ({ ...p, known: checked, prepared: checked ? p.prepared : false }))}
        />
        <span class="text-sm font-medium leading-none">Known</span>
      </label>

      <Show when={formData().level > 0}>
        <label class="flex items-center gap-3 cursor-pointer min-h-[44px]" classList={{ "opacity-50 cursor-not-allowed": !formData().known }}>
          <Checkbox
            checked={formData().prepared}
            disabled={!formData().known}
            onChange={(checked: boolean) => setFormData((p) => ({ ...p, prepared: checked }))}
          />
          <span class="text-sm font-medium leading-none">Prepared</span>
        </label>
      </Show>

      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox
            checked={!!formData().concentration}
            onChange={(checked: boolean) => setFormData((p) => ({ ...p, concentration: checked }))}
          />
          <span class="text-sm font-medium leading-none">Concentration</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox
            checked={!!formData().ritual}
            onChange={(checked: boolean) => setFormData((p) => ({ ...p, ritual: checked }))}
          />
          <span class="text-sm font-medium leading-none">Ritual</span>
        </label>
      </div>

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
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false)
  const [editingSpell, setEditingSpell] = createSignal<Spell | null>(null)
  const [expandedLevels, setExpandedLevels] = createSignal<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
  const [isSpellSlotsModalOpen, setIsSpellSlotsModalOpen] = createSignal(false)


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

  const toggleLevelExpanded = (level: number, isOpen: boolean) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev)
      if (isOpen) newSet.add(level)
      else newSet.delete(level)
      return newSet
    })
  }

  const updateSpellSlots = (level: number, field: "total" | "used", value: number) => {
    props.onUpdate({
      ...props.character,
      spellSlots: {
        ...props.character.spellSlots,
        [level]: {
          ...props.character.spellSlots[level as keyof typeof props.character.spellSlots],
          [field]: Math.max(0, value),
        },
      },
    })
  }

  const updateSpellSlotUsed = (level: number, used: number) => updateSpellSlots(level, "used", used)

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
      known: formData.known,
      damage: formData.damage,
      attackSave: formData.attackSave,
      gain: formData.gain,
      atHigherLevel: formData.atHigherLevel,
      concentration: formData.concentration,
      ritual: formData.ritual,
    }
    const updated = { ...props.character, spells: [...safeSpells(), newSpell] }
    props.onUpdate(updated)
    saveCharacter(updated)
    setIsAddModalOpen(false)
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
      known: formData.known,
      damage: formData.damage,
      attackSave: formData.attackSave,
      gain: formData.gain,
      atHigherLevel: formData.atHigherLevel,
      concentration: formData.concentration,
      ritual: formData.ritual,
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

  const toggleKnown = (spellId: string) => {
    const updated = {
      ...props.character,
      spells: safeSpells().map((spell) =>
        spell.id === spellId
          ? { ...spell, known: !spell.known, prepared: spell.known ? false : spell.prepared }
          : spell
      ),
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
      known: spell.known ?? true,
      gain: spell.gain || "",
      atHigherLevel: spell.atHigherLevel || "",
      concentration: spell.concentration ?? false,
      ritual: spell.ritual ?? false,
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
          <Button size="sm" class="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus class="h-4 w-4" />
            Add Spell
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Show when={safeSpells().length > 0}>
          <div class="space-y-2">
            <Show when={(props.character.edition ?? "2024") === "2014"}>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-muted-foreground">Spellcasting Class:</span>
                <Input
                  class="h-7 w-40 text-sm"
                  value={props.character.spellcastingClass || ""}
                  onInput={(e) => {
                    const updated = { ...props.character, spellcastingClass: e.currentTarget.value }
                    props.onUpdate(updated)
                    saveCharacter(updated)
                  }}
                  placeholder="e.g. Wizard"
                />
              </div>
            </Show>
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
          </div>
        </Show>

        {/* Spell Slots */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Circle class="h-5 w-5 text-primary" />
              Spell Slots
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsSpellSlotsModalOpen(true)}>
              <Settings class="h-3 w-3" />
              Edit Slots
            </Button>
          </div>

          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />

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
                                      <label class="flex items-center gap-2 cursor-pointer">
                                        <Show when={spell.level === 0}>
                                          <Tooltip content="Known">
                                            <Checkbox
                                              checked={spell.known ?? true}
                                              onChange={() => toggleKnown(spell.id)}
                                            />
                                          </Tooltip>
                                        </Show>
                                        <Show when={spell.level > 0}>
                                          <Tooltip content="Prepared">
                                            <Checkbox
                                              checked={spell.prepared || false}
                                              disabled={!(spell.known ?? true)}
                                              onChange={() => togglePrepared(spell.id)}
                                            />
                                          </Tooltip>
                                        </Show>
                                        <h4 class="font-medium">{spell.name}</h4>
                                      </label>
                                      <Badge variant="outline" class="text-xs">{spell.school}</Badge>
                                      <Badge variant="outline" class="text-xs">Level: {spell.level}</Badge>
                                      <Show when={spell.ritual}>
                                        <Badge variant="secondary" class="text-xs" title="Ritual">R</Badge>
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
                                      <Show when={spell.gain}><div class="text-sm font-semibold"><span class="font-medium">Gain:</span> {spell.gain}</div></Show>
                                    </div>
                                    <Show when={spell.description}>
                                      <div class="mb-2">
                                        <span class="font-medium">Description:</span>
                                        <pre class="text-sm text-muted-foreground" style={{ "white-space": "pre-wrap" }}>{spell.description}</pre>
                                      </div>
                                    </Show>
                                  </div>
                                  <div class="flex items-center gap-2 ml-4">
                                    <Tooltip content="Edit spell">
                                      <Button variant="ghost" size="sm" aria-label="Edit spell" onClick={() => setEditingSpell(spell)}>
                                        <Edit class="h-4 w-4" />
                                      </Button>
                                    </Tooltip>
                                    <Tooltip content="Delete spell">
                                      <Button variant="ghost" size="sm" aria-label="Delete spell" onClick={() => handleDeleteSpell(spell.id)}>
                                        <Trash2 class="h-4 w-4" />
                                      </Button>
                                    </Tooltip>
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

      {/* Add Spell Modal */}
      <Modal open={isAddModalOpen()} onOpenChange={setIsAddModalOpen}>
        <ModalContent class="max-w-2xl">
          <ModalHeader><ModalTitle>Add New Spell</ModalTitle></ModalHeader>
          <SpellForm
            initialData={defaultSpellForm}
            onSubmit={handleAddSpell}
            onCancel={() => setIsAddModalOpen(false)}
            editing={false}
          />
        </ModalContent>
      </Modal>

      {/* Edit Spell Modal */}
      <Modal open={!!editingSpell()} onOpenChange={(open: boolean) => { if (!open) setEditingSpell(null) }}>
        <ModalContent class="max-w-2xl">
          <ModalHeader><ModalTitle>Edit Spell</ModalTitle></ModalHeader>
          <SpellForm
            initialData={editSpellData()}
            onSubmit={handleUpdateSpell}
            onCancel={() => setEditingSpell(null)}
            editing={true}
          />
        </ModalContent>
      </Modal>

      {/* Spell Slots Modal */}
      <Modal open={isSpellSlotsModalOpen()} onOpenChange={setIsSpellSlotsModalOpen}>
        <ModalContent class="max-w-2xl">
          <ModalHeader><ModalTitle>Edit Spell Slots</ModalTitle></ModalHeader>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <For each={[1,2,3,4,5,6,7,8,9]}>
                {(level) => {
                  const slots = () => props.character.spellSlots[level as keyof typeof props.character.spellSlots]
                  return (
                    <div class="flex items-center justify-between p-3 border rounded-lg">
                      <span class="font-medium">Level {level}</span>
                      <div class="flex items-center gap-2">
                        <NumericInput
                          min={0} max={20}
                          value={slots().total}
                          onChange={(v) => updateSpellSlots(level, "total", v)}
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
        </ModalContent>
      </Modal>
    </Card>
  )
}

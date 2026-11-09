import { createSignal, createMemo, For, Show } from "solid-js"
import Sparkles from "lucide-solid/icons/sparkles"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Search from "lucide-solid/icons/search"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Zap from "lucide-solid/icons/zap"
import Target from "lucide-solid/icons/target"
import Circle from "lucide-solid/icons/circle"
import Settings from "lucide-solid/icons/settings"
import BookOpen from "lucide-solid/icons/book-open"

import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { Character, Spell } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, getSpellSaveDCBreakdown, getSpellAttackBreakdown, formatModifier, isItemModifierActive, withSpellEnded } from "@/lib/character-utils"
import { EditableModule } from "@/components/editable-module"
import { useModuleEdit } from "@/hooks/use-module-edit"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { Input } from "@/components/ui/input"
import { StepperInput } from "@/components/ui/stepper-input"
import { Chip } from "@/components/ui/chip"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip } from "@/components/ui/tooltip"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"
import { SpellEditModal, SPELL_LEVELS } from "@/components/spell-edit-modal"
import { useReadOnly } from "@/lib/read-only-context"
import { cn, HOVER_ACCENT } from "@/lib/utils"

const EMPTY_SPELLS: Spell[] = []

interface SpellsModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

// The fields this module's edit form shows (see useModuleEdit for how Save writes them)
interface SpellsDraft {
  useCalculatedSpellAttackBonus: boolean
  spellAttackBonus: number
  useCalculatedSpellSaveDC: boolean
  spellSaveDC: number
}

const toDraft = (c: Character): SpellsDraft => {
  const useCalculatedSpellAttackBonus = c.useCalculatedSpellAttackBonus ?? true
  const useCalculatedSpellSaveDC = c.useCalculatedSpellSaveDC ?? true
  return {
    useCalculatedSpellAttackBonus,
    spellAttackBonus: useCalculatedSpellAttackBonus ? getSpellAttackBonus(c) : (c.spellAttackBonus ?? getSpellAttackBonus(c)),
    useCalculatedSpellSaveDC,
    spellSaveDC: useCalculatedSpellSaveDC ? getSpellSaveDC(c) : (c.spellSaveDC ?? getSpellSaveDC(c)),
  }
}

export function SpellsModule(props: SpellsModuleProps) {
  const isReadOnly = useReadOnly()
  const edit = useModuleEdit({
    character: () => props.character,
    toDraft,
    resolve: (draft): Partial<Character> => ({
      ...draft,
      spellAttackBonus: spellAttackField.resolvedValue(),
      spellSaveDC: spellSaveDCField.resolvedValue(),
    }),
    onUpdate: (c) => props.onUpdate(c),
  })
  const [searchTerm, setSearchTerm] = createSignal("")
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false)
  const [editingSpell, setEditingSpell] = createSignal<Spell | null>(null)
  const [expandedLevels, setExpandedLevels] = createPersistedSetSignal<number>(
    () => `dnd-collapsible-spells-${props.character.id}`,
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  )
  const [isSpellSlotsModalOpen, setIsSpellSlotsModalOpen] = createSignal(false)


  const safeSpells = createMemo(() => props.character.spells || [])
  const magicItems = createMemo(() => (props.character.equipment ?? []).filter((item) => item.magic))
  const magicItemById = (id: string | undefined) => magicItems().find((item) => item.id === id)
  const filteredSpells = createMemo(() =>
    safeSpells().filter(
      (spell) =>
        spell.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
        spell.school.toLowerCase().includes(searchTerm().toLowerCase()) ||
        spell.description.toLowerCase().includes(searchTerm().toLowerCase()),
    )
  )

  const spellsByLevelMap = createMemo(() => {
    const map = new Map<number, Spell[]>()
    for (const spell of filteredSpells()) {
      const bucket = map.get(spell.level)
      if (bucket) bucket.push(spell)
      else map.set(spell.level, [spell])
    }
    return map
  })
  // Must be called inside a reactive context (JSX, effect, memo) — reads spellsByLevelMap()
  const spellsByLevel = (levelValue: number) => spellsByLevelMap().get(levelValue) ?? EMPTY_SPELLS
  const preparedSpells = createMemo(() => safeSpells().filter((spell) => spell.prepared && spell.level > 0))
  const spellSaveDC = createMemo(() => getSpellSaveDC(props.character))
  const spellAttackBonus = createMemo(() => getSpellAttackBonus(props.character))

  const spellAttackField = useCalculatedValue({
    useCalculated: () => (edit.isEditing() ? edit.draft().useCalculatedSpellAttackBonus : (props.character.useCalculatedSpellAttackBonus ?? true)),
    setUseCalculated: (v) => edit.setDraft((prev) => ({ ...prev, useCalculatedSpellAttackBonus: v })),
    manualValue: () => (edit.isEditing() ? edit.draft().spellAttackBonus : (props.character.spellAttackBonus ?? spellAttackBonus())),
    setManualValue: (v) => edit.setDraft((prev) => ({ ...prev, spellAttackBonus: v })),
    calculatedValue: spellAttackBonus,
    calculatedTooltip: () => getSpellAttackBreakdown(props.character),
  })

  const spellSaveDCField = useCalculatedValue({
    useCalculated: () => (edit.isEditing() ? edit.draft().useCalculatedSpellSaveDC : (props.character.useCalculatedSpellSaveDC ?? true)),
    setUseCalculated: (v) => edit.setDraft((prev) => ({ ...prev, useCalculatedSpellSaveDC: v })),
    manualValue: () => (edit.isEditing() ? edit.draft().spellSaveDC : (props.character.spellSaveDC ?? spellSaveDC())),
    setManualValue: (v) => edit.setDraft((prev) => ({ ...prev, spellSaveDC: v })),
    calculatedValue: spellSaveDC,
    calculatedTooltip: () => getSpellSaveDCBreakdown(props.character),
  })

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

  const handleSaveSpell = (saved: Spell) => {
    if (isReadOnly) return
    const exists = safeSpells().some((s) => s.id === saved.id)
    props.onUpdate({
      ...props.character,
      spells: exists ? safeSpells().map((s) => (s.id === saved.id ? saved : s)) : [...safeSpells(), saved],
    })
    setIsAddModalOpen(false)
    setEditingSpell(null)
  }

  const handleDeleteSpell = (spellId: string) => {
    if (isReadOnly) return
    const updated = {
      ...props.character,
      spells: safeSpells().filter((spell) => spell.id !== spellId),
      // A deleted spell is no longer in effect
      ...(props.character.activeSpellIds ? { activeSpellIds: withSpellEnded(props.character, spellId) } : {}),
    }
    props.onUpdate(updated)
  }

  const togglePrepared = (spellId: string) => {
    if (isReadOnly) return
    const updated = {
      ...props.character,
      spells: safeSpells().map((spell) => (spell.id === spellId ? { ...spell, prepared: !spell.prepared } : spell)),
    }
    props.onUpdate(updated)
  }

  const toggleKnown = (spellId: string) => {
    if (isReadOnly) return
    const updated = {
      ...props.character,
      spells: safeSpells().map((spell) =>
        spell.id === spellId
          ? { ...spell, known: !spell.known, prepared: spell.known ? false : spell.prepared }
          : spell
      ),
    }
    props.onUpdate(updated)
  }

  const allSlotsEmpty = createMemo(() => [1,2,3,4,5,6,7,8,9].every(
    (level) => props.character.spellSlots[level as keyof typeof props.character.spellSlots].total === 0
  ))

  return (
    <EditableModule data-test="spells-module"
      data-sem="spells-module"
      icon={<Sparkles class="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Spells"
      isEditing={edit.isEditing()}
      onEdit={edit.start}
      onSave={edit.save}
      onSaveKeepEditing={edit.commit}
      onCancel={edit.cancel}
      contentClass="space-y-4"
    >
        {/* Shown while editing even without spells, so the custom values can be set */}
        <Show when={safeSpells().length > 0 || edit.isEditing()}>
          <div class="space-y-2">
            <Show when={(props.character.edition ?? "2024") === "2014"}>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-muted-foreground">Spellcasting Class:</span>
                <Show
                  when={!isReadOnly}
                  fallback={<span class="text-sm">{props.character.spellcastingClass || ""}</span>}
                >
                  <Input
                    data-test="spellcasting-class-input"
                    class="h-7 w-40 text-sm"
                    value={props.character.spellcastingClass || ""}
                    onInput={(e) => {
                      const updated = { ...props.character, spellcastingClass: e.currentTarget.value }
                      props.onUpdate(updated)
                    }}
                    placeholder="e.g. Wizard"
                  />
                </Show>
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg">
              <div class="text-center">
                <CalculatedValue data-test="spell-save-dc"
                  label="Spell Save DC"
                  labelClass="text-sm font-medium"
                  icon={<Target class="h-4 w-4 text-primary" aria-hidden="true" />}
                  editable={edit.isEditing()}
                  {...spellSaveDCField.binding()}
                />
              </div>
              <div class="text-center">
                <CalculatedValue data-test="spell-attack"
                  label="Spell Attack"
                  labelClass="text-sm font-medium"
                  icon={<Zap class="h-4 w-4 text-primary" aria-hidden="true" />}
                  editable={edit.isEditing()}
                  {...spellAttackField.binding()}
                  format={formatModifier}
                />
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
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <Circle class="h-5 w-5 text-primary" aria-hidden="true" />
              Spell Slots
            </h2>
            <Show when={!isReadOnly}>
              <Button data-test="edit-spell-slots-button" variant="outline" size="sm" class="gap-1" onClick={() => setIsSpellSlotsModalOpen(true)}>
                <Settings class="h-3 w-3" aria-hidden="true" />
                Edit Slots
              </Button>
            </Show>
          </div>

          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />

          <Show when={allSlotsEmpty()}>
            <div class="text-center py-4 text-muted-foreground">
              <p>No spell slots configured.</p>
              <Show when={!isReadOnly}>
                <p class="text-sm">Click "Edit Slots" to add spell slots for your character.</p>
              </Show>
            </div>
          </Show>
        </div>

        {/* Spell List */}
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <BookOpen class="h-5 w-5 text-primary" aria-hidden="true" />
            Spell List
          </h2>
          <Show when={!isReadOnly}>
            <Button data-test="add-spell-button" variant="outline" size="sm" class="gap-1" onClick={() => setIsAddModalOpen(true)}>
              <Plus class="h-3 w-3" aria-hidden="true" />
              Add Spell
            </Button>
          </Show>
        </div>

        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            data-test="spell-search-input"
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
                      <CollapsibleTrigger data-test={`spell-level-${level.value}-toggle`} class={cn("flex w-full items-center justify-between p-3 rounded-md transition-colors", HOVER_ACCENT)}>
                        <div class="flex items-center gap-2">
                          <span class="font-semibold">{level.label}</span>
                          <Chip variant="secondary">{levelSpells().length}</Chip>
                          <Show when={level.value > 0}>
                            {/* An outline chip has no background of its own, so its text follows the
                                header's colour and stays readable on the hover highlight. */}
                            <Chip variant="outline" class="text-xs text-inherit">
                              {levelSpells().filter((s) => s.prepared).length} prepared
                            </Chip>
                          </Show>
                        </div>
                        <ChevronDown class="h-4 w-4" aria-hidden="true" />
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
                                      {/* The spell name is the checkbox's label (wrapped in the card's heading), so
                                          clicking it toggles Known (cantrips) or Prepared (leveled spells). */}
                                      <Show when={!isReadOnly} fallback={<h3 data-test={`spell-name-${spell.id}`} class="font-medium">{spell.name}</h3>}>
                                        <Show when={spell.level === 0}>
                                          <Tooltip content="Known">
                                            <Checkbox
                                              data-test={`spell-known-${spell.id}`}
                                              checked={spell.known ?? true}
                                              onChange={() => toggleKnown(spell.id)}
                                              aria-label={`Known: ${spell.name}`}
                                              flush
                                              label={spell.name}
                                              labelHeading="h3"
                                              labelTestId={`spell-name-${spell.id}`}
                                              labelClass="font-medium cursor-pointer select-none"
                                            />
                                          </Tooltip>
                                        </Show>
                                        <Show when={spell.level > 0}>
                                          <Tooltip content="Prepared">
                                            <Checkbox
                                              data-test={`spell-prepared-${spell.id}`}
                                              checked={spell.prepared || false}
                                              disabled={!(spell.known ?? true)}
                                              onChange={() => togglePrepared(spell.id)}
                                              aria-label={`Prepared: ${spell.name}`}
                                              flush
                                              label={spell.name}
                                              labelHeading="h3"
                                              labelTestId={`spell-name-${spell.id}`}
                                              labelClass="font-medium cursor-pointer select-none data-[disabled]:cursor-default"
                                            />
                                          </Tooltip>
                                        </Show>
                                      </Show>
                                      <Chip variant="outline" class="text-xs">{spell.school}</Chip>
                                      <Chip variant="outline" class="text-xs">Level: {spell.level}</Chip>
                                      <Show when={spell.ritual}>
                                        <Tooltip content="Ritual" triggerFocusable triggerLabel="Ritual">
                                          <Chip data-test={`spell-ritual-${spell.id}`} variant="secondary" class="text-xs">R</Chip>
                                        </Tooltip>
                                      </Show>
                                      <Show when={magicItemById(spell.grantedBy)}>
                                        {(item) => (
                                          <Show
                                            when={!isItemModifierActive(item())}
                                            fallback={<Chip variant="outline" class="text-xs">Granted: {item().name}</Chip>}
                                          >
                                            <Tooltip content="Item not currently equipped/attuned" triggerFocusable>
                                              <Chip data-test={`spell-granted-inactive-${spell.id}`} variant="outline" class="text-xs text-muted-foreground italic">Granted: {item().name}</Chip>
                                            </Tooltip>
                                          </Show>
                                        )}
                                      </Show>
                                      <Show when={spell.grantedBy && spell.freeCast}>
                                        <Chip variant="secondary" class="text-xs">Free Cast</Chip>
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
                                        <MarkdownContent text={spell.description!} class="text-muted-foreground" />
                                      </div>
                                    </Show>
                                  </div>
                                  <Show when={!isReadOnly}>
                                    <div class="flex items-center gap-2 ml-4">
                                      <Tooltip content="Edit spell">
                                        <Button data-test={`edit-spell-${spell.id}`} variant="ghost" size="sm" aria-label={`Edit ${spell.name}`} onClick={() => setEditingSpell(spell)}>
                                          <Edit class="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                      </Tooltip>
                                      <Tooltip content="Delete spell">
                                        <ConfirmButton data-test={`delete-spell-${spell.id}`} variant="ghost" size="sm" verb="Delete" subject={spell.name} onConfirm={() => handleDeleteSpell(spell.id)}>
                                          <Trash2 class="h-4 w-4" aria-hidden="true" />
                                        </ConfirmButton>
                                      </Tooltip>
                                    </div>
                                  </Show>
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

      <SpellEditModal
        open={isAddModalOpen() || !!editingSpell()}
        spell={editingSpell()}
        magicItems={magicItems()}
        onSave={handleSaveSpell}
        onCancel={() => { setIsAddModalOpen(false); setEditingSpell(null) }}
      />

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
                        <StepperInput
                          data-test={`spell-slot-level-${level}-total`}
                          min={0} max={20}
                          value={slots().total}
                          onChange={(v) => updateSpellSlots(level, "total", v)}
                          aria-label={`Level ${level} total slots`}
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
    </EditableModule>
  )
}

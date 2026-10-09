import { createSignal, For, Show } from "solid-js"
import Package from "lucide-solid/icons/package"
import Plus from "lucide-solid/icons/plus"
import Edit from "lucide-solid/icons/edit"
import Trash2 from "lucide-solid/icons/trash-2"
import Search from "lucide-solid/icons/search"
import Scale from "lucide-solid/icons/scale"
import Gem from "lucide-solid/icons/gem"
import Coins from "lucide-solid/icons/coins"
import TriangleAlert from "lucide-solid/icons/triangle-alert"
import Zap from "lucide-solid/icons/zap"

import type { AbilityScores, Character, Equipment, SenseType } from "@/lib/character-types"
import {
  SENSE_LABELS,
  SKILL_DISPLAY_NAMES,
  BASE_ATTUNEMENT_LIMIT,
  ABILITY_ABBREVIATIONS,
  remainingUses,
  spentFromRemaining,
  effectiveEquipmentMaxUses,
  effectiveEquipmentUses,
  hasChargesTracking,
  isItemModifierActive,
  formatModifier,
  getEffectiveCarryingCapacity,
  getCarryingCapacityBreakdown,
} from "@/lib/character-utils"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { cascadeDecrement } from "@/lib/currency-utils"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { useReadOnly } from "@/lib/read-only-context"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { EquipmentItemModal, ACTION_KIND_OPTIONS, hasOtherModifierFields } from "@/components/equipment-item-modal"

const roundToOneDecimal = (n: number): number => Math.round(n * 10) / 10

interface EquipmentInventoryModuleProps {
  character: Character
  onUpdate: (character: Character) => void
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
    },
    manualValue: () => props.character.attunementLimit ?? BASE_ATTUNEMENT_LIMIT,
    setManualValue: (v) => {
      const updated = { ...props.character, attunementLimit: v }
      props.onUpdate(updated)
    },
    calculatedValue: () => BASE_ATTUNEMENT_LIMIT,
    calculatedTooltip: () => `${BASE_ATTUNEMENT_LIMIT} (base attunement limit)`,
  })
  const overAttunementLimit = () => attunedCount() > attunementLimitField.resolvedValue()

  const carryingCapacityField = useCalculatedValue({
    useCalculated: () => props.character.useCalculatedCarryingCapacity ?? true,
    setUseCalculated: (v) => {
      const updated = { ...props.character, useCalculatedCarryingCapacity: v }
      props.onUpdate(updated)
    },
    manualValue: () => props.character.carryingCapacity ?? getEffectiveCarryingCapacity(props.character),
    setManualValue: (v) => {
      const updated = { ...props.character, carryingCapacity: v }
      props.onUpdate(updated)
    },
    calculatedValue: () => getEffectiveCarryingCapacity(props.character),
    calculatedTooltip: () => getCarryingCapacityBreakdown(props.character).breakdown,
  })
  const overCarryingCapacity = () => totalWeight() > carryingCapacityField.resolvedValue()

  const filteredEquipment = () =>
    safeEquipment().filter(
      (item) =>
        !item.magic &&
        (item.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm().toLowerCase())),
    )
  const totalWeight = () => roundToOneDecimal(safeEquipment().reduce((total, item) => total + (item.weight || 0) * item.quantity, 0))
  const equippedItems = () => safeEquipment().filter((item) => item.equipped)

  const openAdd = () => { setEditingItem(null); setModalOpen(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setModalOpen(true) }
  const closeModal = () => { setEditingItem(null); setModalOpen(false) }

  const handleSaveItem = (item: Equipment) => {
    const existing = editingItem()
    const updated = {
      ...props.character,
      equipment: existing
        ? safeEquipment().map((e) => (e.id === existing.id ? item : e))
        : [...safeEquipment(), item],
    }
    props.onUpdate(updated)
    closeModal()
  }

  const handleDeleteItem = (itemId: string) => {
    const updated = { ...props.character, equipment: safeEquipment().filter((item) => item.id !== itemId) }
    props.onUpdate(updated)
  }

  const toggleEquipped = (itemId: string) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, equipped: !item.equipped } : item)),
    }
    props.onUpdate(updated)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => {
        if (item.id !== itemId) return item
        const next = { ...item, quantity }
        if (item.type === "consumable" && (item.consumedUses ?? 0) > quantity) next.consumedUses = quantity
        return next
      }),
    }
    props.onUpdate(updated)
  }

  const toggleAttuned = (itemId: string) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => (item.id === itemId ? { ...item, attuned: !item.attuned } : item)),
    }
    props.onUpdate(updated)
  }

  const updateItemUses = (itemId: string, uses: number) => {
    const updated = {
      ...props.character,
      equipment: safeEquipment().map((item) => {
        if (item.id !== itemId) return item
        const clamped = Math.max(0, Math.min(uses, effectiveEquipmentMaxUses(item)))
        return hasChargesTracking(item) ? { ...item, charges: clamped } : { ...item, consumedUses: clamped }
      }),
    }
    props.onUpdate(updated)
  }

  return (
    <Card data-sem="equipment-inventory-module">
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Package class="h-5 w-5 text-primary" aria-hidden="true" />
            Equipment & Inventory
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="gap-1">
              <Scale class="h-3 w-3" aria-hidden="true" />
              {totalWeight()} lbs
            </Badge>
            <Show when={!isReadOnly}>
              <Button data-test="add-equipment-button" size="sm" class="gap-2" onClick={openAdd}>
                <Plus class="h-4 w-4" aria-hidden="true" />
                Add Item
              </Button>
            </Show>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {/* Carrying Capacity */}
        <div data-test="carrying-capacity-row" class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Carrying Capacity: {totalWeight()} /</span>
          <CalculatedValue data-test="carrying-capacity"
            label="Carrying Capacity"
            labelClass="sr-only"
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
            <Coins class="h-4 w-4 text-primary" aria-hidden="true" />
            Currency
          </h2>
          <div class="flex flex-wrap gap-2">
            <For each={["cp", "sp", "ep", "gp", "pp"] as const}>{(denom) => (
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
                    data-test={`currency-${denom}`}
                    aria-label={`${denom.toUpperCase()} currency`}
                    min={0}
                    value={props.character.coins?.[denom] ?? 0}
                    onChange={(v) => {
                      const updated = { ...props.character, coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...props.character.coins, [denom]: v } }
                      props.onUpdate(updated)
                    }}
                    onAtMin={() => {
                      const currentCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...props.character.coins }
                      const result = cascadeDecrement(currentCoins, denom)
                      if (result) {
                        const updated = { ...props.character, coins: result }
                        props.onUpdate(updated)
                      }
                    }}
                  />
                </Show>
              </div>
            )}</For>
          </div>
        </div>

        <Separator />

        {/* Magic Items */}
        <div data-sem="magic-items-section" data-test="magic-items-section">
          <h2 class="font-semibold text-sm flex items-center gap-2 mb-2">
            <Gem class="h-4 w-4 text-primary" aria-hidden="true" />
            Magic Items
          </h2>
          <div data-test="attunement-limit-row" class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
            <span>{attunedCount()}/</span>
            <CalculatedValue data-test="attunement-limit"
              label="Attunement Limit"
              labelClass="sr-only"
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
                            data-test={`magic-item-toggle-equipped-${item.id}`}
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
                        <Show when={item.actionKind}>
                          <Badge variant="outline" class="text-xs flex items-center gap-1">
                            <Zap class="h-3 w-3" aria-hidden="true" />
                            {ACTION_KIND_OPTIONS.find((o) => o.value === item.actionKind)?.label}
                          </Badge>
                        </Show>
                        <Show when={item.rarity}>
                          <Badge variant="outline" class="text-xs capitalize">{item.rarity?.replace("-", " ")}</Badge>
                        </Show>
                        <Show when={item.requiresAttunement}>
                          <Show when={!isReadOnly}>
                            <Checkbox data-test={`magic-item-toggle-attuned-${item.id}`} checked={item.attuned ?? false} onChange={() => toggleAttuned(item.id)} title="Toggle attuned" aria-label="Toggle attuned" />
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
                        <MarkdownContent text={item.description!} class="text-xs text-muted-foreground line-clamp-1" />
                      </Show>
                      <Show when={hasOtherModifierFields(item.modifiers)}>
                        <div class={`text-xs mt-1 flex flex-wrap gap-x-2 gap-y-0.5 ${isItemModifierActive(item) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground italic"}`}>
                          <Show when={item.modifiers?.armorClass}>
                            <span>AC {formatModifier(item.modifiers!.armorClass!)}</span>
                          </Show>
                          <Show when={item.modifiers?.initiative}>
                            <span>Init {formatModifier(item.modifiers!.initiative!)}</span>
                          </Show>
                          <For each={Object.entries(item.modifiers?.savingThrows ?? {})}>
                            {([ability, bonus]) => <span>{ABILITY_ABBREVIATIONS[ability as keyof AbilityScores]} Save {formatModifier(bonus as number)}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScores ?? {})}>
                            {([ability, bonus]) => <span>{ABILITY_ABBREVIATIONS[ability as keyof AbilityScores]} {formatModifier(bonus as number)}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScoreFloors ?? {})}>
                            {([ability, floor]) => <span>{ABILITY_ABBREVIATIONS[ability as keyof AbilityScores]} floor {floor as number}</span>}
                          </For>
                          <For each={Object.entries(item.modifiers?.abilityScoreMaxCaps ?? {})}>
                            {([ability, cap]) => <span>{ABILITY_ABBREVIATIONS[ability as keyof AbilityScores]} max {cap as number}</span>}
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
                      {/* Skill advantage/disadvantage activates on equip alone, unlike every other
                          modifier field above (which requires magic + attunement), so it's shown
                          and colored independently of isItemModifierActive. */}
                      <Show when={(item.modifiers?.skillAdvantage?.length ?? 0) > 0 || (item.modifiers?.skillDisadvantage?.length ?? 0) > 0}>
                        <div class={`text-xs mt-1 flex flex-wrap gap-x-2 gap-y-0.5 ${item.equipped ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground italic"}`}>
                          <Show when={(item.modifiers?.skillAdvantage?.length ?? 0) > 0}>
                            <span>Advantage: {item.modifiers!.skillAdvantage!.map((s) => SKILL_DISPLAY_NAMES[s]).join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.skillDisadvantage?.length ?? 0) > 0}>
                            <span>Disadvantage: {item.modifiers!.skillDisadvantage!.map((s) => SKILL_DISPLAY_NAMES[s]).join(", ")}</span>
                          </Show>
                          <Show when={!item.equipped}>
                            <span>(equip to activate)</span>
                          </Show>
                        </div>
                      </Show>
                      <Show when={effectiveEquipmentMaxUses(item) > 0}>
                        <div class="mt-1">
                          <Show
                            when={effectiveEquipmentMaxUses(item) <= 5}
                            fallback={
                              <StepperInput data-test={`magic-item-uses-stepper-${item.id}`}
                                value={remainingUses(effectiveEquipmentUses(item), effectiveEquipmentMaxUses(item))}
                                min={0}
                                max={effectiveEquipmentMaxUses(item)}
                                onChange={(v) => updateItemUses(item.id, spentFromRemaining(v, effectiveEquipmentMaxUses(item)))}
                                readOnly={isReadOnly}
                                aria-label={`${item.name} uses remaining`}
                              />
                            }
                          >
                            <PipTracker
                              total={effectiveEquipmentMaxUses(item)}
                              used={effectiveEquipmentUses(item)}
                              onToggle={(v) => updateItemUses(item.id, v)}
                              usedTitle={item.type === "consumable" ? "Used (click to restore)" : "Charge spent (click to restore)"}
                              availableTitle={item.type === "consumable" ? "Available (click to use)" : "Charge available (click to use)"}
                              readOnly={isReadOnly}
                            />
                          </Show>
                        </div>
                      </Show>
                    </div>
                    <Show when={!isReadOnly}>
                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <Tooltip content={`Edit ${item.name}`}>
                          <Button data-test={`magic-item-edit-${item.id}`} variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                            <Edit class="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={`Delete ${item.name}`}>
                          <ConfirmButton data-test={`magic-item-delete-${item.id}`} variant="ghost" size="sm" verb="Delete" subject={item.name} onConfirm={() => handleDeleteItem(item.id)}>
                            <Trash2 class="h-4 w-4" aria-hidden="true" />
                          </ConfirmButton>
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
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            data-test="equipment-search-input"
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
                              data-test={`equipment-toggle-equipped-${item.id}`}
                              checked={item.equipped || false}
                              onChange={() => toggleEquipped(item.id)}
                              title="Toggle equipped"
                              aria-label={`Toggle equipped: ${item.name}`}
                            />
                          </Show>
                          <h3 class="font-medium">
                            <button
                              type="button"
                              data-test={`equipment-item-name-${item.id}`}
                              disabled={isReadOnly}
                              aria-pressed={!isReadOnly ? item.equipped : undefined}
                              class={`bg-transparent border-0 p-0 font-medium text-left ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                              onClick={() => !isReadOnly && toggleEquipped(item.id)}
                            >
                              {item.name}
                            </button>
                          </h3>
                        </div>
                        <Show when={item.type && item.type !== "other"}>
                          <Badge variant="outline" class="text-xs capitalize">{item.type}</Badge>
                        </Show>
                        <Show when={item.actionKind}>
                          <Badge variant="outline" class="text-xs flex items-center gap-1">
                            <Zap class="h-3 w-3" aria-hidden="true" />
                            {ACTION_KIND_OPTIONS.find((o) => o.value === item.actionKind)?.label}
                          </Badge>
                        </Show>
                        <Show when={item.magic}>
                          <Badge variant="outline" class="text-xs gap-1">
                            <Gem class="h-3 w-3" aria-hidden="true" />
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
                      {/* Skill advantage/disadvantage activates on equip alone (see
                          getEquipmentSkillEffectTotals), so non-magic items can grant it too —
                          shown here since this general list excludes magic items (filteredEquipment). */}
                      <Show when={(item.modifiers?.skillAdvantage?.length ?? 0) > 0 || (item.modifiers?.skillDisadvantage?.length ?? 0) > 0}>
                        <div class={`text-xs mt-1 flex flex-wrap gap-x-2 gap-y-0.5 ${item.equipped ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground italic"}`}>
                          <Show when={(item.modifiers?.skillAdvantage?.length ?? 0) > 0}>
                            <span>Advantage: {item.modifiers!.skillAdvantage!.map((s) => SKILL_DISPLAY_NAMES[s]).join(", ")}</span>
                          </Show>
                          <Show when={(item.modifiers?.skillDisadvantage?.length ?? 0) > 0}>
                            <span>Disadvantage: {item.modifiers!.skillDisadvantage!.map((s) => SKILL_DISPLAY_NAMES[s]).join(", ")}</span>
                          </Show>
                          <Show when={!item.equipped}>
                            <span>(equip to activate)</span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                    <Show when={!isReadOnly}>
                      <div class="flex items-center gap-2">
                        <Tooltip content={`Edit ${item.name}`}>
                          <Button data-test={`equipment-edit-${item.id}`} variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                            <Edit class="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={`Delete ${item.name}`}>
                          <ConfirmButton data-test={`equipment-delete-${item.id}`} variant="ghost" size="sm" verb="Delete" subject={item.name} onConfirm={() => handleDeleteItem(item.id)}>
                            <Trash2 class="h-4 w-4" aria-hidden="true" />
                          </ConfirmButton>
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
                              data-test={`equipment-quantity-decrease-${item.id}`}
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
                              data-test={`equipment-quantity-increase-${item.id}`}
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
                  <Show when={item.type === "consumable" && effectiveEquipmentMaxUses(item) > 0}>
                    <div>
                      <Show
                        when={effectiveEquipmentMaxUses(item) <= 5}
                        fallback={
                          <StepperInput data-test={`equipment-uses-stepper-${item.id}`}
                            value={remainingUses(effectiveEquipmentUses(item), effectiveEquipmentMaxUses(item))}
                            min={0}
                            max={effectiveEquipmentMaxUses(item)}
                            onChange={(v) => updateItemUses(item.id, spentFromRemaining(v, effectiveEquipmentMaxUses(item)))}
                            readOnly={isReadOnly}
                            aria-label={`${item.name} uses remaining`}
                          />
                        }
                      >
                        <PipTracker
                          total={effectiveEquipmentMaxUses(item)}
                          used={effectiveEquipmentUses(item)}
                          onToggle={(v) => updateItemUses(item.id, v)}
                          usedTitle="Used (click to restore)"
                          availableTitle="Available (click to use)"
                          readOnly={isReadOnly}
                        />
                      </Show>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>
      </CardContent>

      <EquipmentItemModal
        open={modalOpen()}
        editingItem={editingItem()}
        onSave={handleSaveItem}
        onCancel={closeModal}
      />
    </Card>
  )
}

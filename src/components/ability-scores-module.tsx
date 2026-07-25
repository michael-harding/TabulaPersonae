import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, formatModifier, getSavingThrowModifier, getEquipmentModifierTotals } from "@/lib/character-utils"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { EditableModule } from "@/components/editable-module"
import { NumericInput } from "@/components/ui/numeric-input"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import Zap from "lucide-solid/icons/zap"

interface AbilityScoresModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

const ABILITY_NAMES = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
} as const

const ABILITY_ABBREVIATIONS = {
  strength: "STR", dexterity: "DEX", constitution: "CON",
  intelligence: "INT", wisdom: "WIS", charisma: "CHA",
} as const

const DEFAULT_SCORES = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }
const DEFAULT_SAVES = { strength: false, dexterity: false, constitution: false, intelligence: false, wisdom: false, charisma: false }

type AbilityKey = keyof typeof DEFAULT_SCORES

export function AbilityScoresModule(props: AbilityScoresModuleProps) {
  const safeScores = () => props.character.abilityScores || DEFAULT_SCORES
  const safeSaves = () => props.character.savingThrows || DEFAULT_SAVES
  const safeAbilityOverrides = () => props.character.abilityScoreOverrides ?? {}
  const safeUseCalculatedAbility = () => props.character.useCalculatedAbilityScores ?? {}

  const [isEditing, setIsEditing] = createSignal(false)
  const [editedScores, setEditedScores] = createSignal(safeScores())
  const [editedSaves, setEditedSaves] = createSignal(safeSaves())
  const [editedAbilityOverrides, setEditedAbilityOverrides] = createSignal(safeAbilityOverrides())
  const [editedUseCalculatedAbility, setEditedUseCalculatedAbility] = createSignal(safeUseCalculatedAbility())

  const modifierTotals = () => getEquipmentModifierTotals(props.character.equipment)

  createEffect(on(() => props.character.id, () => {
    setEditedScores(safeScores())
    setEditedSaves(safeSaves())
    setEditedAbilityOverrides(safeAbilityOverrides())
    setEditedUseCalculatedAbility(safeUseCalculatedAbility())
  }))

  const handleSave = () => {
    props.onUpdate({
      ...props.character,
      abilityScores: editedScores(),
      savingThrows: editedSaves(),
      abilityScoreOverrides: editedAbilityOverrides(),
      useCalculatedAbilityScores: editedUseCalculatedAbility(),
    })
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEditedScores(safeScores())
    setEditedSaves(safeSaves())
    setEditedAbilityOverrides(safeAbilityOverrides())
    setEditedUseCalculatedAbility(safeUseCalculatedAbility())
    setIsEditing(false)
  }

  return (
    <EditableModule
      data-sem="ability-scores-module"
      icon={<Zap class="h-5 w-5 text-primary" />}
      title="Ability Scores"
      isEditing={isEditing()}
      onEdit={() => {
        setEditedScores(safeScores())
        setEditedSaves(safeSaves())
        setEditedAbilityOverrides(safeAbilityOverrides())
        setEditedUseCalculatedAbility(safeUseCalculatedAbility())
        setIsEditing(true)
      }}
      onSave={handleSave}
      onCancel={handleCancel}
    >
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <For each={Object.keys(ABILITY_NAMES) as AbilityKey[]}>
            {(ability) => {
              const score = () => isEditing() ? editedScores()[ability] : safeScores()[ability]
              const itemBonus = () => modifierTotals().abilityScores[ability]
              const saveItemBonus = () => modifierTotals().savingThrows[ability]
              const abilityCalculated = () => score() + itemBonus()

              const abilityField = useCalculatedValue({
                useCalculated: () =>
                  (isEditing() ? editedUseCalculatedAbility()[ability] : props.character.useCalculatedAbilityScores?.[ability]) ?? true,
                setUseCalculated: (v) => setEditedUseCalculatedAbility((prev) => ({ ...prev, [ability]: v })),
                manualValue: () =>
                  (isEditing() ? editedAbilityOverrides()[ability] : props.character.abilityScoreOverrides?.[ability]) ?? abilityCalculated(),
                setManualValue: (v) => setEditedAbilityOverrides((prev) => ({ ...prev, [ability]: v })),
                calculatedValue: abilityCalculated,
                calculatedTooltip: () => {
                  const effective = abilityCalculated()
                  const mod = getAbilityModifier(effective)
                  const base = itemBonus() !== 0 ? `${score()} base + ${itemBonus()} (item) = ${effective}; ` : ""
                  return `${base}(${effective} − 10) / 2 = ${formatModifier(mod)}`
                },
              })

              const modifier = () => getAbilityModifier(abilityField.resolvedValue())
              const scoreTooltip = () => {
                const binding = abilityField.binding()
                return binding.custom ? "Custom" : binding.calculatedTooltip
              }
              const isProfSave = () => isEditing() ? editedSaves()[ability] : (safeSaves()[ability] || false)
              const savingThrowMod = () => getSavingThrowModifier(abilityField.resolvedValue(), props.character.proficiencyBonus, true, saveItemBonus())
              const saveTooltip = () => {
                const parts = [`${ABILITY_ABBREVIATIONS[ability]} ${formatModifier(modifier())}`, `Prof +${props.character.proficiencyBonus}`]
                if (saveItemBonus() !== 0) parts.push(`Item ${formatModifier(saveItemBonus())}`)
                return `${parts.join(" + ")} = ${formatModifier(savingThrowMod())}`
              }

              return (
                <div class="text-center space-y-2">
                  <div class="font-medium text-sm text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</div>
                  {isEditing() ? (
                    <div class="space-y-2">
                      <NumericInput
                        min={1} max={30}
                        aria-label={ABILITY_NAMES[ability]}
                        value={editedScores()[ability]}
                        onChange={(v) => setEditedScores((prev) => ({ ...prev, [ability]: v }))}
                        class="text-center text-2xl font-bold h-16"
                      />
                      <div class="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <span>Effective:</span>
                        <CalculatedValue
                          label={`${ABILITY_NAMES[ability]} effective score`}
                          editable={true}
                          class="text-xs"
                          {...abilityField.binding()}
                        />
                      </div>
                      <label class="flex items-center gap-1 justify-center text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label={`${ABILITY_NAMES[ability]} saving throw`}
                          checked={isProfSave()}
                          onChange={(e) => setEditedSaves((prev) => ({ ...prev, [ability]: e.currentTarget.checked }))}
                        />
                        Save Prof
                      </label>
                    </div>
                  ) : (
                    <Tooltip
                      content={scoreTooltip()}
                      triggerFocusable
                      triggerClass="w-full"
                    >
                      <div class="ring-1 ring-black rounded-lg p-3 w-full">
                        <div class="flex items-center justify-center gap-1">
                          <div class="text-2xl font-bold text-primary">{abilityField.resolvedValue()}</div>
                          <Show when={itemBonus() !== 0}>
                            <Badge variant="outline" class="text-[10px] px-1 py-0">item {formatModifier(itemBonus())}</Badge>
                          </Show>
                        </div>
                        <div class="text-lg font-semibold text-foreground">{formatModifier(modifier())}</div>
                      </div>
                    </Tooltip>
                  )}
                  {!isEditing() && isProfSave() && (
                    <Tooltip
                      content={saveTooltip()}
                      triggerFocusable
                      triggerClass="w-full"
                    >
                      <div class="space-y-1 w-full">
                        <div class="text-xs">Saving Throw</div>
                        <div class="flex items-center justify-center gap-1">
                          <span class="font-medium">
                            {formatModifier(savingThrowMod())}
                          </span>
                          <Badge variant="secondary" class="text-xs px-1 py-0">Prof</Badge>
                        </div>
                      </div>
                    </Tooltip>
                  )}
                </div>
              )
            }}
          </For>
        </div>
    </EditableModule>
  )
}

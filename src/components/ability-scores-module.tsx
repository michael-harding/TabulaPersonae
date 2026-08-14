import { createSignal, createEffect, createMemo, on, For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, formatModifier, formatTerm, formatBonusTerm, getSavingThrowModifier, getEquipmentModifierTotals, getActiveFeatureEffects, getCalculatedAbilityScore, getAbilityScoreBaseMax, ABILITY_ABBREVIATIONS, ABILITY_TITLE_CASE } from "@/lib/character-utils"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { EditableModule } from "@/components/editable-module"
import { NumericInput } from "@/components/ui/numeric-input"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import Zap from "lucide-solid/icons/zap"

interface AbilityScoresModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

const ABILITY_NAMES = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
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

  const modifierTotals = createMemo(() => getEquipmentModifierTotals(props.character.equipment))
  const featureTotals = createMemo(() => getActiveFeatureEffects(props.character))

  createEffect(on(() => props.character.id, () => {
    setEditedScores(safeScores())
    setEditedSaves(safeSaves())
    setEditedAbilityOverrides(safeAbilityOverrides())
    setEditedUseCalculatedAbility(safeUseCalculatedAbility())
  }))

  const persist = () => {
    props.onUpdate({
      ...props.character,
      abilityScores: editedScores(),
      savingThrows: editedSaves(),
      abilityScoreOverrides: editedAbilityOverrides(),
      useCalculatedAbilityScores: editedUseCalculatedAbility(),
    })
  }
  const handleSave = () => { persist(); setIsEditing(false) }
  const handleSaveKeepEditing = () => { persist() }
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
      onSaveKeepEditing={handleSaveKeepEditing}
      onCancel={handleCancel}
    >
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <For each={Object.keys(ABILITY_NAMES) as AbilityKey[]}>
            {(ability) => {
              const score = () => isEditing() ? editedScores()[ability] : safeScores()[ability]
              const itemGrants = () => modifierTotals().abilityScoreGrants[ability]
              const featureGrants = () => featureTotals().abilityScoreGrants[ability]
              const floor = () => {
                const itemFloor = modifierTotals().abilityScoreFloors[ability]
                const featureFloor = featureTotals().abilityScoreFloors[ability]
                if (itemFloor === undefined && featureFloor === undefined) return undefined
                return Math.max(itemFloor ?? -Infinity, featureFloor ?? -Infinity)
              }
              const cap = () => {
                const itemCap = modifierTotals().abilityScoreMaxCaps[ability]
                const featureCap = featureTotals().abilityScoreMaxCaps[ability]
                if (itemCap === undefined && featureCap === undefined) return undefined
                return Math.min(itemCap ?? Infinity, featureCap ?? Infinity)
              }
              const baseMax = () => getAbilityScoreBaseMax(props.character, ability)
              const saveItemBonus = () => modifierTotals().savingThrows[ability]
              const abilityCalculated = () =>
                getCalculatedAbilityScore({ ...props.character, abilityScores: { ...safeScores(), [ability]: score() } }, ability)

              const abilityField = useCalculatedValue({
                useCalculated: () =>
                  (isEditing() ? editedUseCalculatedAbility()[ability] : props.character.useCalculatedAbilityScores?.[ability]) ?? true,
                setUseCalculated: (v) => setEditedUseCalculatedAbility((prev) => ({ ...prev, [ability]: v })),
                manualValue: () =>
                  (isEditing() ? editedAbilityOverrides()[ability] : props.character.abilityScoreOverrides?.[ability]) ?? abilityCalculated(),
                setManualValue: (v) => setEditedAbilityOverrides((prev) => ({ ...prev, [ability]: v })),
                calculatedValue: abilityCalculated,
                calculatedTooltip: () => {
                  const grants = [...itemGrants(), ...featureGrants()]
                  const bonusTotal = grants.reduce((sum, g) => sum + g.amount, 0)
                  const withBonus = score() + bonusTotal
                  const effective = abilityCalculated()
                  const mod = getAbilityModifier(effective)
                  const flooredNote = floor() !== undefined && effective > withBonus ? `, floor ${floor()}` : ""
                  const cappedNote = cap() !== undefined && effective < withBonus ? `, cap ${cap()}` : ""
                  const terms = grants.map((g) => formatTerm(g.amount, g.source)).join("")
                  const base = (grants.length > 0 || flooredNote || cappedNote) ? `${score()} base${terms}${flooredNote}${cappedNote} = ${effective}; ` : ""
                  return `${base}(${effective} − 10) / 2 = ${formatModifier(mod)}`
                },
              })

              const modifier = () => getAbilityModifier(abilityField.resolvedValue())
              const scoreTooltip = () => {
                const binding = abilityField.binding()
                return binding.custom ? "Custom" : binding.calculatedTooltip
              }
              const grantedBySave = () => featureTotals().savingThrowProficiencies[ability]
              const ownProfSave = () => isEditing() ? editedSaves()[ability] : (safeSaves()[ability] || false)
              const isProfSave = () => ownProfSave() || !!grantedBySave()
              const savingThrowMod = () => getSavingThrowModifier(abilityField.resolvedValue(), props.character.proficiencyBonus, true, saveItemBonus())
              const saveTooltip = () => `${formatModifier(modifier())} (${ABILITY_TITLE_CASE[ability]})`
                + formatTerm(props.character.proficiencyBonus ?? 0, "Prof")
                + formatBonusTerm(saveItemBonus(), "Item")

              return (
                <div class="text-center space-y-2">
                  <div class="font-medium text-sm text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</div>
                  {isEditing() ? (
                    <div class="space-y-2">
                      <NumericInput
                        min={1} max={baseMax()}
                        aria-label={ABILITY_NAMES[ability]}
                        value={editedScores()[ability]}
                        onChange={(v) => setEditedScores((prev) => ({ ...prev, [ability]: v }))}
                        class="text-center text-2xl font-bold h-16"
                      />
                      <CalculatedValue
                        label={`${ABILITY_NAMES[ability]} Effective`}
                        labelPosition="left"
                        labelClass="text-xs text-muted-foreground"
                        editable={true}
                        class="justify-center"
                        {...abilityField.binding()}
                      />
                      <Show
                        when={grantedBySave()}
                        fallback={
                          <Checkbox
                            aria-label={`${ABILITY_NAMES[ability]} saving throw`}
                            checked={ownProfSave()}
                            onChange={(checked) => setEditedSaves((prev) => ({ ...prev, [ability]: checked }))}
                            label="Save Prof"
                            labelClass="text-xs cursor-pointer"
                            containerClass="justify-center gap-1"
                          />
                        }
                      >
                        <Tooltip content={`Granted by ${grantedBySave()}`} triggerFocusable>
                          <Checkbox
                            aria-label={`${ABILITY_NAMES[ability]} saving throw`}
                            checked
                            disabled
                            label="Save Prof"
                            labelClass="text-xs cursor-pointer"
                            containerClass="justify-center gap-1"
                          />
                        </Tooltip>
                      </Show>
                    </div>
                  ) : (
                    <Tooltip
                      content={scoreTooltip()}
                      triggerFocusable
                      triggerClass="w-full"
                    >
                      <div class="ring-1 ring-black rounded-lg p-3 w-full">
                        <div class="text-2xl font-bold text-primary">{abilityField.resolvedValue()}</div>
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

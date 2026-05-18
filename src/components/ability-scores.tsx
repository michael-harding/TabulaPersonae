import { createSignal, createEffect, on, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, formatModifier, getSavingThrowModifier } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Zap from "lucide-solid/icons/zap"
import Save from "lucide-solid/icons/save"
import Edit from "lucide-solid/icons/edit"

interface AbilityScoresProps {
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

export function AbilityScores(props: AbilityScoresProps) {
  const safeScores = () => props.character.abilityScores || DEFAULT_SCORES
  const safeSaves = () => props.character.savingThrows || DEFAULT_SAVES

  const [isEditing, setIsEditing] = createSignal(false)
  const [editedScores, setEditedScores] = createSignal(safeScores())
  const [editedSaves, setEditedSaves] = createSignal(safeSaves())

  createEffect(on(() => props.character.id, () => {
    setEditedScores(safeScores())
    setEditedSaves(safeSaves())
  }))

  const handleSave = () => {
    props.onUpdate({ ...props.character, abilityScores: editedScores(), savingThrows: editedSaves() })
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEditedScores(safeScores())
    setEditedSaves(safeSaves())
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Zap class="h-5 w-5 text-primary" />
            {isEditing() ? "Edit Ability Scores" : "Ability Scores"}
          </div>
          {!isEditing() && (
            <Button variant="outline" size="sm" aria-label="Edit" onClick={() => { setEditedScores(safeScores()); setEditedSaves(safeSaves()); setIsEditing(true) }}>
              <Edit class="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <For each={Object.keys(ABILITY_NAMES) as AbilityKey[]}>
            {(ability) => {
              const score = () => isEditing() ? editedScores()[ability] : safeScores()[ability]
              const modifier = () => getAbilityModifier(score())
              const isProfSave = () => isEditing() ? editedSaves()[ability] : (safeSaves()[ability] || false)

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
                    <div class="ring-1 rounded-lg p-3">
                      <div class="text-2xl font-bold text-primary">{score()}</div>
                      <div class="text-lg font-semibold text-foreground">{formatModifier(modifier())}</div>
                    </div>
                  )}
                  {!isEditing() && isProfSave() && (
                    <div class="space-y-1">
                      <div class="text-xs">Saving Throw</div>
                      <div class="flex items-center justify-center gap-1">
                        <span class="font-medium">
                          {formatModifier(getSavingThrowModifier(safeScores()[ability], props.character.proficiencyBonus, true))}
                        </span>
                        <Badge variant="secondary" class="text-xs px-1 py-0">Prof</Badge>
                      </div>
                    </div>
                  )}
                </div>
              )
            }}
          </For>
        </div>
        {isEditing() && (
          <div class="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} class="gap-2"><Save class="h-4 w-4" />Save Changes</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

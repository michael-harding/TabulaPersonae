"use client"

import { useState, useEffect } from "react"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, formatModifier, getSavingThrowModifier } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, Save, Edit } from "lucide-react"

interface AbilityScoresProps {
  character: Character
  onUpdate: (character: Character) => void
}

const ABILITY_NAMES: { [K in keyof Character["abilityScores"]]: string } = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

const ABILITY_ABBREVIATIONS: { [K in keyof Character["abilityScores"]]: string } = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

export function AbilityScores({ character, onUpdate }: AbilityScoresProps) {
  const safeAbilityScores = character.abilityScores || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editedScores, setEditedScores] = useState(safeAbilityScores)

  // Update edited scores when character prop changes
  useEffect(() => {
    const newSafeAbilityScores = character.abilityScores || {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }
    setEditedScores(newSafeAbilityScores)
  }, [character.id])

  const handleSave = () => {
    const updated = {
      ...character,
      abilityScores: editedScores,
    }
    onUpdate(updated)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedScores(safeAbilityScores)
    setIsEditing(false)
  }

  const updateScore = (ability: keyof Character["abilityScores"], value: number) => {
    setEditedScores((prev) => ({
      ...prev,
      [ability]: Math.max(1, Math.min(30, value)),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Ability Scores
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(Object.keys(ABILITY_NAMES) as Array<keyof Character["abilityScores"]>).map((ability) => {
            const score = isEditing ? editedScores[ability] : safeAbilityScores[ability]
            const modifier = getAbilityModifier(score)
            const abilityScore = character.abilityScores[ability]
            const isProficient = character.savingThrows?.[ability] || false
            const savingThrowModifier = getSavingThrowModifier(
              abilityScore,
              character.proficiencyBonus,
              isProficient
            )
            const isProficientSave = character.savingThrows?.[ability] || false

            return (
              <div key={ability} className="text-center space-y-2">
                <div className="font-medium text-sm text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</div>

                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={score}
                    onChange={(e) => updateScore(ability, Number.parseInt(e.target.value) || 1)}
                    className="text-center text-2xl font-bold h-16"
                  />
                ) : (
                  <div className="ring-1 rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary">{score}</div>
                    <div className="text-lg font-semibold text-foreground">{formatModifier(modifier)}</div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-xs">Saving Throw</div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{formatModifier(savingThrowModifier)}</span>
                    {isProficientSave && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Prof
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

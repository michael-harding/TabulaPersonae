"use client"

import { useState } from "react"
import type { Character } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Shield, Heart, Save, Edit, Plus, Minus } from "lucide-react"

interface CombatStatsProps {
  character: Character
  onUpdate: (character: Character) => void
}

export function CombatStats({ character, onUpdate }: CombatStatsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCharacter, setEditedCharacter] = useState({
    ...character,
    hitPoints: {
      current: character.hitPoints?.current ?? 0,
      maximum: character.hitPoints?.maximum ?? 1,
      temporary: character.hitPoints?.temporary ?? 0,
    },
    armorClass: character.armorClass || 10,
    initiative: character.initiative || 0,
    speed: character.speed || 30,
    proficiencyBonus: character.proficiencyBonus || 2,
  })

  const handleSave = () => {
    onUpdate(editedCharacter)
    saveCharacter(editedCharacter)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCharacter({
      ...character,
      hitPoints: {
        current: character.hitPoints?.current ?? 0,
        maximum: character.hitPoints?.maximum ?? 1,
        temporary: character.hitPoints?.temporary ?? 0,
      },
      armorClass: character.armorClass || 10,
      initiative: character.initiative || 0,
      speed: character.speed || 30,
      proficiencyBonus: character.proficiencyBonus || 2,
    })
    setIsEditing(false)
  }

  const updateField = (field: keyof Character | keyof typeof editedCharacter.hitPoints, value: any) => {
    if (field === "current" || field === "maximum" || field === "temporary") {
      setEditedCharacter((prev) => ({
        ...prev,
        hitPoints: {
          ...prev.hitPoints,
          [field]: value,
        },
      }))
    } else {
      setEditedCharacter((prev) => ({ ...prev, [field]: value }))
    }
  }

  const adjustHitPoints = (amount: number) => {
    const currentHP = character.hitPoints?.current ?? 0
    const maxHP = character.hitPoints?.maximum ?? 1
    const tempHP = character.hitPoints?.temporary ?? 0

    const newHP = Math.max(0, Math.min(maxHP + tempHP, currentHP + amount))
    const updated = {
      ...character,
      hitPoints: {
        ...character.hitPoints,
        current: newHP,
      },
    }
    onUpdate(updated)
    saveCharacter(updated)
  }

  const currentHP = character.hitPoints?.current ?? 0
  const maxHP = character.hitPoints?.maximum ?? 1
  const tempHP = character.hitPoints?.temporary ?? 0
  const hpPercentage = (maxHP > 0 ? (currentHP / maxHP) * 100 : 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Combat Stats
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hit Points */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              Hit Points
            </Label>
            {!isEditing && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => adjustHitPoints(-1)} disabled={currentHP <= 0}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => adjustHitPoints(1)} disabled={currentHP >= maxHP}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Current</Label>
                <Input
                  type="number"
                  min="0"
                  value={editedCharacter.hitPoints?.current ?? 0}
                  onChange={(e) => updateField("current", Number.parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Maximum</Label>
                <Input
                  type="number"
                  min="1"
                  value={editedCharacter.hitPoints?.maximum ?? 1}
                  onChange={(e) => updateField("maximum", Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label className="text-xs">Temporary</Label>
                <Input
                  type="number"
                  min="0"
                  value={editedCharacter.hitPoints?.temporary ?? 0}
                  onChange={(e) => updateField("temporary", Number.parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {currentHP}
                  {tempHP > 0 && <span className="text-accent">+{tempHP}</span>}
                  <span className="text-muted-foreground">/{maxHP}</span>
                </span>
                <span className="text-sm text-muted-foreground">{Math.round(hpPercentage)}%</span>
              </div>
              <Progress value={hpPercentage} className="h-2" />
            </div>
          )}
        </div>

        {/* Other Combat Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Label className="text-sm text-muted-foreground">Armor Class</Label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                value={editedCharacter.armorClass || 10}
                onChange={(e) => updateField("armorClass", Number.parseInt(e.target.value) || 10)}
                className="text-center text-xl font-bold mt-1"
              />
            ) : (
              <div className="text-2xl font-bold text-primary mt-1">{character.armorClass || 10}</div>
            )}
          </div>

          <div className="text-center">
            <Label className="text-sm text-muted-foreground">Initiative</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editedCharacter.initiative || 0}
                onChange={(e) => updateField("initiative", Number.parseInt(e.target.value) || 0)}
                className="text-center text-xl font-bold mt-1"
              />
            ) : (
              <div className="text-2xl font-bold text-primary mt-1">
                {(character.initiative || 0) >= 0 ? "+" : ""}
                {character.initiative || 0}
              </div>
            )}
          </div>

          <div className="text-center">
            <Label className="text-sm text-muted-foreground">Speed</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                value={editedCharacter.speed || 30}
                onChange={(e) => updateField("speed", Number.parseInt(e.target.value) || 30)}
                className="text-center text-xl font-bold mt-1"
              />
            ) : (
              <div className="text-2xl font-bold text-primary mt-1">{character.speed || 30} ft</div>
            )}
          </div>

          <div className="text-center">
            <Label className="text-sm text-muted-foreground">Proficiency Bonus</Label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                value={editedCharacter.proficiencyBonus || 2}
                onChange={(e) => updateField("proficiencyBonus", Number.parseInt(e.target.value) || 2)}
                className="text-center text-xl font-bold mt-1"
              />
            ) : (
              <div className="text-2xl font-bold text-primary mt-1">+{character.proficiencyBonus || 2}</div>
            )}
          </div>
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

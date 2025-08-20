"use client"

import { useState } from "react"
import type { Character } from "@/lib/character-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Save } from "lucide-react"

interface CharacterBasicInfoProps {
  character: Character
  onUpdate: (character: Character) => void
}

const RACES = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Dragonborn",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Tiefling",
  "Aasimar",
  "Genasi",
  "Goliath",
  "Tabaxi",
  "Other",
]

const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Artificer",
  "Other",
]

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
]

export function CharacterBasicInfo({ character, onUpdate }: CharacterBasicInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCharacter, setEditedCharacter] = useState(character)

  const handleSave = () => {
    onUpdate(editedCharacter)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCharacter(character)
    setIsEditing(false)
  }

  const updateField = (field: keyof Character, value: any) => {
    setEditedCharacter((prev) => ({ ...prev, [field]: value }))
  }

  if (!isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Character Information
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <p className="text-lg font-semibold">{character.name || "Unnamed Character"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Level</Label>
              <p className="text-lg font-semibold">{character.level}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Race</Label>
              <p className="text-lg">{character.race || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Class</Label>
              <p className="text-lg">{character.class || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Background</Label>
              <p className="text-lg">{character.background || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Alignment</Label>
              <p className="text-lg">{character.alignment || "Not specified"}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Experience Points</Label>
            <p className="text-lg font-semibold">{(character.experiencePoints || 0).toLocaleString()} XP</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Edit Character Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Character Name</Label>
            <Input
              id="name"
              value={editedCharacter.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter character name"
            />
          </div>
          <div>
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              type="number"
              min="1"
              max="20"
              value={editedCharacter.level}
              onChange={(e) => updateField("level", Number.parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label htmlFor="race">Race</Label>
            <Select value={editedCharacter.race} onValueChange={(value) => updateField("race", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select race" />
              </SelectTrigger>
              <SelectContent>
                {RACES.map((race) => (
                  <SelectItem key={race} value={race}>
                    {race}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="class">Class</Label>
            <Select value={editedCharacter.class} onValueChange={(value) => updateField("class", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="background">Background</Label>
            <Input
              id="background"
              value={editedCharacter.background}
              onChange={(e) => updateField("background", e.target.value)}
              placeholder="Enter background"
            />
          </div>
          <div>
            <Label htmlFor="alignment">Alignment</Label>
            <Select value={editedCharacter.alignment} onValueChange={(value) => updateField("alignment", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENTS.map((alignment) => (
                  <SelectItem key={alignment} value={alignment}>
                    {alignment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="xp">Experience Points</Label>
          <Input
            id="xp"
            type="number"
            min="0"
            value={editedCharacter.experiencePoints}
            onChange={(e) => updateField("experiencePoints", Number.parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import type { Character } from "@/lib/character-types"
import { getSkillModifier, formatModifier, getSavingThrowModifier } from "@/lib/character-utils"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Save, Edit, Plus, X } from "lucide-react"

interface SkillsProficienciesProps {
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
  strength: "Str",
  dexterity: "Dex",
  constitution: "Con",
  intelligence: "Int",
  wisdom: "Wis",
  charisma: "Cha",
}

const SKILL_ABILITY_MAP: { [K in keyof Character["skills"]]: keyof Character["abilityScores"] } = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
}

const SKILL_DISPLAY_NAMES: { [K in keyof Character["skills"]]: string } = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
}

export function SkillsProficiencies({ character, onUpdate }: SkillsProficienciesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCharacter, setEditedCharacter] = useState(character)
  const [newLanguage, setNewLanguage] = useState("")
  const [newProficiency, setNewProficiency] = useState("")

  const handleSave = () => {
    onUpdate(editedCharacter)
    saveCharacter(editedCharacter)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCharacter(character)
    setIsEditing(false)
    setNewLanguage("")
    setNewProficiency("")
  }

  const toggleSkillProficiency = (skillName: keyof Character["skills"]) => {
    setEditedCharacter((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillName]: {
          ...prev.skills?.[skillName],
          proficient: !prev.skills?.[skillName]?.proficient,
          expertise: prev.skills?.[skillName]?.proficient ? false : prev.skills?.[skillName]?.expertise || false,
        },
      },
    }))
  }

  const toggleSkillExpertise = (skillName: keyof Character["skills"]) => {
    setEditedCharacter((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillName]: {
          ...prev.skills?.[skillName],
          expertise: !prev.skills?.[skillName]?.expertise,
          proficient: prev.skills?.[skillName]?.expertise ? prev.skills?.[skillName]?.proficient || false : true,
        },
      },
    }))
  }

  const toggleSavingThrowProficiency = (ability: keyof Character["abilityScores"]) => {
    setEditedCharacter((prev) => ({
      ...prev,
      savingThrows: {
        ...prev.savingThrows,
        [ability]: !prev.savingThrows?.[ability],
      },
    }))
  }

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setEditedCharacter((prev) => ({
        ...prev,
        languages: [...(prev.languages || []), newLanguage.trim()],
      }))
      setNewLanguage("")
    }
  }

  const removeLanguage = (language: string) => {
    setEditedCharacter((prev) => ({
      ...prev,
      languages: (prev.languages || []).filter((l) => l !== language),
    }))
  }

  const addProficiency = () => {
    if (newProficiency.trim()) {
      setEditedCharacter((prev) => ({
        ...prev,
        otherProficiencies: [...(prev.otherProficiencies || []), newProficiency.trim()],
      }))
      setNewProficiency("")
    }
  }

  const removeProficiency = (proficiency: string) => {
    setEditedCharacter((prev) => ({
      ...prev,
      otherProficiencies: (prev.otherProficiencies || []).filter((p) => p !== proficiency),
    }))
  }

  const currentCharacter = isEditing ? editedCharacter : character

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Skills & Proficiencies
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saving Throws */}
        <div>
          <h3 className="font-semibold mb-3">Saving Throws</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(Object.keys(ABILITY_NAMES) as Array<keyof Character["abilityScores"]>).map((ability) => {
              const modifier = getSavingThrowModifier(currentCharacter, ability)
              const isProficient = currentCharacter.savingThrows?.[ability] || false

              return (
                <div key={ability} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <Checkbox checked={isProficient} onCheckedChange={() => toggleSavingThrowProficiency(ability)} />
                    )}
                    <span className="text-sm font-medium">{ABILITY_ABBREVIATIONS[ability]}</span>
                    {!isEditing && isProficient && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Prof
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold">{formatModifier(modifier)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Skills */}
        <div>
          <h3 className="font-semibold mb-3">Skills</h3>
          <div className="space-y-1">
            {(Object.keys(SKILL_DISPLAY_NAMES) as Array<keyof Character["skills"]>).map((skillKey) => {
              const skill = currentCharacter.skills?.[skillKey] || { proficient: false, expertise: false }
              const ability = SKILL_ABILITY_MAP[skillKey]
              const modifier = getSkillModifier(currentCharacter, SKILL_DISPLAY_NAMES[skillKey], ability)

              return (
                <div key={skillKey} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {isEditing && (
                      <div className="flex gap-1">
                        <Checkbox
                          checked={skill.proficient}
                          onCheckedChange={() => toggleSkillProficiency(skillKey)}
                          title="Proficient"
                        />
                        <Checkbox
                          checked={skill.expertise}
                          onCheckedChange={() => toggleSkillExpertise(skillKey)}
                          title="Expertise"
                          className="border-secondary data-[state=checked]:bg-secondary"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{SKILL_DISPLAY_NAMES[skillKey]}</span>
                        <span className="text-xs text-muted-foreground">({ABILITY_ABBREVIATIONS[ability]})</span>
                        {!isEditing && (
                          <div className="flex gap-1">
                            {skill.proficient && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                Prof
                              </Badge>
                            )}
                            {skill.expertise && (
                              <Badge variant="default" className="text-xs px-1 py-0">
                                Exp
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-right min-w-[3rem]">{formatModifier(modifier)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Languages */}
        <div>
          <h3 className="font-semibold mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(currentCharacter.languages || []).map((language) => (
              <Badge key={language} variant="outline" className="gap-1">
                {language}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeLanguage(language)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                placeholder="Add language"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLanguage()}
                className="flex-1"
              />
              <Button onClick={addLanguage} size="sm" disabled={!newLanguage.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Other Proficiencies */}
        <div>
          <h3 className="font-semibold mb-3">Other Proficiencies</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(currentCharacter.otherProficiencies || []).map((proficiency) => (
              <Badge key={proficiency} variant="outline" className="gap-1">
                {proficiency}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeProficiency(proficiency)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
            {(currentCharacter.otherProficiencies || []).length === 0 && (
              <span className="text-muted-foreground text-sm">No additional proficiencies</span>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                placeholder="Add proficiency (weapons, tools, etc.)"
                value={newProficiency}
                onChange={(e) => setNewProficiency(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProficiency()}
                className="flex-1"
              />
              <Button onClick={addProficiency} size="sm" disabled={!newProficiency.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
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

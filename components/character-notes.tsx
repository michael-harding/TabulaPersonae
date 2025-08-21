"use client"

import { useState, useEffect } from "react"
import type { Character } from "@/lib/character-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { FileText, Save, Edit } from "lucide-react"

interface CharacterNotesProps {
  character: Character
  onUpdate: (character: Character) => void
}

export function CharacterNotes({ character, onUpdate }: CharacterNotesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCharacter, setEditedCharacter] = useState(character)

  // Update edited character when character prop changes
  useEffect(() => {
    setEditedCharacter(character)
  }, [character.id])

  const handleSave = () => {
    onUpdate(editedCharacter)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCharacter(character)
    setIsEditing(false)
  }

  const updateField = (field: keyof Character, value: string) => {
    setEditedCharacter((prev) => ({ ...prev, [field]: value }))
  }

  const currentCharacter = isEditing ? editedCharacter : character

  if (!isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Character Background & Notes
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personality Traits */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Personality Traits</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">
                {currentCharacter.personalityTraits || "No personality traits defined yet."}
              </p>
            </div>
          </div>

          {/* Ideals */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Ideals</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">{currentCharacter.ideals || "No ideals defined yet."}</p>
            </div>
          </div>

          {/* Bonds */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Bonds</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">{currentCharacter.bonds || "No bonds defined yet."}</p>
            </div>
          </div>

          {/* Flaws */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Flaws</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">{currentCharacter.flaws || "No flaws defined yet."}</p>
            </div>
          </div>

          <Separator />

          {/* Backstory */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Backstory</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[100px]">
              <p className="text-sm whitespace-pre-wrap">{currentCharacter.backstory || "No backstory written yet."}</p>
            </div>
          </div>

          <Separator />

          {/* General Notes */}
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Notes</h3>
            <div className="bg-muted/50 rounded-lg p-3 min-h-[100px]">
              <p className="text-sm whitespace-pre-wrap">{currentCharacter.notes || "No additional notes yet."}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Edit Character Background & Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personality Traits */}
        <div>
          <Label htmlFor="personality-traits">Personality Traits</Label>
          <Textarea
            id="personality-traits"
            value={editedCharacter.personalityTraits}
            onChange={(e) => updateField("personalityTraits", e.target.value)}
            placeholder="Describe your character's personality traits, quirks, and mannerisms..."
            rows={3}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            What makes your character unique? How do they act in different situations?
          </p>
        </div>

        {/* Ideals */}
        <div>
          <Label htmlFor="ideals">Ideals</Label>
          <Textarea
            id="ideals"
            value={editedCharacter.ideals}
            onChange={(e) => updateField("ideals", e.target.value)}
            placeholder="What principles and values drive your character..."
            rows={3}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            What motivates your character? What do they believe in most strongly?
          </p>
        </div>

        {/* Bonds */}
        <div>
          <Label htmlFor="bonds">Bonds</Label>
          <Textarea
            id="bonds"
            value={editedCharacter.bonds}
            onChange={(e) => updateField("bonds", e.target.value)}
            placeholder="Important people, places, or things your character cares about..."
            rows={3}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Who or what is most important to your character? What connects them to the world?
          </p>
        </div>

        {/* Flaws */}
        <div>
          <Label htmlFor="flaws">Flaws</Label>
          <Textarea
            id="flaws"
            value={editedCharacter.flaws}
            onChange={(e) => updateField("flaws", e.target.value)}
            placeholder="Your character's weaknesses, vices, or fears..."
            rows={3}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            What are your character's weaknesses? What might cause them trouble?
          </p>
        </div>

        <Separator />

        {/* Backstory */}
        <div>
          <Label htmlFor="backstory">Backstory</Label>
          <Textarea
            id="backstory"
            value={editedCharacter.backstory}
            onChange={(e) => updateField("backstory", e.target.value)}
            placeholder="Tell your character's story - their history, important events, and how they became who they are today..."
            rows={6}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Where did your character come from? What shaped them into who they are today?
          </p>
        </div>

        <Separator />

        {/* General Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={editedCharacter.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Campaign notes, character goals, relationships, or any other important information..."
            rows={4}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use this space for campaign-specific notes, character goals, or anything else you want to remember.
          </p>
        </div>

        <div className="flex gap-2 pt-4 border-t">
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

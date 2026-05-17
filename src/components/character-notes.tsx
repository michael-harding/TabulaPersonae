import { createSignal, createEffect, on } from "solid-js"
import type { Character } from "@/lib/character-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import FileText from "lucide-solid/icons/file-text"
import Save from "lucide-solid/icons/save"
import Edit from "lucide-solid/icons/edit"

interface CharacterNotesProps {
  character: Character
  onUpdate: (character: Character) => void
}

export function CharacterNotes(props: CharacterNotesProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [editedCharacter, setEditedCharacter] = createSignal(props.character)

  createEffect(on(() => props.character.id, () => {
    setEditedCharacter(props.character)
  }))

  const handleSave = () => {
    props.onUpdate(editedCharacter())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCharacter(props.character)
    setIsEditing(false)
  }

  const updateField = (field: keyof Character, value: string) => {
    setEditedCharacter((prev) => ({ ...prev, [field]: value }))
  }

  const current = () => isEditing() ? editedCharacter() : props.character

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <FileText class="h-5 w-5 text-primary" />
            {isEditing() ? "Edit Character Background & Notes" : "Character Background & Notes"}
          </div>
          {!isEditing() && (
            <Button variant="outline" size="sm" onClick={() => { setEditedCharacter(props.character); setIsEditing(true) }}>
              <Edit class="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        {isEditing() ? (
          <>
            <div>
              <Label for="personality-traits">Personality Traits</Label>
              <Textarea
                id="personality-traits"
                value={editedCharacter().personalityTraits}
                onInput={(e) => updateField("personalityTraits", e.currentTarget.value)}
                placeholder="Describe your character's personality traits, quirks, and mannerisms..."
                rows={3}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                What makes your character unique? How do they act in different situations?
              </p>
            </div>

            <div>
              <Label for="ideals">Ideals</Label>
              <Textarea
                id="ideals"
                value={editedCharacter().ideals}
                onInput={(e) => updateField("ideals", e.currentTarget.value)}
                placeholder="What principles and values drive your character..."
                rows={3}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                What motivates your character? What do they believe in most strongly?
              </p>
            </div>

            <div>
              <Label for="bonds">Bonds</Label>
              <Textarea
                id="bonds"
                value={editedCharacter().bonds}
                onInput={(e) => updateField("bonds", e.currentTarget.value)}
                placeholder="Important people, places, or things your character cares about..."
                rows={3}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Who or what is most important to your character? What connects them to the world?
              </p>
            </div>

            <div>
              <Label for="flaws">Flaws</Label>
              <Textarea
                id="flaws"
                value={editedCharacter().flaws}
                onInput={(e) => updateField("flaws", e.currentTarget.value)}
                placeholder="Your character's weaknesses, vices, or fears..."
                rows={3}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                What are your character's weaknesses? What might cause them trouble?
              </p>
            </div>

            <Separator />

            <div>
              <Label for="backstory">Backstory</Label>
              <Textarea
                id="backstory"
                value={editedCharacter().backstory}
                onInput={(e) => updateField("backstory", e.currentTarget.value)}
                placeholder="Tell your character's story..."
                rows={6}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Where did your character come from? What shaped them into who they are today?
              </p>
            </div>

            <Separator />

            <div>
              <Label for="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={editedCharacter().notes}
                onInput={(e) => updateField("notes", e.currentTarget.value)}
                placeholder="Campaign notes, character goals, relationships..."
                rows={4}
                class="mt-1"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Use this space for campaign-specific notes, character goals, or anything else.
              </p>
            </div>

            <div class="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} class="gap-2">
                <Save class="h-4 w-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Personality Traits</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">
                  {current().personalityTraits || "No personality traits defined yet."}
                </p>
              </div>
            </div>

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Ideals</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">{current().ideals || "No ideals defined yet."}</p>
              </div>
            </div>

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Bonds</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">{current().bonds || "No bonds defined yet."}</p>
              </div>
            </div>

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Flaws</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">{current().flaws || "No flaws defined yet."}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Backstory</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <p class="text-sm whitespace-pre-wrap">{current().backstory || "No backstory written yet."}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Notes</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <p class="text-sm whitespace-pre-wrap">{current().notes || "No additional notes yet."}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

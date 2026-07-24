import { createSignal, createEffect, on, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { EditableModule } from "@/components/editable-module"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { MarkdownContent } from "@/components/ui/markdown-content"
import FileText from "lucide-solid/icons/file-text"

interface CharacterNotesModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

export function CharacterNotesModule(props: CharacterNotesModuleProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [editedCharacter, setEditedCharacter] = createSignal(props.character)

  createEffect(on(() => props.character.id, () => {
    setEditedCharacter(props.character)
  }))

  const handleSave = () => { props.onUpdate(editedCharacter()); setIsEditing(false) }
  const handleCancel = () => { setEditedCharacter(props.character); setIsEditing(false) }

  const updateField = (field: keyof Character, value: string) => {
    setEditedCharacter((prev) => ({ ...prev, [field]: value }))
  }

  const current = () => isEditing() ? editedCharacter() : props.character
  const edition = () => props.character.edition ?? "2024"

  const PHYSICAL_FIELDS = [
    { field: "age" as const, label: "Age" },
    { field: "height" as const, label: "Height" },
    { field: "weight" as const, label: "Weight" },
    { field: "eyes" as const, label: "Eyes" },
    { field: "skin" as const, label: "Skin" },
    { field: "hair" as const, label: "Hair" },
  ]

  interface MarkdownField {
    field: "appearance" | "personalityTraits" | "ideals" | "bonds" | "flaws" | "backstory" | "alliesAndOrganizations" | "treasure" | "notes"
    label: string
    fallback: string
    minHeightClass: "min-h-[60px]" | "min-h-[100px]"
  }

  const PERSONALITY_FIELDS: MarkdownField[] = [
    { field: "personalityTraits", label: "Personality Traits", fallback: "No personality traits defined yet.", minHeightClass: "min-h-[60px]" },
    { field: "ideals", label: "Ideals", fallback: "No ideals defined yet.", minHeightClass: "min-h-[60px]" },
    { field: "bonds", label: "Bonds", fallback: "No bonds defined yet.", minHeightClass: "min-h-[60px]" },
    { field: "flaws", label: "Flaws", fallback: "No flaws defined yet.", minHeightClass: "min-h-[60px]" },
  ]
  const APPEARANCE_FIELD: MarkdownField = { field: "appearance", label: "Appearance", fallback: "No appearance description yet.", minHeightClass: "min-h-[60px]" }
  const BACKSTORY_FIELD: MarkdownField = { field: "backstory", label: "Backstory", fallback: "No backstory written yet.", minHeightClass: "min-h-[100px]" }
  const EDITION_2014_FIELDS: MarkdownField[] = [
    { field: "alliesAndOrganizations", label: "Allies & Organizations", fallback: "No allies or organizations listed yet.", minHeightClass: "min-h-[60px]" },
    { field: "treasure", label: "Treasure", fallback: "No treasure listed yet.", minHeightClass: "min-h-[60px]" },
  ]
  const NOTES_FIELD: MarkdownField = { field: "notes", label: "Notes", fallback: "No additional notes yet.", minHeightClass: "min-h-[100px]" }

  const renderMarkdownField = (f: MarkdownField) => (
    <div>
      <h2 class="font-semibold mb-2 text-sm text-muted-foreground">{f.label}</h2>
      <div class={`bg-muted/50 rounded-lg p-3 ${f.minHeightClass}`}>
        <Show when={current()[f.field]} fallback={<p class="text-sm text-muted-foreground">{f.fallback}</p>}>
          <MarkdownContent text={current()[f.field] as string} />
        </Show>
      </div>
    </div>
  )

  return (
    <EditableModule
      data-sem="character-notes-module"
      data-test="character-notes-module"
      icon={<FileText class="h-5 w-5 text-primary" />}
      title="Character Background & Notes"
      isEditing={isEditing()}
      onEdit={() => { setEditedCharacter(props.character); setIsEditing(true) }}
      onSave={handleSave}
      onCancel={handleCancel}
      contentClass="space-y-6"
    >
        {isEditing() ? (
          <>
            {/* Physical Details */}
            <div>
              <Label class="text-sm font-semibold">Physical Details</Label>
              <div class="grid grid-cols-3 gap-3 mt-2">
                {PHYSICAL_FIELDS.map(({ field, label }) => (
                  <div>
                    <Label for={`phys-${field}`} class="text-xs">{label}</Label>
                    <Input
                      id={`phys-${field}`}
                      value={(editedCharacter()[field] as string) || ""}
                      onInput={(e) => updateField(field, e.currentTarget.value)}
                      placeholder={label}
                      class="mt-1 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label for="appearance">Appearance</Label>
              <Textarea
                id="appearance"
                value={editedCharacter().appearance || ""}
                onInput={(e) => updateField("appearance", e.currentTarget.value)}
                placeholder="Describe your character's appearance..."
                rows={3}
                class="mt-1"
              />
            </div>

            <Separator />

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
            </div>

            <Separator />

            {/* 2014 edition-specific fields */}
            <Show when={edition() === "2014"}>
              <div>
                <Label for="allies-organizations">Allies & Organizations</Label>
                <Textarea
                  id="allies-organizations"
                  value={editedCharacter().alliesAndOrganizations || ""}
                  onInput={(e) => updateField("alliesAndOrganizations", e.currentTarget.value)}
                  placeholder="Allies, contacts, and organizations your character belongs to..."
                  rows={4}
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="treasure">Treasure</Label>
                <Textarea
                  id="treasure"
                  value={editedCharacter().treasure || ""}
                  onInput={(e) => updateField("treasure", e.currentTarget.value)}
                  placeholder="Valuables, gems, art objects, and other treasures..."
                  rows={3}
                  class="mt-1"
                />
              </div>

              <Separator />
            </Show>

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
            </div>
          </>
        ) : (
          <>
            {/* Physical Details */}
            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Physical Details</h2>
              <div class="grid grid-cols-3 gap-2">
                {PHYSICAL_FIELDS.map(({ field, label }) => (
                  <div>
                    <span class="text-xs text-muted-foreground">{label}: </span>
                    <span class="text-sm">{(current()[field] as string) || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {renderMarkdownField(APPEARANCE_FIELD)}

            <Separator />

            {PERSONALITY_FIELDS.map((f) => renderMarkdownField(f))}

            <Separator />

            {renderMarkdownField(BACKSTORY_FIELD)}

            <Separator />

            {/* 2014-only view */}
            <Show when={edition() === "2014"}>
              {EDITION_2014_FIELDS.map((f) => renderMarkdownField(f))}

              <Separator />
            </Show>

            {renderMarkdownField(NOTES_FIELD)}
          </>
        )}
    </EditableModule>
  )
}

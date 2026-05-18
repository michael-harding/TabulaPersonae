import { createSignal, createEffect, on, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { EditableSection } from "@/components/editable-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import FileText from "lucide-solid/icons/file-text"

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

  return (
    <EditableSection
      icon={<FileText class="h-5 w-5 text-primary" />}
      title="Character Background & Notes"
      editTitle="Edit Character Background & Notes"
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

            {/* 2024 edition-specific fields */}
            <Show when={edition() === "2024"}>
              <div>
                <Label for="class-features">Class Features</Label>
                <Textarea
                  id="class-features"
                  value={editedCharacter().classFeatures || ""}
                  onInput={(e) => updateField("classFeatures", e.currentTarget.value)}
                  placeholder="List your class features and abilities..."
                  rows={4}
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="species-traits">Species Traits</Label>
                <Textarea
                  id="species-traits"
                  value={editedCharacter().speciesTraits || ""}
                  onInput={(e) => updateField("speciesTraits", e.currentTarget.value)}
                  placeholder="List your species traits and abilities..."
                  rows={3}
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="feats">Feats</Label>
                <Textarea
                  id="feats"
                  value={editedCharacter().feats || ""}
                  onInput={(e) => updateField("feats", e.currentTarget.value)}
                  placeholder="List your feats..."
                  rows={3}
                  class="mt-1"
                />
              </div>

              <Separator />
            </Show>

            {/* 2014 edition-specific fields */}
            <Show when={edition() === "2014"}>
              <div>
                <Label for="features-traits">Features & Traits</Label>
                <Textarea
                  id="features-traits"
                  value={editedCharacter().classFeatures || ""}
                  onInput={(e) => updateField("classFeatures", e.currentTarget.value)}
                  placeholder="List your class features, racial traits, and other abilities..."
                  rows={6}
                  class="mt-1"
                />
              </div>

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
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Physical Details</h3>
              <div class="grid grid-cols-3 gap-2">
                {PHYSICAL_FIELDS.map(({ field, label }) => (
                  <div>
                    <span class="text-xs text-muted-foreground">{label}: </span>
                    <span class="text-sm">{(current()[field] as string) || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Appearance</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">{current().appearance || "No appearance description yet."}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Personality Traits</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <p class="text-sm whitespace-pre-wrap">{current().personalityTraits || "No personality traits defined yet."}</p>
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

            {/* 2024-only view */}
            <Show when={edition() === "2024"}>
              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Class Features</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <p class="text-sm whitespace-pre-wrap">{current().classFeatures || "No class features listed yet."}</p>
                </div>
              </div>

              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Species Traits</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <p class="text-sm whitespace-pre-wrap">{current().speciesTraits || "No species traits listed yet."}</p>
                </div>
              </div>

              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Feats</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <p class="text-sm whitespace-pre-wrap">{current().feats || "No feats listed yet."}</p>
                </div>
              </div>

              <Separator />
            </Show>

            {/* 2014-only view */}
            <Show when={edition() === "2014"}>
              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Features & Traits</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                  <p class="text-sm whitespace-pre-wrap">{current().classFeatures || "No features or traits listed yet."}</p>
                </div>
              </div>

              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Allies & Organizations</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <p class="text-sm whitespace-pre-wrap">{current().alliesAndOrganizations || "No allies or organizations listed yet."}</p>
                </div>
              </div>

              <div>
                <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Treasure</h3>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <p class="text-sm whitespace-pre-wrap">{current().treasure || "No treasure listed yet."}</p>
                </div>
              </div>

              <Separator />
            </Show>

            <div>
              <h3 class="font-semibold mb-2 text-sm text-muted-foreground">Notes</h3>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <p class="text-sm whitespace-pre-wrap">{current().notes || "No additional notes yet."}</p>
              </div>
            </div>
          </>
        )}
    </EditableSection>
  )
}

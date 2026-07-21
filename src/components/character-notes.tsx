import { createSignal, createEffect, on, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { EditableSection } from "@/components/editable-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { MarkdownContent } from "@/components/ui/markdown-content"
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
      data-sem="character-notes"
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

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Appearance</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <Show when={current().appearance} fallback={<p class="text-sm text-muted-foreground">No appearance description yet.</p>}>
                  <MarkdownContent text={current().appearance!} />
                </Show>
              </div>
            </div>

            <Separator />

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Personality Traits</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <Show when={current().personalityTraits} fallback={<p class="text-sm text-muted-foreground">No personality traits defined yet.</p>}>
                  <MarkdownContent text={current().personalityTraits!} />
                </Show>
              </div>
            </div>

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Ideals</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <Show when={current().ideals} fallback={<p class="text-sm text-muted-foreground">No ideals defined yet.</p>}>
                  <MarkdownContent text={current().ideals!} />
                </Show>
              </div>
            </div>

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Bonds</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <Show when={current().bonds} fallback={<p class="text-sm text-muted-foreground">No bonds defined yet.</p>}>
                  <MarkdownContent text={current().bonds!} />
                </Show>
              </div>
            </div>

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Flaws</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                <Show when={current().flaws} fallback={<p class="text-sm text-muted-foreground">No flaws defined yet.</p>}>
                  <MarkdownContent text={current().flaws!} />
                </Show>
              </div>
            </div>

            <Separator />

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Backstory</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <Show when={current().backstory} fallback={<p class="text-sm text-muted-foreground">No backstory written yet.</p>}>
                  <MarkdownContent text={current().backstory!} />
                </Show>
              </div>
            </div>

            <Separator />

            {/* 2014-only view */}
            <Show when={edition() === "2014"}>
              <div>
                <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Allies & Organizations</h2>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <Show when={current().alliesAndOrganizations} fallback={<p class="text-sm text-muted-foreground">No allies or organizations listed yet.</p>}>
                    <MarkdownContent text={current().alliesAndOrganizations!} />
                  </Show>
                </div>
              </div>

              <div>
                <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Treasure</h2>
                <div class="bg-muted/50 rounded-lg p-3 min-h-[60px]">
                  <Show when={current().treasure} fallback={<p class="text-sm text-muted-foreground">No treasure listed yet.</p>}>
                    <MarkdownContent text={current().treasure!} />
                  </Show>
                </div>
              </div>

              <Separator />
            </Show>

            <div>
              <h2 class="font-semibold mb-2 text-sm text-muted-foreground">Notes</h2>
              <div class="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <Show when={current().notes} fallback={<p class="text-sm text-muted-foreground">No additional notes yet.</p>}>
                  <MarkdownContent text={current().notes!} />
                </Show>
              </div>
            </div>
          </>
        )}
    </EditableSection>
  )
}

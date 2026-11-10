import { Show } from "solid-js"
import User from "lucide-solid/icons/user"

import type { Character } from "@/lib/character-types"
import { useModuleEdit } from "@/hooks/use-module-edit"
import { EditableModule } from "@/components/editable-module"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"

interface CharacterBasicInfoModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

const RACES = [
  "Human","Elf","Dwarf","Halfling","Dragonborn","Gnome",
  "Half-Elf","Half-Orc","Tiefling","Aasimar","Genasi","Goliath","Tabaxi","Other",
]

const SPECIES = [
  "Human","Elf","Dwarf","Halfling","Dragonborn","Gnome",
  "Orc","Tiefling","Aasimar","Goliath","Ardling","Other",
]

const CLASSES = [
  "Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin",
  "Ranger","Rogue","Sorcerer","Warlock","Wizard","Artificer","Other",
]

const ALIGNMENTS = [
  "Lawful Good","Neutral Good","Chaotic Good",
  "Lawful Neutral","True Neutral","Chaotic Neutral",
  "Lawful Evil","Neutral Evil","Chaotic Evil",
].map((a) => ({ value: a, label: a }))

// The fields this module's edit form shows (see useModuleEdit for how Save writes them)
const toDraft = (c: Character) => ({
  name: c.name || "",
  level: c.level,
  race: c.race || "",
  class: c.class || "",
  subclass: c.subclass || "",
  background: c.background || "",
  alignment: c.alignment || "",
  experiencePoints: c.experiencePoints || 0,
})

type Draft = ReturnType<typeof toDraft>

export function CharacterBasicInfoModule(props: CharacterBasicInfoModuleProps) {
  const edit = useModuleEdit({ character: () => props.character, toDraft, onUpdate: (c) => props.onUpdate(c) })

  const edition = () => props.character.edition ?? "2024"
  const raceLabel = () => edition() === "2014" ? "Race" : "Species"
  const raceList = () => edition() === "2014" ? RACES : SPECIES

  const updateField = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    edit.setDraft((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <EditableModule
      data-sem="character-basic-info-module"
      data-test="character-basic-info-module"
      icon={<User class="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Character Information"
      isEditing={edit.isEditing()}
      onEdit={edit.start}
      onSave={edit.save}
      onSaveKeepEditing={edit.commit}
      onCancel={edit.cancel}
      contentClass="space-y-4"
    >
        {edit.isEditing() ? (
          <>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="name">Character Name</Label>
                <Input id="name" value={edit.draft().name} onInput={(e) => updateField("name", e.currentTarget.value)} placeholder="Enter character name" />
              </div>
              <div>
                <Label for="level">Level</Label>
                <NumericInput id="level" min={1} max={20} value={edit.draft().level || 1} onChange={(v) => updateField("level", v)} />
              </div>
              <div>
                <Label for="race">{raceLabel()}</Label>
                <Combobox id="race" data-test="race-combobox" value={edit.draft().race} onValueChange={(v) => updateField("race", v)} options={raceList()} placeholder={`Select ${raceLabel().toLowerCase()}`} />
              </div>
              <div>
                <Label for="class">Class</Label>
                <Combobox id="class" data-test="class-combobox" value={edit.draft().class} onValueChange={(v) => updateField("class", v)} options={CLASSES} placeholder="Select class" />
              </div>
              <Show when={edition() === "2024"}>
                <div>
                  <Label for="subclass">Subclass</Label>
                  <Input id="subclass" value={edit.draft().subclass || ""} onInput={(e) => updateField("subclass", e.currentTarget.value)} placeholder="Enter subclass" />
                </div>
              </Show>
              <div>
                <Label for="background">Background</Label>
                <Input id="background" value={edit.draft().background} onInput={(e) => updateField("background", e.currentTarget.value)} placeholder="Enter background" />
              </div>
              <div>
                <Label for="alignment">Alignment</Label>
                <Select options={ALIGNMENTS} value={edit.draft().alignment} onValueChange={(v) => updateField("alignment", v)}>
                  <SelectTrigger id="alignment" data-test="alignment-select"><SelectValue placeholder="Select alignment" /></SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            </div>
            <div>
              <Label for="xp">Experience Points</Label>
              <NumericInput id="xp" min={0} value={edit.draft().experiencePoints || 0} onChange={(v) => updateField("experiencePoints", v)} />
            </div>
          </>
        ) : (
          <>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label class="text-sm font-medium text-muted-foreground">Name</Label><p class="text-lg font-semibold">{props.character.name || "Unnamed Character"}</p></div>
              <div><Label class="text-sm font-medium text-muted-foreground">Level</Label><p class="text-lg font-semibold">{props.character.level}</p></div>
              <div><Label class="text-sm font-medium text-muted-foreground">{raceLabel()}</Label><p class="text-lg">{props.character.race || "Not specified"}</p></div>
              <div>
                <Label class="text-sm font-medium text-muted-foreground">Class</Label>
                <p class="text-lg">{props.character.class || "Not specified"}</p>
              </div>
              <Show when={edition() === "2024"}>
                <div><Label class="text-sm font-medium text-muted-foreground">Subclass</Label><p class="text-lg">{props.character.subclass || "Not specified"}</p></div>
              </Show>
              <div><Label class="text-sm font-medium text-muted-foreground">Background</Label><p class="text-lg">{props.character.background || "Not specified"}</p></div>
              <div><Label class="text-sm font-medium text-muted-foreground">Alignment</Label><p class="text-lg">{props.character.alignment || "Not specified"}</p></div>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground">Experience Points</Label>
              <p class="text-lg font-semibold">{(props.character.experiencePoints || 0).toLocaleString()} XP</p>
            </div>
          </>
        )}
    </EditableModule>
  )
}

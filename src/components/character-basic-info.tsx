import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { Character, AbilityScores } from "@/lib/character-types"
import { EditableSection } from "@/components/editable-section"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import User from "lucide-solid/icons/user"

interface CharacterBasicInfoProps {
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

const CLASS_TO_SPELLCASTING_ABILITY: Record<string, keyof AbilityScores | ""> = {
  Barbarian: "", Bard: "charisma", Cleric: "wisdom", Druid: "wisdom",
  Fighter: "", Monk: "", Paladin: "charisma", Ranger: "wisdom",
  Rogue: "", Sorcerer: "charisma", Warlock: "charisma",
  Wizard: "intelligence", Artificer: "intelligence", Other: "",
}

const CLASSES = [
  "Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin",
  "Ranger","Rogue","Sorcerer","Warlock","Wizard","Artificer","Other",
]

const ALIGNMENTS = [
  "Lawful Good","Neutral Good","Chaotic Good",
  "Lawful Neutral","True Neutral","Chaotic Neutral",
  "Lawful Evil","Neutral Evil","Chaotic Evil",
]

const toEdit = (c: Character) => ({
  ...c,
  name: c.name || "",
  race: c.race || "",
  class: c.class || "",
  subclass: c.subclass || "",
  background: c.background || "",
  alignment: c.alignment || "",
  experiencePoints: c.experiencePoints || 0,
})

export function CharacterBasicInfo(props: CharacterBasicInfoProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))
  createEffect(on(() => props.character.id, () => {
    setEdited(toEdit(props.character))
  }))

  const edition = () => props.character.edition ?? "2024"
  const raceLabel = () => edition() === "2014" ? "Race" : "Species"
  const raceList = () => edition() === "2014" ? RACES : SPECIES
  const inspirationLabel = () => edition() === "2014" ? "Inspiration" : "Heroic Inspiration"

  const updateField = (field: keyof Character, value: any) => {
    if (field === "class") {
      const spellcastingAbility = CLASS_TO_SPELLCASTING_ABILITY[value] ?? ""
      setEdited((prev) => ({ ...prev, class: value, spellcastingAbility }))
    } else {
      setEdited((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = () => { props.onUpdate(edited()); setIsEditing(false) }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  return (
    <EditableSection
      icon={<User class="h-5 w-5 text-primary" />}
      title="Character Information"
      editTitle="Edit Character Information"
      isEditing={isEditing()}
      onEdit={() => { setEdited(toEdit(props.character)); setIsEditing(true) }}
      onSave={handleSave}
      onCancel={handleCancel}
      headerExtra={
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <Label for="heroic-inspiration-toggle" class="text-xs font-medium">{inspirationLabel()}</Label>
            <input
              id="heroic-inspiration-toggle"
              type="checkbox"
              checked={!!props.character.heroicInspiration}
              onChange={(e) => props.onUpdate({ ...props.character, heroicInspiration: e.currentTarget.checked })}
              class="accent-primary h-4 w-4"
              style={{ "accent-color": "#eab308" }}
            />
          </div>
        </div>
      }
      contentClass="space-y-4"
    >
        {isEditing() ? (
          <>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="name">Character Name</Label>
                <Input id="name" value={edited().name} onInput={(e) => updateField("name", e.currentTarget.value)} placeholder="Enter character name" />
              </div>
              <div>
                <Label for="level">Level</Label>
                <NumericInput id="level" min={1} max={20} value={edited().level || 1} onChange={(v) => updateField("level", v)} />
              </div>
              <div>
                <Label for="race">{raceLabel()}</Label>
                <Combobox value={edited().race} onValueChange={(v) => updateField("race", v)} options={raceList()} placeholder={`Select ${raceLabel().toLowerCase()}`} />
              </div>
              <div>
                <Label for="class">Class</Label>
                <Combobox value={edited().class} onValueChange={(v) => updateField("class", v)} options={CLASSES} placeholder="Select class" />
              </div>
              <Show when={edition() === "2024"}>
                <div>
                  <Label for="subclass">Subclass</Label>
                  <Input id="subclass" value={edited().subclass || ""} onInput={(e) => updateField("subclass", e.currentTarget.value)} placeholder="Enter subclass" />
                </div>
              </Show>
              <div>
                <Label for="background">Background</Label>
                <Input id="background" value={edited().background} onInput={(e) => updateField("background", e.currentTarget.value)} placeholder="Enter background" />
              </div>
              <div>
                <Label for="alignment">Alignment</Label>
                <Select value={edited().alignment} onValueChange={(v) => updateField("alignment", v)}>
                  <SelectTrigger><SelectValue placeholder="Select alignment" /></SelectTrigger>
                  <SelectContent>
                    <For each={ALIGNMENTS}>{(a) => <SelectItem value={a}>{a}</SelectItem>}</For>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label for="xp">Experience Points</Label>
              <NumericInput id="xp" min={0} value={edited().experiencePoints || 0} onChange={(v) => updateField("experiencePoints", v)} />
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
    </EditableSection>
  )
}

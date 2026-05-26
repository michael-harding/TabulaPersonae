import { createSignal, createEffect, on, For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSkillModifier, formatModifier, getSavingThrowModifier } from "@/lib/character-utils"
import { EditableSection } from "@/components/editable-section"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip } from "@/components/ui/tooltip"
import BookOpen from "lucide-solid/icons/book-open"
import Plus from "lucide-solid/icons/plus"
import X from "lucide-solid/icons/x"

const ABILITY_ABBREVIATIONS = {
  strength: "Str", dexterity: "Dex", constitution: "Con",
  intelligence: "Int", wisdom: "Wis", charisma: "Cha",
} as const

const SKILL_ABILITY_MAP: Record<keyof Character["skills"], keyof Character["abilityScores"]> = {
  acrobatics: "dexterity", animalHandling: "wisdom", arcana: "intelligence",
  athletics: "strength", deception: "charisma", history: "intelligence",
  insight: "wisdom", intimidation: "charisma", investigation: "intelligence",
  medicine: "wisdom", nature: "intelligence", perception: "wisdom",
  performance: "charisma", persuasion: "charisma", religion: "intelligence",
  sleightOfHand: "dexterity", stealth: "dexterity", survival: "wisdom",
}

const SKILL_DISPLAY_NAMES: Record<keyof Character["skills"], string> = {
  acrobatics: "Acrobatics", animalHandling: "Animal Handling", arcana: "Arcana",
  athletics: "Athletics", deception: "Deception", history: "History",
  insight: "Insight", intimidation: "Intimidation", investigation: "Investigation",
  medicine: "Medicine", nature: "Nature", perception: "Perception",
  performance: "Performance", persuasion: "Persuasion", religion: "Religion",
  sleightOfHand: "Sleight of Hand", stealth: "Stealth", survival: "Survival",
}

type AbilityKey = keyof Character["abilityScores"]
type SkillKey = keyof Character["skills"]

interface SkillsProficienciesProps {
  character: Character
  onUpdate: (character: Character) => void
}

export function SkillsProficiencies(props: SkillsProficienciesProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(props.character)
  const [newLanguage, setNewLanguage] = createSignal("")
  const [newProficiency, setNewProficiency] = createSignal("")

  createEffect(on(() => props.character.id, () => setEdited(props.character)))

  const current = () => isEditing() ? edited() : props.character

  const handleSave = () => { props.onUpdate(edited()); setIsEditing(false) }
  const handleCancel = () => {
    setEdited(props.character); setIsEditing(false)
    setNewLanguage(""); setNewProficiency("")
  }

  const toggleSkillProf = (skill: SkillKey) => {
    setEdited((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: {
          ...prev.skills?.[skill],
          proficient: !prev.skills?.[skill]?.proficient,
          expertise: prev.skills?.[skill]?.proficient ? false : prev.skills?.[skill]?.expertise ?? false,
        },
      },
    }))
  }

  const toggleSkillExp = (skill: SkillKey) => {
    setEdited((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: {
          ...prev.skills?.[skill],
          expertise: !prev.skills?.[skill]?.expertise,
          proficient: prev.skills?.[skill]?.expertise ? prev.skills?.[skill]?.proficient ?? false : true,
        },
      },
    }))
  }

  const toggleSkillDisadvantage = (skill: SkillKey) => {
    setEdited((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: { ...prev.skills?.[skill], disadvantage: !prev.skills?.[skill]?.disadvantage },
      },
    }))
  }

  const toggleSavingThrow = (ability: AbilityKey) => {
    setEdited((prev) => ({
      ...prev,
      savingThrows: { ...prev.savingThrows, [ability]: !prev.savingThrows?.[ability] },
    }))
  }

  const addLanguage = () => {
    if (!newLanguage().trim()) return
    setEdited((prev) => ({ ...prev, languages: [...(prev.languages ?? []), newLanguage().trim()] }))
    setNewLanguage("")
  }

  const addProficiency = () => {
    if (!newProficiency().trim()) return
    setEdited((prev) => ({ ...prev, otherProficiencies: [...(prev.otherProficiencies ?? []), newProficiency().trim()] }))
    setNewProficiency("")
  }

  return (
    <EditableSection
      icon={<BookOpen class="h-5 w-5 text-primary" />}
      title="Skills & Proficiencies"
      isEditing={isEditing()}
      onEdit={() => { setEdited(props.character); setIsEditing(true) }}
      onSave={handleSave}
      onCancel={handleCancel}
      contentClass="space-y-6"
    >
        {/* Saving Throws */}
        <div>
          <h3 class="font-semibold mb-3">Saving Throws</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <For each={Object.keys(ABILITY_ABBREVIATIONS) as AbilityKey[]}>
              {(ability) => {
                const isProficient = () => current().savingThrows?.[ability] ?? false
                const modifier = () => getSavingThrowModifier(current().abilityScores[ability], current().proficiencyBonus, isProficient())
                return (
                  <div class="flex items-center justify-between p-2 rounded border">
                    <label class={`flex items-center gap-2 ${isEditing() ? "cursor-pointer" : "cursor-default"}`}>
                      <Show when={isEditing()}>
                        <Checkbox checked={isProficient()} onChange={() => toggleSavingThrow(ability)} />
                      </Show>
                      <span class="text-sm font-medium">{ABILITY_ABBREVIATIONS[ability]}</span>
                      <Show when={!isEditing() && isProficient()}>
                        <Badge variant="secondary" class="text-xs px-1 py-0">Prof</Badge>
                      </Show>
                    </label>
                    <span class="font-semibold">{formatModifier(modifier())}</span>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        <Separator />

        {/* Skills */}
        <div>
          <h3 class="font-semibold mb-3">Skills</h3>
          <div class="columns-1 sm:columns-2 md:columns-3" style="column-gap: 1rem; column-rule: 1px solid var(--border)">
            <For each={Object.keys(SKILL_DISPLAY_NAMES) as SkillKey[]}>
              {(skillKey) => {
                const ability = SKILL_ABILITY_MAP[skillKey]
                const skill = () => current().skills?.[skillKey] ?? { proficient: false, expertise: false, disadvantage: false }
                const modifier = () => getSkillModifier(current().abilityScores[ability], current().proficiencyBonus, skill().proficient, skill().expertise)
                return (
                  <div class="break-inside-avoid flex items-center justify-between p-1 rounded hover:bg-gray-500 [&:nth-child(3n)]:mb-3">
                    <div class="flex items-center gap-3 w-full transition-colors duration-150">
                      <Show when={isEditing()}>
                        <div class="flex gap-1">
                          <Tooltip content="Proficiency (adds proficiency bonus)">
                            <Checkbox aria-label="Proficient" checked={skill().proficient} onChange={() => toggleSkillProf(skillKey)} class="border-secondary data-[checked]:bg-secondary" />
                          </Tooltip>
                          <Tooltip content="Expertise (doubles proficiency bonus)">
                            <Checkbox aria-label="Expertise" checked={skill().expertise} onChange={() => toggleSkillExp(skillKey)} />
                          </Tooltip>
                        </div>
                      </Show>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span
                            class={`font-medium ${isEditing() ? "cursor-pointer" : ""}`}
                            onClick={() => isEditing() && toggleSkillProf(skillKey)}
                          >{SKILL_DISPLAY_NAMES[skillKey]} <span class="text-xs text-muted-foreground font-normal">({ABILITY_ABBREVIATIONS[ability]})</span><Show when={!isEditing()}><span class="inline-flex gap-1 ml-1 align-middle"><Show when={skill().proficient}><Badge variant="secondary" class="text-xs px-1 py-0">Prof</Badge></Show><Show when={skill().expertise}><Badge variant="default" class="text-xs px-1 py-0">Exp</Badge></Show></span></Show></span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 justify-end min-w-[3rem]">
                      <Show when={isEditing()}>
                        <button
                          type="button"
                          title="Disadvantage"
                          aria-label="Disadvantage"
                          onClick={() => toggleSkillDisadvantage(skillKey)}
                          class={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold leading-none cursor-pointer ${(skill().disadvantage ?? false) ? "bg-destructive text-destructive-foreground" : "border border-white text-white"}`}
                        >D</button>
                      </Show>
                      <Show when={!isEditing() && (skill().disadvantage ?? false)}>
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs font-bold leading-none">D</span>
                      </Show>
                      <span class="font-semibold">{formatModifier(modifier())}</span>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        <Separator />

        {/* Senses */}
        <div>
          <h3 class="font-semibold mb-3">Senses</h3>
          <div class="grid grid-cols-3 gap-2">
            {(["perception", "insight", "investigation"] as SkillKey[]).map((skillKey) => {
              const ability = SKILL_ABILITY_MAP[skillKey]
              const skill = () => current().skills?.[skillKey] ?? { proficient: false, expertise: false }
              const passive = () => 10 + getSkillModifier(current().abilityScores[ability], current().proficiencyBonus, skill().proficient, skill().expertise)
              return (
                <div class="flex flex-col items-center p-2 rounded border text-center">
                  <span class="text-lg font-bold">{passive()}</span>
                  <span class="text-xs text-muted-foreground">Passive {SKILL_DISPLAY_NAMES[skillKey]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Languages */}
        <div>
          <h3 class="font-semibold mb-3">Languages</h3>
          <div class="flex flex-wrap gap-2 mb-3">
            <For each={current().languages ?? []}>
              {(lang) => (
                <Badge variant="outline" class="gap-1">
                  {lang}
                  <Show when={isEditing()}>
                    <Tooltip content="Remove language">
                      <Button variant="ghost" size="sm" aria-label="Remove language" class="h-auto p-0 hover:bg-transparent" onClick={() => setEdited((prev) => ({ ...prev, languages: prev.languages?.filter((l) => l !== lang) }))}>
                        <X class="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </Show>
                </Badge>
              )}
            </For>
          </div>
          <Show when={isEditing()}>
            <div class="flex gap-2">
              <Input placeholder="Add language" value={newLanguage()} onInput={(e) => setNewLanguage(e.currentTarget.value)} onKeyDown={(e) => e.key === "Enter" && addLanguage()} class="flex-1" />
              <Tooltip content="Add language">
                <Button onClick={addLanguage} size="sm" aria-label="Add language" disabled={!newLanguage().trim()}><Plus class="h-4 w-4" /></Button>
              </Tooltip>
            </div>
          </Show>
        </div>

        <Separator />

        {/* Other Proficiencies */}
        <div>
          <h3 class="font-semibold mb-3">Other Proficiencies</h3>
          <div class="flex flex-wrap gap-2 mb-3">
            <For each={current().otherProficiencies ?? []}>
              {(prof) => (
                <Badge variant="outline" class="gap-1">
                  {prof}
                  <Show when={isEditing()}>
                    <Tooltip content="Remove proficiency">
                      <Button variant="ghost" size="sm" aria-label="Remove proficiency" class="h-auto p-0 hover:bg-transparent" onClick={() => setEdited((prev) => ({ ...prev, otherProficiencies: prev.otherProficiencies?.filter((p) => p !== prof) }))}>
                        <X class="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </Show>
                </Badge>
              )}
            </For>
            <Show when={(current().otherProficiencies ?? []).length === 0}>
              <span class="text-muted-foreground text-sm">No additional proficiencies</span>
            </Show>
          </div>
          <Show when={isEditing()}>
            <div class="flex gap-2">
              <Input placeholder="Add proficiency (weapons, tools, etc.)" value={newProficiency()} onInput={(e) => setNewProficiency(e.currentTarget.value)} onKeyDown={(e) => e.key === "Enter" && addProficiency()} class="flex-1" />
              <Tooltip content="Add proficiency">
                <Button onClick={addProficiency} size="sm" aria-label="Add proficiency" disabled={!newProficiency().trim()}><Plus class="h-4 w-4" /></Button>
              </Tooltip>
            </div>
          </Show>
        </div>

    </EditableSection>
  )
}

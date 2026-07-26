import { createSignal, createEffect, createMemo, on, For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSkillModifier, getAbilityModifier, getPassiveScore, formatModifier, getSavingThrowModifier, getEffectiveAbilityScores, getEquipmentModifierTotals, getEffectiveSenses, SENSE_TYPES, SENSE_LABELS } from "@/lib/character-utils"
import { EditableModule } from "@/components/editable-module"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Separator } from "@/components/ui/separator"
import { Tooltip } from "@/components/ui/tooltip"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
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

interface SkillsProficienciesModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

function EditableTagList(props: {
  label: string
  itemLabel: string
  placeholder: string
  emptyText?: string
  ownValues: string[]
  grantedValues: string[]
  editing: boolean
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const [newValue, setNewValue] = createSignal("")
  const add = () => {
    const trimmed = newValue().trim()
    if (!trimmed) return
    props.onAdd(trimmed)
    setNewValue("")
  }
  return (
    <div>
      <h2 class="font-semibold mb-3">{props.label}</h2>
      <div class="flex flex-wrap gap-2 mb-3">
        <For each={props.ownValues}>
          {(value) => (
            <Badge variant="outline" class="gap-1">
              {value}
              <Show when={props.editing}>
                <Tooltip content={`Remove ${props.itemLabel}`}>
                  <Button variant="ghost" size="sm" aria-label={`Remove ${props.itemLabel}`} class="h-auto p-0 hover:bg-transparent" onClick={() => props.onRemove(value)}>
                    <X class="h-3 w-3" />
                  </Button>
                </Tooltip>
              </Show>
            </Badge>
          )}
        </For>
        <For each={props.grantedValues}>
          {(value) => (
            <Badge variant="secondary" class="gap-1" title="Granted by an equipped item">
              {value}
            </Badge>
          )}
        </For>
        <Show when={props.emptyText && props.ownValues.length === 0 && props.grantedValues.length === 0}>
          <span class="text-muted-foreground text-sm">{props.emptyText}</span>
        </Show>
      </div>
      <Show when={props.editing}>
        <div class="flex gap-2">
          <Input
            placeholder={props.placeholder}
            value={newValue()}
            onInput={(e) => setNewValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            class="flex-1"
          />
          <Tooltip content={`Add ${props.itemLabel}`}>
            <Button onClick={add} size="sm" aria-label={`Add ${props.itemLabel}`} disabled={!newValue().trim()}>
              <Plus class="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </Show>
    </div>
  )
}

export function SkillsProficienciesModule(props: SkillsProficienciesModuleProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(props.character)

  createEffect(on(() => props.character.id, () => setEdited(props.character)))

  const current = () => isEditing() ? edited() : props.character
  const effectiveScores = createMemo(() => getEffectiveAbilityScores(current()))
  const modifierTotals = createMemo(() => getEquipmentModifierTotals(current().equipment))
  const effectiveSenses = createMemo(() => getEffectiveSenses(current()))

  const ownDamageResistances = () => current().damageResistances ?? []
  const grantedDamageResistances = () => modifierTotals().resistances.filter((r) => !ownDamageResistances().includes(r))
  const ownDamageImmunities = () => current().damageImmunities ?? []
  const grantedDamageImmunities = () => modifierTotals().immunities.filter((r) => !ownDamageImmunities().includes(r))
  const ownDamageVulnerabilities = () => current().damageVulnerabilities ?? []
  const grantedDamageVulnerabilities = () => modifierTotals().vulnerabilities.filter((r) => !ownDamageVulnerabilities().includes(r))
  const grantedLanguages = () => modifierTotals().languages.filter((l) => !(current().languages ?? []).includes(l))
  const grantedProficiencies = () => modifierTotals().proficiencies.filter((p) => !(current().otherProficiencies ?? []).includes(p))

  const makePassiveStat = (
    skillKey: SkillKey,
    field: "passivePerception" | "passiveInsight" | "passiveInvestigation",
    useField: "useCalculatedPassivePerception" | "useCalculatedPassiveInsight" | "useCalculatedPassiveInvestigation",
  ) => {
    const ability = SKILL_ABILITY_MAP[skillKey]
    const skill = () => current().skills?.[skillKey] ?? { proficient: false, expertise: false }
    const calc = createMemo(() => getPassiveScore(effectiveScores()[ability], current().proficiencyBonus, skill().proficient, skill().expertise))
    const tooltip = createMemo(() => {
      const mod = getSkillModifier(effectiveScores()[ability], current().proficiencyBonus, skill().proficient, skill().expertise)
      return `10 + ${SKILL_DISPLAY_NAMES[skillKey]} ${formatModifier(mod)} = ${calc()}`
    })
    return {
      skillKey,
      label: `Passive ${SKILL_DISPLAY_NAMES[skillKey]}`,
      ...useCalculatedValue({
        useCalculated: () => current()[useField] ?? true,
        setUseCalculated: (v) => setEdited((prev) => ({ ...prev, [useField]: v })),
        manualValue: () => current()[field] ?? calc(),
        setManualValue: (v) => setEdited((prev) => ({ ...prev, [field]: v })),
        calculatedValue: calc,
        calculatedTooltip: tooltip,
      }),
    }
  }

  const passivePerceptionStat = makePassiveStat("perception", "passivePerception", "useCalculatedPassivePerception")
  const passiveInsightStat = makePassiveStat("insight", "passiveInsight", "useCalculatedPassiveInsight")
  const passiveInvestigationStat = makePassiveStat("investigation", "passiveInvestigation", "useCalculatedPassiveInvestigation")
  const passiveStats = [passivePerceptionStat, passiveInsightStat, passiveInvestigationStat]

  const handleSave = () => {
    const data = edited()
    const normalized = {
      ...data,
      passivePerception: passivePerceptionStat.resolvedValue(),
      passiveInsight: passiveInsightStat.resolvedValue(),
      passiveInvestigation: passiveInvestigationStat.resolvedValue(),
    }
    props.onUpdate(normalized)
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEdited(props.character); setIsEditing(false)
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

  type TagListField = "languages" | "otherProficiencies" | "damageResistances" | "damageImmunities" | "damageVulnerabilities"

  const addTag = (field: TagListField, value: string) => {
    setEdited((prev) => ({ ...prev, [field]: [...(prev[field] ?? []), value] }))
  }
  const removeTag = (field: TagListField, value: string) => {
    setEdited((prev) => ({ ...prev, [field]: (prev[field] ?? []).filter((v) => v !== value) }))
  }

  return (
    <EditableModule
      data-sem="skills-proficiencies-module"
      data-test="skills-proficiencies-module"
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
          <h2 class="font-semibold mb-3">Saving Throws</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <For each={Object.keys(ABILITY_ABBREVIATIONS) as AbilityKey[]}>
              {(ability) => {
                const isProficient = () => current().savingThrows?.[ability] ?? false
                const saveItemBonus = () => modifierTotals().savingThrows[ability]
                const modifier = () => getSavingThrowModifier(effectiveScores()[ability], current().proficiencyBonus, isProficient(), saveItemBonus())
                const abilityMod = () => getAbilityModifier(effectiveScores()[ability])
                const saveTooltip = () => {
                  const parts = [`${ABILITY_ABBREVIATIONS[ability]} ${formatModifier(abilityMod())}`]
                  if (isProficient()) parts.push(`Prof +${current().proficiencyBonus}`)
                  if (saveItemBonus() !== 0) parts.push(`Item ${formatModifier(saveItemBonus())}`)
                  return parts.length > 1 ? `${parts.join(" + ")} = ${formatModifier(modifier())}` : parts[0]
                }
                return (
                  <div class="flex items-center justify-between p-2 rounded border">
                    <Show
                      when={isEditing()}
                      fallback={
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium">{ABILITY_ABBREVIATIONS[ability]}</span>
                          <Show when={isProficient()}>
                            <Badge variant="secondary" class="text-xs px-1 py-0">Prof</Badge>
                          </Show>
                        </div>
                      }
                    >
                      <Checkbox
                        checked={isProficient()}
                        onChange={() => toggleSavingThrow(ability)}
                        label={ABILITY_ABBREVIATIONS[ability]}
                        labelClass="text-sm font-medium cursor-pointer"
                        containerClass="gap-2"
                      />
                    </Show>
                    <Tooltip content={saveTooltip()} triggerFocusable>
                      <span class="font-semibold">{formatModifier(modifier())}</span>
                    </Tooltip>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        <Separator />

        {/* Skills */}
        <div>
          <h2 class="font-semibold mb-3">Skills</h2>
          <div class="columns-1 sm:columns-2 md:columns-3" style="column-gap: 1rem; column-rule: 1px solid var(--border)">
            <For each={Object.keys(SKILL_DISPLAY_NAMES) as SkillKey[]}>
              {(skillKey) => {
                const ability = SKILL_ABILITY_MAP[skillKey]
                const skill = () => current().skills?.[skillKey] ?? { proficient: false, expertise: false, disadvantage: false }
                const modifier = () => getSkillModifier(effectiveScores()[ability], current().proficiencyBonus, skill().proficient, skill().expertise)
                const abilityMod = () => getAbilityModifier(effectiveScores()[ability])
                const skillTooltip = () => {
                  const parts = [`${ABILITY_ABBREVIATIONS[ability]} ${formatModifier(abilityMod())}`]
                  if (skill().proficient) parts.push(`Prof +${current().proficiencyBonus}`)
                  if (skill().expertise) parts.push(`Exp +${current().proficiencyBonus}`)
                  return parts.join(" + ") + (parts.length > 1 ? ` = ${formatModifier(modifier())}` : "")
                }
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
                      <Tooltip content={skillTooltip()} triggerFocusable>
                        <span class="font-semibold">{formatModifier(modifier())}</span>
                      </Tooltip>
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
          <h2 class="font-semibold mb-3">Senses</h2>
          <div class="grid grid-cols-3 gap-2">
            <For each={passiveStats}>
              {(stat) => (
                <div class="flex flex-col items-center p-2 rounded border text-center w-full">
                  <span class="text-xs text-muted-foreground">{stat.label}</span>
                  <CalculatedValue
                    class="mt-1"
                    label={stat.label.toLowerCase()}
                    editable={isEditing()}
                    {...stat.binding()}
                  />
                </div>
              )}
            </For>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <For each={SENSE_TYPES}>
              {(sense) => {
                const baseValue = () => current().senses?.[sense] ?? 0
                const itemBonus = () => modifierTotals().senses[sense]
                return (
                  <Show when={isEditing() || effectiveSenses()[sense] !== 0}>
                    <div class="flex flex-col items-center p-2 rounded border text-center w-full">
                      <span class="text-xs text-muted-foreground">{SENSE_LABELS[sense]}</span>
                      <Show when={isEditing()} fallback={
                        <span class="text-xl font-bold text-primary mt-1">{effectiveSenses()[sense]} ft</span>
                      }>
                        <NumericInput
                          min={0}
                          value={baseValue()}
                          onChange={(v) => setEdited((prev) => ({ ...prev, senses: { ...prev.senses, [sense]: v } }))}
                          class="text-center h-8 text-sm mt-1"
                          aria-label={SENSE_LABELS[sense]}
                        />
                      </Show>
                      <Show when={itemBonus() !== 0}>
                        <span class="text-xs text-muted-foreground">{formatModifier(itemBonus())} item</span>
                      </Show>
                    </div>
                  </Show>
                )
              }}
            </For>
          </div>
        </div>

        <Separator />

        {/* Damage Resistances / Immunities / Vulnerabilities */}
        <div class="space-y-4">
          <EditableTagList
            label="Damage Resistances"
            itemLabel="resistance"
            placeholder="Add resistance (e.g. Fire)"
            emptyText="No resistances"
            ownValues={ownDamageResistances()}
            grantedValues={grantedDamageResistances()}
            editing={isEditing()}
            onAdd={(v) => addTag("damageResistances", v)}
            onRemove={(v) => removeTag("damageResistances", v)}
          />
          <EditableTagList
            label="Damage Immunities"
            itemLabel="immunity"
            placeholder="Add immunity (e.g. Poison)"
            emptyText="No immunities"
            ownValues={ownDamageImmunities()}
            grantedValues={grantedDamageImmunities()}
            editing={isEditing()}
            onAdd={(v) => addTag("damageImmunities", v)}
            onRemove={(v) => removeTag("damageImmunities", v)}
          />
          <EditableTagList
            label="Damage Vulnerabilities"
            itemLabel="vulnerability"
            placeholder="Add vulnerability (e.g. Cold)"
            emptyText="No vulnerabilities"
            ownValues={ownDamageVulnerabilities()}
            grantedValues={grantedDamageVulnerabilities()}
            editing={isEditing()}
            onAdd={(v) => addTag("damageVulnerabilities", v)}
            onRemove={(v) => removeTag("damageVulnerabilities", v)}
          />
        </div>

        <Separator />

        {/* Languages */}
        <EditableTagList
          label="Languages"
          itemLabel="language"
          placeholder="Add language"
          ownValues={current().languages ?? []}
          grantedValues={grantedLanguages()}
          editing={isEditing()}
          onAdd={(v) => addTag("languages", v)}
          onRemove={(v) => removeTag("languages", v)}
        />

        <Separator />

        {/* Other Proficiencies */}
        <EditableTagList
          label="Other Proficiencies"
          itemLabel="proficiency"
          placeholder="Add proficiency (weapons, tools, etc.)"
          emptyText="No additional proficiencies"
          ownValues={current().otherProficiencies ?? []}
          grantedValues={grantedProficiencies()}
          editing={isEditing()}
          onAdd={(v) => addTag("otherProficiencies", v)}
          onRemove={(v) => removeTag("otherProficiencies", v)}
        />

    </EditableModule>
  )
}

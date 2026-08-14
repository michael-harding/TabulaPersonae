import { createSignal, For, Index, Show, type ParentProps } from "solid-js"
import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { AbilityScores, Character, Feature, FeatureEffects, FeatureKind, FeatureLevelEffect, FeatureTypeValue, ActionKind, ActionType, Skills, HitPointsMode } from "@/lib/character-types"
import { safeFeatures, remainingUses, spentFromRemaining, ABILITY_ABBREVIATIONS, SKILL_DISPLAY_NAMES, getActiveFeatureEffects, SENSE_TYPES, SENSE_LABELS, DAMAGE_TYPE_OPTIONS, CONDITIONS, SIZES } from "@/lib/character-utils"
import { DIE_SIZES } from "@/lib/dice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Tooltip } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import BookOpen from "lucide-solid/icons/book-open"
import Leaf from "lucide-solid/icons/leaf"
import Star from "lucide-solid/icons/star"
import ScrollText from "lucide-solid/icons/scroll-text"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import Pencil from "lucide-solid/icons/pencil"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Zap from "lucide-solid/icons/zap"
import Layers from "lucide-solid/icons/layers"
import X from "lucide-solid/icons/x"
import { useReadOnly } from "@/lib/read-only-context"

interface FeaturesModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

type FeatureField = 'classFeatures' | 'speciesTraits' | 'feats' | 'backgroundFeatures'

interface FeatureFieldConfig {
  kind: FeatureKind
  title: string
  singular: string
  field: FeatureField
  icon: typeof BookOpen
}

const FEATURE_FIELD_CONFIG: FeatureFieldConfig[] = [
  { kind: 'class-feature', title: 'Class Features', singular: 'Class Feature', field: 'classFeatures', icon: BookOpen },
  { kind: 'species-trait', title: 'Species Traits',  singular: 'Species Trait',  field: 'speciesTraits', icon: Leaf    },
  { kind: 'background',    title: 'Background',      singular: 'Background Feature', field: 'backgroundFeatures', icon: ScrollText },
  { kind: 'feat',          title: 'Feats',           singular: 'Feat',           field: 'feats',         icon: Star   },
]

const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  'action': 'Action',
  'bonus-action': 'Bonus Action',
  'reaction': 'Reaction',
  'other': 'Other',
}

const ACTION_TYPE_LABELS = ['Attack', 'Ability', 'Other']

const RECHARGE_ON_LABELS: Record<'' | 'short-rest' | 'long-rest', string> = {
  '': 'None',
  'short-rest': 'Short Rest',
  'long-rest': 'Long Rest',
}

const SAVE_ABILITIES: (keyof AbilityScores)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']

const SPELLCASTING_ABILITY_OPTIONS: { value: keyof AbilityScores | ''; label: string }[] = [
  { value: '', label: 'None' },
  ...SAVE_ABILITIES.map((ability) => ({ value: ability, label: ability.charAt(0).toUpperCase() + ability.slice(1) })),
]

const HIT_POINTS_MODE_OPTIONS: { value: HitPointsMode; label: string }[] = [
  { value: 'per-level', label: 'Fixed value per level after 1st' },
  { value: 'flat', label: 'Single value' },
  { value: 'rolled', label: 'Rolled Values' },
]

const SKILL_KEYS = Object.keys(SKILL_DISPLAY_NAMES) as (keyof Skills)[]

// Spellcasting Ability, Hit Points, and Size are fixed facts of a class/species, not something
// that changes at higher levels, so they get a single always-on control. The proficiency-grant
// types (and the other species-trait-shaped effects below) genuinely can be granted or expanded
// at different levels, so they keep the repeatable level-tier list. Hit Points bundles a Hit Die
// selector (used independently by Rest Modal's hit-dice-spending flow) with a choice of three Max
// HP calculation modes (flat / per-level / rolled) — see the 'Hit Points' block in FeatureForm.
// Max HP Bonus is single-tier too, but for a different reason than the other three: its value is
// a single always-scaling rate (× total character level, computed in calculateMaxHitPoints), not a
// flat amount that can stack across tiers — a second tier wouldn't have a sensible combined value
// (see the comment on the hpBonusPerLevel block in getActiveFeatureEffects). Even though its
// granting trait/feat can be picked up at any level, it needs no editable level either: a feature is
// only ever added once actually gained, and amount × current-level is already algebraically
// equivalent to 5e RAW (e.g. Tough) for any level at or after that, regardless of which level it was.
const SINGLE_EFFECT_TYPES: FeatureTypeValue[] = ['Spellcasting Ability', 'Hit Points', 'Size', 'Max HP Bonus']
// The Name field is hidden entirely for these three — the feature type itself is already the name
// (see changeFeatureType, which fills formData.name with the type string so the hidden field still
// has a value to submit/display). Max HP Bonus is deliberately excluded even though it's also a
// SINGLE_EFFECT_TYPE: a character can gain HP-bonus-per-level from more than one source, so its Name
// stays visible and user-editable to tell those sources apart.
const NAMELESS_FEATURE_TYPES: FeatureTypeValue[] = ['Spellcasting Ability', 'Hit Points', 'Size']
const TIERED_EFFECT_TYPES: FeatureTypeValue[] = [
  'Saving Throw Proficiency', 'Skill Proficiency', 'Other Proficiency',
  'Speed', 'Senses', 'Damage Resistance/Immunity/Vulnerability', 'Condition Immunity', 'Language', 'Carrying Capacity',
  'Ability Scores',
]
const FEATURE_TYPES: FeatureTypeValue[] = ['Action', ...SINGLE_EFFECT_TYPES, ...TIERED_EFFECT_TYPES]

function isTieredEffectType(t: FeatureTypeValue | ''): boolean {
  return (TIERED_EFFECT_TYPES as string[]).includes(t)
}

interface FeatureFormData {
  name: string
  description: string
  featureType: FeatureTypeValue | ''
  actionKind: ActionKind | ''
  type: string
  range: string
  uses: number
  maxUses: number
  rechargeOn: '' | 'short-rest' | 'long-rest'
  level: number
  levelEffects: FeatureLevelEffect[]
}

interface FeatureFormProps {
  initialData?: FeatureFormData
  characterLevel: number
  onSubmit: (data: FeatureFormData) => void
  onCancel: () => void
}

// Reusable picker for string-list effect fields (resistances/immunities/vulnerabilities/condition
// immunities) drawn from a closed 5e rules enum — mirrors the Skill Proficiency picker's
// Combobox+Add+Badge idiom, but for a plain string list instead of skill-keyed grants.
function ClosedListEditor(props: {
  label: string
  ariaLabel: string
  options: string[]
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [newValue, setNewValue] = createSignal('')
  const available = () => props.options.filter((o) => !props.values.includes(o))
  const add = () => {
    if (!available().includes(newValue())) return
    props.onChange([...props.values, newValue()])
    setNewValue('')
  }
  const remove = (v: string) => props.onChange(props.values.filter((x) => x !== v))
  return (
    <div class="space-y-1">
      <Label class="text-xs">{props.label}</Label>
      <Show when={props.values.length > 0}>
        <div class="flex flex-wrap gap-2 mb-2">
          <For each={props.values}>
            {(v) => (
              <Badge variant="secondary" class="gap-1.5 pr-1">
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)}>
                  <X class="h-3 w-3" />
                </button>
              </Badge>
            )}
          </For>
        </div>
      </Show>
      <Show when={available().length > 0}>
        <div class="flex gap-2" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}>
          <Combobox
            value={newValue()}
            onValueChange={setNewValue}
            options={available()}
            placeholder={`Add ${props.ariaLabel.toLowerCase()}...`}
            aria-label={props.ariaLabel}
          />
          <Button type="button" size="sm" variant="outline" onClick={add}>Add</Button>
        </div>
      </Show>
    </div>
  )
}

// Reusable picker for free-text string-list effect fields (no fixed enum) — mirrors the same
// Add+Badge idiom as ClosedListEditor, but accepts any typed value (used by Other Proficiency
// and Language, neither of which has a closed list of valid values).
function FreeTextListEditor(props: {
  label: string
  ariaLabel: string
  placeholder: string
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [newValue, setNewValue] = createSignal('')
  const add = () => {
    const trimmed = newValue().trim()
    if (!trimmed || props.values.includes(trimmed)) return
    props.onChange([...props.values, trimmed])
    setNewValue('')
  }
  const remove = (v: string) => props.onChange(props.values.filter((x) => x !== v))
  return (
    <div class="space-y-1">
      <Label class="text-xs">{props.label}</Label>
      <Show when={props.values.length > 0}>
        <div class="flex flex-wrap gap-2 mb-2">
          <For each={props.values}>
            {(v) => (
              <Badge variant="secondary" class="gap-1.5 pr-1">
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)}>
                  <X class="h-3 w-3" />
                </button>
              </Badge>
            )}
          </For>
        </div>
      </Show>
      <div class="flex gap-2">
        <Input
          aria-label={props.ariaLabel}
          value={newValue()}
          onInput={(e) => setNewValue(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={props.placeholder}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

type EffectGroupKey = 'bonus' | 'floor' | 'cap' | 'baseMax'

function anyAbilitySet(record: Partial<Record<keyof AbilityScores, number>> | undefined): boolean {
  return Object.values(record ?? {}).some((v) => v !== undefined)
}

// Whether each Ability Scores subsection should start expanded — true if it already carries
// a value, so editing an existing feature never hides data the user needs to see.
function computeInitialEffectGroups(effects: FeatureEffects): Record<EffectGroupKey, boolean> {
  return {
    bonus: anyAbilitySet(effects.abilityScores),
    floor: anyAbilitySet(effects.abilityScoreFloors),
    cap: anyAbilitySet(effects.abilityScoreMaxCaps),
    baseMax: anyAbilitySet(effects.abilityScoreBaseMax),
  }
}

function EffectGroup(props: ParentProps<{ label: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  return (
    <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
      <CollapsibleTrigger class="flex w-full items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{props.label}</span>
        <ChevronDown class="h-3.5 w-3.5 transition-transform ui-expanded:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent class="pt-2">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}

function LevelEffectRow(props: {
  featureType:
    | 'Saving Throw Proficiency' | 'Skill Proficiency' | 'Other Proficiency'
    | 'Speed' | 'Senses' | 'Damage Resistance/Immunity/Vulnerability' | 'Condition Immunity' | 'Language' | 'Carrying Capacity'
    | 'Ability Scores'
  tier: FeatureLevelEffect
  effectGroupsOpen: () => Record<EffectGroupKey, boolean>
  onEffectGroupOpenChange: (key: EffectGroupKey, open: boolean) => void
  onLevelChange: (level: number) => void
  onEffectsChange: (effects: FeatureEffects) => void
  onRemove: () => void
}) {
  const [newSkillLabel, setNewSkillLabel] = createSignal('')

  const effects = () => props.tier.effects
  const update = (patch: Partial<FeatureEffects>) => props.onEffectsChange({ ...effects(), ...patch })

  const toggleSave = (ability: keyof AbilityScores) => {
    const current = effects().savingThrowProficiencies ?? []
    const next = current.includes(ability) ? current.filter((a) => a !== ability) : [...current, ability]
    update({ savingThrowProficiencies: next.length > 0 ? next : undefined })
  }

  const availableSkills = () => {
    const granted = effects().skillProficiencies ?? []
    return SKILL_KEYS.filter((skill) => !granted.some((g) => g.skill === skill))
  }

  const addSkill = () => {
    const skill = SKILL_KEYS.find((s) => SKILL_DISPLAY_NAMES[s] === newSkillLabel())
    if (!skill) return
    const current = effects().skillProficiencies ?? []
    update({ skillProficiencies: [...current, { skill, expertise: false }] })
    setNewSkillLabel('')
  }
  const removeSkill = (skill: keyof Skills) => {
    const next = (effects().skillProficiencies ?? []).filter((g) => g.skill !== skill)
    update({ skillProficiencies: next.length > 0 ? next : undefined })
  }
  const toggleSkillExpertise = (skill: keyof Skills) => {
    const next = (effects().skillProficiencies ?? []).map((g) => (g.skill === skill ? { ...g, expertise: !g.expertise } : g))
    update({ skillProficiencies: next })
  }

  return (
    <div class="border rounded-md p-3 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Label class="text-xs whitespace-nowrap">At Level</Label>
          <NumericInput aria-label="At Level" class="w-20" min={1} max={20} value={props.tier.level} onChange={props.onLevelChange} />
        </div>
        <button
          type="button"
          aria-label={`Remove level ${props.tier.level} entry`}
          onClick={props.onRemove}
          class="text-muted-foreground hover:text-destructive"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>

      <Show when={props.featureType === 'Saving Throw Proficiency'}>
        <div class="space-y-1">
          <Label class="text-xs">Saving Throw Proficiencies</Label>
          <div class="grid grid-cols-3 gap-1">
            <For each={SAVE_ABILITIES}>
              {(ability) => (
                <Checkbox
                  checked={(effects().savingThrowProficiencies ?? []).includes(ability)}
                  onChange={() => toggleSave(ability)}
                  label={ABILITY_ABBREVIATIONS[ability]}
                  labelClass="text-xs cursor-pointer"
                  containerClass="gap-1.5"
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.featureType === 'Skill Proficiency'}>
        <div class="space-y-1">
          <Label class="text-xs">Skill Proficiencies</Label>
          <Show when={(effects().skillProficiencies ?? []).length > 0}>
            <div class="flex flex-wrap gap-2 mb-2">
              <For each={effects().skillProficiencies ?? []}>
                {(grant) => (
                  <Badge variant="secondary" class="gap-1.5 pr-1">
                    {SKILL_DISPLAY_NAMES[grant.skill]}
                    <label class="flex items-center gap-1 text-xs font-normal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grant.expertise ?? false}
                        onChange={() => toggleSkillExpertise(grant.skill)}
                      />
                      Exp
                    </label>
                    <button type="button" aria-label={`Remove ${SKILL_DISPLAY_NAMES[grant.skill]}`} onClick={() => removeSkill(grant.skill)}>
                      <X class="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </For>
            </div>
          </Show>
          <Show when={availableSkills().length > 0}>
            <div class="flex gap-2" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}>
              <Combobox
                value={newSkillLabel()}
                onValueChange={setNewSkillLabel}
                options={availableSkills().map((s) => SKILL_DISPLAY_NAMES[s])}
                placeholder="Add skill..."
                aria-label="Add skill"
              />
              <Button type="button" size="sm" variant="outline" onClick={addSkill}>Add</Button>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.featureType === 'Other Proficiency'}>
        <FreeTextListEditor
          label="Other Proficiencies (armor/weapon/tool)"
          ariaLabel="Add other proficiency"
          placeholder="e.g. Light Armor"
          values={effects().otherProficiencies ?? []}
          onChange={(next) => update({ otherProficiencies: next.length > 0 ? next : undefined })}
        />
      </Show>

      <Show when={props.featureType === 'Speed'}>
        <div class="space-y-1">
          <Label class="text-xs">Speed (ft)</Label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <Label for="fx-speed-walk" class="text-xs text-muted-foreground">Walk</Label>
              <NumericInput id="fx-speed-walk" value={effects().speed ?? 0} onChange={(v) => update({ speed: v })} />
            </div>
            <div>
              <Label for="fx-speed-fly" class="text-xs text-muted-foreground">Fly</Label>
              <NumericInput id="fx-speed-fly" min={0} value={effects().flySpeed ?? 0} onChange={(v) => update({ flySpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-swim" class="text-xs text-muted-foreground">Swim</Label>
              <NumericInput id="fx-speed-swim" min={0} value={effects().swimSpeed ?? 0} onChange={(v) => update({ swimSpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-climb" class="text-xs text-muted-foreground">Climb</Label>
              <NumericInput id="fx-speed-climb" min={0} value={effects().climbSpeed ?? 0} onChange={(v) => update({ climbSpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-burrow" class="text-xs text-muted-foreground">Burrow</Label>
              <NumericInput id="fx-speed-burrow" min={0} value={effects().burrowSpeed ?? 0} onChange={(v) => update({ burrowSpeed: v })} />
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.featureType === 'Senses'}>
        <div class="space-y-1">
          <Label class="text-xs">Senses (ft)</Label>
          <div class="grid grid-cols-2 gap-2">
            <For each={SENSE_TYPES}>
              {(sense) => (
                <div>
                  <Label for={`fx-sense-${sense}`} class="text-xs text-muted-foreground">{SENSE_LABELS[sense]}</Label>
                  <NumericInput
                    id={`fx-sense-${sense}`}
                    min={0}
                    value={effects().senses?.[sense] ?? 0}
                    onChange={(v) => update({ senses: { ...effects().senses, [sense]: v } })}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.featureType === 'Damage Resistance/Immunity/Vulnerability'}>
        <div class="space-y-3">
          <ClosedListEditor
            label="Damage Resistances"
            ariaLabel="Damage resistance"
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().resistances ?? []}
            onChange={(next) => update({ resistances: next.length > 0 ? next : undefined })}
          />
          <ClosedListEditor
            label="Damage Immunities"
            ariaLabel="Damage immunity"
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().immunities ?? []}
            onChange={(next) => update({ immunities: next.length > 0 ? next : undefined })}
          />
          <ClosedListEditor
            label="Damage Vulnerabilities"
            ariaLabel="Damage vulnerability"
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().vulnerabilities ?? []}
            onChange={(next) => update({ vulnerabilities: next.length > 0 ? next : undefined })}
          />
        </div>
      </Show>

      <Show when={props.featureType === 'Condition Immunity'}>
        <ClosedListEditor
          label="Condition Immunities"
          ariaLabel="Condition immunity"
          options={CONDITIONS}
          values={effects().conditionImmunities ?? []}
          onChange={(next) => update({ conditionImmunities: next.length > 0 ? next : undefined })}
        />
      </Show>

      <Show when={props.featureType === 'Language'}>
        <FreeTextListEditor
          label="Languages"
          ariaLabel="Add language"
          placeholder="e.g. Elvish"
          values={effects().languages ?? []}
          onChange={(next) => update({ languages: next.length > 0 ? next : undefined })}
        />
      </Show>

      <Show when={props.featureType === 'Carrying Capacity'}>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <Label for="fx-capacity-bonus" class="text-xs text-muted-foreground">Bonus (lbs)</Label>
            <NumericInput id="fx-capacity-bonus" value={effects().carryingCapacityBonus ?? 0} onChange={(v) => update({ carryingCapacityBonus: v ?? undefined })} />
          </div>
          <div>
            <Label for="fx-capacity-multiplier" class="text-xs text-muted-foreground">Multiplier (0 = none)</Label>
            <NumericInput
              id="fx-capacity-multiplier"
              min={0}
              step="0.5"
              parser={parseFloat}
              value={effects().carryingCapacityMultiplier ?? 0}
              onChange={(v) => update({ carryingCapacityMultiplier: v ?? undefined })}
            />
          </div>
        </div>
      </Show>

      <Show when={props.featureType === 'Ability Scores'}>
        <div class="space-y-3">
          <EffectGroup
            label="Ability Score"
            open={props.effectGroupsOpen().bonus}
            onOpenChange={(open) => props.onEffectGroupOpenChange('bonus', open)}
          >
            <div class="grid grid-cols-2 gap-2">
              <For each={SAVE_ABILITIES}>
                {(ability) => (
                  <div>
                    <Label for={`fx-asi-bonus-${ability}`} class="text-xs text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</Label>
                    <NumericInput
                      id={`fx-asi-bonus-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Bonus`}
                      value={effects().abilityScores?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScores: { ...effects().abilityScores, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </EffectGroup>
          <EffectGroup
            label="Ability Score Floor (minimum score, 0 = none)"
            open={props.effectGroupsOpen().floor}
            onOpenChange={(open) => props.onEffectGroupOpenChange('floor', open)}
          >
            <div class="grid grid-cols-2 gap-2">
              <For each={SAVE_ABILITIES}>
                {(ability) => (
                  <div>
                    <Label for={`fx-asi-floor-${ability}`} class="text-xs text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</Label>
                    <NumericInput
                      id={`fx-asi-floor-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Floor`}
                      min={0}
                      value={effects().abilityScoreFloors?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreFloors: { ...effects().abilityScoreFloors, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </EffectGroup>
          <EffectGroup
            label="Ability Score Max Cap (maximum score, 0 = none)"
            open={props.effectGroupsOpen().cap}
            onOpenChange={(open) => props.onEffectGroupOpenChange('cap', open)}
          >
            <div class="grid grid-cols-2 gap-2">
              <For each={SAVE_ABILITIES}>
                {(ability) => (
                  <div>
                    <Label for={`fx-asi-cap-${ability}`} class="text-xs text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</Label>
                    <NumericInput
                      id={`fx-asi-cap-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Max Cap`}
                      min={0}
                      value={effects().abilityScoreMaxCaps?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreMaxCaps: { ...effects().abilityScoreMaxCaps, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </EffectGroup>
          <EffectGroup
            label="Ability Score Base Max (raises the normal maximum, default 20)"
            open={props.effectGroupsOpen().baseMax}
            onOpenChange={(open) => props.onEffectGroupOpenChange('baseMax', open)}
          >
            <div class="grid grid-cols-2 gap-2">
              <For each={SAVE_ABILITIES}>
                {(ability) => (
                  <div>
                    <Label for={`fx-asi-basemax-${ability}`} class="text-xs text-muted-foreground">{ABILITY_ABBREVIATIONS[ability]}</Label>
                    <NumericInput
                      id={`fx-asi-basemax-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Base Max`}
                      min={0}
                      value={effects().abilityScoreBaseMax?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreBaseMax: { ...effects().abilityScoreBaseMax, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </EffectGroup>
        </div>
      </Show>
    </div>
  )
}

function FeatureForm(props: FeatureFormProps) {
  const [formData, setFormData] = createSignal<FeatureFormData>(
    props.initialData ?? { name: '', description: '', featureType: '', actionKind: '', type: '', range: '', uses: 0, maxUses: 0, rechargeOn: '', level: 1, levelEffects: [] }
  )

  // Spellcasting Ability / Hit Points / Size / Max HP Bonus aren't level-dependent — they're always
  // in force as soon as the feature exists, modeled as a single tier fixed at level 1 rather than a
  // user-editable level. This holds for Max HP Bonus too even though its granting trait/feat can be
  // picked up at any level: the feature object itself is only ever added to the character once
  // actually gained (there's no "pre-enter it, activate later" flow), and hpBonusPerLevel's amount
  // is always multiplied by the character's *current* level in calculateMaxHitPoints — which for the
  // 5e RAW math (e.g. Tough: "+2× your level when gained, +2 more per level thereafter") is
  // algebraically identical to amount × current level for any level at or after it was gained,
  // regardless of what level that was. So the tier's own level threshold never needs to be anything
  // but 1; it would only matter if a feature were added before it was actually gained, which the app
  // doesn't do.
  const singleTierEffects = () => formData().levelEffects[0]?.effects ?? {}
  const setSingleTierEffects = (effects: FeatureEffects) => setFormData((d) => ({
    ...d,
    levelEffects: [{ level: d.levelEffects[0]?.level ?? 1, effects }],
  }))

  // Local helpers for the Hit Points "rolled" mode's per-level value list — deliberately separate
  // from addLevelEffect/removeLevelEffect/updateLevelEffect below, which operate on the top-level
  // levelEffects array reserved for TIERED_EFFECT_TYPES. This list instead lives inside the single
  // level-1 tier's effects object (singleTierEffects().hitPointsRolledLevels), indexed positionally
  // (index 0 = level 1, ...) — there's exactly one roll per level, so level is never editable.
  // Always shows at least one row per level the character has reached; rows beyond the character's
  // current level are optional pre-planning entries and are the only ones that can be removed.
  const rolledLevels = () => singleTierEffects().hitPointsRolledLevels ?? []
  const rolledRowCount = () => Math.max(rolledLevels().length, props.characterLevel)
  const rolledAmountAt = (index: number) => rolledLevels()[index] ?? 0
  const updateRolledLevel = (index: number, amount: number) => {
    const next = [...rolledLevels()]
    while (next.length <= index) next.push(0)
    next[index] = amount
    setSingleTierEffects({ ...singleTierEffects(), hitPointsRolledLevels: next })
  }
  const addRolledLevel = () => {
    const next = [...rolledLevels()]
    while (next.length < rolledRowCount() + 1) next.push(0)
    setSingleTierEffects({ ...singleTierEffects(), hitPointsRolledLevels: next })
  }
  const removeRolledLevel = (index: number) => {
    const next = [...rolledLevels()]
    next[index] = 0
    // Trim trailing zeros back down, but never below the always-shown baseline of one row per
    // level already reached — those rows aren't removable, so the array shouldn't shrink past them.
    while (next.length > props.characterLevel && next[next.length - 1] === 0) next.pop()
    setSingleTierEffects({ ...singleTierEffects(), hitPointsRolledLevels: next })
  }

  const updateLevelEffect = (index: number, patch: Partial<FeatureLevelEffect>) => {
    setFormData((d) => ({ ...d, levelEffects: d.levelEffects.map((t, i) => (i === index ? { ...t, ...patch } : t)) }))
  }

  // Ability Score subsections (Bonus/Floor/Max Cap/Base Max) are individually collapsible.
  // Their open/closed state is tracked here, in the stable parent, rather than as local state
  // inside LevelEffectRow — that row is recreated on every keystroke (each edit replaces the tier
  // object, and Solid's <For> remounts children whose item reference changes), which would silently
  // discard any state kept inside it, snapping a manually-collapsed section back open on the next edit.
  const [effectGroupsOpen, setEffectGroupsOpen] = createSignal<Record<number, Record<EffectGroupKey, boolean>>>(
    Object.fromEntries((formData().levelEffects).map((t, i) => [i, computeInitialEffectGroups(t.effects)]))
  )
  const getEffectGroupsOpen = (index: number) => effectGroupsOpen()[index] ?? computeInitialEffectGroups({})
  const setEffectGroupOpen = (index: number, key: EffectGroupKey, open: boolean) =>
    setEffectGroupsOpen((g) => ({ ...g, [index]: { ...getEffectGroupsOpen(index), [key]: open } }))

  const addLevelEffect = () => {
    const newIndex = formData().levelEffects.length
    setFormData((d) => ({ ...d, levelEffects: [...d.levelEffects, { level: 1, effects: {} }] }))
    setEffectGroupsOpen((g) => ({ ...g, [newIndex]: computeInitialEffectGroups({}) }))
  }
  const removeLevelEffect = (index: number) => {
    setFormData((d) => ({ ...d, levelEffects: d.levelEffects.filter((_, i) => i !== index) }))
    setEffectGroupsOpen((g) => {
      const next: Record<number, Record<EffectGroupKey, boolean>> = {}
      for (const [kStr, v] of Object.entries(g)) {
        const k = Number(kStr)
        if (k < index) next[k] = v
        else if (k > index) next[k - 1] = v
      }
      return next
    })
  }

  const changeFeatureType = (value: string) => {
    const next = value as FeatureTypeValue | ''
    setFormData((d) => {
      if (next === d.featureType) return d
      return {
        ...d,
        featureType: next,
        // A blank Name defaults to the newly picked type string — the only way NAMELESS_FEATURE_TYPES
        // ever get a name (their Name field is hidden), and a visible starting point for every other
        // type that the user can overwrite. Never overwrites a name the user already typed.
        name: d.name.trim() === '' && next !== '' ? next : d.name,
        actionKind: next === 'Action' ? 'action' : '',
        type: '', range: '', uses: 0, maxUses: 0, rechargeOn: '',
        level: 1,
        levelEffects: (SINGLE_EFFECT_TYPES as string[]).includes(next) || isTieredEffectType(next) ? [{ level: 1, effects: {} }] : [],
      }
    })
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const data = formData()
    if (!data.name.trim()) return
    props.onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4 p-4">
      <div class="space-y-1">
        <Label for="feature-type-select">Feature Type</Label>
        <Select value={formData().featureType} onValueChange={changeFeatureType}>
          <SelectTrigger id="feature-type-select" aria-label="Feature Type">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            <For each={FEATURE_TYPES}>
              {(t) => <SelectItem value={t}>{t}</SelectItem>}
            </For>
          </SelectContent>
        </Select>
      </div>

      {/* Also shows once a name exists even with no type picked — otherwise editing a pre-existing
          untyped feature (name/description only, no mechanical effect) would hide the very fields
          needed to see or change it, with no way back in since Name only appears once type is set. */}
      <Show when={formData().featureType !== '' || formData().name.trim() !== ''}>
        <Show when={!NAMELESS_FEATURE_TYPES.includes(formData().featureType as FeatureTypeValue)}>
          <div class="space-y-1">
            <Label for="feature-name">Name</Label>
            <Input
              id="feature-name"
              value={formData().name}
              onInput={(e) => setFormData((d) => ({ ...d, name: e.currentTarget.value }))}
              placeholder="Feature name"
              required
            />
          </div>
        </Show>
        <div class="space-y-1">
          <Label for="feature-description">Description</Label>
          <Textarea
            id="feature-description"
            value={formData().description}
            onInput={(e) => setFormData((d) => ({ ...d, description: e.currentTarget.value }))}
            placeholder="Describe the feature..."
            rows={4}
          />
        </div>
      </Show>

      <Show when={formData().featureType === 'Action'}>
        <div class="space-y-4 border rounded-md p-3">
          <div class="flex items-center gap-2">
            <Label class="text-xs whitespace-nowrap">At Level</Label>
            <NumericInput aria-label="At Level" class="w-20" min={1} max={20} value={formData().level} onChange={(v) => setFormData((d) => ({ ...d, level: v }))} />
          </div>
          <div class="space-y-1">
            <Label for="feature-action-kind">Action Kind</Label>
            <Select value={formData().actionKind || 'action'} onValueChange={(v) => setFormData((d) => ({ ...d, actionKind: v as ActionKind | '' }))}>
              <SelectTrigger id="feature-action-kind" aria-label="Action Kind">
                <span class="flex-1 text-left">{ACTION_KIND_LABELS[(formData().actionKind || 'action') as ActionKind]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="bonus-action">Bonus Action</SelectItem>
                <SelectItem value="reaction">Reaction</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1">
            <Label for="feature-action-type">Type</Label>
            <Combobox
              value={formData().type}
              onValueChange={(v) => setFormData((d) => ({ ...d, type: v }))}
              options={ACTION_TYPE_LABELS}
              aria-label="Type"
            />
          </div>
          <div class="space-y-1">
            <Label for="feature-range">Range</Label>
            <Input
              id="feature-range"
              value={formData().range}
              onInput={(e) => setFormData((d) => ({ ...d, range: e.currentTarget.value }))}
              placeholder="5 ft, 30 ft, Touch, Self"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <Label for="feature-uses">Uses Spent</Label>
              <NumericInput id="feature-uses" min={0} value={formData().uses}
                onChange={(v) => setFormData((d) => ({ ...d, uses: v }))} />
            </div>
            <div class="space-y-1">
              <Label for="feature-max-uses">Max Uses (0 = unlimited)</Label>
              <NumericInput id="feature-max-uses" min={0} value={formData().maxUses}
                onChange={(v) => setFormData((d) => ({ ...d, maxUses: v, uses: 0 }))} />
            </div>
          </div>
          <div class="space-y-1">
            <Label for="feature-recharge">Recharge On</Label>
            <Select value={formData().rechargeOn} onValueChange={(v) => setFormData((d) => ({ ...d, rechargeOn: v as '' | 'short-rest' | 'long-rest' }))}>
              <SelectTrigger id="feature-recharge">
                <span class="flex-1 text-left">{RECHARGE_ON_LABELS[formData().rechargeOn]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="short-rest">Short Rest</SelectItem>
                <SelectItem value="long-rest">Long Rest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Show>

      <Show when={formData().featureType === 'Spellcasting Ability'}>
        <div class="space-y-1">
          <Label for="feature-spellcasting-ability">Spellcasting Ability</Label>
          <Select
            value={singleTierEffects().spellcastingAbility ?? ''}
            onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), spellcastingAbility: (v || undefined) as keyof AbilityScores | undefined })}
          >
            <SelectTrigger id="feature-spellcasting-ability" aria-label="Spellcasting Ability">
              <span class="flex-1 text-left">{SPELLCASTING_ABILITY_OPTIONS.find((o) => o.value === (singleTierEffects().spellcastingAbility ?? ''))?.label}</span>
            </SelectTrigger>
            <SelectContent>
              <For each={SPELLCASTING_ABILITY_OPTIONS}>
                {(o) => <SelectItem value={o.value}>{o.label}</SelectItem>}
              </For>
            </SelectContent>
          </Select>
        </div>
      </Show>

      <Show when={formData().featureType === 'Hit Points'}>
        <div class="space-y-4 border rounded-md p-3">
          <div class="space-y-1">
            <Label for="feature-hit-die">Hit Die</Label>
            <Select
              value={singleTierEffects().hitDiceSize ? String(singleTierEffects().hitDiceSize) : ''}
              onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitDiceSize: v ? Number(v) : undefined })}
            >
              <SelectTrigger id="feature-hit-die" aria-label="Hit Die">
                <span class="flex-1 text-left">{singleTierEffects().hitDiceSize ? `d${singleTierEffects().hitDiceSize}` : 'None'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <For each={DIE_SIZES}>{(s) => <SelectItem value={String(s)}>d{s}</SelectItem>}</For>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label for="feature-hp-mode">Max HP Calculation</Label>
            <Select
              value={singleTierEffects().hitPointsMode ?? 'per-level'}
              onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitPointsMode: v as HitPointsMode })}
            >
              <SelectTrigger id="feature-hp-mode" aria-label="Max HP Calculation">
                {/* SelectValue renders the raw controlled value verbatim (see select.tsx), which would
                    show the storage code ("per-level") rather than a readable label — unlike
                    FeatureTypeValue, hitPointsMode's value is persisted data, so it stays a short code
                    and this looks up its label locally instead of making the code itself the label. */}
                <span class="flex-1 text-left">{HIT_POINTS_MODE_OPTIONS.find((o) => o.value === (singleTierEffects().hitPointsMode ?? 'per-level'))?.label}</span>
              </SelectTrigger>
              <SelectContent>
                <For each={HIT_POINTS_MODE_OPTIONS}>{(o) => <SelectItem value={o.value}>{o.label}</SelectItem>}</For>
              </SelectContent>
            </Select>
          </div>

          <Show when={(singleTierEffects().hitPointsMode ?? 'per-level') === 'flat'}>
            <div class="space-y-1">
              <Label for="feature-hp-flat">Flat Max HP Value</Label>
              <NumericInput
                id="feature-hp-flat" aria-label="Flat Max HP Value" min={0}
                value={singleTierEffects().hitPointsFlatValue ?? 0}
                onChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitPointsFlatValue: v ?? undefined })}
              />
            </div>
          </Show>

          <Show when={(singleTierEffects().hitPointsMode ?? 'per-level') === 'per-level'}>
            <div class="space-y-1">
              <Label for="feature-hp-per-level">HP per Level After 1st</Label>
              <NumericInput
                id="feature-hp-per-level" aria-label="HP per Level After 1st" min={0}
                value={singleTierEffects().hitPointsPerLevelAmount ?? (Math.floor((singleTierEffects().hitDiceSize ?? 8) / 2) + 1)}
                onChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitPointsPerLevelAmount: v })}
              />
            </div>
          </Show>

          <Show when={singleTierEffects().hitPointsMode === 'rolled'}>
            <div class="space-y-2">
              <Label class="text-xs">Rolled HP by Level</Label>
              <Index each={Array.from({ length: rolledRowCount() })}>
                {(_, index) => (
                  <div class="flex items-center gap-2">
                    <Label class="text-xs whitespace-nowrap w-16">Level {index + 1}</Label>
                    <Label class="text-xs whitespace-nowrap">Rolled</Label>
                    <NumericInput aria-label={`Rolled amount for level ${index + 1}`} class="w-16" min={0}
                      value={rolledAmountAt(index)} onChange={(v) => updateRolledLevel(index, v)} />
                    <Show when={index >= props.characterLevel}>
                      <button
                        type="button"
                        aria-label={`Remove level ${index + 1} roll`}
                        onClick={() => removeRolledLevel(index)}
                        class="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </Show>
                  </div>
                )}
              </Index>
              <Button type="button" variant="outline" size="sm" class="gap-1" onClick={addRolledLevel}>
                <Plus class="h-3 w-3" />
                Add Level Roll
              </Button>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={formData().featureType === 'Size'}>
        <div class="space-y-1">
          <Label for="feature-size">Size</Label>
          <Select
            value={singleTierEffects().size ?? ''}
            onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), size: v || undefined })}
          >
            <SelectTrigger id="feature-size" aria-label="Size"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              <For each={SIZES}>{(s) => <SelectItem value={s}>{s}</SelectItem>}</For>
            </SelectContent>
          </Select>
        </div>
      </Show>

      <Show when={formData().featureType === 'Max HP Bonus'}>
        <div class="space-y-1">
          <Label for="feature-hp-bonus-per-level" class="text-xs">Max HP Bonus (per level)</Label>
          <NumericInput
            id="feature-hp-bonus-per-level"
            aria-label="Max HP Bonus (per level)"
            value={singleTierEffects().hpBonusPerLevel ?? 0}
            onChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hpBonusPerLevel: v ?? undefined })}
          />
        </div>
      </Show>

      <Show when={isTieredEffectType(formData().featureType)}>
        <div class="space-y-3">
          <Index each={formData().levelEffects}>
            {(tier, i) => (
              <LevelEffectRow
                featureType={formData().featureType as
                  | 'Saving Throw Proficiency' | 'Skill Proficiency' | 'Other Proficiency'
                  | 'Speed' | 'Senses' | 'Damage Resistance/Immunity/Vulnerability' | 'Condition Immunity' | 'Language' | 'Carrying Capacity'
                  | 'Ability Scores'}
                tier={tier()}
                effectGroupsOpen={() => getEffectGroupsOpen(i)}
                onEffectGroupOpenChange={(key, open) => setEffectGroupOpen(i, key, open)}
                onLevelChange={(level) => updateLevelEffect(i, { level })}
                onEffectsChange={(effects) => updateLevelEffect(i, { effects })}
                onRemove={() => removeLevelEffect(i)}
              />
            )}
          </Index>
          <Button type="button" variant="outline" size="sm" class="gap-1" onClick={addLevelEffect}>
            <Plus class="h-3 w-3" />
            Add Level
          </Button>
        </div>
      </Show>

      <div class="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}

export function FeaturesModule(props: FeaturesModuleProps) {
  const isReadOnly = useReadOnly()
  const [isAddOpen, setIsAddOpen] = createSignal<FeatureKind | null>(null)
  const [editingFeature, setEditingFeature] = createSignal<Feature | null>(null)
  const [expandedSections, setExpandedSections] = createPersistedSetSignal<FeatureKind>(
    `dnd-collapsible-features-${props.character.id}`,
    ['class-feature', 'species-trait', 'feat', 'background']
  )

  const toggleExpanded = (kind: FeatureKind, open: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      open ? next.add(kind) : next.delete(kind)
      return next
    })
  }

  const handleAdd = (kind: FeatureKind, field: FeatureField, data: FeatureFormData) => {
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      description: data.description,
      source: kind,
      featureType: data.featureType,
      actionKind: data.actionKind || undefined,
      type: (data.actionKind && data.type) ? data.type as ActionType : undefined,
      range: (data.actionKind && data.range) ? data.range : undefined,
      level: data.actionKind ? (data.level || undefined) : undefined,
      uses: (data.actionKind && data.uses) ? data.uses : undefined,
      maxUses: (data.actionKind && data.maxUses) ? data.maxUses : undefined,
      rechargeOn: (data.actionKind && data.rechargeOn) ? data.rechargeOn : undefined,
      levelEffects: data.levelEffects.length > 0 ? data.levelEffects : undefined,
    }
    props.onUpdate({
      ...props.character,
      [field]: [...safeFeatures(props.character[field]), newFeature],
    })
    setIsAddOpen(null)
  }

  const handleUpdate = (field: FeatureField, data: FeatureFormData) => {
    const editing = editingFeature()
    if (!editing) return
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).map((f) =>
        f.id === editing.id
          ? {
              ...f,
              name: data.name.trim(),
              description: data.description,
              featureType: data.featureType,
              actionKind: data.actionKind || undefined,
              type: (data.actionKind && data.type) ? data.type as ActionType : undefined,
              range: (data.actionKind && data.range) ? data.range : undefined,
              level: data.actionKind ? (data.level || undefined) : undefined,
              uses: (data.actionKind && data.uses) ? data.uses : undefined,
              maxUses: (data.actionKind && data.maxUses) ? data.maxUses : undefined,
              rechargeOn: (data.actionKind && data.rechargeOn) ? data.rechargeOn : undefined,
              levelEffects: data.levelEffects.length > 0 ? data.levelEffects : undefined,
            }
          : f
      ),
    })
    setEditingFeature(null)
  }

  const handleFeatureUsesChange = (field: FeatureField, id: string, v: number) => {
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).map((f) => f.id === id ? { ...f, uses: v } : f),
    })
  }

  // Hit die size is only ever set via a Feature grant — this identifies the single feature that
  // is *currently* the active source, so the spent-hit-dice tracker renders on that one card only.
  const isActiveHitDieSource = (feature: Feature) =>
    getActiveFeatureEffects(props.character).hitDiceSizeSourceFeatureId === feature.id

  const handleSpentHitDiceChange = (v: number) => {
    props.onUpdate({ ...props.character, spentHitDice: v })
  }

  const handleDelete = (field: FeatureField, id: string) => {
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).filter((f) => f.id !== id),
    })
  }

  return (
    <Card data-sem="features-module">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Layers class="h-5 w-5 text-primary" />
          Class Features, Species Traits, Background &amp; Feats
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <For each={FEATURE_FIELD_CONFIG}>
          {(section) => {
            const features = () => safeFeatures(props.character[section.field])
            return (
              <Collapsible
                open={expandedSections().has(section.kind)}
                onOpenChange={(open: boolean) => toggleExpanded(section.kind, open)}
              >
                <div class="flex items-center justify-between pr-1">
                  <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
                    <section.icon class="h-4 w-4 text-primary" />
                    <span class="font-semibold">{section.title}</span>
                    <Badge variant="secondary">{features().length}</Badge>
                    <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
                  </CollapsibleTrigger>
                  <Show when={!isReadOnly}>
                    <Button
                      variant="outline"
                      size="sm"
                      class="gap-1 h-7 ml-2"
                      onClick={() => setIsAddOpen(section.kind)}
                    >
                      <Plus class="h-3 w-3" />
                      Add {section.singular}
                    </Button>
                  </Show>
                </div>
                <CollapsibleContent class="space-y-2 mt-1 px-1">
                  <Show
                    when={features().length > 0}
                    fallback={
                      <div class="text-center py-4 text-muted-foreground text-sm">
                        No {section.title.toLowerCase()} added yet.
                      </div>
                    }
                  >
                    <For each={features()}>
                      {(feature) => (
                        <div class="border rounded-lg p-3 space-y-1">
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-medium">{feature.name}</span>
                              <Show when={feature.actionKind}>
                                <Badge variant="outline" class="text-xs flex items-center gap-1">
                                  <Zap class="h-3 w-3" />
                                  {ACTION_KIND_LABELS[feature.actionKind!]}
                                </Badge>
                              </Show>
                            </div>
                            <Show when={!isReadOnly}>
                              <div class="flex items-center gap-1 shrink-0">
                                <Tooltip content={`Edit ${section.singular}`}>
                                  <button
                                    type="button"
                                    aria-label={`Edit ${feature.name}`}
                                    onClick={() => setEditingFeature(feature)}
                                    class="text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil class="h-4 w-4" />
                                  </button>
                                </Tooltip>
                                <Tooltip content={`Delete ${section.singular}`}>
                                  <button
                                    type="button"
                                    aria-label={`Delete ${feature.name}`}
                                    onClick={() => handleDelete(section.field, feature.id)}
                                    class="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 class="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              </div>
                            </Show>
                          </div>
                          <Show when={feature.description}>
                            <MarkdownContent text={feature.description!} class="text-muted-foreground" />
                          </Show>
                          <Show when={(feature.maxUses ?? 0) > 0}>
                            <Show
                              when={(feature.maxUses ?? 0) <= 5}
                              fallback={
                                // value/onChange are inverted: display shows remaining uses, storage tracks used count
                                <StepperInput
                                  value={remainingUses(feature.uses, feature.maxUses)}
                                  min={0}
                                  max={feature.maxUses!}
                                  onChange={(v) => handleFeatureUsesChange(section.field, feature.id, spentFromRemaining(v, feature.maxUses))}
                                  readOnly={isReadOnly}
                                />
                              }
                            >
                              <PipTracker
                                total={feature.maxUses!}
                                used={feature.uses ?? 0}
                                onToggle={(v) => handleFeatureUsesChange(section.field, feature.id, v)}
                                usedTitle="Charge spent (click to restore)"
                                availableTitle="Charge available (click to use)"
                                readOnly={isReadOnly}
                              />
                            </Show>
                          </Show>
                          <Show when={isActiveHitDieSource(feature)}>
                            <div class="space-y-1">
                              <Label class="text-xs text-muted-foreground">Spent Hit Dice</Label>
                              <Show
                                when={(props.character.level ?? 1) <= 5}
                                fallback={
                                  <StepperInput
                                    value={props.character.spentHitDice ?? 0}
                                    min={0}
                                    max={props.character.level ?? 1}
                                    onChange={handleSpentHitDiceChange}
                                    readOnly={isReadOnly}
                                  />
                                }
                              >
                                <PipTracker
                                  total={props.character.level ?? 1}
                                  used={props.character.spentHitDice ?? 0}
                                  onToggle={handleSpentHitDiceChange}
                                  usedTitle="Hit die spent"
                                  availableTitle="Hit die available"
                                  readOnly={isReadOnly}
                                />
                              </Show>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </CollapsibleContent>
              </Collapsible>
            )
          }}
        </For>
      </CardContent>

      {/* Add modals — always in DOM, open prop controls visibility */}
      <For each={FEATURE_FIELD_CONFIG}>
        {(section) => (
          <Modal
            open={isAddOpen() === section.kind}
            onOpenChange={(open) => { if (!open) setIsAddOpen(null) }}
          >
            <ModalContent class="max-w-md">
              <Show when={isAddOpen() === section.kind}>
                <ModalHeader>
                  <ModalTitle>Add {section.singular}</ModalTitle>
                </ModalHeader>
                <FeatureForm
                  characterLevel={props.character.level ?? 1}
                  onSubmit={(data) => handleAdd(section.kind, section.field, data)}
                  onCancel={() => setIsAddOpen(null)}
                />
              </Show>
            </ModalContent>
          </Modal>
        )}
      </For>

      {/* Edit modal — always in DOM, open prop controls visibility */}
      <Modal
        open={editingFeature() !== null}
        onOpenChange={(open) => { if (!open) setEditingFeature(null) }}
      >
        <ModalContent class="max-w-md">
          <Show when={editingFeature()}>
            {(feature) => {
              const section = FEATURE_FIELD_CONFIG.find((s) => s.kind === feature().source)!
              return (
                <>
                  <ModalHeader>
                    <ModalTitle>Edit {section.singular}</ModalTitle>
                  </ModalHeader>
                  <FeatureForm
                    initialData={{
                      name: feature().name,
                      description: feature().description,
                      featureType: feature().featureType ?? '',
                      actionKind: feature().actionKind ?? '',
                      type: feature().type ?? '',
                      range: feature().range ?? '',
                      uses: feature().uses ?? 0,
                      maxUses: feature().maxUses ?? 0,
                      rechargeOn: feature().rechargeOn ?? '',
                      level: feature().level ?? 1,
                      levelEffects: feature().levelEffects ?? [],
                    }}
                    characterLevel={props.character.level ?? 1}
                    onSubmit={(data) => handleUpdate(section.field, data)}
                    onCancel={() => setEditingFeature(null)}
                  />
                </>
              )
            }}
          </Show>
        </ModalContent>
      </Modal>
    </Card>
  )
}

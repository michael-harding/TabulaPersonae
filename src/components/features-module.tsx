import { createMemo, createSignal, untrack, For, Index, Match, Show, Switch } from "solid-js"
import BookOpen from "lucide-solid/icons/book-open"
import Leaf from "lucide-solid/icons/leaf"
import Star from "lucide-solid/icons/star"
import ScrollText from "lucide-solid/icons/scroll-text"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import Pencil from "lucide-solid/icons/pencil"
import Zap from "lucide-solid/icons/zap"
import Dices from "lucide-solid/icons/dices"
import Layers from "lucide-solid/icons/layers"

import { createPersistedSetSignal } from "@/lib/persisted-signal"
import type { AbilityScores, Character, Feature, FeatureEffects, FeatureKind, FeatureLevelEffect, FeatureTypeValue, ActionKind, ActionType, Skills, HitPointsMode, MaxUsesMode, SpellSlotLevel, DamageFields as DamageValues, GainFields as GainValues } from "@/lib/character-types"
import { safeFeatures, remainingUses, spentFromRemaining, effectiveMaxUses, getEffectiveProficiencyBonus, ABILITY_ABBREVIATIONS, SKILL_DISPLAY_NAMES, getActiveFeatureEffects, SENSE_TYPES, SENSE_LABELS, DAMAGE_TYPE_OPTIONS, CONDITIONS, SIZES, CREATURE_TYPES, RECHARGE_ON_OPTIONS, RECHARGE_ON_LABELS, ACTION_KIND_LABELS, ACTION_KIND_OPTIONS, ordinal, SPELL_SLOT_LEVELS, SPELLCASTING_FEATURE_NAME, withFeatureSaved } from "@/lib/character-utils"
import { DIE_SIZES } from "@/lib/dice"
import { featureEffectLines, spellcastingAbilityOf } from "@/lib/feature-effect-lines"
import { effectFeatureType, isRequiredFeature, isRequiredFeatureType } from "@/lib/required-features"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { CheckableChip } from "@/components/ui/chip-button"
import { ChipListEditor } from "@/components/ui/chip-list-editor"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { FieldError, FormErrorSummary, RequiredLegend } from "@/components/ui/form-validation"
import { requiredText, useFormValidation } from "@/hooks/use-form-validation"
import { Textarea } from "@/components/ui/textarea"
import { Chip } from "@/components/ui/chip"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Tooltip } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { Collapsible, CollapsibleChevron, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ModifierGroup } from "@/components/ui/modifier-group"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { DamageFields, GainFields } from "@/components/effect-fields"
import { useReadOnly } from "@/lib/read-only-context"
import { cn, HOVER_ACCENT, TOUCH_TARGET_BOX } from "@/lib/utils"

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

const ACTION_TYPE_LABELS = ['Attack', 'Ability', 'Other']

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

const MAX_USES_MODE_OPTIONS: { value: MaxUsesMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'per-level', label: 'Per Level' },
  { value: 'proficiency-bonus', label: 'Proficiency Bonus' },
]

const SKILL_KEYS = Object.keys(SKILL_DISPLAY_NAMES) as (keyof Skills)[]

// Hit Points, Size, and Creature Type are fixed facts of a class/species, not something
// that changes at higher levels, so they get a single always-on control. The proficiency-grant
// types (and the other species-trait-shaped effects below) genuinely can be granted or expanded
// at different levels, so they keep the repeatable level-tier list. Hit Points bundles a Hit Die
// selector (used independently by Rest Modal's hit-dice-spending flow) with a choice of three Max
// HP calculation modes (flat / per-level / rolled) — see the 'Hit Points' block in FeatureForm.
// Spellcasting is tiered for its spell slot table; its ability is the whole feature's, set once
// above the rows and saved onto each of them (see setSpellcastingAbility in FeatureForm).
// Max HP Bonus is single-tier too, but for a different reason than the other three: its value is
// a single always-scaling rate (× total character level, computed in calculateMaxHitPoints), not a
// flat amount that can stack across tiers — a second tier wouldn't have a sensible combined value
// (see the comment on the hpBonusPerLevel block in getActiveFeatureEffects). Even though its
// granting trait/feat can be picked up at any level, it needs no editable level either: a feature is
// only ever added once actually gained, and amount × current-level is already algebraically
// equivalent to 5e RAW (e.g. Tough) for any level at or after that, regardless of which level it was.
// Ability Score Improvement is single-tier because its one value is itself a list of levels.
const SINGLE_EFFECT_TYPES: FeatureTypeValue[] = ['Hit Points', 'Ability Score Improvement', 'Size', 'Creature Type', 'Max HP Bonus']
// The Name field is hidden entirely for these — the feature type itself is already the name
// (see changeFeatureType, which fills formData.name with the type string so the hidden field still
// has a value to submit/display). Max HP Bonus is deliberately excluded even though it's also a
// SINGLE_EFFECT_TYPE: a character can gain HP-bonus-per-level from more than one source, so its Name
// stays visible and user-editable to tell those sources apart.
const NAMELESS_FEATURE_TYPES: FeatureTypeValue[] = ['Hit Points', 'Ability Score Improvement', 'Size', 'Creature Type']
const TIERED_EFFECT_TYPES: FeatureTypeValue[] = [
  'Spellcasting', 'Prepared Spells',
  'Saving Throw Proficiency', 'Skill Proficiency', 'Other Proficiency',
  'Speed', 'Senses', 'Damage Resistance/Immunity/Vulnerability', 'Condition Immunity', 'Language', 'Carrying Capacity',
  'Ability Scores',
]
// Table types: each tier is a whole row of the class's table, so only the highest tier reached counts
// (see getActiveFeatureEffects), and a new tier starts as a copy of the row before it.
const TABLE_EFFECT_TYPES: FeatureTypeValue[] = ['Spellcasting', 'Prepared Spells']
// Required types aren't offered: every character already has its one feature of each (see
// required-features.ts), and that feature's type is locked. Custom, a feature with no mechanical
// effect, comes first: it's what a new feature starts as.
const FEATURE_TYPES: FeatureTypeValue[] = (['Custom', 'Action', ...SINGLE_EFFECT_TYPES, ...TIERED_EFFECT_TYPES] as FeatureTypeValue[]).filter((t) => !isRequiredFeatureType(t))
const FEATURE_TYPE_OPTIONS = FEATURE_TYPES.map((t) => ({ value: t, label: t }))
// The levels an Ability Score Improvement can be gained at, for its "+ Add" menu
const CHARACTER_LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => String(i + 1))
const CREATURE_TYPE_OPTIONS = [{ value: '', label: 'None' }, ...CREATURE_TYPES.map((t) => ({ value: t, label: t }))]
const HIT_DIE_OPTIONS = [{ value: '', label: 'None' }, ...DIE_SIZES.map((s) => ({ value: String(s), label: `d${s}` }))]
const SIZE_OPTIONS = [{ value: '', label: 'None' }, ...SIZES.map((s) => ({ value: s, label: s }))]

function isTieredEffectType(t: FeatureTypeValue): boolean {
  return (TIERED_EFFECT_TYPES as string[]).includes(t)
}

export interface FeatureFormData extends DamageValues, GainValues {
  name: string
  highlights: string
  description: string
  featureType: FeatureTypeValue
  actionKind: ActionKind | ''
  type: string
  range: string
  attackBonus: number
  attackSave: string
  uses: number
  maxUses: number
  maxUsesMode: MaxUsesMode
  maxUsesPerLevel: number
  rechargeOn: '' | 'short-rest' | 'long-rest'
  level: number
  levelEffects: FeatureLevelEffect[]
}

// An Action feature's own fields, cleared whenever the feature type changes
const ACTION_FIELD_DEFAULTS = {
  type: '', range: '', attackBonus: 0, attackSave: '',
  damage: '', damageType: '', damageRecurring: false, gain: '', gainType: '', gainRecurring: false,
  uses: 0, maxUses: 0, maxUsesMode: 'flat', maxUsesPerLevel: 0, rechargeOn: '',
} satisfies Partial<FeatureFormData>

export const defaultFeatureForm: FeatureFormData = {
  name: '', highlights: '', description: '', featureType: 'Custom', actionKind: '', ...ACTION_FIELD_DEFAULTS, level: 1, levelEffects: [],
}

/** The form's fields for an existing feature. */
export function featureToForm(feature: Feature): FeatureFormData {
  return {
    name: feature.name,
    highlights: feature.highlights ?? '',
    description: feature.description,
    featureType: feature.featureType ?? 'Custom',
    actionKind: feature.actionKind ?? '',
    type: feature.type ?? '',
    range: feature.range ?? '',
    attackBonus: feature.attackBonus ?? 0,
    attackSave: feature.attackSave ?? '',
    damage: feature.damage ?? '',
    damageType: feature.damageType ?? '',
    damageRecurring: feature.damageRecurring ?? false,
    gain: feature.gain ?? '',
    gainType: feature.gainType ?? '',
    gainRecurring: feature.gainRecurring ?? false,
    uses: feature.uses ?? 0,
    maxUses: feature.maxUses ?? 0,
    maxUsesMode: feature.maxUsesMode ?? 'flat',
    maxUsesPerLevel: feature.maxUsesPerLevel ?? 0,
    rechargeOn: feature.rechargeOn ?? '',
    level: feature.level ?? 1,
    levelEffects: feature.levelEffects ?? [],
  }
}

/**
 * The feature a submitted form describes: `base` updated in place (keeping its id, source and any
 * field the form doesn't show), or a new feature of base's source when base has no id. An Action
 * feature's own fields are kept only while it has an action kind; blank ones are omitted.
 */
export function featureFromForm(form: FeatureFormData, base: Partial<Feature> & Pick<Feature, 'source'>): Feature {
  const action = !!form.actionKind
  return {
    ...base,
    id: base.id ?? crypto.randomUUID(),
    name: form.name.trim(),
    highlights: form.highlights.trim() || undefined,
    description: form.description,
    featureType: form.featureType,
    actionKind: form.actionKind || undefined,
    type: (action && form.type) ? form.type as ActionType : undefined,
    range: (action && form.range) ? form.range : undefined,
    attackBonus: (action && form.attackBonus) ? form.attackBonus : undefined,
    attackSave: (action && form.attackSave) ? form.attackSave : undefined,
    damage: (action && form.damage) ? form.damage : undefined,
    damageType: (action && form.damageType) ? form.damageType : undefined,
    damageRecurring: (action && form.damage && form.damageRecurring) ? true : undefined,
    gain: (action && form.gain) ? form.gain : undefined,
    gainType: (action && form.gainType) ? form.gainType : undefined,
    gainRecurring: (action && form.gain && form.gainRecurring) ? true : undefined,
    level: action ? (form.level || undefined) : undefined,
    uses: (action && form.uses) ? form.uses : undefined,
    maxUses: (action && form.maxUsesMode === 'flat' && form.maxUses) ? form.maxUses : undefined,
    maxUsesMode: (action && form.maxUsesMode !== 'flat') ? form.maxUsesMode : undefined,
    maxUsesPerLevel: (action && form.maxUsesMode === 'per-level' && form.maxUsesPerLevel) ? form.maxUsesPerLevel : undefined,
    rechargeOn: (action && form.rechargeOn) ? form.rechargeOn : undefined,
    levelEffects: form.levelEffects.length > 0 ? form.levelEffects : undefined,
  }
}

/** The form with `type` picked as its Feature Type: what picking it from the menu does. */
export function withFeatureType(form: FeatureFormData, type: FeatureTypeValue): FeatureFormData {
  if (type === form.featureType) return form
  return {
    ...form,
    featureType: type,
    // A blank Name defaults to the newly picked type's name — the only way NAMELESS_FEATURE_TYPES
    // ever get a name (their Name field is hidden), and a visible starting point for every other
    // type that the user can overwrite. Never overwrites a name the user already typed.
    name: form.name.trim() === '' ? defaultFeatureName(type) : form.name,
    actionKind: type === 'Action' ? 'action' : '',
    ...ACTION_FIELD_DEFAULTS,
    level: 1,
    levelEffects: (SINGLE_EFFECT_TYPES as string[]).includes(type) || isTieredEffectType(type) ? [{ level: 1, effects: {} }] : [],
  }
}

/**
 * The name a new feature of this type starts with: the type's own, but for Spellcasting's, and none
 * for Custom, whose name is the player's to give.
 */
function defaultFeatureName(type: FeatureTypeValue): string {
  if (type === 'Custom') return ''
  return type === 'Spellcasting' ? SPELLCASTING_FEATURE_NAME : type
}

// A new level of a table type is the table's next row: one level after the highest so far, starting
// from that row (a Spellcasting row's slots and the feature's ability, a Prepared Spells row's
// count), since a row usually adds a little to the one before it.
function nextTableTier(tiers: FeatureLevelEffect[]): FeatureLevelEffect {
  if (tiers.length === 0) return { level: 1, effects: {} }
  const highest = tiers.reduce((top, tier) => (tier.level > top.level ? tier : top))
  const effects = { ...highest.effects }
  if (effects.spellSlots) effects.spellSlots = { ...effects.spellSlots }
  return { level: Math.min(20, highest.level + 1), effects }
}

interface FeatureFormProps {
  initialData?: FeatureFormData
  characterLevel: number
  /** The character's effective proficiency bonus, for the Proficiency Bonus uses scaling. */
  proficiencyBonus: number
  onSubmit: (data: FeatureFormData) => void
  onCancel: () => void
}

type StringListEffectKey = 'resistances' | 'immunities' | 'vulnerabilities' | 'conditionImmunities' | 'languages' | 'otherProficiencies'

type EffectGroupKey = 'bonus' | 'floor' | 'cap' | 'baseMax'

function anyAbilitySet(record: Partial<Record<keyof AbilityScores, number>> | undefined): boolean {
  return Object.values(record ?? {}).some((v) => v != null)
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

type TieredEffectType =
  | 'Saving Throw Proficiency' | 'Skill Proficiency' | 'Other Proficiency'
  | 'Speed' | 'Senses' | 'Damage Resistance/Immunity/Vulnerability' | 'Condition Immunity' | 'Language' | 'Carrying Capacity'
  | 'Ability Scores' | 'Spellcasting' | 'Prepared Spells'

function LevelEffectRow(props: {
  featureType: TieredEffectType
  index: number
  tier: FeatureLevelEffect
  effectGroupsOpen: () => Record<EffectGroupKey, boolean>
  onEffectGroupOpenChange: (key: EffectGroupKey, open: boolean) => void
  onLevelChange: (level: number) => void
  onEffectsChange: (effects: FeatureEffects) => void
  onRemove: () => void
}) {
  const effects = () => props.tier.effects
  const update = (patch: Partial<FeatureEffects>) => props.onEffectsChange({ ...effects(), ...patch })

  // An emptied list is stored as absent rather than as [], like every other unset effect.
  const setList = (key: StringListEffectKey, values: string[]) => update({ [key]: values.length > 0 ? values : undefined })

  const toggleSave = (ability: keyof AbilityScores) => {
    const current = effects().savingThrowProficiencies ?? []
    const next = current.includes(ability) ? current.filter((a) => a !== ability) : [...current, ability]
    update({ savingThrowProficiencies: next.length > 0 ? next : undefined })
  }

  // Keeps each remaining skill's expertise flag; a newly added skill starts without it.
  const setSkills = (skills: (keyof Skills)[]) => {
    const current = effects().skillProficiencies ?? []
    const next = skills.map((skill) => current.find((g) => g.skill === skill) ?? { skill, expertise: false })
    update({ skillProficiencies: next.length > 0 ? next : undefined })
  }
  // A slot level with none is left out, and a row with none at all has no slot counts: a row
  // without slots gives none, whichever way it's stored (see getActiveFeatureEffects).
  const setSpellSlots = (slotLevel: SpellSlotLevel, count: number) => {
    const next = { ...effects().spellSlots }
    if (count > 0) next[slotLevel] = count
    else delete next[slotLevel]
    update({ spellSlots: Object.keys(next).length > 0 ? next : undefined })
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
          <NumericInput data-test={`level-effect-${props.index}-level-input`} aria-label="At Level" class="w-20" min={1} max={20} value={props.tier.level} onChange={props.onLevelChange} />
        </div>
        <ConfirmButton
          data-test={`level-effect-${props.index}-remove-button`}
          verb="Remove"
          subject={`level ${props.tier.level} entry`}
          variant="ghostDestructive"
          size="bareIcon"
          onConfirm={props.onRemove}
        >
          <Trash2 class="h-4 w-4" aria-hidden="true" />
        </ConfirmButton>
      </div>

      <Show when={props.featureType === 'Saving Throw Proficiency'}>
        <div class="space-y-1">
          <Label class="text-xs">Saving Throw Proficiencies</Label>
          <div class="grid grid-cols-3 gap-1">
            <For each={SAVE_ABILITIES}>
              {(ability) => (
                <Checkbox
                  data-test={`level-effect-${props.index}-save-${ability}`}
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
        <ChipListEditor
          label="Skill Proficiencies"
          itemLabel="skill proficiency"
          data-test={`level-effect-${props.index}-skill`}
          options={SKILL_KEYS}
          optionLabel={(skill) => SKILL_DISPLAY_NAMES[skill]}
          values={(effects().skillProficiencies ?? []).map((g) => g.skill)}
          onChange={setSkills}
          renderChip={(skill, remove) => (
            <CheckableChip
              data-test={`level-effect-${props.index}-skill-${skill}`}
              removeLabel={`Remove ${SKILL_DISPLAY_NAMES[skill]}`}
              onRemove={remove}
              checkLabel="Exp"
              checkAriaLabel={`Expertise for ${SKILL_DISPLAY_NAMES[skill]}`}
              checked={(effects().skillProficiencies ?? []).find((g) => g.skill === skill)?.expertise ?? false}
              onCheckedChange={() => toggleSkillExpertise(skill)}
            >
              {SKILL_DISPLAY_NAMES[skill]}
            </CheckableChip>
          )}
        />
      </Show>

      <Show when={props.featureType === 'Other Proficiency'}>
        <ChipListEditor
          label="Other Proficiencies (armor/weapon/tool)"
          itemLabel="other proficiency"
          data-test={`level-effect-${props.index}-other-proficiency`}
          placeholder="e.g. Light Armor"
          values={effects().otherProficiencies ?? []}
          onChange={(next) => setList('otherProficiencies', next)}
        />
      </Show>

      <Show when={props.featureType === 'Speed'}>
        <div class="space-y-1">
          <Label class="text-xs">Speed (ft)</Label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <Label for="fx-speed-walk" class="text-xs text-muted-foreground">Walk</Label>
              <NumericInput id="fx-speed-walk" data-test={`level-effect-${props.index}-speed-walk`} value={effects().speed ?? 0} onChange={(v) => update({ speed: v })} />
            </div>
            <div>
              <Label for="fx-speed-fly" class="text-xs text-muted-foreground">Fly</Label>
              <NumericInput id="fx-speed-fly" data-test={`level-effect-${props.index}-speed-fly`} min={0} value={effects().flySpeed ?? 0} onChange={(v) => update({ flySpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-swim" class="text-xs text-muted-foreground">Swim</Label>
              <NumericInput id="fx-speed-swim" data-test={`level-effect-${props.index}-speed-swim`} min={0} value={effects().swimSpeed ?? 0} onChange={(v) => update({ swimSpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-climb" class="text-xs text-muted-foreground">Climb</Label>
              <NumericInput id="fx-speed-climb" data-test={`level-effect-${props.index}-speed-climb`} min={0} value={effects().climbSpeed ?? 0} onChange={(v) => update({ climbSpeed: v })} />
            </div>
            <div>
              <Label for="fx-speed-burrow" class="text-xs text-muted-foreground">Burrow</Label>
              <NumericInput id="fx-speed-burrow" data-test={`level-effect-${props.index}-speed-burrow`} min={0} value={effects().burrowSpeed ?? 0} onChange={(v) => update({ burrowSpeed: v })} />
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
                    data-test={`level-effect-${props.index}-sense-${sense}`}
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
          <ChipListEditor
            label="Damage Resistances"
            itemLabel="damage resistance"
            data-test={`level-effect-${props.index}-resistance`}
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().resistances ?? []}
            onChange={(next) => setList('resistances', next)}
          />
          <ChipListEditor
            label="Damage Immunities"
            itemLabel="damage immunity"
            data-test={`level-effect-${props.index}-immunity`}
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().immunities ?? []}
            onChange={(next) => setList('immunities', next)}
          />
          <ChipListEditor
            label="Damage Vulnerabilities"
            itemLabel="damage vulnerability"
            data-test={`level-effect-${props.index}-vulnerability`}
            options={DAMAGE_TYPE_OPTIONS}
            values={effects().vulnerabilities ?? []}
            onChange={(next) => setList('vulnerabilities', next)}
          />
        </div>
      </Show>

      <Show when={props.featureType === 'Condition Immunity'}>
        <ChipListEditor
            label="Condition Immunities"
            itemLabel="condition immunity"
            data-test={`level-effect-${props.index}-condition-immunity`}
            options={CONDITIONS}
            values={effects().conditionImmunities ?? []}
            onChange={(next) => setList('conditionImmunities', next)}
          />
      </Show>

      <Show when={props.featureType === 'Language'}>
        <ChipListEditor
          label="Languages"
          itemLabel="language"
          data-test={`level-effect-${props.index}-language`}
          placeholder="e.g. Elvish"
          values={effects().languages ?? []}
          onChange={(next) => setList('languages', next)}
        />
      </Show>

      <Show when={props.featureType === 'Carrying Capacity'}>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <Label for="fx-capacity-bonus" class="text-xs text-muted-foreground">Bonus (lbs)</Label>
            <NumericInput id="fx-capacity-bonus" data-test={`level-effect-${props.index}-capacity-bonus`} value={effects().carryingCapacityBonus ?? 0} onChange={(v) => update({ carryingCapacityBonus: v ?? undefined })} />
          </div>
          <div>
            <Label for="fx-capacity-multiplier" class="text-xs text-muted-foreground">Multiplier (0 = none)</Label>
            <NumericInput
              id="fx-capacity-multiplier"
              data-test={`level-effect-${props.index}-capacity-multiplier`}
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
          <ModifierGroup
            label="Ability Score"
            data-test={`level-effect-${props.index}-effect-group-bonus`}
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
                      data-test={`level-effect-${props.index}-asi-bonus-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Bonus`}
                      value={effects().abilityScores?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScores: { ...effects().abilityScores, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </ModifierGroup>
          <ModifierGroup
            label="Ability Score Floor (minimum score, 0 = none)"
            data-test={`level-effect-${props.index}-effect-group-floor`}
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
                      data-test={`level-effect-${props.index}-asi-floor-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Floor`}
                      min={0}
                      value={effects().abilityScoreFloors?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreFloors: { ...effects().abilityScoreFloors, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </ModifierGroup>
          <ModifierGroup
            label="Ability Score Max Cap (maximum score, 0 = none)"
            data-test={`level-effect-${props.index}-effect-group-cap`}
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
                      data-test={`level-effect-${props.index}-asi-cap-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Max Cap`}
                      min={0}
                      value={effects().abilityScoreMaxCaps?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreMaxCaps: { ...effects().abilityScoreMaxCaps, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </ModifierGroup>
          <ModifierGroup
            label="Ability Score Base Max (raises the normal maximum, default 20)"
            data-test={`level-effect-${props.index}-effect-group-basemax`}
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
                      data-test={`level-effect-${props.index}-asi-basemax-${ability}`}
                      aria-label={`${ABILITY_ABBREVIATIONS[ability]} Base Max`}
                      min={0}
                      value={effects().abilityScoreBaseMax?.[ability] ?? 0}
                      onChange={(v) => update({ abilityScoreBaseMax: { ...effects().abilityScoreBaseMax, [ability]: v ?? undefined } })}
                    />
                  </div>
                )}
              </For>
            </div>
          </ModifierGroup>
        </div>
      </Show>

      <Show when={props.featureType === 'Prepared Spells'}>
        <div class="space-y-1">
          <Label for={`fx-prepared-spells-${props.index}`} class="text-xs">Prepared Spells</Label>
          <NumericInput
            id={`fx-prepared-spells-${props.index}`}
            data-test={`level-effect-${props.index}-prepared-spells`}
            class="w-24"
            min={0}
            max={99}
            value={effects().preparedSpells ?? 0}
            onChange={(v) => update({ preparedSpells: v || undefined })}
          />
        </div>
      </Show>

      <Show when={props.featureType === 'Spellcasting'}>
        <div class="space-y-1">
          <Label class="text-xs">Spell Slots</Label>
          <div class="grid grid-cols-3 gap-2">
            <For each={SPELL_SLOT_LEVELS}>
              {(slotLevel) => (
                <div>
                  <Label for={`fx-spell-slots-${props.index}-${slotLevel}`} class="text-xs text-muted-foreground">{ordinal(slotLevel)}</Label>
                  <NumericInput
                    id={`fx-spell-slots-${props.index}-${slotLevel}`}
                    data-test={`level-effect-${props.index}-spell-slots-${slotLevel}`}
                    aria-label={`${ordinal(slotLevel)} level slots`}
                    min={0}
                    max={20}
                    value={effects().spellSlots?.[slotLevel] ?? 0}
                    onChange={(v) => setSpellSlots(slotLevel, v)}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}

function FeatureForm(props: FeatureFormProps) {
  const [formData, setFormData] = createSignal<FeatureFormData>(props.initialData ?? defaultFeatureForm)
  // A legacy type behaves like its required type: same fields, same card summary
  const effectType = createMemo(() => effectFeatureType(formData().featureType))
  // A required feature keeps its type: its form has no Feature Type field, and the modal's title
  // names the type instead (see FeatureEditModal). A feature opened with a type that isn't offered
  // (a legacy one) still lists it, so the menu shows it and can return to it.
  const initialType = untrack(() => props.initialData?.featureType ?? 'Custom')
  const typeFixed = isRequiredFeatureType(initialType)
  const typeOptions = FEATURE_TYPES.includes(initialType)
    ? FEATURE_TYPE_OPTIONS
    : [...FEATURE_TYPE_OPTIONS, { value: initialType, label: initialType }]

  // Hit Points / Size / Max HP Bonus aren't level-dependent — they're always
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

  // The ability is the whole feature's: every row carries it, so whichever row applies has it. With
  // every row removed, it starts a level 1 row rather than going nowhere.
  const setSpellcastingAbility = (ability: keyof AbilityScores | undefined) => setFormData((d) => {
    const withAbility = (effects: FeatureEffects): FeatureEffects => {
      const next = { ...effects, spellcastingAbility: ability }
      if (!ability) delete next.spellcastingAbility
      return next
    }
    const tiers = d.levelEffects.length > 0 ? d.levelEffects : [{ level: 1, effects: {} }]
    return { ...d, levelEffects: tiers.map((tier) => ({ ...tier, effects: withAbility(tier.effects) })) }
  })

  const updateLevelEffect = (index: number, patch: Partial<FeatureLevelEffect>) => {
    setFormData((d) => ({ ...d, levelEffects: d.levelEffects.map((t, i) => (i === index ? { ...t, ...patch } : t)) }))
  }

  // Ability Score subsections (Bonus/Floor/Max Cap/Base Max) are individually collapsible.
  // Their open/closed state is tracked here, in the stable parent, rather than as local state
  // inside LevelEffectRow — that row is recreated on every keystroke (each edit replaces the tier
  // object, and Solid's <For> remounts children whose item reference changes), which would silently
  // discard any state kept inside it, snapping a manually-collapsed section back open on the next edit.
  const [effectGroupsOpen, setEffectGroupsOpen] = createSignal<Record<number, Record<EffectGroupKey, boolean>>>(
    untrack(() => Object.fromEntries((formData().levelEffects).map((t, i) => [i, computeInitialEffectGroups(t.effects)])))
  )
  const getEffectGroupsOpen = (index: number) => effectGroupsOpen()[index] ?? computeInitialEffectGroups({})
  const setEffectGroupOpen = (index: number, key: EffectGroupKey, open: boolean) =>
    setEffectGroupsOpen((g) => ({ ...g, [index]: { ...getEffectGroupsOpen(index), [key]: open } }))

  const addLevelEffect = () => {
    const newIndex = formData().levelEffects.length
    const tier = TABLE_EFFECT_TYPES.includes(effectType()) ? nextTableTier(formData().levelEffects) : { level: 1, effects: {} }
    setFormData((d) => ({ ...d, levelEffects: [...d.levelEffects, tier] }))
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

  const changeFeatureType = (value: string) => setFormData((d) => withFeatureType(d, value as FeatureTypeValue))

  const isNameless = createMemo(() => NAMELESS_FEATURE_TYPES.includes(effectType()))
  // Name shows for every type but those that take their name from the type instead. The
  // required-field legend explains Name's asterisk, so it follows this too.
  const nameShown = createMemo(() => !isNameless())

  // A feature needs a name. A nameless type has no Name field and needs none, since a blank name is
  // filled from the type on saving (see handleSubmit).
  const validation = useFormValidation(() => {
    const data = formData()
    if (data.name.trim() || isNameless()) return []
    return [requiredText('feature-name', 'Name', data.name)]
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (!validation.validate()) return
    const data = formData()
    // The same default changeFeatureType gives on picking the type, for a nameless-type feature saved
    // without one (made before that default existed, or imported that way)
    props.onSubmit(isNameless() && !data.name.trim() ? { ...data, name: effectType() } : data)
  }

  // noValidate: the browser's own required-field popup would pre-empt the standard error UI.
  return (
    <form onSubmit={handleSubmit} noValidate class="space-y-4">
      {/* The fields keep their own inset; ModalFooter spans the whole modal */}
      <div class="space-y-4 px-4 pt-4">
        <Show when={nameShown()}><RequiredLegend /></Show>
        <FormErrorSummary validation={validation} />
        <Show when={!typeFixed}>
          <div class="space-y-1">
            <Label for="feature-type-select">Feature Type</Label>
            <Select options={typeOptions} value={formData().featureType} onValueChange={changeFeatureType}>
              <SelectTrigger id="feature-type-select" data-test="feature-type-select" aria-label="Feature Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Show>

        <Show when={nameShown()}>
          <div class="space-y-1">
            <Label for="feature-name" required>Name</Label>
            <Input
              id="feature-name"
              data-test="feature-name-input"
              value={formData().name}
              onInput={(e) => setFormData((d) => ({ ...d, name: e.currentTarget.value }))}
              {...validation.controlProps('feature-name')}
              placeholder="Feature name"
              required
            />
            <FieldError validation={validation} fieldId="feature-name" />
          </div>
        </Show>
        <div class="space-y-1">
          <Label for="feature-highlights">Highlights</Label>
          <Textarea
            id="feature-highlights"
            data-test="feature-highlights-input"
            value={formData().highlights}
            onInput={(e) => setFormData((d) => ({ ...d, highlights: e.currentTarget.value }))}
            placeholder="Shown on the action card (Markdown)"
            rows={2}
          />
        </div>
        <div class="space-y-1">
          <Label for="feature-description">Description</Label>
          <Textarea
            id="feature-description"
            data-test="feature-description-input"
            value={formData().description}
            onInput={(e) => setFormData((d) => ({ ...d, description: e.currentTarget.value }))}
            placeholder="Describe the feature..."
            rows={4}
          />
        </div>

        <Show when={formData().featureType === 'Action'}>
          <div class="space-y-4 border rounded-md p-3">
            <div class="flex items-center gap-2">
              <Label class="text-xs whitespace-nowrap">At Level</Label>
              <NumericInput data-test="feature-action-level-input" aria-label="At Level" class="w-20" min={1} max={20} value={formData().level} onChange={(v) => setFormData((d) => ({ ...d, level: v }))} />
            </div>
            <div class="space-y-1">
              <Label for="feature-action-kind">Action Kind</Label>
              <Select options={ACTION_KIND_OPTIONS} value={formData().actionKind || 'action'} onValueChange={(v) => setFormData((d) => ({ ...d, actionKind: v as ActionKind | '' }))}>
                <SelectTrigger id="feature-action-kind" data-test="feature-action-kind-select" aria-label="Action Kind"><SelectValue /></SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div class="space-y-1">
              <Label for="feature-action-type">Type</Label>
              <Combobox
                data-test="feature-action-type-combobox"
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
                data-test="feature-range-input"
                value={formData().range}
                onInput={(e) => setFormData((d) => ({ ...d, range: e.currentTarget.value }))}
                placeholder="5 ft, 30 ft, Touch, Self"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label for="feature-attack-bonus">Attack Bonus</Label>
                <NumericInput id="feature-attack-bonus" data-test="feature-attack-bonus-input" value={formData().attackBonus}
                  onChange={(v) => setFormData((d) => ({ ...d, attackBonus: v }))} placeholder="+5" />
              </div>
              <div class="space-y-1">
                <Label for="feature-attack-save">Attack/Save</Label>
                <Input id="feature-attack-save" data-test="feature-attack-save-input" value={formData().attackSave}
                  onInput={(e) => setFormData((d) => ({ ...d, attackSave: e.currentTarget.value }))} placeholder="e.g. DEX save DC 13" />
              </div>
            </div>
            <DamageFields idPrefix="feature" value={formData()} onChange={(patch) => setFormData((d) => ({ ...d, ...patch }))} placeholder="e.g. 2d6" />
            <GainFields idPrefix="feature" value={formData()} onChange={(patch) => setFormData((d) => ({ ...d, ...patch }))} placeholder="e.g. 1d10" />
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label for="feature-uses">Uses Spent</Label>
                <NumericInput id="feature-uses" data-test="feature-uses-input" min={0} value={formData().uses}
                  onChange={(v) => setFormData((d) => ({ ...d, uses: v }))} />
              </div>
              <div class="space-y-1">
                <Label for="feature-uses-scaling">Uses Scaling</Label>
                <Select
                  options={MAX_USES_MODE_OPTIONS}
                  value={formData().maxUsesMode}
                  onValueChange={(v) => setFormData((d) => ({ ...d, maxUsesMode: v as MaxUsesMode, uses: 0 }))}
                >
                  <SelectTrigger id="feature-uses-scaling" data-test="feature-uses-scaling-select" aria-label="Uses Scaling"><SelectValue /></SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            </div>
            <Switch>
              <Match when={formData().maxUsesMode === 'flat'}>
                <div class="space-y-1">
                  <Label for="feature-max-uses">Max Uses (0 = unlimited)</Label>
                  <NumericInput id="feature-max-uses" data-test="feature-max-uses-input" min={0} value={formData().maxUses}
                    onChange={(v) => setFormData((d) => ({ ...d, maxUses: v, uses: 0 }))} />
                </div>
              </Match>
              <Match when={formData().maxUsesMode === 'per-level'}>
                <div class="space-y-1">
                  <Label for="feature-max-uses-per-level">Max Uses per Level</Label>
                  <NumericInput id="feature-max-uses-per-level" data-test="feature-max-uses-per-level-input" min={0} value={formData().maxUsesPerLevel}
                    onChange={(v) => setFormData((d) => ({ ...d, maxUsesPerLevel: v, uses: 0 }))} />
                  <p class="text-xs text-muted-foreground">
                    = {formData().maxUsesPerLevel * props.characterLevel} at Level {props.characterLevel}
                  </p>
                </div>
              </Match>
              <Match when={formData().maxUsesMode === 'proficiency-bonus'}>
                <p class="text-xs text-muted-foreground" data-test="feature-max-uses-proficiency-bonus">
                  Max Uses = {props.proficiencyBonus} (Proficiency Bonus)
                </p>
              </Match>
            </Switch>
            <div class="space-y-1">
              <Label for="feature-recharge">Recharge On</Label>
              <Select options={RECHARGE_ON_OPTIONS} value={formData().rechargeOn} onValueChange={(v) => setFormData((d) => ({ ...d, rechargeOn: v as '' | 'short-rest' | 'long-rest' }))}>
                <SelectTrigger id="feature-recharge" data-test="feature-recharge-select"><SelectValue /></SelectTrigger>
                <SelectContent />
              </Select>
            </div>
          </div>
        </Show>

        <Show when={effectType() === 'Hit Points'}>
          <div class="space-y-4 border rounded-md p-3">
            <div class="space-y-1">
              <Label for="feature-hit-die">Hit Die</Label>
              <Select
                options={HIT_DIE_OPTIONS}
                value={singleTierEffects().hitDiceSize ? String(singleTierEffects().hitDiceSize) : ''}
                onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitDiceSize: v ? Number(v) : undefined })}
              >
                <SelectTrigger id="feature-hit-die" data-test="feature-hit-die-select" aria-label="Hit Die"><SelectValue /></SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            <div class="space-y-1">
              <Label for="feature-hp-mode">Max HP Calculation</Label>
              <Select
                options={HIT_POINTS_MODE_OPTIONS}
                value={singleTierEffects().hitPointsMode ?? 'per-level'}
                onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitPointsMode: v as HitPointsMode })}
              >
                <SelectTrigger id="feature-hp-mode" data-test="feature-hp-mode-select" aria-label="Max HP Calculation"><SelectValue /></SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            <Show when={(singleTierEffects().hitPointsMode ?? 'per-level') === 'flat'}>
              <div class="space-y-1">
                <Label for="feature-hp-flat">Flat Max HP Value</Label>
                <NumericInput
                  id="feature-hp-flat" data-test="feature-hp-flat-input" aria-label="Flat Max HP Value" min={0}
                  value={singleTierEffects().hitPointsFlatValue ?? 0}
                  onChange={(v) => setSingleTierEffects({ ...singleTierEffects(), hitPointsFlatValue: v ?? undefined })}
                />
              </div>
            </Show>

            <Show when={(singleTierEffects().hitPointsMode ?? 'per-level') === 'per-level'}>
              <div class="space-y-1">
                <Label for="feature-hp-per-level">HP per Level After 1st</Label>
                <NumericInput
                  id="feature-hp-per-level" data-test="feature-hp-per-level-input" aria-label="HP per Level After 1st" min={0}
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
                        <ConfirmButton
                          data-test={`rolled-hp-level-${index + 1}-remove`}
                          verb="Remove"
                          subject={`level ${index + 1} roll`}
                          variant="ghostDestructive"
                          size="bareIcon"
                          onConfirm={() => removeRolledLevel(index)}
                        >
                          <Trash2 class="h-4 w-4" aria-hidden="true" />
                        </ConfirmButton>
                      </Show>
                    </div>
                  )}
                </Index>
                <Button type="button" variant="outline" size="sm" class="gap-1" onClick={addRolledLevel}>
                  <Plus class="h-3 w-3" aria-hidden="true" />
                  Add Level Roll
                </Button>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={effectType() === 'Size'}>
          <div class="space-y-1">
            <Label for="feature-size">Size</Label>
            <Select
              options={SIZE_OPTIONS}
              value={singleTierEffects().size ?? ''}
              onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), size: v || undefined })}
            >
              <SelectTrigger id="feature-size" aria-label="Size"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Show>

        <Show when={effectType() === 'Creature Type'}>
          <div class="space-y-1">
            <Label for="feature-creature-type">Creature Type</Label>
            <Select
              options={CREATURE_TYPE_OPTIONS}
              value={singleTierEffects().creatureType ?? ''}
              onValueChange={(v) => setSingleTierEffects({ ...singleTierEffects(), creatureType: v || undefined })}
            >
              <SelectTrigger id="feature-creature-type" data-test="feature-creature-type-select" aria-label="Creature Type"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Show>

        <Show when={effectType() === 'Ability Score Improvement'}>
          <ChipListEditor
            label="Levels"
            itemLabel="level"
            data-test="feature-asi-level"
            options={CHARACTER_LEVEL_OPTIONS}
            values={(singleTierEffects().abilityScoreImprovementLevels ?? []).map(String)}
            onChange={(next) => setSingleTierEffects({
              ...singleTierEffects(),
              abilityScoreImprovementLevels: next.map(Number).sort((a, b) => a - b),
            })}
            emptyText="No levels"
          />
        </Show>

        <Show when={effectType() === 'Max HP Bonus'}>
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

        <Show when={isTieredEffectType(effectType())}>
          <div class="space-y-3">
            <Show when={effectType() === 'Spellcasting'}>
              <div class="space-y-1">
                <Label for="feature-spellcasting-ability">Spellcasting Ability</Label>
                <Select
                  options={SPELLCASTING_ABILITY_OPTIONS}
                  value={spellcastingAbilityOf(formData().levelEffects) ?? ''}
                  onValueChange={(v) => setSpellcastingAbility((v || undefined) as keyof AbilityScores | undefined)}
                >
                  <SelectTrigger id="feature-spellcasting-ability" data-test="feature-spellcasting-ability-select" aria-label="Spellcasting Ability"><SelectValue /></SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
              <p data-test="spellcasting-hint" class="text-xs text-muted-foreground">
                Each level lists all the spell slots the character has from that level on, like a row of your class's spell slot table. The highest level the character has reached applies. The spellcasting ability applies from the first level.
              </p>
            </Show>
            <Show when={effectType() === 'Prepared Spells'}>
              <p data-test="prepared-spells-hint" class="text-xs text-muted-foreground">
                Each level gives the number of spells the character can prepare from that level on, like a row of your class's table. The highest level the character has reached applies.
              </p>
            </Show>
            <Index each={formData().levelEffects}>
              {(tier, i) => (
                <LevelEffectRow
                  featureType={effectType() as TieredEffectType}
                  index={i}
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
              <Plus class="h-3 w-3" aria-hidden="true" />
              Add Level
            </Button>
          </div>
        </Show>
      </div>

      <ModalFooter>
        <Button type="button" variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </ModalFooter>
    </form>
  )
}

export function FeaturesModule(props: FeaturesModuleProps) {
  const isReadOnly = useReadOnly()
  const [isAddOpen, setIsAddOpen] = createSignal<FeatureKind | null>(null)
  const [editingFeature, setEditingFeature] = createSignal<Feature | null>(null)
  const [expandedSections, setExpandedSections] = createPersistedSetSignal<FeatureKind>(
    () => `dnd-collapsible-features-${props.character.id}`,
    ['class-feature', 'species-trait', 'feat', 'background']
  )

  const toggleExpanded = (kind: FeatureKind, open: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (open) next.add(kind)
      else next.delete(kind)
      return next
    })
  }

  const handleSave = (saved: Feature) => {
    props.onUpdate(withFeatureSaved(props.character, saved))
    setIsAddOpen(null)
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
          <Layers class="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
                  <CollapsibleTrigger class={cn("flex flex-1 items-center gap-2 p-3 rounded-md transition-colors text-left", HOVER_ACCENT)}>
                    <section.icon class="h-4 w-4 text-primary" aria-hidden="true" />
                    <span class="font-semibold">{section.title}</span>
                    <Chip variant="secondary">{features().length}</Chip>
                    <CollapsibleChevron class="ml-auto" />
                  </CollapsibleTrigger>
                  <Show when={!isReadOnly}>
                    <Button
                      data-test={`add-feature-${section.kind}`}
                      variant="outline"
                      size="sm"
                      class="gap-1 h-7 ml-2"
                      onClick={() => setIsAddOpen(section.kind)}
                    >
                      <Plus class="h-3 w-3" aria-hidden="true" />
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
                              <Show when={feature.featureType && feature.featureType !== 'Action' && feature.featureType !== 'Custom'}>
                                <Chip variant="outline" class="text-xs">{feature.featureType}</Chip>
                              </Show>
                              <Show when={feature.actionKind}>
                                <Chip variant="outline" class="text-xs flex items-center gap-1">
                                  <Zap class="h-3 w-3" aria-hidden="true" />
                                  {ACTION_KIND_LABELS[feature.actionKind!]}
                                </Chip>
                              </Show>
                              <Show when={feature.level}>
                                <Chip variant="outline" class="text-xs">At Level {feature.level}</Chip>
                              </Show>
                              <Show when={feature.type}>
                                <Chip variant="outline" class="text-xs">{feature.type}</Chip>
                              </Show>
                              <Show when={feature.range}>
                                <Chip variant="outline" class="text-xs">Range: {feature.range}</Chip>
                              </Show>
                              <Show when={feature.rechargeOn}>
                                <Chip variant="outline" class="text-xs">{RECHARGE_ON_LABELS[feature.rechargeOn!]}</Chip>
                              </Show>
                            </div>
                            <Show when={!isReadOnly}>
                              <div class="flex items-center shrink-0">
                                <Tooltip content={`Edit ${section.singular}`}>
                                  <button
                                    type="button"
                                    data-test={`feature-edit-${feature.id}`}
                                    aria-label={`Edit ${feature.name}`}
                                    onClick={() => setEditingFeature(feature)}
                                    class={cn(TOUCH_TARGET_BOX, "text-muted-foreground hover:text-foreground")}
                                  >
                                    <Pencil class="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </Tooltip>
                                {/* Every character keeps its required features */}
                                <Show when={!isRequiredFeature(feature)}>
                                  <Tooltip content={`Delete ${section.singular}`}>
                                    <ConfirmButton
                                      data-test={`feature-delete-${feature.id}`}
                                      verb="Delete"
                                      subject={feature.name}
                                      variant="ghostDestructive"
                                      size="bareIcon"
                                      onConfirm={() => handleDelete(section.field, feature.id)}
                                    >
                                      <Trash2 class="h-4 w-4" aria-hidden="true" />
                                    </ConfirmButton>
                                  </Tooltip>
                                </Show>
                              </div>
                            </Show>
                          </div>
                          <Show when={feature.featureType && feature.featureType !== 'Action'}>
                            {(() => {
                              const lines = featureEffectLines(feature)
                              return (
                                <Show when={lines.length > 0}>
                                  <div class="text-xs text-muted-foreground space-y-0.5">
                                    <For each={lines}>
                                      {(line) => (
                                        <div>
                                          <Show when={lines.length > 1 && line.level != null}>
                                            <span class="font-medium">Level {line.level}: </span>
                                          </Show>
                                          {line.text}
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </Show>
                              )
                            })()}
                          </Show>
                          <Show when={feature.description}>
                            <MarkdownContent text={feature.description!} class="text-muted-foreground" />
                          </Show>
                          {(() => {
                            const maxUses = effectiveMaxUses(feature, props.character)
                            return (
                              <Show when={maxUses > 0}>
                                <Show
                                  when={maxUses <= 5}
                                  fallback={
                                    // value/onChange are inverted: display shows remaining uses, storage tracks used count
                                    <StepperInput data-test={`feature-uses-stepper-${feature.id}`}
                                      value={remainingUses(feature.uses, maxUses)}
                                      min={0}
                                      max={maxUses}
                                      onChange={(v) => handleFeatureUsesChange(section.field, feature.id, spentFromRemaining(v, maxUses))}
                                      readOnly={isReadOnly}
                                      aria-label={`${feature.name} uses remaining`}
                                    />
                                  }
                                >
                                  <PipTracker
                                    data-test={`feature-uses-${feature.id}`}
                                    total={maxUses}
                                    used={feature.uses ?? 0}
                                    onToggle={(v) => handleFeatureUsesChange(section.field, feature.id, v)}
                                    usedTitle="Charge spent (click to restore)"
                                    availableTitle="Charge available (click to use)"
                                    usedLabel="Charge spent"
                                    availableLabel="Charge available"
                                    readOnly={isReadOnly}
                                  />
                                </Show>
                              </Show>
                            )
                          })()}
                          <Show when={isActiveHitDieSource(feature)}>
                            <div class="space-y-1">
                              <Label class="text-xs text-muted-foreground">Spent Hit Dice</Label>
                              <Show
                                when={(props.character.level ?? 1) <= 5}
                                fallback={
                                  <StepperInput data-test="spent-hit-dice-stepper"
                                    value={props.character.spentHitDice ?? 0}
                                    min={0}
                                    max={props.character.level ?? 1}
                                    onChange={handleSpentHitDiceChange}
                                    readOnly={isReadOnly}
                                    aria-label="Spent hit dice"
                                  />
                                }
                              >
                                <PipTracker
                                  data-test={`hit-dice-${feature.id}`}
                                  icon={Dices}
                                  total={props.character.level ?? 1}
                                  used={props.character.spentHitDice ?? 0}
                                  onToggle={handleSpentHitDiceChange}
                                  usedTitle="Hit die spent"
                                  availableTitle="Hit die available"
                                  usedLabel="Hit die spent"
                                  availableLabel="Hit die available"
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

      <FeatureEditModal
        open={isAddOpen() != null || editingFeature() != null}
        kind={editingFeature()?.source ?? isAddOpen() ?? 'class-feature'}
        feature={editingFeature()}
        characterLevel={props.character.level ?? 1}
        proficiencyBonus={getEffectiveProficiencyBonus(props.character)}
        onSave={handleSave}
        onCancel={() => { setIsAddOpen(null); setEditingFeature(null) }}
      />
    </Card>
  )
}

interface FeatureEditModalProps {
  open: boolean
  /** The section a new feature is added to; an edited feature keeps its own source. */
  kind: FeatureKind
  /** The feature to edit, or null to add a new one. */
  feature: Feature | null
  /** The Feature Type a new feature starts with; none picked when absent. */
  initialType?: FeatureTypeValue
  characterLevel: number
  /** The character's effective proficiency bonus (getEffectiveProficiencyBonus). */
  proficiencyBonus: number
  onSave: (feature: Feature) => void
  onCancel: () => void
}

/** The feature add/edit modal, shared by the Features module and the feature action cards. */
export function FeatureEditModal(props: FeatureEditModalProps) {
  const singular = () => FEATURE_FIELD_CONFIG.find((s) => s.kind === (props.feature?.source ?? props.kind))!.singular
  // A required feature's type can't change, so the title names it in place of a Feature Type field
  const subject = (feature: Feature | null) => (feature && isRequiredFeature(feature) ? feature.featureType : singular())
  return (
    <Modal open={props.open} onOpenChange={(open) => { if (!open) props.onCancel() }}>
      {/* Adding starts with only Feature Type, whose dropdown opens in place and is clipped by the
          modal's own scroll container, so the modal must be tall enough to show it. content-start
          keeps the header and form together at the top. */}
      <ModalContent class={cn("max-w-md", !props.feature && "min-h-[540px] content-start")}>
        {/* Keyed so the form starts over from the right feature each time the modal opens */}
        <Show when={props.open && { feature: props.feature }} keyed>
          {({ feature }) => (
            <>
              <ModalHeader>
                <ModalTitle>{feature ? "Edit" : "Add"} {subject(feature)}</ModalTitle>
              </ModalHeader>
              <FeatureForm
                initialData={feature ? featureToForm(feature) : props.initialType ? withFeatureType(defaultFeatureForm, props.initialType) : undefined}
                characterLevel={props.characterLevel}
                proficiencyBonus={props.proficiencyBonus}
                onSubmit={(data) => props.onSave(featureFromForm(data, feature ?? { source: props.kind }))}
                onCancel={props.onCancel}
              />
            </>
          )}
        </Show>
      </ModalContent>
    </Modal>
  )
}

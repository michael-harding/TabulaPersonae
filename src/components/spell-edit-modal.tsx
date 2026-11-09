import { createSignal, Show } from "solid-js"
import Save from "lucide-solid/icons/save"

import type { Spell, Equipment, DamageFields as DamageValues, GainFields as GainValues } from "@/lib/character-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { DamageFields, GainFields } from "@/components/effect-fields"
import { ABILITY_ABBREVIATIONS } from "@/lib/character-utils"

export interface SpellFormData extends DamageValues, GainValues {
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  attackRoll: boolean
  attackSave?: string
  atHigherLevel?: string
  damagePerLevel: string
  gainPerLevel: string
  highlights: string
  description: string
  prepared: boolean
  known: boolean
  concentration?: boolean
  ritual?: boolean
  grantedBy: string
  freeCast: boolean
}

const SPELL_SCHOOLS = ["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"]

export const SPELL_LEVELS = [
  { value: 0, label: "Cantrip" },
  { value: 1, label: "1st Level" },
  { value: 2, label: "2nd Level" },
  { value: 3, label: "3rd Level" },
  { value: 4, label: "4th Level" },
  { value: 5, label: "5th Level" },
  { value: 6, label: "6th Level" },
  { value: 7, label: "7th Level" },
  { value: 8, label: "8th Level" },
  { value: 9, label: "9th Level" },
]
const SPELL_LEVEL_OPTIONS = SPELL_LEVELS.map((l) => ({ value: String(l.value), label: l.label }))

// A spell's save is named by its ability; the DC comes from the character
const SAVE_ABILITIES = Object.values(ABILITY_ABBREVIATIONS)

const CASTING_TIMES = ["1 action","1 bonus action","1 reaction","1 minute","10 minutes","1 hour","8 hours","24 hours"]

export const defaultSpellForm: SpellFormData = {
  name: "",
  level: 0,
  school: "Evocation",
  castingTime: "1 action",
  range: "Touch",
  components: "V, S",
  duration: "Instantaneous",
  damage: "",
  damageType: "",
  damageRecurring: false,
  attackRoll: false,
  attackSave: "",
  gain: "",
  gainType: "",
  gainRecurring: false,
  atHigherLevel: "",
  damagePerLevel: "",
  gainPerLevel: "",
  highlights: "",
  description: "",
  prepared: false,
  known: true,
  concentration: false,
  ritual: false,
  grantedBy: "",
  freeCast: false,
}

interface SpellFormProps {
  initialData: SpellFormData
  onSubmit: (data: SpellFormData) => void
  onCancel: () => void
  editing: boolean
  magicItems: Equipment[]
}

export function SpellForm(props: SpellFormProps) {
  const [formData, setFormData] = createSignal<SpellFormData>(props.initialData)
  const grantedByName = () => props.magicItems.find((item) => item.id === formData().grantedBy)?.name
  const grantedByOptions = () => [
    { value: "", label: "Not item-granted" },
    ...props.magicItems.map((item) => ({ value: item.id, label: item.name })),
  ]

  return (
    <div class="space-y-4">
      <div>
        <Label for="spell-name">Spell Name</Label>
        <Input id="spell-name" data-test="spell-name" value={formData().name} onInput={(e) => setFormData((p) => ({ ...p, name: e.currentTarget.value }))} placeholder="e.g. Fireball" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <DamageFields idPrefix="spell" value={formData()} onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))} placeholder="e.g. 8d6" perLevelPlaceholder="e.g. 1d6" />
        <GainFields idPrefix="spell" value={formData()} onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))} placeholder="e.g. 2d8" perLevelPlaceholder="e.g. 1d8" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="attack-save">Attack/Save</Label>
          <Combobox id="attack-save" data-test="spell-attack-save" value={formData().attackSave || ""} onValueChange={(v) => setFormData((p) => ({ ...p, attackSave: v }))} options={SAVE_ABILITIES} placeholder="e.g. DEX" />
        </div>
        <div>
          <Label for="at-higher-level">At Higher Level</Label>
          <Input id="at-higher-level" data-test="spell-at-higher-level" value={formData().atHigherLevel || ""} onInput={(e) => setFormData((p) => ({ ...p, atHigherLevel: e.currentTarget.value }))} placeholder="e.g. +1d6 per level" />
        </div>
      </div>

      {/* Apart from Attack/Save: a spell can call for both an attack roll and a save */}
      <Checkbox
        data-test="spell-attack-roll-checkbox"
        checked={formData().attackRoll}
        onChange={(checked: boolean) => setFormData((p) => ({ ...p, attackRoll: checked }))}
        label="Has attack roll"
        labelClass="text-sm font-medium leading-none cursor-pointer"
        containerClass="gap-3 min-h-[44px]"
      />

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="spell-level">Level</Label>
          <Select options={SPELL_LEVEL_OPTIONS} value={formData().level.toString()} onValueChange={(v: string) => setFormData((p) => ({ ...p, level: parseInt(v) }))}>
            <SelectTrigger id="spell-level" data-test="spell-level-select"><SelectValue /></SelectTrigger>
            <SelectContent />
          </Select>
        </div>
        <div>
          <Label for="spell-school">School</Label>
          <Combobox id="spell-school" data-test="spell-school-combobox" value={formData().school} onValueChange={(v) => setFormData((p) => ({ ...p, school: v }))} options={SPELL_SCHOOLS} />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="casting-time">Casting Time</Label>
          <Combobox id="casting-time" data-test="spell-casting-time-combobox" value={formData().castingTime} onValueChange={(v) => setFormData((p) => ({ ...p, castingTime: v }))} options={CASTING_TIMES} />
        </div>
        <div>
          <Label for="range">Range</Label>
          <Input id="range" data-test="spell-range" value={formData().range} onInput={(e) => setFormData((p) => ({ ...p, range: e.currentTarget.value }))} placeholder="Touch" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="components">Components</Label>
          <Input id="components" data-test="spell-components" value={formData().components} onInput={(e) => setFormData((p) => ({ ...p, components: e.currentTarget.value }))} placeholder="V, S, M" />
        </div>
        <div>
          <Label for="duration">Duration</Label>
          <Input id="duration" data-test="spell-duration" value={formData().duration} onInput={(e) => setFormData((p) => ({ ...p, duration: e.currentTarget.value }))} placeholder="Instantaneous" />
        </div>
      </div>

      <div>
        <Label for="spell-highlights">Highlights</Label>
        <Textarea id="spell-highlights" data-test="spell-highlights" value={formData().highlights} onInput={(e) => setFormData((p) => ({ ...p, highlights: e.currentTarget.value }))} placeholder="Shown on the action card (Markdown)" rows={2} />
      </div>

      <div>
        <Label for="description">Description</Label>
        <Textarea id="description" data-test="spell-description" value={formData().description} onInput={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))} placeholder="Spell description and effects" rows={4} />
      </div>

      <Checkbox
        data-test="spell-known-checkbox"
        checked={formData().known}
        onChange={(checked: boolean) => setFormData((p) => ({ ...p, known: checked, prepared: checked ? p.prepared : false }))}
        label="Known"
        labelClass="text-sm font-medium leading-none cursor-pointer"
        containerClass="gap-3 min-h-[44px]"
      />

      <Show when={formData().level > 0}>
        <Checkbox
          data-test="spell-prepared-checkbox"
          checked={formData().prepared}
          disabled={!formData().known}
          onChange={(checked: boolean) => setFormData((p) => ({ ...p, prepared: checked }))}
          label="Prepared"
          labelClass={`text-sm font-medium leading-none ${formData().known ? "cursor-pointer" : "cursor-not-allowed"}`}
          containerClass={`gap-3 min-h-[44px] ${formData().known ? "" : "opacity-50 cursor-not-allowed"}`}
        />
      </Show>

      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox
          data-test="spell-concentration-checkbox"
          checked={!!formData().concentration}
          onChange={(checked: boolean) => setFormData((p) => ({ ...p, concentration: checked }))}
          label="Concentration"
          labelClass="text-sm font-medium leading-none cursor-pointer"
          containerClass="gap-3 min-h-[44px]"
        />
        <Checkbox
          data-test="spell-ritual-checkbox"
          checked={!!formData().ritual}
          onChange={(checked: boolean) => setFormData((p) => ({ ...p, ritual: checked }))}
          label="Ritual"
          labelClass="text-sm font-medium leading-none cursor-pointer"
          containerClass="gap-3 min-h-[44px]"
        />
      </div>

      <Show when={props.magicItems.length > 0}>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="spell-granted-by">Granted By (optional)</Label>
            <Select
              options={grantedByOptions()}
              // An item that has since been removed is no longer granting anything
              value={grantedByName() ? formData().grantedBy : ""}
              onValueChange={(id) => setFormData((p) => ({ ...p, grantedBy: id }))}
            >
              <SelectTrigger id="spell-granted-by" data-test="spell-granted-by-select"><SelectValue /></SelectTrigger>
              <SelectContent />
            </Select>
          </div>
          <Show when={formData().grantedBy}>
            <Checkbox
              data-test="spell-free-cast-checkbox"
              checked={formData().freeCast}
              onChange={(checked: boolean) => setFormData((p) => ({ ...p, freeCast: checked }))}
              label="Free Cast (no slot)"
              labelClass="text-sm font-medium leading-none cursor-pointer"
              containerClass="gap-3 min-h-[44px] mt-auto"
            />
          </Show>
        </div>
      </Show>

      <div class="flex gap-2 justify-end pt-4">
        <Button data-test="spell-form-cancel" variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button data-test="spell-form-submit" onClick={() => props.onSubmit(formData())} class="gap-2">
          <Save class="h-4 w-4" aria-hidden="true" />
          {props.editing ? "Update Spell" : "Add Spell"}
        </Button>
      </div>
    </div>
  )
}


/** The form's fields for an existing spell. */
export function spellToForm(spell: Spell): SpellFormData {
  return {
    name: spell.name,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    damage: spell.damage || "",
    damageType: spell.damageType || "",
    damageRecurring: spell.damageRecurring ?? false,
    attackRoll: spell.attackRoll ?? false,
    attackSave: spell.attackSave || "",
    highlights: spell.highlights || "",
    description: spell.description,
    prepared: spell.prepared || false,
    known: spell.known ?? true,
    gain: spell.gain || "",
    gainType: spell.gainType || "",
    gainRecurring: spell.gainRecurring ?? false,
    atHigherLevel: spell.atHigherLevel || "",
    damagePerLevel: spell.damagePerLevel || "",
    gainPerLevel: spell.gainPerLevel || "",
    concentration: spell.concentration ?? false,
    ritual: spell.ritual ?? false,
    grantedBy: spell.grantedBy || "",
    freeCast: spell.freeCast ?? false,
  }
}

/**
 * The spell a submitted form describes: `base` updated in place (keeping its id and any field the
 * form doesn't show), or a new spell when there is no base. Optional fields left blank are omitted
 * rather than stored as "" or false.
 */
export function spellFromForm(form: SpellFormData, base?: Spell): Spell {
  return {
    ...base,
    id: base?.id ?? crypto.randomUUID(),
    name: form.name.trim(),
    level: form.level,
    school: form.school,
    castingTime: form.castingTime,
    range: form.range,
    components: form.components,
    duration: form.duration,
    highlights: form.highlights.trim() || undefined,
    description: form.description.trim(),
    prepared: form.prepared,
    known: form.known,
    damage: form.damage,
    damageType: form.damageType || undefined,
    damageRecurring: form.damageRecurring || undefined,
    attackRoll: form.attackRoll || undefined,
    attackSave: form.attackSave,
    gain: form.gain,
    gainType: form.gainType || undefined,
    gainRecurring: form.gainRecurring || undefined,
    atHigherLevel: form.atHigherLevel,
    damagePerLevel: form.damagePerLevel.trim() || undefined,
    gainPerLevel: form.gainPerLevel.trim() || undefined,
    concentration: form.concentration,
    ritual: form.ritual,
    grantedBy: form.grantedBy || undefined,
    freeCast: form.grantedBy && form.freeCast ? true : undefined,
  }
}

interface SpellEditModalProps {
  open: boolean
  /** The spell to edit, or null to add a new one. */
  spell: Spell | null
  magicItems: Equipment[]
  onSave: (spell: Spell) => void
  onCancel: () => void
}

/** The spell add/edit modal, shared by the Spells module and the spell action cards. */
export function SpellEditModal(props: SpellEditModalProps) {
  const handleSubmit = (form: SpellFormData) => {
    if (!form.name.trim()) return
    props.onSave(spellFromForm(form, props.spell ?? undefined))
  }
  return (
    <Modal open={props.open} onOpenChange={(open: boolean) => { if (!open) props.onCancel() }}>
      <ModalContent class="max-w-2xl">
        <ModalHeader><ModalTitle>{props.spell ? "Edit Spell" : "Add New Spell"}</ModalTitle></ModalHeader>
        <SpellForm
          initialData={props.spell ? spellToForm(props.spell) : defaultSpellForm}
          onSubmit={handleSubmit}
          onCancel={props.onCancel}
          editing={!!props.spell}
          magicItems={props.magicItems}
        />
      </ModalContent>
    </Modal>
  )
}

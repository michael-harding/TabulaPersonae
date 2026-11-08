import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { DAMAGE_TYPE_OPTIONS, GAIN_TYPE_OPTIONS } from "@/lib/character-utils"
import type { DamageFields as DamageValues, GainFields as GainValues } from "@/lib/character-types"

// Shared by every form that authors damage or gain (spells, features, custom actions, items), so
// the three fields always appear together and in the same layout.

interface EffectFieldsProps<T> {
  /** Prefix for each control's id and data-test, e.g. "spell" gives "spell-damage". Page-unique. */
  idPrefix: string
  value: T
  onChange: (patch: Partial<T>) => void
  /** What this kind of entry usually holds, e.g. "e.g. 8d6" for a spell. */
  placeholder: string
}

export function DamageFields(props: EffectFieldsProps<DamageValues>) {
  const id = (suffix: string) => `${props.idPrefix}-${suffix}`
  return (
    <div class="space-y-1">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for={id("damage")}>Damage</Label>
          <Input id={id("damage")} data-test={id("damage")} value={props.value.damage ?? ""}
            onInput={(e) => props.onChange({ damage: e.currentTarget.value })} placeholder={props.placeholder} />
        </div>
        <div>
          <Label for={id("damage-type")}>Damage Type</Label>
          <Combobox id={id("damage-type")} data-test={id("damage-type")} value={props.value.damageType ?? ""}
            onValueChange={(v) => props.onChange({ damageType: v })} options={DAMAGE_TYPE_OPTIONS} />
        </div>
      </div>
      <Checkbox
        data-test={id("damage-recurring")}
        checked={!!props.value.damageRecurring}
        onChange={(checked: boolean) => props.onChange({ damageRecurring: checked })}
        label="Damage recurs each turn"
        labelClass="text-sm font-medium leading-none cursor-pointer"
        containerClass="gap-3 min-h-[44px]"
      />
    </div>
  )
}

export function GainFields(props: EffectFieldsProps<GainValues>) {
  const id = (suffix: string) => `${props.idPrefix}-${suffix}`
  return (
    <div class="space-y-1">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for={id("gain")}>Gain</Label>
          <Input id={id("gain")} data-test={id("gain")} value={props.value.gain ?? ""}
            onInput={(e) => props.onChange({ gain: e.currentTarget.value })} placeholder={props.placeholder} />
        </div>
        <div>
          <Label for={id("gain-type")}>Gain Type</Label>
          <Combobox id={id("gain-type")} data-test={id("gain-type")} value={props.value.gainType ?? ""}
            onValueChange={(v) => props.onChange({ gainType: v })} options={GAIN_TYPE_OPTIONS} />
        </div>
      </div>
      <Checkbox
        data-test={id("gain-recurring")}
        checked={!!props.value.gainRecurring}
        onChange={(checked: boolean) => props.onChange({ gainRecurring: checked })}
        label="Gain recurs each turn"
        labelClass="text-sm font-medium leading-none cursor-pointer"
        containerClass="gap-3 min-h-[44px]"
      />
    </div>
  )
}

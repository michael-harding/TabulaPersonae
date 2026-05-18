import { createSignal, Show, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSkillModifier, parseHitDiceSize } from "@/lib/character-utils"
import { DIE_SIZES } from "@/lib/dice"
import { saveCharacter } from "@/lib/character-storage"
import { EditableSection } from "@/components/editable-section"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import ShieldIcon from "lucide-solid/icons/shield"
import Heart from "lucide-solid/icons/heart"
import Plus from "lucide-solid/icons/plus"
import Minus from "lucide-solid/icons/minus"
import Skull from "lucide-solid/icons/skull"
import CheckCircle from "lucide-solid/icons/check-circle"
import XCircle from "lucide-solid/icons/x-circle"
import X from "lucide-solid/icons/x"

const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
]

interface CombatStatsProps {
  character: Character
  onUpdate: (character: Character) => void
}

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]

const toEdit = (c: Character) => ({
  ...c,
  hitPoints: {
    current: c.hitPoints?.current ?? 0,
    maximum: c.hitPoints?.maximum ?? 1,
    temporary: c.hitPoints?.temporary ?? 0,
  },
  armorClass: c.armorClass || 10,
  initiative: c.initiative || 0,
  speed: c.speed || 30,
  proficiencyBonus: c.proficiencyBonus || 2,
  deathSaves: { successes: c.deathSaves?.successes || 0, failures: c.deathSaves?.failures || 0 },
  spentHitDice: c.spentHitDice ?? 0,
  hitDiceSize: c.hitDiceSize ?? parseHitDiceSize(c.hitDice ?? "1d8"),
  size: c.size ?? "Medium",
  shield: c.shield ?? false,
})


export function CombatStats(props: CombatStatsProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))

  const handleSave = () => { props.onUpdate(edited()); saveCharacter(edited()); setIsEditing(false) }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  const edition = () => props.character.edition ?? "2024"

  const updateHP = (field: "current" | "maximum" | "temporary", value: number) =>
    setEdited((prev) => {
      const next = { ...prev.hitPoints, [field]: value }
      if (next.current > next.maximum) next.current = next.maximum
      return { ...prev, hitPoints: next }
    })

  const adjustHitPoints = (amount: number) => {
    const currentHP = props.character.hitPoints?.current ?? 0
    const maxHP = props.character.hitPoints?.maximum ?? 1
    const tempHP = props.character.hitPoints?.temporary ?? 0

    let newTempHP = tempHP
    let newCurrentHP = currentHP

    if (amount < 0) {
      const damage = -amount
      const tempAbsorbed = Math.min(tempHP, damage)
      newTempHP = tempHP - tempAbsorbed
      newCurrentHP = Math.max(0, currentHP - (damage - tempAbsorbed))
    } else {
      newCurrentHP = Math.min(maxHP, currentHP + amount)
    }

    const updated = { ...props.character, hitPoints: { ...props.character.hitPoints, current: newCurrentHP, temporary: newTempHP } }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const toggleDeathSave = (type: "successes" | "failures", index: number) => {
    const current = props.character.deathSaves?.[type] || 0
    const newValue = Math.max(0, Math.min(3, index < current ? current - 1 : index + 1))
    const updated = { ...props.character, deathSaves: { ...props.character.deathSaves, [type]: newValue } }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const currentHP = () => props.character.hitPoints?.current ?? 0
  const maxHP = () => props.character.hitPoints?.maximum ?? 1
  const tempHP = () => props.character.hitPoints?.temporary ?? 0
  const hpPercentage = () => maxHP() > 0 ? (currentHP() / maxHP()) * 100 : 0
  const hpColor = () => {
    const pct = hpPercentage()
    if (pct >= 67) return "bg-green-500 dark:bg-green-700"
    if (pct >= 34) return "bg-yellow-500 dark:bg-yellow-600"
    return "bg-red-600"
  }
  const tempHpWidth = () => Math.min(tempHP() / maxHP() * 100, 100)
  const tempHpLeft = () => Math.min(hpPercentage(), 100 - tempHpWidth())

  const toggleCondition = (condition: string) => {
    const current = props.character.conditions ?? []
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition]
    const updated = { ...props.character, conditions: next }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const passivePerception = () => {
    const wis = props.character.abilityScores?.wisdom ?? 10
    const prof = props.character.proficiencyBonus ?? 2
    const percSkill = props.character.skills?.perception
    return 10 + getSkillModifier(wis, prof, percSkill?.proficient ?? false, percSkill?.expertise ?? false)
  }

  const passivePerceptionLabel = () => edition() === "2014" ? "Passive Wisdom (Perception)" : "Passive Perception"

  return (
    <EditableSection
      icon={<ShieldIcon class="h-5 w-5 text-primary" />}
      title="Combat Stats"
      isEditing={isEditing()}
      onEdit={() => { setEdited(toEdit(props.character)); setIsEditing(true) }}
      onSave={handleSave}
      onCancel={handleCancel}
      contentClass="space-y-6"
    >
        {/* Hit Points */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label class="flex items-center gap-2">
              <Heart class="h-4 w-4 text-destructive" />
              Hit Points
            </Label>
            <Show when={!isEditing()}>
              <div class="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => adjustHitPoints(-1)} disabled={currentHP() <= 0}>
                  <Minus class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => adjustHitPoints(1)} disabled={currentHP() >= maxHP()}>
                  <Plus class="h-3 w-3" />
                </Button>
              </div>
            </Show>
          </div>

          <Show when={isEditing()} fallback={
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-2xl font-bold">
                  {currentHP()}
                  <Show when={tempHP() > 0}><span class="text-accent">+{tempHP()}</span></Show>
                  <span class="text-muted-foreground">/{maxHP()}</span>
                </span>
                <span class="text-sm text-muted-foreground">{Math.round(hpPercentage())}%</span>
              </div>
              <div class="relative h-2 w-full overflow-hidden bg-secondary/30 rounded-full">
                <div
                  class={`absolute left-0 top-0 h-full transition-all duration-300 ${hpColor()}`}
                  style={{ width: `${hpPercentage()}%` }}
                />
                <Show when={tempHP() > 0}>
                  <div
                    class="absolute top-0 h-full bg-blue-500 transition-all duration-300"
                    style={{ left: `${tempHpLeft()}%`, width: `${tempHpWidth()}%` }}
                  />
                </Show>
              </div>
            </div>
          }>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <Label class="text-xs">Current</Label>
                <NumericInput min={0} max={edited().hitPoints?.maximum} value={edited().hitPoints?.current ?? 0} onChange={(v) => updateHP("current", v)} />
              </div>
              <div>
                <Label class="text-xs">Maximum</Label>
                <NumericInput min={1} value={edited().hitPoints?.maximum ?? 1} onChange={(v) => updateHP("maximum", v)} />
              </div>
              <div>
                <Label class="text-xs">Temporary</Label>
                <NumericInput min={0} value={edited().hitPoints?.temporary ?? 0} onChange={(v) => updateHP("temporary", v)} />
              </div>
            </div>
          </Show>
        </div>

        {/* Hit Dice */}
        <div class="space-y-2">
          <Label class="text-sm text-muted-foreground">Hit Dice</Label>
          <Show
            when={isEditing()}
            fallback={
              <div class="flex items-center gap-3">
                <span class="text-lg font-semibold">
                  d{props.character.hitDiceSize ?? parseHitDiceSize(props.character.hitDice ?? "1d8")}
                </span>
                <span class="text-muted-foreground">
                  {(props.character.level ?? 1) - (props.character.spentHitDice ?? 0)}/{props.character.level ?? 1} available
                </span>
              </div>
            }
          >
            <div class="space-y-3">
              <div>
                <Label class="text-xs">Die Type</Label>
                <Select
                  value={String(edited().hitDiceSize)}
                  onValueChange={(v) => setEdited(prev => ({ ...prev, hitDiceSize: Number(v) }))}
                >
                  <SelectTrigger class="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <For each={DIE_SIZES}>{(s) => <SelectItem value={String(s)}>d{s}</SelectItem>}</For>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label class="text-xs">Spent Hit Dice</Label>
                <Show
                  when={(props.character.level ?? 1) <= 5}
                  fallback={
                    <StepperInput
                      value={edited().spentHitDice ?? 0}
                      min={0}
                      max={props.character.level ?? 1}
                      onChange={(v) => setEdited(prev => ({ ...prev, spentHitDice: v }))}
                    />
                  }
                >
                  <PipTracker
                    total={props.character.level ?? 1}
                    used={edited().spentHitDice ?? 0}
                    onToggle={(v) => setEdited(prev => ({ ...prev, spentHitDice: v }))}
                    usedTitle="Hit die spent"
                    availableTitle="Hit die available"
                  />
                </Show>
              </div>
            </div>
          </Show>
        </div>

        {/* Death Saves — only at 0 HP */}
        <Show when={currentHP() === 0}>
          <div class="space-y-3">
            <Label class="flex items-center gap-2">
              <Skull class="h-4 w-4 text-destructive" />
              Death Saves
            </Label>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="text-sm font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle class="h-3 w-3" /> Successes
                </div>
                <div class="flex gap-1">
                  <For each={[0, 1, 2]}>
                    {(i) => (
                      <button
                        onClick={() => toggleDeathSave("successes", i)}
                        class={`w-6 h-6 rounded-full border-2 transition-colors ${i < (props.character.deathSaves?.successes || 0) ? "bg-green-500 border-green-500" : "bg-background border-green-500 hover:bg-green-100"}`}
                        title={i < (props.character.deathSaves?.successes || 0) ? "Success (click to remove)" : "Click to add success"}
                      >
                        <Show when={i < (props.character.deathSaves?.successes || 0)}>
                          <CheckCircle class="h-4 w-4 text-white mx-auto" />
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div class="space-y-2">
                <div class="text-sm font-medium text-red-600 flex items-center gap-1">
                  <XCircle class="h-3 w-3" /> Failures
                </div>
                <div class="flex gap-1">
                  <For each={[0, 1, 2]}>
                    {(i) => (
                      <button
                        onClick={() => toggleDeathSave("failures", i)}
                        class={`w-6 h-6 rounded-full border-2 transition-colors ${i < (props.character.deathSaves?.failures || 0) ? "bg-red-500 border-red-500" : "bg-background border-red-500 hover:bg-red-100"}`}
                        title={i < (props.character.deathSaves?.failures || 0) ? "Failure (click to remove)" : "Click to add failure"}
                      >
                        <Show when={i < (props.character.deathSaves?.failures || 0)}>
                          <XCircle class="h-4 w-4 text-white mx-auto" />
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
            <Show when={(props.character.deathSaves?.successes || 0) >= 3}>
              <div class="text-sm text-green-600 font-medium">✓ Stabilized! Character is unconscious but stable.</div>
            </Show>
            <Show when={(props.character.deathSaves?.failures || 0) >= 3}>
              <div class="text-sm text-red-600 font-medium">✗ Character has died.</div>
            </Show>
          </div>
        </Show>

        {/* Conditions */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm text-muted-foreground">Conditions</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                as="button"
                class="inline-flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                title="Add condition"
              >
                <Plus class="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <For each={CONDITIONS}>
                  {(condition) => (
                    <DropdownMenuItem
                      onSelect={() => toggleCondition(condition)}
                      class={(props.character.conditions ?? []).includes(condition) ? "text-primary font-medium" : ""}
                    >
                      {condition}
                      <Show when={(props.character.conditions ?? []).includes(condition)}>
                        <span class="ml-auto text-primary">✓</span>
                      </Show>
                    </DropdownMenuItem>
                  )}
                </For>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div class="flex flex-wrap gap-1.5 min-h-[1.5rem]">
            <Show
              when={(props.character.conditions ?? []).length > 0}
              fallback={<span class="text-xs text-muted-foreground italic">None</span>}
            >
              <For each={props.character.conditions ?? []}>
                {(condition) => (
                  <button
                    type="button"
                    onClick={() => toggleCondition(condition)}
                    class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                    title="Click to remove"
                  >
                    {condition}
                    <X class="h-2.5 w-2.5" />
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Other Combat Stats */}
        <div class="grid grid-cols-2 gap-4">
          {/* AC with optional shield */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">
              Armor Class
              <Show when={edition() === "2024"}>
                <Show when={!isEditing()}>
                  <label class="ml-2 inline-flex items-center gap-1 cursor-pointer" title="Shield equipped">
                    <input
                      type="checkbox"
                      checked={!!props.character.shield}
                      onChange={(e) => {
                        const updated = { ...props.character, shield: e.currentTarget.checked }
                        props.onUpdate(updated)
                        saveCharacter(updated)
                      }}
                      class="h-3 w-3 accent-primary"
                    />
                    <span class="text-xs">Shield</span>
                  </label>
                </Show>
              </Show>
            </Label>
            <Show when={isEditing()} fallback={
              <div class="text-2xl font-bold text-primary mt-1">{props.character.armorClass as number || 10}</div>
            }>
              <div class="space-y-1">
                <NumericInput
                  value={edited().armorClass}
                  onChange={(v) => setEdited(prev => ({ ...prev, armorClass: v }))}
                  class="text-center text-xl font-bold mt-1"
                />
                <Show when={edition() === "2024"}>
                  <label class="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!edited().shield}
                      onChange={(e) => setEdited(prev => ({ ...prev, shield: e.currentTarget.checked }))}
                      class="h-3 w-3 accent-primary"
                    />
                    Shield equipped
                  </label>
                </Show>
              </div>
            </Show>
          </div>

          {[
            { label: "Initiative", field: "initiative" as const, default: 0, display: (v: number) => `${v >= 0 ? "+" : ""}${v}` },
            { label: "Speed", field: "speed" as const, default: 30, display: (v: number) => `${v} ft` },
            { label: "Proficiency Bonus", field: "proficiencyBonus" as const, default: 2, display: (v: number) => `+${v}` },
          ].map(({ label, field, default: def, display }) => (
            <div class="text-center">
              <Label class="text-sm text-muted-foreground">{label}</Label>
              <Show when={isEditing()} fallback={
                <div class="text-2xl font-bold text-primary mt-1">{display(props.character[field] as number || def)}</div>
              }>
                <NumericInput
                  value={edited()[field] as number}
                  onChange={(v) => setEdited(prev => ({ ...prev, [field]: v }))}
                  class="text-center text-xl font-bold mt-1"
                />
              </Show>
            </div>
          ))}

          {/* Passive Perception — both editions */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">{passivePerceptionLabel()}</Label>
            <div class="text-2xl font-bold text-primary mt-1">{passivePerception()}</div>
          </div>

          {/* Size — 2024 only */}
          <Show when={edition() === "2024"}>
            <div class="text-center">
              <Label class="text-sm text-muted-foreground">Size</Label>
              <Show when={isEditing()} fallback={
                <div class="text-2xl font-bold text-primary mt-1">{props.character.size ?? "Medium"}</div>
              }>
                <Combobox
                  value={edited().size ?? "Medium"}
                  onValueChange={(v) => setEdited(prev => ({ ...prev, size: v }))}
                  options={SIZES}
                  class="mt-1"
                />
              </Show>
            </div>
          </Show>
        </div>

    </EditableSection>
  )
}

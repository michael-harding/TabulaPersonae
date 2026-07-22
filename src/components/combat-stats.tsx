import { createSignal, createMemo, Show, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getSkillModifier, getAbilityModifier, getProficiencyBonus, parseHitDiceSize, calculateEquippedAC } from "@/lib/character-utils"
import { useHpDisplay } from "@/hooks/use-hp-display"
import { DIE_SIZES } from "@/lib/dice"
import { saveCharacter } from "@/lib/character-storage"
import { Tooltip } from "@/components/ui/tooltip"
import { EditableSection } from "@/components/editable-section"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { Checkbox } from "@/components/ui/checkbox"
import { useReadOnly } from "@/lib/read-only-context"
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

function computePassivePerception(c: Character): number {
  const wis = c.abilityScores?.wisdom ?? 10
  const prof = c.proficiencyBonus ?? 2
  const percSkill = c.skills?.perception
  return 10 + getSkillModifier(wis, prof, percSkill?.proficient ?? false, percSkill?.expertise ?? false)
}

const toEdit = (c: Character) => {
  return {
    ...c,
    hitPoints: {
      current: c.hitPoints?.current ?? 0,
      maximum: c.hitPoints?.maximum ?? 1,
      temporary: c.hitPoints?.temporary ?? 0,
      temporaryMaximum: c.hitPoints?.temporaryMaximum ?? 0,
    },
    armorClass: c.armorClass || 10,
    initiative: c.initiative || 0,
    speed: c.speed || 30,
    proficiencyBonus: c.proficiencyBonus || 2,
    deathSaves: { successes: c.deathSaves?.successes || 0, failures: c.deathSaves?.failures || 0 },
    spentHitDice: c.spentHitDice ?? 0,
    hitDiceSize: c.hitDiceSize ?? parseHitDiceSize(c.hitDice ?? "1d8"),
    size: c.size ?? "Medium",
    useCalculatedInitiative: c.useCalculatedInitiative ?? false,
    useCalculatedProficiencyBonus: c.useCalculatedProficiencyBonus ?? false,
    useCalculatedArmorClass: c.useCalculatedArmorClass ?? true,
    useCalculatedPassivePerception: c.useCalculatedPassivePerception ?? true,
    passivePerception: c.passivePerception ?? computePassivePerception(c),
  }
}


export function CombatStats(props: CombatStatsProps) {
  const isReadOnly = useReadOnly()
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))

  const handleSave = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    const data = edited()
    const effMax = (data.hitPoints?.maximum ?? 1) + (data.hitPoints?.temporaryMaximum ?? 0)
    const normalized = {
      ...data,
      hitPoints: {
        ...data.hitPoints,
        current: Math.min(data.hitPoints?.current ?? 0, effMax),
      },
      initiative: data.useCalculatedInitiative
        ? getAbilityModifier(data.abilityScores?.dexterity ?? 10)
        : data.initiative,
      proficiencyBonus: data.useCalculatedProficiencyBonus
        ? getProficiencyBonus(data.level ?? 1)
        : data.proficiencyBonus,
      armorClass: (data.useCalculatedArmorClass ?? true)
        ? equippedAC().ac
        : data.armorClass,
      passivePerception: (data.useCalculatedPassivePerception ?? true)
        ? passivePerception()
        : (data.passivePerception ?? passivePerception()),
    }
    props.onUpdate(normalized)
    saveCharacter(normalized)
    setIsEditing(false)
  }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  const edition = createMemo(() => props.character.edition ?? "2024")

  const updateHP = (field: "current" | "maximum" | "temporary" | "temporaryMaximum", value: number) =>
    setEdited((prev) => {
      const next = { ...prev.hitPoints, [field]: value }
      const effMax = (next.maximum ?? 1) + (next.temporaryMaximum ?? 0)
      if ((next.current ?? 0) > effMax) next.current = effMax
      return { ...prev, hitPoints: next }
    })

  const adjustHitPoints = (amount: number) => {
    if (isReadOnly) return
    const currentHP = props.character.hitPoints?.current ?? 0
    const maxHP = (props.character.hitPoints?.maximum ?? 1) + (props.character.hitPoints?.temporaryMaximum ?? 0)
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

  const toggleDeathSave = (type: "successes" | "failures", newValue: number) => {
    if (isReadOnly) return
    const updated = { ...props.character, deathSaves: { ...props.character.deathSaves, [type]: newValue } }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const {
    currentHp: currentHP, maxHp: maxHP, tempHp: tempHP,
    hpPercentage, hpColor, tempHpWidth, tempHpLeft,
  } = useHpDisplay(() => props.character)

  const toggleCondition = (condition: string) => {
    if (isReadOnly) return
    const current = props.character.conditions ?? []
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition]
    const updated = { ...props.character, conditions: next }
    props.onUpdate(updated)
    saveCharacter(updated)
  }

  const passivePerception = createMemo(() => {
    const wis = props.character.abilityScores?.wisdom ?? 10
    const prof = props.character.proficiencyBonus ?? 2
    const percSkill = props.character.skills?.perception
    return 10 + getSkillModifier(wis, prof, percSkill?.proficient ?? false, percSkill?.expertise ?? false)
  })

  const passivePerceptionTooltip = createMemo(() => {
    const wis = props.character.abilityScores?.wisdom ?? 10
    const prof = props.character.proficiencyBonus ?? 2
    const percSkill = props.character.skills?.perception
    const skillMod = getSkillModifier(wis, prof, percSkill?.proficient ?? false, percSkill?.expertise ?? false)
    const wisMod = getAbilityModifier(wis)
    const parts = [`Wis ${wisMod >= 0 ? "+" : ""}${wisMod}`]
    if (percSkill?.expertise) {
      parts.push(`Prof +${prof}`, `Exp +${prof}`)
    } else if (percSkill?.proficient) {
      parts.push(`Prof +${prof}`)
    }
    return `10 + ${parts.join(" + ")} = ${passivePerception()}`
  })

  const passivePerceptionLabel = createMemo(() => edition() === "2014" ? "Passive Wisdom (Perception)" : "Passive Perception")

  const calcInitiative = createMemo(() => getAbilityModifier(edited().abilityScores?.dexterity ?? 10))
  const calcProfBonus = createMemo(() => getProficiencyBonus(edited().level ?? 1))

  const effectiveInitiative = createMemo(() =>
    props.character.useCalculatedInitiative
      ? getAbilityModifier(props.character.abilityScores?.dexterity ?? 10)
      : props.character.initiative ?? 0
  )
  const effectiveProfBonus = createMemo(() =>
    props.character.useCalculatedProficiencyBonus
      ? getProficiencyBonus(props.character.level ?? 1)
      : props.character.proficiencyBonus ?? 2
  )

  const equippedAC = createMemo(() => calculateEquippedAC(props.character))

  const effectiveAC = createMemo(() =>
    (props.character.useCalculatedArmorClass ?? true)
      ? equippedAC().ac
      : props.character.armorClass ?? 10
  )

  const effectivePassivePerception = createMemo(() =>
    (props.character.useCalculatedPassivePerception ?? true)
      ? passivePerception()
      : (props.character.passivePerception ?? passivePerception())
  )

  const effectivePassivePerceptionTooltip = createMemo(() =>
    (props.character.useCalculatedPassivePerception ?? true)
      ? passivePerceptionTooltip()
      : "Manual passive perception override"
  )

  return (
    <EditableSection
      data-sem="combat-stats"
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
            <Show when={!isEditing() && !isReadOnly}>
              <div class="flex gap-1">
                <Button data-test="hp-decrease-button" size="sm" variant="outline" aria-label="Decrease HP" onClick={() => adjustHitPoints(-1)} disabled={currentHP() <= 0}>
                  <Minus class="h-3 w-3" />
                </Button>
                <Button data-test="hp-increase-button" size="sm" variant="outline" aria-label="Increase HP" onClick={() => adjustHitPoints(1)} disabled={currentHP() >= maxHP()}>
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
                  <Show when={tempHP() > 0}><span class="text-blue-500 dark:text-blue-300">+{tempHP()}</span></Show>
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
              <Show when={!isReadOnly}>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground">Temp HP:</span>
                  <StepperInput
                    min={0}
                    value={props.character.hitPoints?.temporary ?? 0}
                    onChange={(v) => {
                      const updated = { ...props.character, hitPoints: { ...props.character.hitPoints, temporary: v } }
                      props.onUpdate(updated)
                      saveCharacter(updated)
                    }}
                    aria-label="Set temporary hit points"
                  />
                </div>
              </Show>
            </div>
          }>
            <div class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-xs">Current</Label>
                  <NumericInput min={0} value={edited().hitPoints?.current ?? 0} onChange={(v) => updateHP("current", v)} />
                </div>
                <div>
                  <Label class="text-xs">Maximum</Label>
                  <NumericInput min={1} value={edited().hitPoints?.maximum ?? 1} onChange={(v) => updateHP("maximum", v)} />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-xs">Temporary</Label>
                  <NumericInput min={0} value={edited().hitPoints?.temporary ?? 0} onChange={(v) => updateHP("temporary", v)} />
                </div>
                <div>
                  <Label class="text-xs">Temp Max HP</Label>
                  <NumericInput min={-999} value={edited().hitPoints?.temporaryMaximum ?? 0} onChange={(v) => updateHP("temporaryMaximum", v)} />
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Hit Dice — edit mode only */}
        <Show when={isEditing()}>
          <div class="space-y-2">
            <Label class="text-sm text-muted-foreground">Hit Dice</Label>
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
          </div>
        </Show>

        {/* Death Saves — only at 0 HP */}
        <Show when={currentHP() === 0}>
          <div class="space-y-3">
            <Label class="flex items-center gap-2">
              <Skull class="h-4 w-4 text-destructive" />
              Death Saves
            </Label>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle class="h-3 w-3" /> Successes
                </div>
                <PipTracker
                  total={3}
                  used={props.character.deathSaves?.successes || 0}
                  onToggle={(n) => toggleDeathSave("successes", n)}
                  filledClass="bg-green-500 border-green-500 hover:bg-green-400"
                  emptyClass="bg-background border-green-500 hover:bg-green-100"
                  filledIcon={<CheckCircle class="h-4 w-4 text-white" />}
                  usedTitle="Success (click to remove)"
                  availableTitle="Click to add success"
                  readOnly={isReadOnly}
                />
              </div>
              <div class="space-y-2">
                <div class="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                  <XCircle class="h-3 w-3" /> Failures
                </div>
                <PipTracker
                  total={3}
                  used={props.character.deathSaves?.failures || 0}
                  onToggle={(n) => toggleDeathSave("failures", n)}
                  filledClass="bg-red-500 border-red-500 hover:bg-red-400"
                  emptyClass="bg-background border-red-500 hover:bg-red-100"
                  filledIcon={<XCircle class="h-4 w-4 text-white" />}
                  usedTitle="Failure (click to remove)"
                  availableTitle="Click to add failure"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <Show when={(props.character.deathSaves?.successes || 0) >= 3}>
              <div class="text-sm text-green-700 dark:text-green-400 font-medium">✓ Stabilized! Character is unconscious but stable.</div>
            </Show>
            <Show when={(props.character.deathSaves?.failures || 0) >= 3}>
              <div class="text-sm text-red-600 dark:text-red-400 font-medium">✗ Character has died.</div>
            </Show>
          </div>
        </Show>

        {/* Conditions */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm text-muted-foreground">Conditions</Label>
            <Show when={!isReadOnly}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  as="button"
                  data-test="add-condition-button"
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
            </Show>
          </div>
          <div class="flex flex-wrap gap-1.5 min-h-[1.5rem]">
            <Show
              when={(props.character.conditions ?? []).length > 0}
              fallback={<span class="text-xs text-muted-foreground italic">None</span>}
            >
              <For each={props.character.conditions ?? []}>
                {(condition) => (
                  <Show
                    when={!isReadOnly}
                    fallback={
                      <span class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
                        {condition}
                      </span>
                    }
                  >
                    <button
                      type="button"
                      data-test={`remove-condition-${condition}`}
                      onClick={() => toggleCondition(condition)}
                      class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                      title="Click to remove"
                    >
                      {condition}
                      <X class="h-2.5 w-2.5" />
                    </button>
                  </Show>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Other Combat Stats */}
        <div class="grid grid-cols-2 gap-4">
          {/* AC */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">Armor Class</Label>
            <Show when={isEditing()} fallback={
              <div>
                <Tooltip
                  content={
                    (props.character.useCalculatedArmorClass ?? true)
                      ? (equippedAC().isEquippedArmor ? equippedAC().breakdown : "Base armor class")
                      : "Manual armor class override"
                  }
                  triggerFocusable
                >
                  <div class="text-2xl font-bold text-primary mt-1">{effectiveAC()}</div>
                </Tooltip>
              </div>
            }>
              <div class="space-y-1 mt-1">
                <div class="flex justify-center">
                  <Checkbox
                    label="Use calculated"
                    checked={edited().useCalculatedArmorClass ?? true}
                    onChange={(checked: boolean) => setEdited(prev => ({ ...prev, useCalculatedArmorClass: checked }))}
                    aria-label="Use calculated armor class"
                  />
                </div>
                <Show
                  when={!(edited().useCalculatedArmorClass ?? true)}
                  fallback={
                    <div class="text-xl font-bold text-primary text-center">{equippedAC().ac}</div>
                  }
                >
                  <NumericInput
                    value={edited().armorClass}
                    onChange={(v) => setEdited(prev => ({ ...prev, armorClass: v }))}
                    class="text-center"
                  />
                </Show>
              </div>
            </Show>
          </div>

          {/* Initiative */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">Initiative</Label>
            <Show when={isEditing()} fallback={
              <div class="text-2xl font-bold text-primary mt-1">
                {effectiveInitiative() >= 0 ? "+" : ""}{effectiveInitiative()}
              </div>
            }>
              <div class="space-y-1 mt-1">
                <div class="flex justify-center">
                  <Checkbox
                    label="Use DEX mod"
                    checked={edited().useCalculatedInitiative}
                    onChange={(checked: boolean) => setEdited(prev => ({ ...prev, useCalculatedInitiative: checked }))}
                    aria-label="Use DEX modifier for initiative"
                  />
                </div>
                <Show
                  when={!edited().useCalculatedInitiative}
                  fallback={
                    <div class="text-xl font-bold text-primary text-center">
                      {calcInitiative() >= 0 ? "+" : ""}{calcInitiative()}
                    </div>
                  }
                >
                  <NumericInput
                    value={edited().initiative}
                    onChange={(v) => setEdited(prev => ({ ...prev, initiative: v }))}
                    class="text-center"
                  />
                </Show>
              </div>
            </Show>
          </div>

          {/* Speed */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">Speed</Label>
            <Show when={isEditing()} fallback={
              <div class="text-2xl font-bold text-primary mt-1">{(props.character.speed || 30)} ft</div>
            }>
              <NumericInput
                value={edited().speed}
                onChange={(v) => setEdited(prev => ({ ...prev, speed: v }))}
                class="text-center text-xl font-bold mt-1"
              />
            </Show>
          </div>

          {/* Proficiency Bonus */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">Proficiency Bonus</Label>
            <Show when={isEditing()} fallback={
              <div class="text-2xl font-bold text-primary mt-1">+{effectiveProfBonus()}</div>
            }>
              <div class="space-y-1 mt-1">
                <div class="flex justify-center">
                  <Checkbox
                    label="From level"
                    checked={edited().useCalculatedProficiencyBonus}
                    onChange={(checked: boolean) => setEdited(prev => ({ ...prev, useCalculatedProficiencyBonus: checked }))}
                    aria-label="Calculate proficiency bonus from level"
                  />
                </div>
                <Show
                  when={!edited().useCalculatedProficiencyBonus}
                  fallback={
                    <div class="text-xl font-bold text-primary text-center">+{calcProfBonus()}</div>
                  }
                >
                  <NumericInput
                    value={edited().proficiencyBonus}
                    onChange={(v) => setEdited(prev => ({ ...prev, proficiencyBonus: v }))}
                    class="text-center"
                  />
                </Show>
              </div>
            </Show>
          </div>

          {/* Passive Perception — both editions */}
          <div class="text-center">
            <Label class="text-sm text-muted-foreground">{passivePerceptionLabel()}</Label>
            <Show when={isEditing()} fallback={
              <div>
                <Tooltip content={effectivePassivePerceptionTooltip()} triggerFocusable>
                  <div class="text-2xl font-bold text-primary mt-1">{effectivePassivePerception()}</div>
                </Tooltip>
              </div>
            }>
              <div class="space-y-1 mt-1">
                <div class="flex justify-center">
                  <Checkbox
                    label="Use calculated"
                    checked={edited().useCalculatedPassivePerception ?? true}
                    onChange={(checked: boolean) => setEdited(prev => ({ ...prev, useCalculatedPassivePerception: checked }))}
                    aria-label="Use calculated passive perception"
                  />
                </div>
                <Show
                  when={!(edited().useCalculatedPassivePerception ?? true)}
                  fallback={
                    <div class="text-xl font-bold text-primary text-center">{passivePerception()}</div>
                  }
                >
                  <NumericInput
                    value={edited().passivePerception ?? passivePerception()}
                    onChange={(v) => setEdited(prev => ({ ...prev, passivePerception: v }))}
                    class="text-center"
                  />
                </Show>
              </div>
            </Show>
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

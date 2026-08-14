import { createSignal, createMemo, Show, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, getProficiencyBonus, getPassiveScore, calculateEquippedAC, calculateInitiative, calculateMaxHitPoints, getEffectiveAbilityScore, getEffectiveSkillProficiency, formatModifier, formatTerm, getEffectiveMaxHp, CONDITIONS, getEffectiveMovementSpeeds, getMovementSpeedGrants, getEffectiveConditionImmunities, getEffectiveSize, SIZES, ABILITY_TITLE_CASE } from "@/lib/character-utils"
import { useHpDisplay } from "@/hooks/use-hp-display"
import { useCalculatedValue } from "@/hooks/use-calculated-value"
import { EditableModule } from "@/components/editable-module"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import { CalculatedValue } from "@/components/ui/calculated-value"
import { CalculatedValueSelect } from "@/components/ui/calculated-value-select"
import { useReadOnly } from "@/lib/read-only-context"
import ShieldIcon from "lucide-solid/icons/shield"
import Heart from "lucide-solid/icons/heart"
import Plus from "lucide-solid/icons/plus"
import Minus from "lucide-solid/icons/minus"
import Skull from "lucide-solid/icons/skull"
import CheckCircle from "lucide-solid/icons/check-circle"
import XCircle from "lucide-solid/icons/x-circle"
import X from "lucide-solid/icons/x"

interface CombatStatsModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

function movementTooltip(value: number | string, source: string | undefined): string {
  if (!source) return "No species trait grants this — add one in Features, or switch to custom entry"
  const formatted = typeof value === "number" ? `${value} ft` : value
  return `${formatted} (${source})`
}

const toEdit = (c: Character) => {
  const percSkill = c.skills?.perception
  return {
    ...c,
    hitPoints: {
      current: c.hitPoints?.current ?? 0,
      maximum: c.hitPoints?.maximum ?? 1,
      temporary: c.hitPoints?.temporary ?? 0,
      temporaryMaximum: c.hitPoints?.temporaryMaximum ?? 0,
    },
    useCalculatedMaximumHp: c.useCalculatedMaximumHp ?? false,
    armorClass: c.armorClass || 10,
    initiative: c.initiative || 0,
    speed: c.speed ?? 30,
    flySpeed: c.flySpeed ?? 0,
    swimSpeed: c.swimSpeed ?? 0,
    climbSpeed: c.climbSpeed ?? 0,
    burrowSpeed: c.burrowSpeed ?? 0,
    proficiencyBonus: c.proficiencyBonus || 2,
    deathSaves: { successes: c.deathSaves?.successes || 0, failures: c.deathSaves?.failures || 0 },
    size: c.size ?? "Medium",
    useCalculatedInitiative: c.useCalculatedInitiative ?? false,
    useCalculatedProficiencyBonus: c.useCalculatedProficiencyBonus ?? false,
    useCalculatedArmorClass: c.useCalculatedArmorClass ?? true,
    useCalculatedPassivePerception: c.useCalculatedPassivePerception ?? true,
    useCalculatedSpeed: c.useCalculatedSpeed ?? true,
    useCalculatedFlySpeed: c.useCalculatedFlySpeed ?? true,
    useCalculatedSwimSpeed: c.useCalculatedSwimSpeed ?? true,
    useCalculatedClimbSpeed: c.useCalculatedClimbSpeed ?? true,
    useCalculatedBurrowSpeed: c.useCalculatedBurrowSpeed ?? true,
    useCalculatedSize: c.useCalculatedSize ?? true,
    passivePerception: c.passivePerception ?? getPassiveScore(
      c.abilityScores?.wisdom ?? 10,
      c.proficiencyBonus ?? 2,
      percSkill?.proficient ?? false,
      percSkill?.expertise ?? false,
    ),
  }
}


export function CombatStatsModule(props: CombatStatsModuleProps) {
  const isReadOnly = useReadOnly()
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))
  const current = () => (isEditing() ? edited() : props.character)

  const persist = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    const data = edited()
    const effMax = getEffectiveMaxHp(data)
    const normalized = {
      ...data,
      hitPoints: {
        ...data.hitPoints,
        maximum: maximumHpField.resolvedValue(),
        current: Math.max(0, Math.min(data.hitPoints?.current ?? 0, effMax)),
      },
      initiative: initiativeField.resolvedValue(),
      proficiencyBonus: profBonusField.resolvedValue(),
      armorClass: acField.resolvedValue(),
      passivePerception: passivePerceptionField.resolvedValue(),
      speed: speedField.resolvedValue(),
      flySpeed: flySpeedField.resolvedValue(),
      swimSpeed: swimSpeedField.resolvedValue(),
      climbSpeed: climbSpeedField.resolvedValue(),
      burrowSpeed: burrowSpeedField.resolvedValue(),
      size: sizeField.resolvedValue(),
    }
    props.onUpdate(normalized)
  }
  const handleSave = () => { persist(); setIsEditing(false) }
  const handleSaveKeepEditing = () => { persist() }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  const edition = createMemo(() => props.character.edition ?? "2024")

  const updateHP = (field: "current" | "maximum" | "temporary" | "temporaryMaximum", value: number) =>
    setEdited((prev) => {
      const next = { ...prev.hitPoints, [field]: value }
      const effMax = getEffectiveMaxHp({ ...prev, hitPoints: next })
      next.current = Math.max(0, Math.min(next.current ?? 0, effMax))
      return { ...prev, hitPoints: next }
    })

  const adjustHitPoints = (amount: number) => {
    if (isReadOnly) return
    const currentHP = props.character.hitPoints?.current ?? 0
    const maxHP = getEffectiveMaxHp(props.character)
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
  }

  const toggleDeathSave = (type: "successes" | "failures", newValue: number) => {
    if (isReadOnly) return
    const updated = { ...props.character, deathSaves: { ...props.character.deathSaves, [type]: newValue } }
    props.onUpdate(updated)
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
  }

  const toggleConditionImmunity = (condition: string) => {
    if (isReadOnly) return
    const own = props.character.conditionImmunities ?? []
    const next = own.includes(condition)
      ? own.filter((c) => c !== condition)
      : [...own, condition]
    const updated = { ...props.character, conditionImmunities: next }
    props.onUpdate(updated)
  }

  const effectiveConditionImmunities = createMemo(() => getEffectiveConditionImmunities(props.character))
  const effectiveMovement = createMemo(() => getEffectiveMovementSpeeds(props.character))
  const movementGrants = createMemo(() => getMovementSpeedGrants(props.character))
  const effectiveSize = createMemo(() => getEffectiveSize(props.character))

  const passivePerceptionCalc = createMemo(() => {
    const wis = getEffectiveAbilityScore(current(), "wisdom")
    const prof = current().proficiencyBonus ?? 2
    const percSkill = getEffectiveSkillProficiency(current(), "perception")
    return getPassiveScore(wis, prof, percSkill.proficient, percSkill.expertise)
  })

  const passivePerceptionTooltip = createMemo(() => {
    const wis = getEffectiveAbilityScore(current(), "wisdom")
    const prof = current().proficiencyBonus ?? 2
    const percSkill = getEffectiveSkillProficiency(current(), "perception")
    const wisMod = getAbilityModifier(wis)
    let formula = formatTerm(wisMod, ABILITY_TITLE_CASE.wisdom)
    if (percSkill.expertise) {
      formula += formatTerm(prof, "Prof") + formatTerm(prof, "Exp")
    } else if (percSkill.proficient) {
      formula += formatTerm(prof, "Prof")
    }
    return `10${formula}`
  })

  const passivePerceptionLabel = createMemo(() => edition() === "2014" ? "Passive Wisdom (Perception)" : "Passive Perception")

  const equippedInitiative = createMemo(() => calculateInitiative(props.character))
  const calcInitiative = () => equippedInitiative().initiative
  const initiativeTooltip = () => equippedInitiative().breakdown
  const calcProfBonus = createMemo(() => getProficiencyBonus(props.character.level ?? 1))
  const profBonusTooltip = createMemo(() => `${formatModifier(calcProfBonus())} (Level ${props.character.level ?? 1})`)

  const equippedAC = createMemo(() => calculateEquippedAC(props.character))
  const acTooltip = createMemo(() => equippedAC().breakdown)

  const acField = useCalculatedValue({
    useCalculated: () => current().useCalculatedArmorClass ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedArmorClass: v })),
    manualValue: () => current().armorClass ?? 10,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, armorClass: v })),
    calculatedValue: () => equippedAC().ac,
    calculatedTooltip: acTooltip,
  })

  const maxHpCalc = createMemo(() => calculateMaxHitPoints(current()))

  const maximumHpField = useCalculatedValue({
    useCalculated: () => current().useCalculatedMaximumHp ?? false,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedMaximumHp: v })),
    manualValue: () => current().hitPoints?.maximum ?? 1,
    setManualValue: (v) => updateHP("maximum", v),
    calculatedValue: () => maxHpCalc().hp,
    calculatedTooltip: () => maxHpCalc().breakdown,
  })

  const speedField = useCalculatedValue({
    useCalculated: () => current().useCalculatedSpeed ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSpeed: v })),
    manualValue: () => current().speed ?? 30,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, speed: v })),
    calculatedValue: () => effectiveMovement().walk,
    calculatedTooltip: () => movementTooltip(effectiveMovement().walk, movementGrants().walk),
  })

  const flySpeedField = useCalculatedValue({
    useCalculated: () => current().useCalculatedFlySpeed ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedFlySpeed: v })),
    manualValue: () => current().flySpeed ?? 0,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, flySpeed: v })),
    calculatedValue: () => effectiveMovement().fly,
    calculatedTooltip: () => movementTooltip(effectiveMovement().fly, movementGrants().fly),
  })

  const swimSpeedField = useCalculatedValue({
    useCalculated: () => current().useCalculatedSwimSpeed ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSwimSpeed: v })),
    manualValue: () => current().swimSpeed ?? 0,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, swimSpeed: v })),
    calculatedValue: () => effectiveMovement().swim,
    calculatedTooltip: () => movementTooltip(effectiveMovement().swim, movementGrants().swim),
  })

  const climbSpeedField = useCalculatedValue({
    useCalculated: () => current().useCalculatedClimbSpeed ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedClimbSpeed: v })),
    manualValue: () => current().climbSpeed ?? 0,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, climbSpeed: v })),
    calculatedValue: () => effectiveMovement().climb,
    calculatedTooltip: () => movementTooltip(effectiveMovement().climb, movementGrants().climb),
  })

  const burrowSpeedField = useCalculatedValue({
    useCalculated: () => current().useCalculatedBurrowSpeed ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedBurrowSpeed: v })),
    manualValue: () => current().burrowSpeed ?? 0,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, burrowSpeed: v })),
    calculatedValue: () => effectiveMovement().burrow,
    calculatedTooltip: () => movementTooltip(effectiveMovement().burrow, movementGrants().burrow),
  })

  const sizeField = useCalculatedValue<string>({
    useCalculated: () => current().useCalculatedSize ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedSize: v })),
    manualValue: () => current().size ?? "Medium",
    setManualValue: (v) => setEdited((prev) => ({ ...prev, size: v })),
    calculatedValue: () => effectiveSize().size,
    calculatedTooltip: () => movementTooltip(effectiveSize().size, effectiveSize().source),
  })

  const initiativeField = useCalculatedValue({
    useCalculated: () => current().useCalculatedInitiative ?? false,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedInitiative: v })),
    manualValue: () => current().initiative ?? 0,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, initiative: v })),
    calculatedValue: calcInitiative,
    calculatedTooltip: initiativeTooltip,
  })

  const profBonusField = useCalculatedValue({
    useCalculated: () => current().useCalculatedProficiencyBonus ?? false,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedProficiencyBonus: v })),
    manualValue: () => current().proficiencyBonus ?? 2,
    setManualValue: (v) => setEdited((prev) => ({ ...prev, proficiencyBonus: v })),
    calculatedValue: calcProfBonus,
    calculatedTooltip: profBonusTooltip,
  })

  const passivePerceptionField = useCalculatedValue({
    useCalculated: () => current().useCalculatedPassivePerception ?? true,
    setUseCalculated: (v) => setEdited((prev) => ({ ...prev, useCalculatedPassivePerception: v })),
    manualValue: () => current().passivePerception ?? passivePerceptionCalc(),
    setManualValue: (v) => setEdited((prev) => ({ ...prev, passivePerception: v })),
    calculatedValue: passivePerceptionCalc,
    calculatedTooltip: passivePerceptionTooltip,
  })

  return (
    <EditableModule
      data-sem="combat-stats-module"
      data-test="combat-stats-module"
      icon={<ShieldIcon class="h-5 w-5 text-primary" />}
      title="Combat Stats"
      isEditing={isEditing()}
      onEdit={() => { setEdited(toEdit(props.character)); setIsEditing(true) }}
      onSave={handleSave}
      onSaveKeepEditing={handleSaveKeepEditing}
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
                    }}
                    aria-label="Set temporary hit points"
                  />
                </div>
              </Show>
            </div>
          }>
            <div class="flex flex-wrap items-end justify-center gap-4">
              <div class="space-y-1">
                <Label class="text-xs">Current</Label>
                <StepperInput min={0} value={edited().hitPoints?.current ?? 0} onChange={(v) => updateHP("current", v)} aria-label="Current hit points" />
              </div>
              <CalculatedValue label="Maximum" editable={isEditing()} min={1} {...maximumHpField.binding()} />
              <div class="space-y-1">
                <Label class="text-xs">Temporary</Label>
                <StepperInput min={0} value={edited().hitPoints?.temporary ?? 0} onChange={(v) => updateHP("temporary", v)} aria-label="Temporary hit points" />
              </div>
              <div class="space-y-1">
                <Label class="text-xs">Temp Max HP</Label>
                <StepperInput min={-999} value={edited().hitPoints?.temporaryMaximum ?? 0} onChange={(v) => updateHP("temporaryMaximum", v)} aria-label="Temporary maximum hit points" />
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

        {/* Condition Immunities */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm text-muted-foreground">Condition Immunities</Label>
            <Show when={!isReadOnly}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  as="button"
                  data-test="add-condition-immunity-button"
                  class="inline-flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                  title="Add condition immunity"
                >
                  <Plus class="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <For each={CONDITIONS}>
                    {(condition) => (
                      <DropdownMenuItem
                        onSelect={() => toggleConditionImmunity(condition)}
                        class={(props.character.conditionImmunities ?? []).includes(condition) ? "text-primary font-medium" : ""}
                      >
                        {condition}
                        <Show when={(props.character.conditionImmunities ?? []).includes(condition)}>
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
              when={effectiveConditionImmunities().own.length + effectiveConditionImmunities().granted.length > 0}
              fallback={<span class="text-xs text-muted-foreground italic">None</span>}
            >
              <For each={[...effectiveConditionImmunities().own, ...effectiveConditionImmunities().granted]}>
                {(condition) => {
                  const isOwn = () => effectiveConditionImmunities().own.includes(condition)
                  const grantedTooltip = () => {
                    const source = effectiveConditionImmunities().grantedBy[condition]
                    return source === "equipment" ? "Granted by an equipped item" : `Granted by ${source} — edit in Features`
                  }
                  return (
                    <Show
                      when={!isReadOnly && isOwn()}
                      fallback={
                        <span
                          class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground"
                          title={isOwn() ? undefined : grantedTooltip()}
                        >
                          {condition}
                        </span>
                      }
                    >
                      <button
                        type="button"
                        data-test={`remove-condition-immunity-${condition}`}
                        onClick={() => toggleConditionImmunity(condition)}
                        class="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        title="Click to remove"
                      >
                        {condition}
                        <X class="h-2.5 w-2.5" />
                      </button>
                    </Show>
                  )
                }}
              </For>
            </Show>
          </div>
        </div>

        {/* Other Combat Stats */}
        <div class="grid grid-cols-2 gap-4">
          {/* AC */}
          <div class="text-center">
            <CalculatedValue
              label="Armor Class"
              editable={isEditing()}
              {...acField.binding()}
            />
          </div>

          {/* Initiative */}
          <div class="text-center">
            <CalculatedValue
              label="Initiative"
              editable={isEditing()}
              {...initiativeField.binding()}
              format={formatModifier}
            />
          </div>

          {/* Speed */}
          <div class="text-center">
            <CalculatedValue
              label="Speed"
              editable={isEditing()}
              {...speedField.binding()}
              format={(n) => `${n} ft`}
            />
            <Show
              when={isEditing()}
              fallback={
                <div class="flex flex-wrap justify-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                  <Show when={flySpeedField.resolvedValue() > 0}><span>Fly {flySpeedField.resolvedValue()} ft</span></Show>
                  <Show when={swimSpeedField.resolvedValue() > 0}><span>Swim {swimSpeedField.resolvedValue()} ft</span></Show>
                  <Show when={climbSpeedField.resolvedValue() > 0}><span>Climb {climbSpeedField.resolvedValue()} ft</span></Show>
                  <Show when={burrowSpeedField.resolvedValue() > 0}><span>Burrow {burrowSpeedField.resolvedValue()} ft</span></Show>
                </div>
              }
            >
              <div class="grid grid-cols-2 gap-1 mt-2">
                <CalculatedValue variant="compact" label="Fly" editable={isEditing()} min={0} {...flySpeedField.binding()} format={(n) => `${n} ft`} />
                <CalculatedValue variant="compact" label="Swim" editable={isEditing()} min={0} {...swimSpeedField.binding()} format={(n) => `${n} ft`} />
                <CalculatedValue variant="compact" label="Climb" editable={isEditing()} min={0} {...climbSpeedField.binding()} format={(n) => `${n} ft`} />
                <CalculatedValue variant="compact" label="Burrow" editable={isEditing()} min={0} {...burrowSpeedField.binding()} format={(n) => `${n} ft`} />
              </div>
            </Show>
          </div>

          {/* Proficiency Bonus */}
          <div class="text-center">
            <CalculatedValue
              label="Proficiency Bonus"
              editable={isEditing()}
              {...profBonusField.binding()}
              format={formatModifier}
            />
          </div>

          {/* Passive Perception — both editions */}
          <div class="text-center">
            <CalculatedValue
              label={passivePerceptionLabel()}
              editable={isEditing()}
              {...passivePerceptionField.binding()}
            />
          </div>

          {/* Size — 2024 only */}
          <Show when={edition() === "2024"}>
            <div class="text-center">
              <CalculatedValueSelect label="Size" editable={isEditing()} options={SIZES} {...sizeField.binding()} />
            </div>
          </Show>
        </div>

    </EditableModule>
  )
}

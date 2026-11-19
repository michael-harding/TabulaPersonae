import { createEffect, createMemo, createSignal, For, Index, on, Show, untrack } from "solid-js"
import ArrowBigUpDash from "lucide-solid/icons/arrow-big-up-dash"
import ArrowRight from "lucide-solid/icons/arrow-right"
import TriangleAlert from "lucide-solid/icons/triangle-alert"

import type { Character } from "@/lib/character-types"
import { formatModifier, getAbilityModifier, getEffectiveAbilityScore, getEffectiveHitDiceSize } from "@/lib/character-utils"
import {
  applyLevelUp,
  clampCharacterLevel,
  findHitPointsSource,
  getLevelUpSummary,
  levelsGained,
  LEVEL_UP_CHANGE_GROUPS,
  MAX_CHARACTER_LEVEL,
  type LevelUpChange,
  type LevelUpInput,
} from "@/lib/level-up"
import { useFormValidation } from "@/hooks/use-form-validation"
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { FieldError, FormErrorSummary, RequiredLegend } from "@/components/ui/form-validation"

interface LevelUpModalProps {
  character: Character
  open: boolean
  onOpenChange: (open: boolean) => void
  onLevelUp: (updated: Character) => void
}

const rollFieldId = (level: number) => `level-up-rolled-hp-${level}`

/** Value changes, each as "label: before → after". */
function ChangeList(props: { changes: LevelUpChange[] }) {
  return (
    <ul class="space-y-1">
      <For each={props.changes}>
        {(change) => (
          <li data-test={`level-up-change-${change.id}`} class="flex items-center justify-between gap-4 text-sm">
            <span>{change.label}</span>
            <span class="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <span class="text-muted-foreground">{change.before}</span>
              <ArrowRight class="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span class="sr-only"> to </span>
              <span class="font-semibold">{change.after}</span>
            </span>
          </li>
        )}
      </For>
    </ul>
  )
}

export function LevelUpModal(props: LevelUpModalProps) {
  const currentLevel = () => props.character.level ?? 1
  const minLevel = () => clampCharacterLevel(currentLevel() + 1)
  const [level, setLevel] = createSignal(untrack(minLevel))
  const [flatHitPoints, setFlatHitPoints] = createSignal(0)
  // Rolls entered for the levels gained, by level. A level with none entered keeps any roll the
  // Hit Points feature already has for it, so changing the new level doesn't lose what was typed.
  const [rolls, setRolls] = createSignal<Record<number, number>>({})

  const leveled = () => ({ ...props.character, level: level() })
  const hitPointsSource = createMemo(() => findHitPointsSource(leveled()))
  const hitPointsMode = () => hitPointsSource()?.mode ?? "per-level"
  const hitDie = createMemo(() => getEffectiveHitDiceSize(leveled()))
  const conModifier = createMemo(() => getAbilityModifier(getEffectiveAbilityScore(leveled(), "constitution")))
  const gained = createMemo(() => levelsGained(currentLevel(), level()))
  const rollFor = (gainedLevel: number) => rolls()[gainedLevel] ?? hitPointsSource()?.effects.hitPointsRolledLevels?.[gainedLevel - 1] ?? 0

  const input = createMemo((): LevelUpInput => ({
    level: level(),
    flatHitPoints: flatHitPoints(),
    rolledHitPoints: Object.fromEntries(gained().map((gainedLevel) => [gainedLevel, rollFor(gainedLevel)])),
  }))
  const leveledUp = createMemo(() => applyLevelUp(props.character, input()))
  const summary = createMemo(() => getLevelUpSummary(props.character, leveledUp()))
  const hitPointChanges = () => summary().changes.filter((change) => change.group === "Hit Points")
  const changeGroups = createMemo(() =>
    LEVEL_UP_CHANGE_GROUPS
      .filter((group) => group !== "Hit Points")
      .map((group) => ({ group, changes: summary().changes.filter((change) => change.group === group) }))
      .filter((entry) => entry.changes.length > 0),
  )
  const hasChoices = () => summary().abilityScoreImprovementLevels.length > 0 || summary().spellcasting

  // A roll is a die result: at least 1, and no more than the hit die
  const validation = useFormValidation(() => {
    if (hitPointsMode() !== "rolled") return []
    const die = hitDie()
    return gained().map((gainedLevel) => {
      const roll = rollFor(gainedLevel)
      if (roll >= 1 && (die == null || roll <= die)) return null
      const range = die == null ? "at least 1" : `from 1 to ${die}`
      return { fieldId: rollFieldId(gainedLevel), message: `Rolled HP for level ${gainedLevel} must be ${range}` }
    })
  })

  // Each opening starts from the character as it is then
  createEffect(on(() => props.open, (open) => {
    if (!open) return
    setLevel(minLevel())
    setFlatHitPoints(hitPointsSource()?.effects.hitPointsFlatValue ?? 0)
    setRolls({})
    validation.reset()
  }))

  const handleConfirm = () => {
    if (!validation.validate()) return
    props.onLevelUp(leveledUp())
    props.onOpenChange(false)
  }

  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange}>
      <ModalContent data-sem="level-up-modal" data-test="level-up-modal" class="max-w-lg">
        <ModalHeader>
          <ModalTitle class="flex items-center gap-2">
            <ArrowBigUpDash class="h-5 w-5 text-primary" aria-hidden="true" />
            Level Up
          </ModalTitle>
        </ModalHeader>

        <div class="space-y-5">
          <Show when={hitPointsMode() === "rolled"}>
            <RequiredLegend />
          </Show>
          <FormErrorSummary validation={validation} />

          <div class="space-y-1">
            <Label for="level-up-level">New Level</Label>
            <NumericInput
              id="level-up-level"
              data-test="level-up-level-input"
              min={minLevel()}
              max={MAX_CHARACTER_LEVEL}
              value={level()}
              onChange={setLevel}
              aria-describedby="level-up-level-hint"
            />
            <p id="level-up-level-hint" class="text-xs text-muted-foreground">Currently level {currentLevel()}</p>
          </div>

          <section aria-labelledby="level-up-hit-points-heading" class="space-y-2">
            <h3 id="level-up-hit-points-heading" class="text-sm font-medium">Hit Points</h3>

            <Show when={hitPointsMode() === "flat"}>
              <div class="space-y-1">
                <Label for="level-up-new-hp">New HP</Label>
                <NumericInput
                  id="level-up-new-hp"
                  data-test="level-up-new-hp-input"
                  min={0}
                  value={flatHitPoints()}
                  onChange={setFlatHitPoints}
                  aria-describedby="level-up-new-hp-hint"
                />
                <p id="level-up-new-hp-hint" class="text-xs text-muted-foreground">Your Max HP at level {level()}</p>
              </div>
            </Show>

            <Show when={hitPointsMode() === "rolled"}>
              <div class="space-y-3">
                <Index each={gained()}>
                  {(gainedLevel) => (
                    <div class="space-y-1">
                      <Label for={rollFieldId(gainedLevel())} required>Rolled HP (Level {gainedLevel()})</Label>
                      <NumericInput
                        id={rollFieldId(gainedLevel())}
                        data-test={rollFieldId(gainedLevel())}
                        required
                        min={0}
                        max={hitDie()}
                        value={rollFor(gainedLevel())}
                        onChange={(roll) => setRolls((prev) => ({ ...prev, [gainedLevel()]: roll }))}
                        {...validation.controlProps(rollFieldId(gainedLevel()), "level-up-rolled-hp-hint")}
                      />
                      <FieldError validation={validation} fieldId={rollFieldId(gainedLevel())} />
                    </div>
                  )}
                </Index>
                <p id="level-up-rolled-hp-hint" class="text-xs text-muted-foreground">
                  {hitDie() == null ? "Roll your hit die" : `Roll 1d${hitDie()}`} for each level. Your Constitution modifier ({formatModifier(conModifier())}) is added for you.
                </p>
              </div>
            </Show>

            <Show
              when={hitPointChanges().length > 0}
              fallback={<p class="text-sm italic text-muted-foreground">No change to Hit Points.</p>}
            >
              <ChangeList changes={hitPointChanges()} />
            </Show>
          </section>

          <section aria-labelledby="level-up-changes-heading" class="space-y-2" data-test="level-up-changes">
            <h3 id="level-up-changes-heading" class="text-sm font-medium">Calculated Values</h3>
            <Show
              when={changeGroups().length > 0}
              fallback={<p class="text-sm italic text-muted-foreground">No other calculated values change.</p>}
            >
              <For each={changeGroups()}>
                {(entry) => (
                  <div class="space-y-1">
                    <h4 class="text-xs font-medium text-muted-foreground">{entry.group}</h4>
                    <ChangeList changes={entry.changes} />
                  </div>
                )}
              </For>
            </Show>
          </section>

          <Show when={summary().gainedFeatures.length > 0}>
            <section aria-labelledby="level-up-features-heading" class="space-y-2" data-test="level-up-gained-features">
              <h3 id="level-up-features-heading" class="text-sm font-medium">Features Gained</h3>
              <ul class="space-y-2">
                <For each={summary().gainedFeatures}>
                  {(feature) => (
                    <li data-test={`level-up-gained-${feature.id}`} class="space-y-0.5 text-sm">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{feature.name}</span>
                        <Chip variant="outline">{feature.kind}</Chip>
                      </div>
                      <ul class="text-muted-foreground">
                        <For each={feature.gains}>
                          {(gain) => <li>Level {gain.level}: {gain.text}</li>}
                        </For>
                      </ul>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          </Show>

          <Show when={summary().manualValues.length > 0}>
            <section aria-labelledby="level-up-manual-heading" class="space-y-2" data-test="level-up-manual-values">
              <h3 id="level-up-manual-heading" class="flex items-center gap-2 text-sm font-medium">
                <TriangleAlert class="h-4 w-4 text-primary" aria-hidden="true" />
                Update by Hand
              </h3>
              <p class="text-xs text-muted-foreground">These were entered by hand, so they won't change with your level.</p>
              <ul class="space-y-1">
                <For each={summary().manualValues}>
                  {(value) => (
                    <li data-test={`level-up-manual-${value.id}`} class="flex items-center justify-between gap-4 text-sm">
                      <span>{value.label}</span>
                      <span class="whitespace-nowrap text-muted-foreground">{value.reason}: {value.value}</span>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          </Show>

          <Show when={hasChoices()}>
            <section aria-labelledby="level-up-choices-heading" class="space-y-2" data-test="level-up-choices">
              <h3 id="level-up-choices-heading" class="text-sm font-medium">Choices to Make</h3>
              <ul class="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                <For each={summary().abilityScoreImprovementLevels}>
                  {(asiLevel) => (
                    <li data-test={`level-up-asi-${asiLevel}`}>
                      Level {asiLevel}: choose an Ability Score Improvement or another feat, then add it to your Feats in the Features tab.
                    </li>
                  )}
                </For>
                <Show when={summary().spellcasting}>
                  <li data-test="level-up-spells-reminder">Choose any new spells and cantrips, then add them in the Spells tab.</li>
                </Show>
              </ul>
            </section>
          </Show>
        </div>

        <ModalFooter>
          <Button data-test="level-up-cancel-button" variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button data-test="level-up-confirm-button" onClick={handleConfirm}>Confirm Level Up</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

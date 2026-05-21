import { createSignal, For, Show } from "solid-js"
import type { Character } from "@/lib/character-types"
import { getAbilityModifier, parseHitDiceSize, rollHitDice } from "@/lib/character-utils"
import { type DieSize } from "@/lib/dice"
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import FlameKindling from "lucide-solid/icons/flame-kindling"

interface RestModalProps {
  character: Character
  open: boolean
  onOpenChange: (open: boolean) => void
  onRest: (updated: Character) => void
}

export function RestModal(props: RestModalProps) {
  const [restType, setRestType] = createSignal<"short" | "long">("short")
  const [dicesToSpend, setDicesToSpend] = createSignal(0)
  const [rollResult, setRollResult] = createSignal<{ rolls: number[]; total: number } | null>(null)

  const dieSize = () =>
    (props.character.hitDiceSize ?? parseHitDiceSize(props.character.hitDice ?? "1d8")) as DieSize
  const totalHitDice = () => props.character.level ?? 1
  const spentHitDice = () => props.character.spentHitDice ?? 0
  const availableHitDice = () => totalHitDice() - spentHitDice()
  const conMod = () => getAbilityModifier(props.character.abilityScores?.constitution ?? 10)

  const resetMatching = <T extends { rechargeOn?: string }>(actions: T[], ...types: string[]): T[] =>
    actions.map((a) => (a.rechargeOn && types.includes(a.rechargeOn) ? { ...a, uses: 0 } : a))

  const rechargingFeatures = () => {
    const all = [
      ...(props.character.attacks ?? []),
      ...(props.character.bonusActions ?? []),
      ...(props.character.reactions ?? []),
    ]
    if (restType() === "short") return all.filter((a) => a.rechargeOn === "short-rest")
    return all.filter((a) => a.rechargeOn === "short-rest" || a.rechargeOn === "long-rest")
  }

  const handleClose = () => {
    setDicesToSpend(0)
    setRollResult(null)
    setRestType("short")
    props.onOpenChange(false)
  }

  const handleConfirm = () => {
    const char = props.character
    const attacks = char.attacks ?? []
    const bonusActions = char.bonusActions ?? []
    const reactions = char.reactions ?? []

    if (restType() === "short") {
      const spent = dicesToSpend()
      let hpGained = 0
      if (spent > 0) {
        const result = rollHitDice(spent, dieSize(), conMod())
        hpGained = result.total
        setRollResult(result)
      }
      const newHP = Math.min(char.hitPoints.maximum, char.hitPoints.current + hpGained)
      props.onRest({
        ...char,
        hitPoints: { ...char.hitPoints, current: newHP },
        spentHitDice: spentHitDice() + spent,
        attacks: resetMatching(attacks, "short-rest"),
        bonusActions: resetMatching(bonusActions, "short-rest"),
        reactions: resetMatching(reactions, "short-rest"),
      })
      if (spent === 0) handleClose()
    } else {
      const resetSpellSlots = Object.fromEntries(
        Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
      ) as typeof char.spellSlots
      props.onRest({
        ...char,
        hitPoints: { ...char.hitPoints, current: char.hitPoints.maximum, temporary: 0 },
        spentHitDice: 0,
        spellSlots: resetSpellSlots,
        conditions: (char.conditions ?? []).filter((c) => c !== "Exhaustion"),
        attacks: resetMatching(attacks, "short-rest", "long-rest"),
        bonusActions: resetMatching(bonusActions, "short-rest", "long-rest"),
        reactions: resetMatching(reactions, "short-rest", "long-rest"),
      })
      handleClose()
    }
  }

  return (
    <Modal open={props.open} onOpenChange={(open) => { if (!open) handleClose() }}>
      <ModalContent class="max-w-md">
        <ModalHeader>
          <ModalTitle class="flex items-center gap-2">
            <FlameKindling class="h-5 w-5 text-orange-500" />
            Take a Rest
          </ModalTitle>
        </ModalHeader>

        <div class="space-y-4">
          {/* Rest type selector */}
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setRestType("short"); setDicesToSpend(0); setRollResult(null) }}
              class={`p-3 rounded-lg border-2 text-left transition-colors ${restType() === "short" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <div class="font-semibold">Short Rest</div>
              <div class="text-xs text-muted-foreground mt-0.5">1 hour</div>
            </button>
            <button
              type="button"
              onClick={() => { setRestType("long"); setDicesToSpend(0); setRollResult(null) }}
              class={`p-3 rounded-lg border-2 text-left transition-colors ${restType() === "long" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <div class="font-semibold">Long Rest</div>
              <div class="text-xs text-muted-foreground mt-0.5">8 hours</div>
            </button>
          </div>

          {/* Benefits */}
          <div class="p-3 bg-muted/50 rounded-lg space-y-1">
            <div class="text-sm font-medium">Benefits</div>
            <Show
              when={restType() === "short"}
              fallback={
                <ul class="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Regain all lost Hit Points</li>
                  <li>All spent Hit Dice restored</li>
                  <li>All spell slots restored</li>
                  <li>Exhaustion reduced by 1</li>
                  <li>Long-rest features recharge</li>
                  <li>Reset temporary hit points to 0</li>
                </ul>
              }
            >
              <ul class="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Spend Hit Dice to regain HP</li>
                <li>Short-rest features recharge</li>
              </ul>
            </Show>
          </div>

          {/* Hit Dice section — short rest only */}
          <Show when={restType() === "short"}>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium">Hit Dice to Spend</div>
                <div class="text-xs text-muted-foreground">
                  {availableHitDice()} d{dieSize()} available
                </div>
              </div>
              <Show
                when={availableHitDice() > 0}
                fallback={
                  <p class="text-sm text-muted-foreground italic">No hit dice available.</p>
                }
              >
                <Show
                  when={availableHitDice() <= 5}
                  fallback={
                    <StepperInput
                      value={dicesToSpend()}
                      min={0}
                      max={availableHitDice()}
                      onChange={setDicesToSpend}
                    />
                  }
                >
                  <PipTracker
                    total={availableHitDice()}
                    used={dicesToSpend()}
                    onToggle={setDicesToSpend}
                    usedTitle="Die selected to spend"
                    availableTitle="Click to spend this die"
                  />
                </Show>
                <Show when={dicesToSpend() > 0}>
                  <p class="text-xs text-muted-foreground">
                    Roll {dicesToSpend()}d{dieSize()}
                    {conMod() !== 0 ? ` ${conMod() >= 0 ? "+" : ""}${conMod()} per die` : ""} (min 1 per die)
                  </p>
                </Show>
              </Show>

              {/* Roll result */}
              <Show when={rollResult()}>
                {(result) => (
                  <div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div class="text-sm font-medium text-green-700 dark:text-green-400">
                      Rolled: [{result().rolls.join(", ")}] = +{result().total} HP
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </Show>

          {/* Recharging features */}
          <div class="space-y-2">
            <div class="text-sm font-medium">Recharging Features</div>
            <Show
              when={rechargingFeatures().length > 0}
              fallback={
                <p class="text-sm text-muted-foreground italic">No features recharge on this rest.</p>
              }
            >
              <ul class="space-y-1">
                <For each={rechargingFeatures()}>
                  {(feature) => (
                    <li class="text-sm flex items-center justify-between">
                      <span>{feature.name}</span>
                      <span class="text-xs text-muted-foreground capitalize">
                        {feature.rechargeOn === "short-rest" ? "Short Rest" : "Long Rest"}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </div>

        <ModalFooter class="mt-4">
          <Show
            when={rollResult()}
            fallback={
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirm}>Confirm Rest</Button>
              </>
            }
          >
            <Button onClick={handleClose}>Done</Button>
          </Show>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

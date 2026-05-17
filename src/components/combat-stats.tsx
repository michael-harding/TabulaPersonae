import { createSignal, Show, For } from "solid-js"
import type { Character } from "@/lib/character-types"
import { saveCharacter } from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Shield from "lucide-solid/icons/shield"
import Heart from "lucide-solid/icons/heart"
import Save from "lucide-solid/icons/save"
import Edit from "lucide-solid/icons/edit"
import Plus from "lucide-solid/icons/plus"
import Minus from "lucide-solid/icons/minus"
import Skull from "lucide-solid/icons/skull"
import CheckCircle from "lucide-solid/icons/check-circle"
import XCircle from "lucide-solid/icons/x-circle"

interface CombatStatsProps {
  character: Character
  onUpdate: (character: Character) => void
}

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
})

export function CombatStats(props: CombatStatsProps) {
  const [isEditing, setIsEditing] = createSignal(false)
  const [edited, setEdited] = createSignal(toEdit(props.character))

  const handleSave = () => { props.onUpdate(edited()); saveCharacter(edited()); setIsEditing(false) }
  const handleCancel = () => { setEdited(toEdit(props.character)); setIsEditing(false) }

  const updateHP = (field: "current" | "maximum" | "temporary", value: number) =>
    setEdited((prev) => ({ ...prev, hitPoints: { ...prev.hitPoints, [field]: value } }))

  const updateDeathSave = (field: "successes" | "failures", value: number) =>
    setEdited((prev) => ({ ...prev, deathSaves: { ...prev.deathSaves, [field]: value } }))

  const adjustHitPoints = (amount: number) => {
    const currentHP = props.character.hitPoints?.current ?? 0
    const maxHP = props.character.hitPoints?.maximum ?? 1
    const tempHP = props.character.hitPoints?.temporary ?? 0
    const newHP = Math.max(0, Math.min(maxHP + tempHP, currentHP + amount))
    const updated = { ...props.character, hitPoints: { ...props.character.hitPoints, current: newHP } }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Shield class="h-5 w-5 text-primary" />
            Combat Stats
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if (!isEditing()) setEdited(toEdit(props.character))
            setIsEditing(!isEditing())
          }}>
            <Edit class="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
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
              <Progress value={hpPercentage()} class="h-2" />
            </div>
          }>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <Label class="text-xs">Current</Label>
                <Input type="number" min="0" value={edited().hitPoints?.current ?? 0} onInput={(e) => updateHP("current", parseInt(e.currentTarget.value) || 0)} />
              </div>
              <div>
                <Label class="text-xs">Maximum</Label>
                <Input type="number" min="1" value={edited().hitPoints?.maximum ?? 1} onInput={(e) => updateHP("maximum", parseInt(e.currentTarget.value) || 1)} />
              </div>
              <div>
                <Label class="text-xs">Temporary</Label>
                <Input type="number" min="0" value={edited().hitPoints?.temporary ?? 0} onInput={(e) => updateHP("temporary", parseInt(e.currentTarget.value) || 0)} />
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

        {/* Other Combat Stats */}
        <div class="grid grid-cols-2 gap-4">
          {[
            { label: "Armor Class", field: "armorClass" as const, default: 10, display: (v: number) => String(v) },
            { label: "Initiative", field: "initiative" as const, default: 0, display: (v: number) => `${v >= 0 ? "+" : ""}${v}` },
            { label: "Speed", field: "speed" as const, default: 30, display: (v: number) => `${v} ft` },
            { label: "Proficiency Bonus", field: "proficiencyBonus" as const, default: 2, display: (v: number) => `+${v}` },
          ].map(({ label, field, default: def, display }) => (
            <div class="text-center">
              <Label class="text-sm text-muted-foreground">{label}</Label>
              <Show when={isEditing()} fallback={
                <div class="text-2xl font-bold text-primary mt-1">{display(props.character[field] as number || def)}</div>
              }>
                <Input
                  type="number"
                  value={edited()[field] as number || def}
                  onInput={(e) => setEdited((prev) => ({ ...prev, [field]: parseInt(e.currentTarget.value) || def }))}
                  class="text-center text-xl font-bold mt-1"
                />
              </Show>
            </div>
          ))}
        </div>

        <Show when={isEditing()}>
          <div class="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} class="gap-2"><Save class="h-4 w-4" />Save Changes</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </Show>
      </CardContent>
    </Card>
  )
}

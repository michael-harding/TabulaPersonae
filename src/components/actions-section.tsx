import { createSignal, For, Show } from "solid-js"
import type { Character, Attack, BonusAction, Reaction } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Sword from "lucide-solid/icons/sword"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import Clock from "lucide-solid/icons/clock"
import Target from "lucide-solid/icons/target"
import Zap from "lucide-solid/icons/zap"
import Star from "lucide-solid/icons/star"
import Shield from "lucide-solid/icons/shield"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"

interface ActionsSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}

interface AttackFormProps {
  onSubmit: (attack: Omit<Attack, "id">) => void
  onCancel: () => void
  initialData?: Attack
}

function AttackForm(props: AttackFormProps) {
  const [formData, setFormData] = createSignal({
    name: props.initialData?.name ?? "",
    type: (props.initialData?.type ?? "weapon") as "weapon" | "spell",
    attackBonus: props.initialData?.attackBonus ?? 0,
    damage: props.initialData?.damage ?? "",
    damageType: props.initialData?.damageType ?? "slashing",
    range: props.initialData?.range ?? "5 ft",
    description: props.initialData?.description ?? "",
  })

  const handleSubmit = () => {
    if (!formData().name.trim()) return
    props.onSubmit(formData())
  }

  const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]

  return (
    <div class="space-y-4">
      <div>
        <Label for="attack-name">Attack Name</Label>
        <Input id="attack-name" value={formData().name} onInput={(e) => setFormData((p) => ({ ...p, name: e.currentTarget.value }))} placeholder="e.g., Longsword, Fire Bolt" />
      </div>

      <div>
        <Label for="attack-type">Type</Label>
        <Select value={formData().type} onValueChange={(v: "weapon" | "spell") => setFormData((p) => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weapon">Weapon</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for="attack-bonus">Attack Bonus</Label>
          <NumericInput id="attack-bonus" value={formData().attackBonus} onChange={(v) => setFormData(p => ({ ...p, attackBonus: v }))} placeholder="+5" />
        </div>
        <div>
          <Label for="damage">Damage</Label>
          <Input id="damage" value={formData().damage} onInput={(e) => setFormData((p) => ({ ...p, damage: e.currentTarget.value }))} placeholder="1d8+3" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for="damage-type">Damage Type</Label>
          <Select value={formData().damageType} onValueChange={(v: string) => setFormData((p) => ({ ...p, damageType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <For each={DAMAGE_TYPES}>{(t) => <SelectItem value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>}</For>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label for="range">Range</Label>
          <Input id="range" value={formData().range} onInput={(e) => setFormData((p) => ({ ...p, range: e.currentTarget.value }))} placeholder="5 ft, 30 ft" />
        </div>
      </div>

      <div>
        <Label for="attack-description">Description</Label>
        <Textarea id="attack-description" value={formData().description} onInput={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))} placeholder="Additional effects..." rows={3} />
      </div>

      <div class="flex gap-2 justify-end">
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>{props.initialData ? "Update" : "Add"} Attack</Button>
      </div>
    </div>
  )
}

interface BonusActionFormProps {
  onSubmit: (bonusAction: Omit<BonusAction, "id">) => void
  onCancel: () => void
}

function BonusActionForm(props: BonusActionFormProps) {
  const [formData, setFormData] = createSignal({
    name: "",
    type: "ability" as "spell" | "ability" | "other",
    description: "",
    uses: 0,
    maxUses: 0,
  })
  const handleSubmit = () => {
    if (!formData().name.trim()) return
    props.onSubmit(formData())
  }

  return (
    <div class="space-y-4">
      <div>
        <Label for="bonus-action-name">Bonus Action Name</Label>
        <Input id="bonus-action-name" value={formData().name} onInput={(e) => setFormData((p) => ({ ...p, name: e.currentTarget.value }))} placeholder="e.g., Second Wind, Cunning Action" />
      </div>

      <div>
        <Label for="bonus-action-type">Type</Label>
        <Select value={formData().type} onValueChange={(v: "spell" | "ability" | "other") => setFormData((p) => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ability">Class Feature</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for="uses">Current Uses</Label>
          <NumericInput id="uses" min={0} value={formData().uses} onChange={(v) => setFormData(p => ({ ...p, uses: v }))} />
        </div>
        <div>
          <Label for="max-uses">Max Uses</Label>
          <NumericInput id="max-uses" min={0} value={formData().maxUses} onChange={(v) => setFormData(p => ({ ...p, maxUses: v }))} placeholder="0 (unlimited)" />
        </div>
      </div>

      <div>
        <Label for="bonus-action-description">Description</Label>
        <Textarea id="bonus-action-description" value={formData().description} onInput={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))} placeholder="Describe what this bonus action does..." rows={3} />
      </div>

      <div class="flex gap-2 justify-end">
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Bonus Action</Button>
      </div>
    </div>
  )
}

interface ReactionFormProps {
  onSubmit: (reaction: Omit<Reaction, "id">) => void
  onCancel: () => void
}

function ReactionForm(props: ReactionFormProps) {
  const [formData, setFormData] = createSignal({
    name: "",
    type: "ability" as "spell" | "ability" | "other",
    description: "",
    trigger: "",
    uses: 0,
    maxUses: 0,
  })
  const handleSubmit = () => {
    if (!formData().name.trim() || !formData().trigger.trim()) return
    props.onSubmit(formData())
  }

  return (
    <div class="space-y-4">
      <div>
        <Label for="reaction-name">Reaction Name</Label>
        <Input id="reaction-name" value={formData().name} onInput={(e) => setFormData((p) => ({ ...p, name: e.currentTarget.value }))} placeholder="e.g., Opportunity Attack, Counterspell" />
      </div>

      <div>
        <Label for="reaction-type">Type</Label>
        <Select value={formData().type} onValueChange={(v: "spell" | "ability" | "other") => setFormData((p) => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ability">Class Feature</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label for="reaction-trigger">Trigger</Label>
        <Input id="reaction-trigger" value={formData().trigger} onInput={(e) => setFormData((p) => ({ ...p, trigger: e.currentTarget.value }))} placeholder="e.g., When a creature moves out of your reach" />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <Label for="reaction-uses">Current Uses</Label>
          <NumericInput id="reaction-uses" min={0} value={formData().uses} onChange={(v) => setFormData(p => ({ ...p, uses: v }))} />
        </div>
        <div>
          <Label for="reaction-max-uses">Max Uses</Label>
          <NumericInput id="reaction-max-uses" min={0} value={formData().maxUses} onChange={(v) => setFormData(p => ({ ...p, maxUses: v }))} placeholder="0 (unlimited)" />
        </div>
      </div>

      <div>
        <Label for="reaction-description">Description</Label>
        <Textarea id="reaction-description" value={formData().description} onInput={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))} placeholder="Describe what this reaction does..." rows={3} />
      </div>

      <div class="flex gap-2 justify-end">
        <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Reaction</Button>
      </div>
    </div>
  )
}

export function ActionsSection(props: ActionsSectionProps) {
  const [isAddActionOpen, setIsAddActionOpen] = createSignal(false)
  const [isAddBonusActionOpen, setIsAddBonusActionOpen] = createSignal(false)
  const [isAddReactionOpen, setIsAddReactionOpen] = createSignal(false)

  const safeSpells = () => props.character.spells || []
  const spellSaveDC = () => getSpellSaveDC(props.character)
  const spellAttackBonus = () => getSpellAttackBonus(props.character)

  const attackSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) &&
    spell.castingTime.toLowerCase().includes("1 action") &&
    !spell.castingTime.toLowerCase().includes("bonus") &&
    !spell.castingTime.toLowerCase().includes("reaction")
  )
  const bonusActionSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("bonus")
  )
  const reactionSpells = () => safeSpells().filter((spell) =>
    (spell.level === 0 ? (spell.known ?? true) : spell.prepared) && spell.castingTime.toLowerCase().includes("reaction")
  )

  const getOrdinalSuffix = (num: number): string => {
    const suffixes = ["th", "st", "nd", "rd"]
    const v = num % 100
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
  }

  const updateSpellSlotUsed = (level: number, used: number) => {
    props.onUpdate({
      ...props.character,
      spellSlots: {
        ...props.character.spellSlots,
        [level]: { ...props.character.spellSlots[level as keyof typeof props.character.spellSlots], used },
      },
    })
  }

  const castSpell = (level: number) => {
    const slots = props.character.spellSlots[level as keyof typeof props.character.spellSlots]
    if (!slots || slots.used >= slots.total) return
    updateSpellSlotUsed(level, slots.used + 1)
  }

  const handleAddAction = (actionData: Omit<Attack, "id">) => {
    props.onUpdate({ ...props.character, attacks: [...(props.character.attacks || []), { id: crypto.randomUUID(), ...actionData }] })
    setIsAddActionOpen(false)
  }

  const handleDeleteAttack = (id: string) => {
    props.onUpdate({ ...props.character, attacks: (props.character.attacks || []).filter((a) => a.id !== id) })
  }

  const handleAddBonusAction = (data: Omit<BonusAction, "id">) => {
    props.onUpdate({ ...props.character, bonusActions: [...(props.character.bonusActions || []), { id: crypto.randomUUID(), ...data }] })
    setIsAddBonusActionOpen(false)
  }

  const handleDeleteBonusAction = (id: string) => {
    props.onUpdate({ ...props.character, bonusActions: (props.character.bonusActions || []).filter((b) => b.id !== id) })
  }

  const handleAddReaction = (data: Omit<Reaction, "id">) => {
    props.onUpdate({ ...props.character, reactions: [...(props.character.reactions || []), { id: crypto.randomUUID(), ...data }] })
    setIsAddReactionOpen(false)
  }

  const handleDeleteReaction = (id: string) => {
    props.onUpdate({ ...props.character, reactions: (props.character.reactions || []).filter((r) => r.id !== id) })
  }

  const SpellCard = (spell: (typeof safeSpells)[0], castable: () => boolean, onCast?: () => void) => (
    <div class="p-3 border rounded-lg space-y-2 relative">
      <div class="flex items-start justify-between">
        <div>
          <div class="font-medium">{spell.name}</div>
          <div class="text-xs text-muted-foreground">
            {spell.level > 0 ? `${getOrdinalSuffix(spell.level)} level` : "Cantrip"} • {spell.school}
          </div>
        </div>
        <Badge variant="secondary" class="text-xs">Spell</Badge>
      </div>
      <div class="text-sm space-y-1">
        <Show when={spell.attackSave}><div><strong>Attack/Save:</strong> {spell.attackSave}</div></Show>
        <Show when={spell.regain}><div><strong>Regain:</strong> {spell.regain}</div></Show>
        <div><strong>Attack:</strong> {formatModifier(spellAttackBonus())} to hit</div>
        <div><strong>Range:</strong> {spell.range}</div>
        <div><strong>Components:</strong> {spell.components}</div>
      </div>
      <Show when={spell.regain}>
        <div class="absolute right-2 bottom-12 px-2 py-1 border-2 border-green-500 rounded text-green-700 font-semibold whitespace-nowrap">{spell.regain}</div>
      </Show>
      <Show when={!spell.regain && spell.damage}>
        <div class="absolute right-2 bottom-12 px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap">{spell.damage}</div>
      </Show>
      <Show when={spell.level > 0 && onCast}>
        <Button variant="outline" size="sm" disabled={!castable()} onClick={onCast} class="absolute bottom-2 right-2">Cast</Button>
      </Show>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Sword class="h-5 w-5 text-primary" />
          Actions & Attacks
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Target class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">Attack Bonus</span>
            </div>
            <div class="text-2xl font-bold text-primary">{formatModifier(spellAttackBonus())}</div>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Zap class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">Spell Save DC</span>
            </div>
            <div class="text-2xl font-bold text-primary">{spellSaveDC()}</div>
          </div>
          <div class="text-center">
            <div class="text-sm font-medium mb-1">Ready Actions</div>
            <div class="text-2xl font-bold text-primary">{attackSpells().length + bonusActionSpells().length}</div>
          </div>
        </div>

        {/* Spell Slot Toggles */}
        <div class="my-4">
          <SpellSlotTracker spellSlots={props.character.spellSlots} onToggle={updateSpellSlotUsed} />
        </div>

        {/* Actions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Target class="h-5 w-5 text-primary" />
              Actions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddActionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Action
            </Button>
          </div>

          <Show when={attackSpells().length > 0 || (props.character.attacks && props.character.attacks.length > 0)}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={attackSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  return SpellCard(spell, canCast, () => castSpell(spell.level))
                }}
              </For>
              <For each={props.character.attacks || []}>
                {(attack) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="font-medium">{attack.name}</div>
                        <div class="text-xs text-muted-foreground">{attack.type === "weapon" ? "Weapon Attack" : "Spell Attack"}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Badge variant={attack.type === "weapon" ? "outline" : "secondary"} class="text-xs">
                          {attack.type.charAt(0).toUpperCase() + attack.type.slice(1)}
                        </Badge>
                        <button type="button" class="text-destructive hover:text-destructive/80" aria-label="Delete Attack" onClick={() => handleDeleteAttack(attack.id)}>
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <div class="flex-1">
                        <div><strong>Attack:</strong> {formatModifier(attack.attackBonus)} to hit</div>
                        <div><strong>Range:</strong> {attack.range}</div>
                      </div>
                      <Show when={attack.damage}>
                        <div class="ml-4 px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap">
                          {attack.damage} {attack.damageType}
                        </div>
                      </Show>
                    </div>
                    <Show when={attack.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{attack.description}</div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Bonus Actions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Clock class="h-5 w-5 text-primary" />
              Bonus Actions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddBonusActionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Bonus Action
            </Button>
          </div>

          <Show when={bonusActionSpells().length > 0 || (props.character.bonusActions && props.character.bonusActions.length > 0)}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={bonusActionSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  return SpellCard(spell, canCast, () => castSpell(spell.level))
                }}
              </For>
              <For each={props.character.bonusActions || []}>
                {(bonus) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="font-medium">{bonus.name}</div>
                        <div class="text-xs text-muted-foreground">
                          {bonus.type === "ability" ? "Class Feature" : bonus.type.charAt(0).toUpperCase() + bonus.type.slice(1)}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Badge variant={bonus.type === "ability" ? "outline" : "secondary"} class="text-xs">
                          {bonus.type.charAt(0).toUpperCase() + bonus.type.slice(1)}
                        </Badge>
                        <button type="button" class="text-destructive hover:text-destructive/80" aria-label="Delete Bonus Action" onClick={() => handleDeleteBonusAction(bonus.id)}>
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <div class="flex-1">
                        <Show when={typeof bonus.uses === "number" && typeof bonus.maxUses === "number"}>
                          <div><strong>Uses:</strong> {bonus.uses} / {bonus.maxUses === 0 ? "∞" : bonus.maxUses}</div>
                        </Show>
                      </div>
                      <Show when={bonus.damage}>
                        <div class="ml-4 px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap">
                          {bonus.damage} {bonus.damageType}
                        </div>
                      </Show>
                    </div>
                    <Show when={bonus.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{bonus.description}</div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Reactions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Shield class="h-5 w-5 text-primary" />
              Reactions
            </h3>
            <Button variant="outline" size="sm" class="gap-1" onClick={() => setIsAddReactionOpen(true)}>
              <Plus class="h-3 w-3" />
              Add Reaction
            </Button>
          </div>

          <Show when={reactionSpells().length > 0 || (props.character.reactions && props.character.reactions.length > 0)}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <For each={reactionSpells()}>
                {(spell) => {
                  const slotKey = spell.level as keyof typeof props.character.spellSlots
                  const slots = () => props.character.spellSlots[slotKey]
                  const canCast = () => spell.level > 0 && slots() && slots().used < slots().total
                  return SpellCard(spell, canCast, () => castSpell(spell.level))
                }}
              </For>
              <For each={props.character.reactions || []}>
                {(reaction) => (
                  <div class="p-3 border rounded-lg space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="font-medium">{reaction.name}</div>
                        <div class="text-xs text-muted-foreground">
                          {reaction.type === "ability" ? "Class Feature" : reaction.type.charAt(0).toUpperCase() + reaction.type.slice(1)}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Badge variant={reaction.type === "ability" ? "outline" : "secondary"} class="text-xs">
                          {reaction.type.charAt(0).toUpperCase() + reaction.type.slice(1)}
                        </Badge>
                        <button type="button" class="text-destructive hover:text-destructive/80" aria-label="Delete Reaction" onClick={() => handleDeleteReaction(reaction.id)}>
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <div class="flex-1">
                        <div><strong>Trigger:</strong> {reaction.trigger}</div>
                        <Show when={typeof reaction.uses === "number" && typeof reaction.maxUses === "number"}>
                          <div><strong>Uses:</strong> {reaction.uses} / {reaction.maxUses === 0 ? "∞" : reaction.maxUses}</div>
                        </Show>
                      </div>
                      <Show when={reaction.damage}>
                        <div class="ml-4 px-2 py-1 border-2 border-red-500 rounded text-red-700 font-semibold whitespace-nowrap">
                          {reaction.damage} {reaction.damageType}
                        </div>
                      </Show>
                    </div>
                    <Show when={reaction.description}>
                      <div class="text-xs text-muted-foreground line-clamp-2">{reaction.description}</div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Quick Actions */}
        <div class="space-y-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <Star class="h-5 w-5 text-primary" />
            Quick Actions
          </h3>
          <div class="flex flex-wrap gap-2">
            <For each={["Dash","Dodge","Help","Hide","Ready","Search","Use Object"]}>
              {(action) => <Button variant="outline" size="sm">{action}</Button>}
            </For>
          </div>
        </div>
      </CardContent>

      <Dialog open={isAddActionOpen()} onOpenChange={setIsAddActionOpen}>
        <DialogContent class="max-w-md">
          <DialogHeader><DialogTitle>Add Custom Action</DialogTitle></DialogHeader>
          <AttackForm onSubmit={handleAddAction} onCancel={() => setIsAddActionOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBonusActionOpen()} onOpenChange={setIsAddBonusActionOpen}>
        <DialogContent class="max-w-md">
          <DialogHeader><DialogTitle>Add Custom Bonus Action</DialogTitle></DialogHeader>
          <BonusActionForm onSubmit={handleAddBonusAction} onCancel={() => setIsAddBonusActionOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddReactionOpen()} onOpenChange={setIsAddReactionOpen}>
        <DialogContent class="max-w-md">
          <DialogHeader><DialogTitle>Add Custom Reaction</DialogTitle></DialogHeader>
          <ReactionForm onSubmit={handleAddReaction} onCancel={() => setIsAddReactionOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import type { Character, Spell, Attack, BonusAction, Reaction } from "@/lib/character-types"
import { getSpellSaveDC, getSpellAttackBonus, formatModifier } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sword, Plus, Edit, Trash2, Clock, Target, Zap, Star, Shield } from "lucide-react"

interface ActionsSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}


export function ActionsSection({ character, onUpdate }: ActionsSectionProps) {
  // Spell slot toggling logic (copied from SpellsSection)
  // getOrdinalSuffix is defined below and used throughout

  const updateSpellSlots = (level: number, field: 'total' | 'used', value: number) => {
    const updated = {
      ...character,
      spellSlots: {
        ...character.spellSlots,
        [level]: {
          ...character.spellSlots[level as keyof typeof character.spellSlots],
          [field]: value,
        },
      },
    }
    onUpdate(updated)
  }

  const toggleSpellSlot = (level: number, index: number) => {
    const currentSlots = character.spellSlots[level as keyof typeof character.spellSlots]
    const newUsed = index < currentSlots.used ? currentSlots.used - 1 : index + 1
    updateSpellSlots(level, 'used', Math.min(newUsed, currentSlots.total))
  }
  // Remove attack by id
  const handleDeleteAttack = (id: string) => {
    const updated = {
      ...character,
      attacks: (character.attacks || []).filter(a => a.id !== id),
    }
    onUpdate(updated)
  }

  // Remove bonus action by id
  const handleDeleteBonusAction = (id: string) => {
    const updated = {
      ...character,
      bonusActions: (character.bonusActions || []).filter(b => b.id !== id),
    }
    onUpdate(updated)
  }

  // Remove reaction by id
  const handleDeleteReaction = (id: string) => {
    const updated = {
      ...character,
      reactions: (character.reactions || []).filter(r => r.id !== id),
    }
    onUpdate(updated)
  }
  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false)
  const [isAddBonusActionDialogOpen, setIsAddBonusActionDialogOpen] = useState(false)
  const [isAddReactionDialogOpen, setIsAddReactionDialogOpen] = useState(false)
  const [editingAttack, setEditingAttack] = useState<Attack | null>(null)
  const [editingBonusAction, setEditingBonusAction] = useState<BonusAction | null>(null)
  const [editingReaction, setEditingReaction] = useState<Reaction | null>(null)

  // Update local state when character changes
  useEffect(() => {
    // Reset any local state when character changes
  }, [character.id])

  const safeSpells = character.spells || []
  const spellSaveDC = getSpellSaveDC(character)
  const spellAttackBonus = getSpellAttackBonus(character)

  // Get prepared spells and cantrips with 1 action casting time
  const attackSpells = safeSpells.filter(spell =>
    (spell.prepared || spell.level === 0) && 
    spell.castingTime.toLowerCase().includes('1 action') &&
    !spell.castingTime.toLowerCase().includes('bonus') &&
    !spell.castingTime.toLowerCase().includes('reaction')
  )

  // Get prepared spells and cantrips with bonus action casting time
  const bonusActionSpells = safeSpells.filter(spell =>
    (spell.prepared || spell.level === 0) && 
    spell.castingTime.toLowerCase().includes('bonus')
  )

  // Get prepared spells and cantrips with reaction casting time
  const reactionSpells = safeSpells.filter(spell =>
    (spell.prepared || spell.level === 0) && 
    spell.castingTime.toLowerCase().includes('reaction')
  )

  const getOrdinalSuffix = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = num % 100
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
  }

  const handleAddAction = (actionData: Omit<Attack, 'id'>) => {
    const newAction: Attack = {
      id: crypto.randomUUID(),
      ...actionData,
    }

    const updated = {
      ...character,
      attacks: [...(character.attacks || []), newAction],
    }
    onUpdate(updated)
    setIsAddActionDialogOpen(false)
  }

  const handleAddBonusAction = (bonusActionData: Omit<BonusAction, 'id'>) => {
    const newBonusAction: BonusAction = {
      id: crypto.randomUUID(),
      ...bonusActionData,
    }

    const updated = {
      ...character,
      bonusActions: [...(character.bonusActions || []), newBonusAction],
    }
    onUpdate(updated)
    setIsAddBonusActionDialogOpen(false)
  }

  const handleAddReaction = (reactionData: Omit<Reaction, 'id'>) => {
    const newReaction: Reaction = {
      id: crypto.randomUUID(),
      ...reactionData,
    }

    const updated = {
      ...character,
      reactions: [...(character.reactions || []), newReaction],
    }
    onUpdate(updated)
    setIsAddReactionDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sword className="h-5 w-5 text-primary" />
          Actions & Attacks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Economy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Attack Bonus</span>
            </div>
            <div className="text-2xl font-bold text-primary">{formatModifier(spellAttackBonus)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Spell Save DC</span>
            </div>
            <div className="text-2xl font-bold text-primary">{spellSaveDC}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Ready Actions</div>
            <div className="text-2xl font-bold text-primary">{attackSpells.length + bonusActionSpells.length}</div>
          </div>
        </div>

        {/* Spell Slot Toggles (same as SpellsSection) */}
  <div className="flex flex-wrap gap-2 justify-start my-4">
          {[1,2,3,4,5,6,7,8,9].map((level) => {
            const slots = character.spellSlots[level as keyof typeof character.spellSlots]
            if (!slots || slots.total === 0) return null
            return (
              <div key={level} className="flex items-center gap-2 p-2 border rounded-lg">
                <span className="font-medium text-xs text-muted-foreground">{getOrdinalSuffix(level)}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: slots.total }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => toggleSpellSlot(level, index)}
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        index < slots.used
                          ? 'bg-muted border-muted-foreground'
                          : 'bg-primary border-primary hover:bg-primary/80'
                      }`}
                      title={index < slots.used ? 'Used slot (click to restore)' : 'Available slot (click to use)'}
                    >
                      {index < slots.used ? (
                        <span className="sr-only">Used</span>
                      ) : (
                        <span className="block w-2 h-2 bg-primary-foreground rounded-full mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Attacks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Actions
            </h3>
            <Dialog open={isAddActionDialogOpen} onOpenChange={setIsAddActionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Action
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Custom Action</DialogTitle>
                </DialogHeader>
                <AttackForm
                  onSubmit={handleAddAction}
                  onCancel={() => setIsAddActionDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {(attackSpells.length > 0 || (character.attacks && character.attacks.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Spell Attacks */}
              {attackSpells.map((spell) => {
              const slotKey = spell.level as keyof typeof character.spellSlots
              const slots = character.spellSlots[slotKey]
              const canCast = spell.level > 0 && slots && slots.used < slots.total
              const handleCast = () => {
                if (!canCast || !slots) return
                const updated = {
                  ...character,
                  spellSlots: {
                    ...character.spellSlots,
                    [slotKey]: {
                      ...slots,
                      used: slots.used + 1,
                    },
                  },
                }
                onUpdate(updated)
              }
              return (
                <div key={spell.id} className="p-3 border rounded-lg space-y-2 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{spell.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {spell.level > 0 ? `${spell.level}${getOrdinalSuffix(spell.level)} level` : 'Cantrip'} • {spell.school}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Spell</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Attack:</strong> {formatModifier(spellAttackBonus)} to hit</div>
                    <div><strong>Range:</strong> {spell.range}</div>
                    <div><strong>Components:</strong> {spell.components}</div>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {spell.description}
                  </div>
                  {spell.level > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canCast}
                      onClick={handleCast}
                      className="absolute bottom-2 right-2"
                    >
                      Cast
                    </Button>
                  )}
                </div>
              )
            })}

            {/* Custom Attacks */}
            {(character.attacks || []).map((attack) => (
              <div key={attack.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{attack.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {attack.type === 'weapon' ? 'Weapon Attack' : 'Spell Attack'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attack.type === 'weapon' ? "outline" : "secondary"} className="text-xs">
                      {attack.type.charAt(0).toUpperCase() + attack.type.slice(1)}
                    </Badge>
                    <button
                      type="button"
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Delete Attack"
                      onClick={() => handleDeleteAttack(attack.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Attack:</strong> {formatModifier(attack.attackBonus)} to hit</div>
                  <div><strong>Damage:</strong> {attack.damage} {attack.damageType}</div>
                  <div><strong>Range:</strong> {attack.range}</div>
                </div>
                {attack.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {attack.description}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Bonus Actions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Bonus Actions
            </h3>
            <Dialog open={isAddBonusActionDialogOpen} onOpenChange={setIsAddBonusActionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Bonus Action
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Custom Bonus Action</DialogTitle>
                </DialogHeader>
                <BonusActionForm
                  onSubmit={handleAddBonusAction}
                  onCancel={() => setIsAddBonusActionDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {(bonusActionSpells.length > 0 || (character.bonusActions && character.bonusActions.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Bonus Action Spells */}
              {bonusActionSpells.map((spell) => (
              <div key={spell.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{spell.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {spell.level > 0 ? `${spell.level}${getOrdinalSuffix(spell.level)} level` : 'Cantrip'} • {spell.castingTime}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Spell</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Range:</strong> {spell.range}</div>
                  <div><strong>Duration:</strong> {spell.duration}</div>
                  <div><strong>Components:</strong> {spell.components}</div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {spell.description}
                </div>
              </div>
            ))}

            {/* Custom Bonus Actions */}
            {(character.bonusActions || []).map((bonus) => (
              <div key={bonus.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{bonus.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {bonus.type === 'ability' ? 'Class Feature' : bonus.type.charAt(0).toUpperCase() + bonus.type.slice(1)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={bonus.type === 'ability' ? "outline" : "secondary"} className="text-xs">
                      {bonus.type.charAt(0).toUpperCase() + bonus.type.slice(1)}
                    </Badge>
                    <button
                      type="button"
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Delete Bonus Action"
                      onClick={() => handleDeleteBonusAction(bonus.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  {typeof bonus.uses === 'number' && typeof bonus.maxUses === 'number' && (
                    <div><strong>Uses:</strong> {bonus.uses} / {bonus.maxUses === 0 ? '∞' : bonus.maxUses}</div>
                  )}
                </div>
                {bonus.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {bonus.description}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Reactions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Reactions
            </h3>
            <Dialog open={isAddReactionDialogOpen} onOpenChange={setIsAddReactionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Reaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Custom Reaction</DialogTitle>
                </DialogHeader>
                <ReactionForm
                  onSubmit={handleAddReaction}
                  onCancel={() => setIsAddReactionDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {(reactionSpells.length > 0 || (character.reactions && character.reactions.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Reaction Spells */}
              {reactionSpells.map((spell) => (
              <div key={spell.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{spell.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {spell.level > 0 ? `${spell.level}${getOrdinalSuffix(spell.level)} level` : 'Cantrip'} • {spell.castingTime}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Spell</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Range:</strong> {spell.range}</div>
                  <div><strong>Duration:</strong> {spell.duration}</div>
                  <div><strong>Components:</strong> {spell.components}</div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {spell.description}
                </div>
              </div>
            ))}

            {/* Custom Reactions */}
            {(character.reactions || []).map((reaction) => (
              <div key={reaction.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{reaction.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {reaction.type === 'ability' ? 'Class Feature' : reaction.type.charAt(0).toUpperCase() + reaction.type.slice(1)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reaction.type === 'ability' ? "outline" : "secondary"} className="text-xs">
                      {reaction.type.charAt(0).toUpperCase() + reaction.type.slice(1)}
                    </Badge>
                    <button
                      type="button"
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Delete Reaction"
                      onClick={() => handleDeleteReaction(reaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Trigger:</strong> {reaction.trigger}</div>
                  {typeof reaction.uses === 'number' && typeof reaction.maxUses === 'number' && (
                    <div><strong>Uses:</strong> {reaction.uses} / {reaction.maxUses === 0 ? '∞' : reaction.maxUses}</div>
                  )}
                </div>
                {reaction.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {reaction.description}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Quick Actions
          </h3>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Dash</Button>
            <Button variant="outline" size="sm">Dodge</Button>
            <Button variant="outline" size="sm">Help</Button>
            <Button variant="outline" size="sm">Hide</Button>
            <Button variant="outline" size="sm">Ready</Button>
            <Button variant="outline" size="sm">Search</Button>
            <Button variant="outline" size="sm">Use Object</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Attack Form Component
interface AttackFormProps {
  onSubmit: (attack: Omit<Attack, 'id'>) => void
  onCancel: () => void
  initialData?: Attack
}

function AttackForm({ onSubmit, onCancel, initialData }: AttackFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || 'weapon' as 'weapon' | 'spell',
    attackBonus: initialData?.attackBonus || 0,
    damage: initialData?.damage || "",
    damageType: initialData?.damageType || "slashing",
    range: initialData?.range || "5 ft",
    description: initialData?.description || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="attack-name">Attack Name</Label>
        <Input
          id="attack-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Longsword, Fire Bolt"
          required
        />
      </div>

      <div>
        <Label htmlFor="attack-type">Type</Label>
        <Select value={formData.type} onValueChange={(value: 'weapon' | 'spell') => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weapon">Weapon</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="attack-bonus">Attack Bonus</Label>
          <Input
            id="attack-bonus"
            type="number"
            value={formData.attackBonus}
            onChange={(e) => setFormData({ ...formData, attackBonus: parseInt(e.target.value) || 0 })}
            placeholder="+5"
          />
        </div>
        <div>
          <Label htmlFor="damage">Damage</Label>
          <Input
            id="damage"
            value={formData.damage}
            onChange={(e) => setFormData({ ...formData, damage: e.target.value })}
            placeholder="1d8+3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="damage-type">Damage Type</Label>
          <Select value={formData.damageType} onValueChange={(value) => setFormData({ ...formData, damageType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slashing">Slashing</SelectItem>
              <SelectItem value="piercing">Piercing</SelectItem>
              <SelectItem value="bludgeoning">Bludgeoning</SelectItem>
              <SelectItem value="fire">Fire</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="lightning">Lightning</SelectItem>
              <SelectItem value="thunder">Thunder</SelectItem>
              <SelectItem value="acid">Acid</SelectItem>
              <SelectItem value="poison">Poison</SelectItem>
              <SelectItem value="psychic">Psychic</SelectItem>
              <SelectItem value="necrotic">Necrotic</SelectItem>
              <SelectItem value="radiant">Radiant</SelectItem>
              <SelectItem value="force">Force</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="range">Range</Label>
          <Input
            id="range"
            value={formData.range}
            onChange={(e) => setFormData({ ...formData, range: e.target.value })}
            placeholder="5 ft, 30 ft, 120 ft"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="attack-description">Description</Label>
        <Textarea
          id="attack-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional effects or notes about this attack..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update' : 'Add'} Attack
        </Button>
      </div>
    </form>
  )
}

// Bonus Action Form Component
interface BonusActionFormProps {
  onSubmit: (bonusAction: Omit<BonusAction, 'id'>) => void
  onCancel: () => void
  initialData?: BonusAction
}

function BonusActionForm({ onSubmit, onCancel, initialData }: BonusActionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || 'ability' as 'spell' | 'ability' | 'other',
    description: initialData?.description || "",
    uses: initialData?.uses || 0,
    maxUses: initialData?.maxUses || 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="bonus-action-name">Bonus Action Name</Label>
        <Input
          id="bonus-action-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Second Wind, Cunning Action"
          required
        />
      </div>

      <div>
        <Label htmlFor="bonus-action-type">Type</Label>
        <Select value={formData.type} onValueChange={(value: 'spell' | 'ability' | 'other') => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ability">Class Feature</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="uses">Current Uses</Label>
          <Input
            id="uses"
            type="number"
            min="0"
            value={formData.uses}
            onChange={(e) => setFormData({ ...formData, uses: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="max-uses">Max Uses</Label>
          <Input
            id="max-uses"
            type="number"
            min="0"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
            placeholder="0 (unlimited)"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bonus-action-description">Description</Label>
        <Textarea
          id="bonus-action-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this bonus action does..."
          rows={3}
          required
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update' : 'Add'} Bonus Action
        </Button>
      </div>
    </form>
  )
}

// Reaction Form Component
interface ReactionFormProps {
  onSubmit: (reaction: Omit<Reaction, 'id'>) => void
  onCancel: () => void
  initialData?: Reaction
}

function ReactionForm({ onSubmit, onCancel, initialData }: ReactionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || 'ability' as 'spell' | 'ability' | 'other',
    description: initialData?.description || "",
    trigger: initialData?.trigger || "",
    uses: initialData?.uses || 0,
    maxUses: initialData?.maxUses || 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.trigger.trim()) return
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reaction-name">Reaction Name</Label>
        <Input
          id="reaction-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Opportunity Attack, Counterspell"
          required
        />
      </div>

      <div>
        <Label htmlFor="reaction-type">Type</Label>
        <Select value={formData.type} onValueChange={(value: 'spell' | 'ability' | 'other') => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ability">Class Feature</SelectItem>
            <SelectItem value="spell">Spell</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reaction-trigger">Trigger</Label>
        <Input
          id="reaction-trigger"
          value={formData.trigger}
          onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
          placeholder="e.g., When a creature moves out of your reach"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="reaction-uses">Current Uses</Label>
          <Input
            id="reaction-uses"
            type="number"
            min="0"
            value={formData.uses}
            onChange={(e) => setFormData({ ...formData, uses: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="reaction-max-uses">Max Uses</Label>
          <Input
            id="reaction-max-uses"
            type="number"
            min="0"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
            placeholder="0 (unlimited)"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="reaction-description">Description</Label>
        <Textarea
          id="reaction-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this reaction does..."
          rows={3}
          required
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update' : 'Add'} Reaction
        </Button>
      </div>
    </form>
  )
}

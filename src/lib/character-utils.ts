import type { AbilityScores, Character, Equipment, Feature } from "./character-types"
import { rollMany, parseDiceString, type DieSize } from "./dice"

export function getAbilityModifier(score: number): number {
  return Math.floor((Math.max(0, score) - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, level) / 4) + 1
}

export function getSkillModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean,
): number {
  const abilityMod = getAbilityModifier(abilityScore)
  let bonus = abilityMod

  if (isProficient) {
    bonus += proficiencyBonus
  }

  if (hasExpertise) {
    bonus += proficiencyBonus
  }

  return bonus
}

export function getSavingThrowModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  itemBonus: number = 0,
): number {
  const abilityMod = getAbilityModifier(abilityScore)
  return (isProficient ? abilityMod + proficiencyBonus : abilityMod) + itemBonus
}

export function isItemModifierActive(
  item: Pick<Equipment, "equipped" | "magic" | "requiresAttunement" | "attuned">
): boolean {
  if (!item.equipped || !item.magic) return false
  if (item.requiresAttunement && !item.attuned) return false
  return true
}

export interface EquipmentModifierTotals {
  armorClass: number
  initiative: number
  savingThrows: Record<keyof AbilityScores, number>
  abilityScores: Record<keyof AbilityScores, number>
}

export function getEquipmentModifierTotals(equipment: Equipment[] | undefined): EquipmentModifierTotals {
  const zero = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
  const totals: EquipmentModifierTotals = {
    armorClass: 0,
    initiative: 0,
    savingThrows: { ...zero },
    abilityScores: { ...zero },
  }
  for (const item of equipment ?? []) {
    if (!isItemModifierActive(item) || !item.modifiers) continue
    totals.armorClass += item.modifiers.armorClass ?? 0
    totals.initiative += item.modifiers.initiative ?? 0
    for (const ability of Object.keys(zero) as (keyof AbilityScores)[]) {
      totals.savingThrows[ability] += item.modifiers.savingThrows?.[ability] ?? 0
      totals.abilityScores[ability] += item.modifiers.abilityScores?.[ability] ?? 0
    }
  }
  return totals
}

type AbilityScoreCharacter = Pick<
  Character,
  "abilityScores" | "equipment" | "abilityScoreOverrides" | "useCalculatedAbilityScores"
>

export function getEffectiveAbilityScore(character: AbilityScoreCharacter, ability: keyof AbilityScores): number {
  const base = character.abilityScores?.[ability] ?? 10
  const itemBonus = getEquipmentModifierTotals(character.equipment).abilityScores[ability]
  const calculated = base + itemBonus
  const useCalculated = character.useCalculatedAbilityScores?.[ability] ?? true
  return useCalculated ? calculated : (character.abilityScoreOverrides?.[ability] ?? calculated)
}

export function getEffectiveAbilityScores(character: AbilityScoreCharacter): AbilityScores {
  return {
    strength: getEffectiveAbilityScore(character, "strength"),
    dexterity: getEffectiveAbilityScore(character, "dexterity"),
    constitution: getEffectiveAbilityScore(character, "constitution"),
    intelligence: getEffectiveAbilityScore(character, "intelligence"),
    wisdom: getEffectiveAbilityScore(character, "wisdom"),
    charisma: getEffectiveAbilityScore(character, "charisma"),
  }
}

export function getPassiveScore(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean,
): number {
  return 10 + getSkillModifier(abilityScore, proficiencyBonus, isProficient, hasExpertise)
}

export function getEffectiveMaxHp(hitPoints?: { maximum?: number; temporaryMaximum?: number }): number {
  return Math.max(1, (hitPoints?.maximum ?? 1) + (hitPoints?.temporaryMaximum ?? 0))
}

export function getSpellSaveDC(character: Character): number
export function getSpellSaveDC(
  spellcastingAbility: keyof AbilityScores,
  abilityScores: AbilityScores,
  proficiencyBonus: number,
): number
export function getSpellSaveDC(
  characterOrAbility: Character | keyof AbilityScores,
  abilityScores?: AbilityScores,
  proficiencyBonus?: number,
): number {
  // If first parameter is a Character object
  if (typeof characterOrAbility === "object" && "spellcastingAbility" in characterOrAbility) {
    const character = characterOrAbility
    if (!character.spellcastingAbility) return 8
    const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, character.spellcastingAbility))
    return 8 + (character.proficiencyBonus || 2) + abilityMod
  }

  // Original function signature
  const spellcastingAbility = characterOrAbility as keyof AbilityScores
  if (!spellcastingAbility || !abilityScores) return 8
  const abilityMod = getAbilityModifier(abilityScores[spellcastingAbility])
  return 8 + (proficiencyBonus || 2) + abilityMod
}

export function getSpellAttackBonus(character: Character): number
export function getSpellAttackBonus(
  spellcastingAbility: keyof AbilityScores,
  abilityScores: AbilityScores,
  proficiencyBonus: number,
): number
export function getSpellAttackBonus(
  characterOrAbility: Character | keyof AbilityScores,
  abilityScores?: AbilityScores,
  proficiencyBonus?: number,
): number {
  // If first parameter is a Character object
  if (typeof characterOrAbility === "object" && "spellcastingAbility" in characterOrAbility) {
    const character = characterOrAbility
    if (!character.spellcastingAbility) return 0
    const abilityMod = getAbilityModifier(getEffectiveAbilityScore(character, character.spellcastingAbility))
    return (character.proficiencyBonus || 2) + abilityMod
  }

  // Original function signature
  const spellcastingAbility = characterOrAbility as keyof AbilityScores
  if (!spellcastingAbility || !abilityScores) return 0
  const abilityMod = getAbilityModifier(abilityScores[spellcastingAbility])
  return (proficiencyBonus || 2) + abilityMod
}

export const SKILL_ABILITY_MAP = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
} as const

export const SKILL_DISPLAY_NAMES = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
} as const

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

export function parseHitDiceSize(hitDice: string): number {
  return parseDiceString(hitDice)?.sides ?? 8
}

export function rollHitDice(count: number, dieSize: DieSize, conMod: number): { total: number; rolls: number[] } {
  const { rolls } = rollMany(count, dieSize)
  const adjusted = rolls.map((r) => Math.max(1, r + conMod))
  return { rolls: adjusted, total: adjusted.reduce((a, b) => a + b, 0) }
}

export function safeFeatures(raw: Feature[] | string | undefined): Feature[] {
  if (!raw || typeof raw === 'string') return []
  return raw
}

export const DAMAGE_TYPES = ["slashing","piercing","bludgeoning","fire","cold","lightning","thunder","acid","poison","psychic","necrotic","radiant","force"]
export const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => t.charAt(0).toUpperCase() + t.slice(1))

export const BASE_ATTUNEMENT_LIMIT = 3

export interface DerivedWeaponAttack {
  id: string
  name: string
  type: "attack"
  attackBonus: number
  damage: string
  damageType: string
  range: string
  description: string
  isDerived: true
}

export function getEquippedWeaponAttacks(
  character: Pick<Character, "equipment" | "abilityScores" | "proficiencyBonus">
): DerivedWeaponAttack[] {
  const equipment = character.equipment ?? []
  const scores = character.abilityScores
  const profBonus = character.proficiencyBonus ?? 2

  return equipment
    .filter((item): item is Equipment & { weaponStats: NonNullable<Equipment["weaponStats"]> } =>
      item.equipped && item.type === "weapon" && item.weaponStats !== undefined
    )
    .map((item) => {
      const { damage, damageType, weaponRange, attackAbility, proficient } = item.weaponStats
      const strMod = getAbilityModifier(scores?.strength ?? 10)
      const dexMod = getAbilityModifier(scores?.dexterity ?? 10)
      const abilityMod =
        attackAbility === "dex" ? dexMod
        : attackAbility === "finesse" ? Math.max(strMod, dexMod)
        : strMod
      const attackBonus = abilityMod + (proficient ? profBonus : 0)
      const damageStr = abilityMod >= 0 ? `${damage}+${abilityMod}` : `${damage}${abilityMod}`
      return {
        id: `weapon-${item.id}`,
        name: item.name,
        type: "attack" as const,
        attackBonus,
        damage: damageStr,
        damageType,
        range: weaponRange,
        description: item.description,
        isDerived: true as const,
      }
    })
}

function formatBonusTerm(bonus: number, label: string): string {
  if (bonus === 0) return ""
  return bonus > 0 ? ` + ${bonus} (${label})` : ` - ${Math.abs(bonus)} (${label})`
}

export function calculateEquippedAC(
  character: Pick<Character, "equipment" | "abilityScores" | "armorClass" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
): { ac: number; breakdown: string; isEquippedArmor: boolean } {
  const equipment = character.equipment ?? []
  const dexMod = getAbilityModifier(getEffectiveAbilityScore(character, "dexterity"))
  const itemBonus = getEquipmentModifierTotals(equipment).armorClass

  const equippedArmor = equipment.filter(
    (item): item is Equipment & { armorStats: NonNullable<Equipment["armorStats"]> } =>
      item.equipped && item.type === "armor" && item.armorStats !== undefined
  )

  const bodyArmor = equippedArmor.find((item) => item.armorStats.armorType !== "shield")
  const shieldActive = equippedArmor.some((item) => item.armorStats.armorType === "shield")

  if (!bodyArmor) {
    const base = character.armorClass ?? 10
    const ac = (shieldActive ? base + 2 : base) + itemBonus
    let breakdown = shieldActive ? `${base} + 2 (shield)` : `${base}`
    breakdown += formatBonusTerm(itemBonus, "item bonus")
    return { ac, breakdown, isEquippedArmor: false }
  }

  const { baseAC, armorType } = bodyArmor.armorStats
  let ac: number
  let breakdown: string

  if (armorType === "light") {
    ac = baseAC + dexMod
    breakdown = `${baseAC} + ${dexMod} DEX`
  } else if (armorType === "medium") {
    const dexBonus = Math.min(dexMod, 2)
    ac = baseAC + dexBonus
    breakdown = `${baseAC} + ${dexBonus} DEX (max +2)`
  } else {
    ac = baseAC
    breakdown = `${baseAC}`
  }

  if (shieldActive) {
    ac += 2
    breakdown += " + 2 (shield)"
  }

  ac += itemBonus
  breakdown += formatBonusTerm(itemBonus, "item bonus")

  return { ac, breakdown, isEquippedArmor: true }
}

export function calculateInitiative(
  character: Pick<Character, "abilityScores" | "equipment" | "abilityScoreOverrides" | "useCalculatedAbilityScores">
): { initiative: number; breakdown: string } {
  const dexMod = getAbilityModifier(getEffectiveAbilityScore(character, "dexterity"))
  const itemBonus = getEquipmentModifierTotals(character.equipment).initiative
  return {
    initiative: dexMod + itemBonus,
    breakdown: `Dex ${formatModifier(dexMod)}${formatBonusTerm(itemBonus, "item bonus")}`,
  }
}

export function remainingUses(used: number | undefined, max: number | undefined): number {
  return (max ?? 0) - (used ?? 0)
}

export function spentFromRemaining(remaining: number, max: number | undefined): number {
  return (max ?? 0) - remaining
}

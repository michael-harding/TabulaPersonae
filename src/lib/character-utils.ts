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

export function getSavingThrowModifier(abilityScore: number, proficiencyBonus: number, isProficient: boolean): number {
  const abilityMod = getAbilityModifier(abilityScore)
  return isProficient ? abilityMod + proficiencyBonus : abilityMod
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
    const safeAbilityScores = character.abilityScores || {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }

    if (!character.spellcastingAbility) return 8
    const abilityMod = getAbilityModifier(safeAbilityScores[character.spellcastingAbility])
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
    const safeAbilityScores = character.abilityScores || {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }

    if (!character.spellcastingAbility) return 0
    const abilityMod = getAbilityModifier(safeAbilityScores[character.spellcastingAbility])
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

export function calculateEquippedAC(
  character: Pick<Character, "equipment" | "abilityScores" | "armorClass">
): { ac: number; breakdown: string; isEquippedArmor: boolean } {
  const equipment = character.equipment ?? []
  const dexMod = getAbilityModifier(character.abilityScores?.dexterity ?? 10)

  const equippedArmor = equipment.filter(
    (item): item is Equipment & { armorStats: NonNullable<Equipment["armorStats"]> } =>
      item.equipped && item.type === "armor" && item.armorStats !== undefined
  )

  const bodyArmor = equippedArmor.find((item) => item.armorStats.armorType !== "shield")
  const shieldActive = equippedArmor.some((item) => item.armorStats.armorType === "shield")

  if (!bodyArmor) {
    const base = character.armorClass ?? 10
    const ac = shieldActive ? base + 2 : base
    const breakdown = shieldActive ? `${base} + 2 (shield)` : `${base}`
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

  return { ac, breakdown, isEquippedArmor: true }
}

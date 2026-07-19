import { bench, describe } from 'vitest'
import {
  getSpellSaveDC,
  getSpellAttackBonus,
  getEquippedWeaponAttacks,
  calculateEquippedAC,
  safeFeatures,
  getAbilityModifier,
  getSkillModifier,
} from '@/lib/character-utils'
import { testCharacter } from '../../../__tests__/visual/fixtures'

describe('character-utils — derived stat calculations', () => {
  bench('getSpellSaveDC', () => {
    getSpellSaveDC(testCharacter)
  })

  bench('getSpellAttackBonus', () => {
    getSpellAttackBonus(testCharacter)
  })

  bench('getEquippedWeaponAttacks', () => {
    getEquippedWeaponAttacks(testCharacter)
  })

  bench('calculateEquippedAC', () => {
    calculateEquippedAC(testCharacter)
  })

  bench('safeFeatures (classFeatures)', () => {
    safeFeatures(testCharacter.classFeatures)
  })

  bench('getAbilityModifier', () => {
    getAbilityModifier(testCharacter.abilityScores.strength)
  })

  bench('getSkillModifier', () => {
    getSkillModifier(
      testCharacter.abilityScores.dexterity,
      testCharacter.proficiencyBonus,
      true,
      false,
    )
  })
})

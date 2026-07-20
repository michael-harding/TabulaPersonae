import type { JSXElement } from 'solid-js'
import type { Character } from '@/lib/character-types'
import type { ModuleId } from '@/lib/tab-config-types'
import { ActionsSection } from '@/components/actions-section'
import { AbilityScores } from '@/components/ability-scores'
import { CombatStats } from '@/components/combat-stats'
import { SkillsProficiencies } from '@/components/skills-proficiencies'
import { SpellsSection } from '@/components/spells-section'
import { FeaturesSection } from '@/components/features-section'
import { EquipmentInventory } from '@/components/equipment-inventory'
import { CharacterBasicInfo } from '@/components/character-basic-info'
import { CharacterNotes } from '@/components/character-notes'
import { SheetSettings } from '@/components/sheet-settings'

export interface ModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

export interface ModuleDefinition {
  label: string
  description: string
  render: (props: ModuleProps) => JSXElement
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  'actions': {
    label: 'Actions & Attacks',
    description: 'Weapon attacks, bonus actions, reactions, and other actions',
    render: (props) => <ActionsSection {...props} />,
  },
  'ability-scores': {
    label: 'Ability Scores',
    description: 'Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma',
    render: (props) => <AbilityScores {...props} />,
  },
  'combat-stats': {
    label: 'Combat Stats',
    description: 'Armor class, hit points, speed, initiative, hit dice, and death saves',
    render: (props) => <CombatStats {...props} />,
  },
  'skills': {
    label: 'Skills & Proficiencies',
    description: 'Skill checks, saving throws, and proficiency bonuses',
    render: (props) => <SkillsProficiencies {...props} />,
  },
  'spells': {
    label: 'Spells',
    description: 'Spell slots, prepared spells, and spellcasting stats',
    render: (props) => <SpellsSection {...props} />,
  },
  'features': {
    label: 'Features & Traits',
    description: 'Class features, species traits, and feats',
    render: (props) => <FeaturesSection {...props} />,
  },
  'inventory': {
    label: 'Inventory',
    description: 'Equipment, weapons, and magic items',
    render: (props) => <EquipmentInventory {...props} />,
  },
  'character-info': {
    label: 'Character Info',
    description: 'Name, race, class, background, alignment, and appearance',
    render: (props) => <CharacterBasicInfo {...props} />,
  },
  'notes': {
    label: 'Notes',
    description: 'Personality traits, ideals, bonds, flaws, backstory, and notes',
    render: (props) => <CharacterNotes {...props} />,
  },
  'sheet-settings': {
    label: 'Sheet Settings',
    description: 'Edition (2014/2024) and sheet color theme',
    render: (props) => <SheetSettings {...props} />,
  },
}

export const ALL_MODULE_IDS = Object.keys(MODULE_REGISTRY) as ModuleId[]

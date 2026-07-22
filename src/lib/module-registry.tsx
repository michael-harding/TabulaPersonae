import type { JSXElement } from 'solid-js'
import type { Character } from '@/lib/character-types'
import type { ModuleId } from '@/lib/tab-config-types'
import { ActionsModule } from '@/components/actions-module'
import { AbilityScoresModule } from '@/components/ability-scores-module'
import { CombatStatsModule } from '@/components/combat-stats-module'
import { SkillsProficienciesModule } from '@/components/skills-proficiencies-module'
import { SpellsModule } from '@/components/spells-module'
import { FeaturesModule } from '@/components/features-module'
import { EquipmentInventoryModule } from '@/components/equipment-inventory-module'
import { CharacterBasicInfoModule } from '@/components/character-basic-info-module'
import { CharacterNotesModule } from '@/components/character-notes-module'
import { SheetSettingsModule } from '@/components/sheet-settings-module'

export interface ModuleProps {
  character: Character
  onUpdate: (character: Character) => void
}

export interface ModuleDefinition {
  label: string
  description: string
  publicSafe: boolean
  render: (props: ModuleProps) => JSXElement
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  'actions': {
    label: 'Actions & Attacks',
    description: 'Weapon attacks, bonus actions, reactions, and other actions',
    publicSafe: true,
    render: (props) => <ActionsModule {...props} />,
  },
  'ability-scores': {
    label: 'Ability Scores',
    description: 'Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma',
    publicSafe: true,
    render: (props) => <AbilityScoresModule {...props} />,
  },
  'combat-stats': {
    label: 'Combat Stats',
    description: 'Armor class, hit points, speed, initiative, hit dice, and death saves',
    publicSafe: true,
    render: (props) => <CombatStatsModule {...props} />,
  },
  'skills': {
    label: 'Skills & Proficiencies',
    description: 'Skill checks, saving throws, and proficiency bonuses',
    publicSafe: true,
    render: (props) => <SkillsProficienciesModule {...props} />,
  },
  'spells': {
    label: 'Spells',
    description: 'Spell slots, prepared spells, and spellcasting stats',
    publicSafe: true,
    render: (props) => <SpellsModule {...props} />,
  },
  'features': {
    label: 'Features & Traits',
    description: 'Class features, species traits, and feats',
    publicSafe: true,
    render: (props) => <FeaturesModule {...props} />,
  },
  'inventory': {
    label: 'Inventory',
    description: 'Equipment, weapons, and magic items',
    publicSafe: true,
    render: (props) => <EquipmentInventoryModule {...props} />,
  },
  'character-info': {
    label: 'Character Info',
    description: 'Name, race, class, background, alignment, and appearance',
    publicSafe: true,
    render: (props) => <CharacterBasicInfoModule {...props} />,
  },
  'notes': {
    label: 'Notes',
    description: 'Personality traits, ideals, bonds, flaws, backstory, and notes',
    publicSafe: true,
    render: (props) => <CharacterNotesModule {...props} />,
  },
  'sheet-settings': {
    label: 'Sheet Settings',
    description: 'Edition (2014/2024) and sheet color theme',
    publicSafe: false,
    render: (props) => <SheetSettingsModule {...props} />,
  },
}

export const ALL_MODULE_IDS = Object.keys(MODULE_REGISTRY) as ModuleId[]

export const PUBLIC_SAFE_MODULE_IDS = new Set(
  (Object.entries(MODULE_REGISTRY) as [ModuleId, ModuleDefinition][])
    .filter(([, def]) => def.publicSafe)
    .map(([id]) => id)
)

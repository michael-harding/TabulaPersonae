export type ModuleId =
  | 'actions'
  | 'ability-scores'
  | 'combat-stats'
  | 'skills'
  | 'spells'
  | 'features'
  | 'inventory'
  | 'character-info'
  | 'notes'
  | 'sheet-settings'

export interface TabConfig {
  id: string
  label: string
  modules: ModuleId[]
}

export interface UserTabConfig {
  tabs: TabConfig[]
}

export const DEFAULT_TAB_CONFIG: UserTabConfig = {
  tabs: [
    {
      id: 'default-combat',
      label: 'Combat',
      modules: ['actions', 'ability-scores', 'combat-stats', 'skills'],
    },
    { id: 'default-spells', label: 'Spells', modules: ['spells'] },
    { id: 'default-features', label: 'Features', modules: ['features'] },
    { id: 'default-inventory', label: 'Inventory', modules: ['inventory'] },
    {
      id: 'default-character',
      label: 'Character',
      modules: ['character-info', 'notes', 'sheet-settings'],
    },
  ],
}

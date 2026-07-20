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

export function isValidTabConfig(data: unknown): data is UserTabConfig {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.tabs)) return false
  return d.tabs.every(
    (tab) =>
      tab &&
      typeof tab === 'object' &&
      typeof (tab as Record<string, unknown>).id === 'string' &&
      typeof (tab as Record<string, unknown>).label === 'string' &&
      Array.isArray((tab as Record<string, unknown>).modules),
  )
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

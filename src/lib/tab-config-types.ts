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

export interface TabConfig {
  id: string
  label: string
  modules: ModuleId[]
}

export interface UserTabConfig {
  tabs: TabConfig[]
}

const VALID_MODULE_IDS = new Set<string>([
  'actions', 'ability-scores', 'combat-stats', 'skills',
  'spells', 'features', 'inventory', 'character-info',
  'notes',
] satisfies ModuleId[])

/**
 * Modules that no longer exist, which configs saved before they were removed may still name.
 * Sheet Settings moved to the sidebar menu (src/components/sidebar-menu.tsx).
 */
const RETIRED_MODULE_IDS = new Set<string>(['sheet-settings'])

export function isValidTabConfig(data: unknown): data is UserTabConfig {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.tabs)) return false
  return d.tabs.every(
    (tab) => {
      const t = tab as Record<string, unknown>
      return (
        tab &&
        typeof tab === 'object' &&
        typeof t.id === 'string' &&
        typeof t.label === 'string' &&
        Array.isArray(t.modules) &&
        (t.modules as unknown[]).every((m) => typeof m === 'string' && VALID_MODULE_IDS.has(m))
      )
    },
  )
}

/**
 * A stored tab config, ready to use: a retired module is dropped from its tab rather than failing
 * the whole config, which would discard the user's tabs for the default ones. A tab left with no
 * modules is kept. Null if the data is not a tab config.
 */
export function parseTabConfig(data: unknown): UserTabConfig | null {
  const d = data as { tabs?: unknown } | null
  if (d && typeof d === 'object' && Array.isArray(d.tabs)) {
    const tabs = d.tabs.map((tab) => {
      const t = tab as { modules?: unknown } | null
      if (!t || typeof t !== 'object' || !Array.isArray(t.modules)) return tab
      return { ...t, modules: t.modules.filter((m) => !RETIRED_MODULE_IDS.has(m as string)) }
    })
    data = { ...d, tabs }
  }
  return isValidTabConfig(data) ? data : null
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
      modules: ['character-info', 'notes'],
    },
  ],
}

import { createContext, useContext, createSignal, createEffect, ParentComponent } from 'solid-js'
import { useAuth } from '@/lib/auth-context'
import { DEFAULT_TAB_CONFIG } from '@/lib/tab-config-types'
import type { UserTabConfig } from '@/lib/tab-config-types'
import { saveTabConfigToFirebase, getTabConfigFromFirebase } from '@/lib/firebase-storage'

const TAB_CONFIG_KEY = 'dnd-tab-config'

interface TabConfigContextType {
  tabConfig: () => UserTabConfig
  saveTabConfig: (config: UserTabConfig) => Promise<void>
}

const TabConfigContext = createContext<TabConfigContextType>()

export function useTabConfig() {
  const ctx = useContext(TabConfigContext)
  if (!ctx) throw new Error('useTabConfig must be used within a TabConfigProvider')
  return ctx
}

export const TabConfigProvider: ParentComponent = (props) => {
  const { user } = useAuth()
  const [tabConfig, setTabConfig] = createSignal<UserTabConfig>(DEFAULT_TAB_CONFIG)

  createEffect(async () => {
    const u = user()
    if (u) {
      const localRaw = localStorage.getItem(TAB_CONFIG_KEY)
      if (localRaw) {
        // Migrate anonymous config to Firebase on login
        const localConfig = JSON.parse(localRaw) as UserTabConfig
        await saveTabConfigToFirebase(localConfig, u.uid)
        localStorage.removeItem(TAB_CONFIG_KEY)
        setTabConfig(localConfig)
      } else {
        const firebaseConfig = await getTabConfigFromFirebase(u.uid)
        setTabConfig(firebaseConfig ?? DEFAULT_TAB_CONFIG)
      }
    } else {
      const stored = localStorage.getItem(TAB_CONFIG_KEY)
      setTabConfig(stored ? (JSON.parse(stored) as UserTabConfig) : DEFAULT_TAB_CONFIG)
    }
  })

  const saveTabConfig = async (config: UserTabConfig) => {
    setTabConfig(config)
    const u = user()
    if (u) {
      await saveTabConfigToFirebase(config, u.uid)
    } else {
      localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify(config))
    }
  }

  return (
    <TabConfigContext.Provider value={{ tabConfig, saveTabConfig }}>
      {props.children}
    </TabConfigContext.Provider>
  )
}

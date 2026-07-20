import { createContext, useContext, createSignal, createEffect, onCleanup, ParentComponent } from 'solid-js'
import { useAuth } from '@/lib/auth-context'
import { DEFAULT_TAB_CONFIG, isValidTabConfig } from '@/lib/tab-config-types'
import type { UserTabConfig } from '@/lib/tab-config-types'
import { saveTabConfigToFirebase, getTabConfigFromFirebase } from '@/lib/firebase-storage'
import { toast } from '@/hooks/use-toast'

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

function parseLocalConfig(raw: string): UserTabConfig {
  try {
    const parsed = JSON.parse(raw)
    return isValidTabConfig(parsed) ? parsed : DEFAULT_TAB_CONFIG
  } catch {
    return DEFAULT_TAB_CONFIG
  }
}

export const TabConfigProvider: ParentComponent = (props) => {
  const { user } = useAuth()
  const [tabConfig, setTabConfig] = createSignal<UserTabConfig>(DEFAULT_TAB_CONFIG)

  createEffect(() => {
    const u = user()
    let cancelled = false
    onCleanup(() => { cancelled = true })

    if (u) {
      const localRaw = localStorage.getItem(TAB_CONFIG_KEY)
      if (localRaw) {
        // Migrate anonymous config to Firebase on login
        const localConfig = parseLocalConfig(localRaw)
        saveTabConfigToFirebase(localConfig, u.uid).then((saved) => {
          if (cancelled) return
          if (saved) {
            localStorage.removeItem(TAB_CONFIG_KEY)
          } else {
            toast({
              title: 'Settings sync failed',
              description: 'Could not upload your settings to the cloud. Your local settings are preserved.',
              variant: 'destructive',
            })
          }
          setTabConfig(localConfig)
        })
      } else {
        getTabConfigFromFirebase(u.uid).then((firebaseConfig) => {
          if (cancelled) return
          setTabConfig(firebaseConfig ?? DEFAULT_TAB_CONFIG)
        })
      }
    } else {
      const stored = localStorage.getItem(TAB_CONFIG_KEY)
      setTabConfig(stored ? parseLocalConfig(stored) : DEFAULT_TAB_CONFIG)
    }
  })

  const saveTabConfig = async (config: UserTabConfig) => {
    setTabConfig(config)
    const u = user()
    if (u) {
      const saved = await saveTabConfigToFirebase(config, u.uid)
      if (!saved) {
        toast({
          title: 'Settings not saved',
          description: 'Could not save to cloud. Changes may be lost if you refresh.',
          variant: 'destructive',
        })
      }
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

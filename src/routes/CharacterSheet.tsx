import { createSignal, createEffect, onCleanup, Show, For } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { useParams, useNavigate } from "@solidjs/router"
import { type Character } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { subscribeToCharacter } from "@/lib/firebase-storage"
import { useSyncState } from "@/lib/sync-context"
import { useTabConfig } from "@/lib/tab-config-context"
import { MODULE_REGISTRY } from "@/lib/module-registry"
import Scroll from "lucide-solid/icons/scroll"
import Sunrise from "lucide-solid/icons/sunrise"
import FlameKindling from "lucide-solid/icons/flame-kindling"
import Settings from "lucide-solid/icons/settings"
import { Tooltip } from "@/components/ui/tooltip"
import { RestModal } from "@/components/rest-modal"
import { HeaderMenu } from "@/components/header-menu"
import { StatsBar } from "@/components/stats-bar"
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function CharacterSheet() {
  const params = useParams()
  const navigate = useNavigate()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()
  const { tabConfig } = useTabConfig()

  const syncCtx = useSyncState()

  const [charStore, setCharStore] = createStore<{ data: Character | null }>({ data: null })
  const [characters, setCharacters] = createSignal<Character[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [isRestOpen, setIsRestOpen] = createSignal(false)

  createEffect(() => {
    const name = charStore.data?.name
    document.title = name ? `${name} | TabulaPersonae` : "TabulaPersonae"
  })

  createEffect(() => {
    if (authLoading()) return
    if (!user() && !skipAuth()) {
      navigate("/auth")
      return
    }
    const id = params.id
    const sm = storageManager()
    setIsLoading(true)
    sm.getCharacters()
      .then(async (allChars) => {
        setCharacters(allChars)
        const found = allChars.find((c) => c.id === id)
        if (found) {
          setCharStore("data", reconcile(found))
        } else {
          // Fallback for characters created offline and not yet in the query cache
          const single = await sm.getCharacter(id!)
          if (single) {
            setCharStore("data", reconcile(single))
          } else {
            navigate("/404")
          }
        }
      })
      .catch((error) => console.error("Failed to load character:", error))
      .finally(() => setIsLoading(false))
  })

  createEffect(() => {
    const u = user()
    const id = params.id
    if (!u || !id) return
    const unsubscribe = subscribeToCharacter(id, u.uid, (snap) => {
      if (snap) syncCtx?.setSyncState({ hasPendingWrites: snap.hasPendingWrites, updatedAt: snap.updatedAt })
    })
    onCleanup(() => {
      unsubscribe()
      syncCtx?.setSyncState(null)
    })
  })

  const updateCharacter = async (updated: Character) => {
    let next = updated
    if (next.hitPoints.current === 1) {
      next = { ...next, deathSaves: { successes: 0, failures: 0 } }
    }
    setCharStore("data", reconcile(next))
    try {
      await storageManager().saveCharacter(next)
    } catch (error) {
      console.error("Failed to save character:", error)
      alert("Failed to save character.")
    }
  }

  const handleImportCharacter = async (char: Character) => {
    const imported = { ...char, id: crypto.randomUUID() }
    const success = await storageManager().saveCharacter(imported)
    if (!success) throw new Error("Failed to save imported character")
    navigate(`/character/${imported.id}`)
  }

  const handleImportMultiple = async (importedCharacters: Character[]) => {
    const withNewIds = importedCharacters.map((char) => ({ ...char, id: crypto.randomUUID() }))
    await Promise.all(withNewIds.map((char) => storageManager().saveCharacter(char)))
    if (withNewIds.length > 0) navigate(`/character/${withNewIds[0].id}`)
  }

  return (
    <Show
      when={!isLoading() && !authLoading()}
      fallback={
        <div class="flex flex-1 items-center justify-center bg-background">
          <div class="text-center">
            <Scroll class="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p class="text-muted-foreground">Loading character...</p>
          </div>
        </div>
      }
    >
      <Show when={charStore.data}>
        {(getChar) => (
          <div class="bg-background" style={getChar().sheetColor ? { "--primary": getChar().sheetColor } : {}}>
            <StatsBar character={getChar()} />

            <header class="border-b bg-card">
              <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <Scroll class="h-8 w-8 text-primary" />
                    <div class="flex items-center gap-3">
                      <div>
                        <h1 class="text-2xl font-bold text-foreground">{getChar().name || "Unnamed Character"}</h1>
                        <p class="text-sm text-muted-foreground">
                          Level {getChar().level} {getChar().race} {getChar().class}
                        </p>
                      </div>
                      <Tooltip content="Toggle Heroic Inspiration">
                        <button
                          type="button"
                          aria-label="Toggle Heroic Inspiration"
                          onClick={() => updateCharacter({ ...getChar(), heroicInspiration: !getChar().heroicInspiration })}
                          class={`ml-2 transition-colors ${getChar().heroicInspiration ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                          style={{ background: "none", border: "none", padding: "0", cursor: "pointer" }}
                        >
                          <Sunrise class={`h-11 w-11 ${getChar().heroicInspiration ? "fill-yellow-400" : "fill-none"}`} stroke-width={2} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Take a Rest">
                        <button
                          type="button"
                          aria-label="Take a Rest"
                          onClick={() => setIsRestOpen(true)}
                          class="ml-2 text-muted-foreground hover:text-orange-400 transition-colors"
                          style={{ background: "none", border: "none", padding: "0", cursor: "pointer" }}
                        >
                          <FlameKindling class="h-11 w-11" stroke-width={2} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <HeaderMenu
                    characters={characters()}
                    onImportCharacter={handleImportCharacter}
                    onImportMultiple={handleImportMultiple}
                    onAllCharacters={() => navigate("/")}
                    currentCharacter={charStore.data ?? undefined}
                  />
                </div>
              </div>
            </header>

            <div class="max-w-7xl mx-auto px-4 pb-4">
              <TabsRoot defaultValue={tabConfig().tabs[0]?.id ?? ''}>
                <div class="flex items-center border-b border-border">
                  <TabsList class="border-b-0 flex-1">
                    <For each={tabConfig().tabs}>
                      {(tab) => <TabsTrigger value={tab.id}>{tab.label}</TabsTrigger>}
                    </For>
                  </TabsList>
                  <Tooltip content="Configure Tabs">
                    <button
                      type="button"
                      aria-label="Configure tabs"
                      onClick={() => navigate('/settings/tabs')}
                      class="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Settings class="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                <For each={tabConfig().tabs}>
                  {(tab) => (
                    <TabsContent value={tab.id}>
                      <div class="space-y-6">
                        <For each={tab.modules}>
                          {(moduleId) => MODULE_REGISTRY[moduleId]?.render({ character: getChar(), onUpdate: updateCharacter })}
                        </For>
                      </div>
                    </TabsContent>
                  )}
                </For>
              </TabsRoot>
            </div>

            <RestModal
              character={getChar()}
              open={isRestOpen()}
              onOpenChange={setIsRestOpen}
              onRest={updateCharacter}
            />
          </div>
        )}
      </Show>
    </Show>
  )
}

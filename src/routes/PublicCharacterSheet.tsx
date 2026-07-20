import { createSignal, createEffect, Show, For } from "solid-js"
import { useParams, A } from "@solidjs/router"
import { type Character } from "@/lib/character-types"
import { getPublicCharacterFromFirebase } from "@/lib/firebase-storage"
import { ReadOnlyProvider } from "@/lib/read-only-context"
import { DEFAULT_TAB_CONFIG } from "@/lib/tab-config-types"
import { MODULE_REGISTRY } from "@/lib/module-registry"
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StatsBar } from "@/components/stats-bar"
import Scroll from "lucide-solid/icons/scroll"
import Lock from "lucide-solid/icons/lock"

const PUBLIC_TAB_CONFIG = {
  tabs: DEFAULT_TAB_CONFIG.tabs.map((tab) => ({
    ...tab,
    modules: tab.modules.filter((m) => m !== "sheet-settings"),
  })),
}

export default function PublicCharacterSheet() {
  const params = useParams()
  const [character, setCharacter] = createSignal<Character | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [activeTab, setActiveTab] = createSignal(PUBLIC_TAB_CONFIG.tabs[0]?.id ?? "")

  createEffect(() => {
    document.title = "TabulaPersonae"
    const id = params.id
    if (!id) { setIsLoading(false); return }
    getPublicCharacterFromFirebase(id)
      .then((char) => {
        setCharacter(char)
        if (char) document.title = `${char.name} | TabulaPersonae`
      })
      .finally(() => setIsLoading(false))
  })

  return (
    <Show
      when={!isLoading()}
      fallback={
        <div class="flex flex-1 items-center justify-center bg-background">
          <div class="text-center">
            <Scroll class="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p class="text-muted-foreground">Loading character...</p>
          </div>
        </div>
      }
    >
      <Show
        when={character()}
        fallback={
          <div class="flex flex-1 items-center justify-center bg-background">
            <div class="text-center space-y-2">
              <Scroll class="h-12 w-12 mx-auto text-muted-foreground" />
              <p class="text-lg font-semibold">Character not found or not shared publicly.</p>
              <A href="/" class="text-sm text-primary underline underline-offset-2">Go to TabulaPersonae</A>
            </div>
          </div>
        }
      >
        {(getChar) => (
          <ReadOnlyProvider value={true}>
            <div class="bg-background" style={getChar().sheetColor ? { "--primary": getChar().sheetColor } : {}}>
              <StatsBar character={getChar()} />

              <header class="border-b bg-card">
                <div class="max-w-7xl mx-auto px-4 py-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <Scroll class="h-8 w-8 text-primary" />
                      <div>
                        <div class="flex items-center gap-2">
                          <h1 class="text-2xl font-bold text-foreground">{getChar().name || "Unnamed Character"}</h1>
                          <Badge variant="secondary" class="flex items-center gap-1 text-xs">
                            <Lock class="h-3 w-3" />
                            Read-only
                          </Badge>
                        </div>
                        <p class="text-sm text-muted-foreground">
                          Level {getChar().level} {getChar().race} {getChar().class}
                        </p>
                      </div>
                    </div>
                    <A href="/" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      TabulaPersonae ↗
                    </A>
                  </div>
                </div>
              </header>

              <div class="max-w-7xl mx-auto px-4 pb-4">
                <TabsRoot value={activeTab()} onChange={setActiveTab}>
                  <div class="flex items-center border-b border-border">
                    <TabsList class="border-b-0 flex-1">
                      <For each={PUBLIC_TAB_CONFIG.tabs}>
                        {(tab) => <TabsTrigger value={tab.id}>{tab.label}</TabsTrigger>}
                      </For>
                    </TabsList>
                  </div>
                  <For each={PUBLIC_TAB_CONFIG.tabs}>
                    {(tab) => (
                      <TabsContent value={tab.id}>
                        <div class="space-y-6">
                          <For each={tab.modules}>
                            {(moduleId) => MODULE_REGISTRY[moduleId]?.render({ character: getChar(), onUpdate: () => {} })}
                          </For>
                        </div>
                      </TabsContent>
                    )}
                  </For>
                </TabsRoot>
              </div>
            </div>
          </ReadOnlyProvider>
        )}
      </Show>
    </Show>
  )
}

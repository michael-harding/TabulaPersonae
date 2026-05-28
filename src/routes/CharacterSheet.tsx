import { createSignal, createEffect, onCleanup, Show } from "solid-js"
import { useParams, useNavigate } from "@solidjs/router"
import { type Character } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { subscribeToCharacter } from "@/lib/firebase-storage"
import { useSyncState } from "@/lib/sync-context"
import Scroll from "lucide-solid/icons/scroll"
import Sunrise from "lucide-solid/icons/sunrise"
import FlameKindling from "lucide-solid/icons/flame-kindling"
import { Tooltip } from "@/components/ui/tooltip"
import { RestModal } from "@/components/rest-modal"
import { CharacterBasicInfo } from "@/components/character-basic-info"
import { AbilityScores } from "@/components/ability-scores"
import { CombatStats } from "@/components/combat-stats"
import { SkillsProficiencies } from "@/components/skills-proficiencies"
import { ActionsSection } from "@/components/actions-section"
import { SpellsSection } from "@/components/spells-section"
import { EquipmentInventory } from "@/components/equipment-inventory"
import { CharacterNotes } from "@/components/character-notes"
import { FeaturesSection } from "@/components/features-section"
import { SheetSettings } from "@/components/sheet-settings"
import { HeaderMenu } from "@/components/header-menu"
import { StatsBar } from "@/components/stats-bar"
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function CharacterSheet() {
  const params = useParams()
  const navigate = useNavigate()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  const syncCtx = useSyncState()

  const [character, setCharacter] = createSignal<Character | null>(null)
  const [characters, setCharacters] = createSignal<Character[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [isRestOpen, setIsRestOpen] = createSignal(false)

  createEffect(() => {
    const name = character()?.name
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
          setCharacter(found)
        } else {
          // Fallback for characters created offline and not yet in the query cache
          const single = await sm.getCharacter(id!)
          if (single) {
            setCharacter(single)
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
    setCharacter(next)
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
      <Show when={character()}>
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
                    currentCharacter={character() ?? undefined}
                  />
                </div>
              </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 pb-4">
              <TabsRoot defaultValue="combat">
                <TabsList>
                  <TabsTrigger value="combat">Combat</TabsTrigger>
                  <TabsTrigger value="spells">Spells</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="character">Character</TabsTrigger>
                </TabsList>
                <TabsContent value="combat">
                  <div class="space-y-6">
                    <ActionsSection character={getChar()} onUpdate={updateCharacter} />
                    <div class="grid gap-6 lg:grid-cols-2">
                      <AbilityScores character={getChar()} onUpdate={updateCharacter} />
                      <CombatStats character={getChar()} onUpdate={updateCharacter} />
                    </div>
                    <SkillsProficiencies character={getChar()} onUpdate={updateCharacter} />
                  </div>
                </TabsContent>
                <TabsContent value="spells">
                  <SpellsSection character={getChar()} onUpdate={updateCharacter} />
                </TabsContent>
                <TabsContent value="features">
                  <FeaturesSection character={getChar()} onUpdate={updateCharacter} />
                </TabsContent>
                <TabsContent value="inventory">
                  <EquipmentInventory character={getChar()} onUpdate={updateCharacter} />
                </TabsContent>
                <TabsContent value="character">
                  <div class="space-y-6">
                    <CharacterBasicInfo character={getChar()} onUpdate={updateCharacter} />
                    <CharacterNotes character={getChar()} onUpdate={updateCharacter} />
                    <SheetSettings character={getChar()} onUpdate={updateCharacter} />
                  </div>
                </TabsContent>
              </TabsRoot>
            </main>

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

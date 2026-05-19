import { createSignal, createEffect, Show } from "solid-js"
import { useParams, useNavigate } from "@solidjs/router"
import { type Character } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
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

export default function CharacterSheet() {
  const params = useParams()
  const navigate = useNavigate()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

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
      .then((allChars) => {
        setCharacters(allChars)
        const found = allChars.find((c) => c.id === id)
        if (found) {
          setCharacter(found)
        } else {
          navigate("/404")
        }
      })
      .catch((error) => console.error("Failed to load character:", error))
      .finally(() => setIsLoading(false))
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
        <div class="min-h-screen bg-background flex items-center justify-center">
          <div class="text-center">
            <Scroll class="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p class="text-muted-foreground">Loading character...</p>
          </div>
        </div>
      }
    >
      <Show when={character()}>
        {(getChar) => (
          <div class="min-h-screen bg-background" style={getChar().sheetColor ? { "--primary": getChar().sheetColor } : {}}>
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
                    onNewCharacter={() => navigate("/")}
                  />
                </div>
              </div>
            </header>

            <main class="max-w-7xl mx-auto p-4">
              <div class="space-y-6">
                <ActionsSection character={getChar()} onUpdate={updateCharacter} />
                <div class="grid gap-6 lg:grid-cols-2">
                  <AbilityScores character={getChar()} onUpdate={updateCharacter} />
                  <CombatStats character={getChar()} onUpdate={updateCharacter} />
                </div>
                <SkillsProficiencies character={getChar()} onUpdate={updateCharacter} />
                <SpellsSection character={getChar()} onUpdate={updateCharacter} />
                <FeaturesSection character={getChar()} onUpdate={updateCharacter} />
                <EquipmentInventory character={getChar()} onUpdate={updateCharacter} />
                <CharacterBasicInfo character={getChar()} onUpdate={updateCharacter} />
                <CharacterNotes character={getChar()} onUpdate={updateCharacter} />
                <SheetSettings character={getChar()} onUpdate={updateCharacter} />
              </div>
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

import { createSignal, createEffect, For, Show } from "solid-js"
import { useNavigate, A } from "@solidjs/router"
import { type Character, createDefaultCharacter } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Plus from "lucide-solid/icons/plus"
import Scroll from "lucide-solid/icons/scroll"
import Sword from "lucide-solid/icons/sword"
import Trash2 from "lucide-solid/icons/trash-2"
import { ImportExport } from "@/components/import-export"
import { HeaderMenu } from "@/components/header-menu"

export default function Home() {
  const [characters, setCharacters] = createSignal<Character[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const navigate = useNavigate()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  createEffect(() => {
    if (authLoading()) return
    if (!user() && !skipAuth()) {
      navigate("/auth")
      return
    }
    const sm = storageManager()
    setIsLoading(true)
    sm.getCharacters()
      .then((chars) => setCharacters(chars))
      .catch((err) => console.error("Failed to load characters:", err))
      .finally(() => setIsLoading(false))
  })

  const createNewCharacter = () => {
    const newCharacter = createDefaultCharacter()
    setCharacters((prev) => [...prev, newCharacter])
    storageManager().saveCharacter(newCharacter).catch((error) => {
      console.error("Failed to save character:", error)
    })
    navigate(`/character/${newCharacter.id}`)
  }

  const handleImportCharacter = (character: Character) => {
    const imported = { ...character, id: crypto.randomUUID() }
    setCharacters((prev) => [...prev, imported])
    storageManager().saveCharacter(imported).catch((error) => {
      console.error("Failed to save imported character:", error)
    })
    navigate(`/character/${imported.id}`)
  }

  const handleImportMultiple = (importedCharacters: Character[]) => {
    const withNewIds = importedCharacters.map((char) => ({ ...char, id: crypto.randomUUID() }))
    setCharacters((prev) => [...prev, ...withNewIds])
    Promise.all(withNewIds.map((char) => storageManager().saveCharacter(char))).catch((error) => {
      console.error("Failed to save imported characters:", error)
    })
    if (withNewIds.length > 0) navigate(`/character/${withNewIds[0].id}`)
  }

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${characterName || "Unnamed Character"}"? This action cannot be undone.`)) return
    try {
      await storageManager().deleteCharacter(characterId)
      setCharacters((prev) => prev.filter((c) => c.id !== characterId))
    } catch (error) {
      console.error("Failed to delete character:", error)
      alert("Failed to delete character. Please check your connection and try again.")
    }
  }

  return (
    <Show
      when={!isLoading() && !authLoading()}
      fallback={
        <div class="flex flex-1 items-center justify-center bg-background">
          <div class="text-center">
            <Scroll class="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p class="text-muted-foreground">Loading your characters...</p>
          </div>
        </div>
      }
    >
      <div class="bg-background p-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <ImportExport
              characters={characters()}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
            />
            <HeaderMenu
              characters={characters()}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
              onAllCharacters={() => navigate("/")}
            />
          </div>

          <div class="text-center py-12">
            <Scroll class="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 class="text-4xl font-bold mb-4 text-foreground">TabulaPersonae</h1>
            <p class="text-xl text-muted-foreground mb-8">Create and manage your characters</p>

            <Show
              when={characters().length > 0}
              fallback={
                <div class="space-y-4">
                  <p class="text-muted-foreground">
                    You don't have any characters yet. Create your first character to get started!
                  </p>
                  <Button onClick={createNewCharacter} size="lg" class="gap-2">
                    <Plus class="h-5 w-5" />
                    Create Your First Character
                  </Button>
                </div>
              }
            >
              <div class="space-y-6">
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <For each={characters()}>
                    {(character) => (
                      <Card class="cursor-pointer hover:shadow-lg transition-shadow relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${character.name || "character"}`}
                          class="absolute top-2 right-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCharacter(character.id, character.name)
                          }}
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>

                        <A href={`/character/${character.id}`} class="block">
                          <CardHeader>
                            <CardTitle class="flex items-center gap-2 pr-8">
                              <Sword class="h-5 w-5 text-primary" />
                              {character.name || "Unnamed Character"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div class="space-y-2 text-sm text-muted-foreground">
                              <p>Level {character.level} {character.race} {character.class}</p>
                              <p>HP: {character.hitPoints?.current ?? 0}/{character.hitPoints?.maximum ?? 0}</p>
                              <p>AC: {character.armorClass}</p>
                            </div>
                          </CardContent>
                        </A>
                      </Card>
                    )}
                  </For>
                </div>

                <Button onClick={createNewCharacter} variant="outline" class="gap-2 bg-transparent">
                  <Plus class="h-4 w-4" />
                  Create New Character
                </Button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  )
}

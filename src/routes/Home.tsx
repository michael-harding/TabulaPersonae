import { createSignal, createEffect, createMemo, For, Show } from "solid-js"
import { useNavigate, A } from "@solidjs/router"
import Plus from "lucide-solid/icons/plus"
import Scroll from "lucide-solid/icons/scroll"
import Sword from "lucide-solid/icons/sword"
import Trash2 from "lucide-solid/icons/trash-2"

import { type Character, createDefaultCharacter } from "@/lib/character-types"
import { calculateEquippedAC, getEffectiveMaxHp } from "@/lib/character-utils"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { notifyIfFailed, saveImportedCharacters } from "@/lib/save-feedback"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { HeaderMenu } from "@/components/header-menu"

export default function Home() {
  const [characters, setCharacters] = createSignal<Character[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const navigate = useNavigate()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  const loadCharacters = () =>
    storageManager().getCharacters()
      .then((chars) => setCharacters(chars))
      .catch((err) => console.error("Failed to load characters:", err))

  createEffect(() => {
    if (authLoading()) return
    if (!user() && !skipAuth()) {
      navigate("/auth")
      return
    }
    setIsLoading(true)
    loadCharacters().finally(() => setIsLoading(false))
  })

  // None of these wait for the save before showing its result: offline, a signed-in user's write
  // stays pending until the server answers (see notifyIfFailed).
  const createNewCharacter = () => {
    const newCharacter = createDefaultCharacter()
    setCharacters((prev) => [...prev, newCharacter])
    notifyIfFailed(storageManager().saveCharacter(newCharacter), {
      title: "Character not saved",
      description: "The new character could not be saved.",
    })
    navigate(`/character/${newCharacter.id}`)
  }

  const handleImport = (toImport: Character[]) => {
    const { imported, saved } = saveImportedCharacters(toImport, storageManager().saveCharacter)
    setCharacters((prev) => [...prev, ...imported])
    if (imported.length > 0) navigate(`/character/${imported[0].id}`)
    return saved
  }

  const handleDeleteCharacter = async (characterId: string) => {
    const deleted = characters().find((c) => c.id === characterId)
    setCharacters((prev) => prev.filter((c) => c.id !== characterId))
    const succeeded = await notifyIfFailed(storageManager().deleteCharacter(characterId), {
      title: "Character not deleted",
      description: `${deleted?.name || "The character"} could not be deleted.`,
    })
    // It still exists, so show it again
    if (!succeeded) loadCharacters()
  }

  return (
    <Show
      when={!isLoading() && !authLoading()}
      fallback={
        <div data-sem="home-route" class="flex flex-1 items-center justify-center bg-background">
          <div class="text-center">
            <Scroll class="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" aria-hidden="true" />
            <p class="text-muted-foreground">Loading your characters...</p>
          </div>
        </div>
      }
    >
      <div data-sem="home-route" class="bg-background p-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-end mb-4">
            <HeaderMenu
              characters={characters()}
              onImport={handleImport}
              onAllCharacters={() => navigate("/")}
            />
          </div>

          <div class="text-center py-12">
            <Scroll class="h-16 w-16 mx-auto mb-6 text-primary" aria-hidden="true" />
            <h1 class="text-4xl font-bold mb-4 text-foreground">TabulaPersonae</h1>
            <p class="text-xl text-muted-foreground mb-8">Create and manage your characters</p>

            <Show
              when={characters().length > 0}
              fallback={
                <div class="space-y-4">
                  <p class="text-muted-foreground">
                    You don't have any characters yet. Create your first character to get started!
                  </p>
                  <Button data-test="create-first-character-button" onClick={createNewCharacter} size="lg" class="gap-2">
                    <Plus class="h-5 w-5" aria-hidden="true" />
                    Create Your First Character
                  </Button>
                </div>
              }
            >
              <div class="space-y-6">
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <For each={characters()}>
                    {(character) => {
                      const ac = createMemo(() => calculateEquippedAC(character).ac)
                      return (
                      <Card class="cursor-pointer hover:shadow-lg transition-shadow relative group">
                        <ConfirmButton
                          data-test={`delete-character-button-${character.id}`}
                          variant="ghost"
                          size="sm"
                          verb="Delete"
                          subject={character.name || "character"}
                          class="absolute top-2 right-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                          onConfirm={() => handleDeleteCharacter(character.id)}
                        >
                          <Trash2 class="h-4 w-4" aria-hidden="true" />
                        </ConfirmButton>

                        <A href={`/character/${character.id}`} class="block">
                          <CardHeader>
                            <CardTitle class="flex items-center gap-2 pr-8">
                              <Sword class="h-5 w-5 text-primary" aria-hidden="true" />
                              {character.name || "Unnamed Character"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div class="space-y-2 text-sm text-muted-foreground">
                              <p>Level {character.level} {character.race} {character.class}</p>
                              <p>HP: {character.hitPoints?.current ?? 0}/{getEffectiveMaxHp(character)}</p>
                              <p>AC: {(character.useCalculatedArmorClass ?? true) ? ac() : (character.armorClass ?? 10)}</p>
                            </div>
                          </CardContent>
                        </A>
                      </Card>
                      )
                    }}
                  </For>
                </div>

                <Button data-test="create-new-character-button" onClick={createNewCharacter} variant="outline" class="gap-2 bg-transparent">
                  <Plus class="h-4 w-4" aria-hidden="true" />
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

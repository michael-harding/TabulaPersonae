"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { type Character, createDefaultCharacter } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Scroll, Sword, Trash2 } from "lucide-react"
import { ImportExport } from "@/components/import-export"
import { HeaderMenu } from "@/components/header-menu"

export default function CharacterSheetApp() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  useEffect(() => {
    if (authLoading) return;
    if (!user && !skipAuth) {
      router.push('/auth');
      return;
    }

    const initializeApp = async () => {
      try {
        const loadedCharacters = await storageManager.getCharacters()
        setCharacters(loadedCharacters)
      } catch (error) {
        console.error('Failed to load characters:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [authLoading, user, skipAuth, router, storageManager])

  const createNewCharacter = async () => {
    const newCharacter = createDefaultCharacter()
    setCharacters([...characters, newCharacter])

    try {
      const saved = await storageManager.saveCharacter(newCharacter)
      if (!saved) {
        alert("Failed to save character. Please check your connection and try again.")
        return
      }
      router.push(`/character/${newCharacter.id}`)
    } catch (error) {
      console.error('Failed to save character:', error)
      alert("Failed to save character. Please check your connection and try again.")
    }
  }

  const handleImportCharacter = async (character: Character) => {
    const importedCharacter = { ...character, id: crypto.randomUUID() }
    setCharacters([...characters, importedCharacter])

    try {
      await storageManager.saveCharacter(importedCharacter)
      router.push(`/character/${importedCharacter.id}`)
    } catch (error) {
      console.error('Failed to save imported character:', error)
      alert("Failed to save imported character. Please check your connection and try again.")
    }
  }

  const handleImportMultiple = async (importedCharacters: Character[]) => {
    // Generate new IDs to avoid conflicts
    const charactersWithNewIds = importedCharacters.map((char) => ({
      ...char,
      id: crypto.randomUUID(),
    }))

    const updatedCharacters = [...characters, ...charactersWithNewIds]
    setCharacters(updatedCharacters)

    try {
      // Save all imported characters
      await Promise.all(charactersWithNewIds.map((char) => storageManager.saveCharacter(char)))

      // Set the first imported character as active
      if (charactersWithNewIds.length > 0) {
        router.push(`/character/${charactersWithNewIds[0].id}`)
      }
    } catch (error) {
      console.error('Failed to save imported characters:', error)
      alert("Failed to save some imported characters. Please check your connection and try again.")
    }
  }

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${characterName || "Unnamed Character"}"? This action cannot be undone.`,
    )

    if (confirmDelete) {
      try {
        // Delete from storage
        await storageManager.deleteCharacter(characterId)

        // Update local state
        const updatedCharacters = characters.filter((c) => c.id !== characterId)
        setCharacters(updatedCharacters)
      } catch (error) {
        console.error('Failed to delete character:', error)
        alert("Failed to delete character. Please check your connection and try again.")
      }
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your characters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <ImportExport
            characters={characters}
            onImportCharacter={handleImportCharacter}
            onImportMultiple={handleImportMultiple}
          />
          <HeaderMenu
            characters={characters}
            onImportCharacter={handleImportCharacter}
            onImportMultiple={handleImportMultiple}
            onAllCharacters={() => router.push('/')}
            onNewCharacter={createNewCharacter}
          />
        </div>

        <div className="text-center py-12">
          <Scroll className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl font-bold mb-4 text-foreground">D&D Character Sheet</h1>
          <p className="text-xl text-muted-foreground mb-8">Create and manage your Dungeons & Dragons characters</p>

          {characters.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You don't have any characters yet. Create your first character to get started!
              </p>
              <Button onClick={createNewCharacter} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Your First Character
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => (
                  <Card
                    key={character.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCharacter(character.id, character.name)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Link href={`/character/${character.id}`} className="block">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 pr-8">
                          <Sword className="h-5 w-5 text-primary" />
                          {character.name || "Unnamed Character"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>Level {character.level} {character.race} {character.class}</p>
                          <p>HP: {character.hitPoints?.current ?? 0}/{character.hitPoints?.maximum ?? 0}</p>
                          <p>AC: {character.armorClass}</p>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>

              <Button onClick={createNewCharacter} variant="outline" className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Create New Character
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

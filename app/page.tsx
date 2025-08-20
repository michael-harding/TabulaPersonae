"use client"

import { useState, useEffect } from "react"
import { type Character, createDefaultCharacter } from "@/lib/character-types"
import {
  loadCharacters,
  saveCharacter,
  getActiveCharacter,
  setActiveCharacter,
  deleteCharacter,
} from "@/lib/character-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Scroll, Sword, Trash2 } from "lucide-react"
import { CharacterBasicInfo } from "@/components/character-basic-info"
import { AbilityScores } from "@/components/ability-scores"
import { CombatStats } from "@/components/combat-stats"
import { SkillsProficiencies } from "@/components/skills-proficiencies"
import { EquipmentInventory } from "@/components/equipment-inventory"
import { SpellsSection } from "@/components/spells-section"
import { CharacterNotes } from "@/components/character-notes"
import { ModeToggle } from "@/components/mode-toggle"
import { ImportExport } from "@/components/import-export"
import { HeaderMenu } from "@/components/header-menu"
import { HpProgressBar } from "@/components/hp-progress-bar"

export default function CharacterSheetApp() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeCharacter, setActiveCharacterState] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load characters and restore the previously open character by ID
    const loadedCharacters = loadCharacters()
    const activeId = getActiveCharacter()
    setCharacters(loadedCharacters)
    if (activeId) {
      const found = loadedCharacters.find((c) => c.id === activeId)
      setActiveCharacterState(found || null)
    } else {
      setActiveCharacterState(null)
    }
    setIsLoading(false)
  }, [])

  const createNewCharacter = () => {
    const newCharacter = createDefaultCharacter()
    const updatedCharacters = [...characters, newCharacter]

    setCharacters(updatedCharacters)
    setActiveCharacterState(newCharacter)
    setActiveCharacter(newCharacter.id)
    saveCharacter(newCharacter)
  }

  const selectCharacter = (character: Character) => {
    setActiveCharacterState(character)
    setActiveCharacter(character.id)
  }

  const updateCharacter = (updatedCharacter: Character) => {
    setActiveCharacterState(updatedCharacter)
    saveCharacter(updatedCharacter)

    // Update characters list
    setCharacters((prev) => prev.map((c) => (c.id === updatedCharacter.id ? updatedCharacter : c)))
  }

  const handleImportCharacter = (character: Character) => {
    // Generate new ID to avoid conflicts
    const importedCharacter = { ...character, id: crypto.randomUUID() }
    const updatedCharacters = [...characters, importedCharacter]

    setCharacters(updatedCharacters)
    setActiveCharacterState(importedCharacter)
    setActiveCharacter(importedCharacter.id)
    saveCharacter(importedCharacter)
  }

  const handleImportMultiple = (importedCharacters: Character[]) => {
    // Generate new IDs to avoid conflicts
    const charactersWithNewIds = importedCharacters.map((char) => ({
      ...char,
      id: crypto.randomUUID(),
    }))

    const updatedCharacters = [...characters, ...charactersWithNewIds]
    setCharacters(updatedCharacters)

    // Save all imported characters
    charactersWithNewIds.forEach((char) => saveCharacter(char))

    // Set the first imported character as active
    if (charactersWithNewIds.length > 0) {
      setActiveCharacterState(charactersWithNewIds[0])
      setActiveCharacter(charactersWithNewIds[0].id)
    }
  }

  const handleDeleteCharacter = (characterId: string, characterName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${characterName || "Unnamed Character"}"? This action cannot be undone.`,
    )

    if (confirmDelete) {
      // Delete from storage
      deleteCharacter(characterId)

      // Update local state
      const updatedCharacters = characters.filter((c) => c.id !== characterId)
      setCharacters(updatedCharacters)

      // If the deleted character was active, clear active character
      if (activeCharacter?.id === characterId) {
        setActiveCharacterState(null)
        localStorage.removeItem("dnd-active-character")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your characters...</p>
        </div>
      </div>
    )
  }

  if (!activeCharacter) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <ImportExport
              characters={characters}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
            />
            <ModeToggle />
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

                      <div onClick={() => selectCharacter(character)}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 pr-8">
                            <Sword className="h-5 w-5 text-primary" />
                            {character.name || "Unnamed Character"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              Level {character.level} {character.race} {character.class}
                            </p>
                            <p>
                              HP: {character.currentHitPoints}/{character.hitPointMaximum}
                            </p>
                            <p>AC: {character.armorClass}</p>
                          </div>
                        </CardContent>
                      </div>
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

  return (
    <div className="min-h-screen bg-background">
      {activeCharacter && <HpProgressBar character={activeCharacter} />}

      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Scroll className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{activeCharacter.name || "Unnamed Character"}</h1>
                <p className="text-sm text-muted-foreground">
                  Level {activeCharacter.level} {activeCharacter.race} {activeCharacter.class}
                </p>
              </div>
            </div>

            <HeaderMenu
              characters={characters}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
              onAllCharacters={() => setActiveCharacterState(null)}
              onNewCharacter={createNewCharacter}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="space-y-6">
          {/* Character Basic Info */}
          <CharacterBasicInfo character={activeCharacter} onUpdate={updateCharacter} />

          {/* Stats Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AbilityScores character={activeCharacter} onUpdate={updateCharacter} />
            <CombatStats character={activeCharacter} onUpdate={updateCharacter} />
          </div>

          {/* Skills and Proficiencies */}
          <SkillsProficiencies character={activeCharacter} onUpdate={updateCharacter} />

          {/* Equipment */}
          <EquipmentInventory character={activeCharacter} onUpdate={updateCharacter} />

          {/* Spells */}
          <SpellsSection character={activeCharacter} onUpdate={updateCharacter} />

          {/* Character Notes and Background */}
          <CharacterNotes character={activeCharacter} onUpdate={updateCharacter} />
        </div>
      </main>
    </div>
  )
}

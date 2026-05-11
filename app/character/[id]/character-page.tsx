"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { type Character } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { Scroll, Sunrise } from "lucide-react"
import { CharacterBasicInfo } from "@/components/character-basic-info"
import { AbilityScores } from "@/components/ability-scores"
import { CombatStats } from "@/components/combat-stats"
import { SkillsProficiencies } from "@/components/skills-proficiencies"
import { ActionsSection } from "@/components/actions-section"
import { SpellsSection } from "@/components/spells-section"
import { EquipmentInventory } from "@/components/equipment-inventory"
import { CharacterNotes } from "@/components/character-notes"
import { HeaderMenu } from "@/components/header-menu"
import { HpProgressBar } from "@/components/hp-progress-bar"

export interface CharacterSheetPageProps {
  id: string;
}

export default function CharacterSheetPage({}:CharacterSheetPageProps) {
  const { id } = useParams()
  const router = useRouter()
  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  const [character, setCharacter] = useState<Character | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user && !skipAuth) {
      router.push('/auth')
      return
    }

    const loadData = async () => {
      try {
        const allChars = await storageManager.getCharacters()
        setCharacters(allChars)
        const found = allChars.find(c => c.id === id)
        if (found) {
          setCharacter(found)
        } else {
          router.push('/404')
        }
      } catch (error) {
        console.error("Failed to load character:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [id, authLoading, user, skipAuth, router, storageManager])

  const updateCharacter = async (updatedCharacter: Character) => {
    let nextCharacter = updatedCharacter
    if (nextCharacter.hitPoints.current === 1) {
      nextCharacter = {
        ...nextCharacter,
        deathSaves: { successes: 0, failures: 0 },
      }
    }
    setCharacter(nextCharacter)
    try {
      await storageManager.saveCharacter(nextCharacter)
    } catch (error) {
      console.error('Failed to save character:', error)
      alert("Failed to save character.")
    }
  }

  const handleImportCharacter = async (char: Character) => {
    const importedCharacter = { ...char, id: crypto.randomUUID() }
    await storageManager.saveCharacter(importedCharacter)
    router.push(`/character/${importedCharacter.id}`)
  }

  const handleImportMultiple = async (importedCharacters: Character[]) => {
    const charactersWithNewIds = importedCharacters.map((char) => ({ ...char, id: crypto.randomUUID() }))
    await Promise.all(charactersWithNewIds.map((char) => storageManager.saveCharacter(char)))
    if (charactersWithNewIds.length > 0) {
      router.push(`/character/${charactersWithNewIds[0].id}`)
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading character...</p>
        </div>
      </div>
    )
  }

  if (!character) return null

  return (
    <div className="min-h-screen bg-background">
      <HpProgressBar character={character} />

      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Scroll className="h-8 w-8 text-primary" />
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{character.name || "Unnamed Character"}</h1>
                  <p className="text-sm text-muted-foreground">
                    Level {character.level} {character.race} {character.class}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Heroic Inspiration"
                  onClick={() => updateCharacter({ ...character, heroicInspiration: !character.heroicInspiration })}
                  className={`ml-2 transition-colors ${character.heroicInspiration ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <Sunrise className={`h-11 w-11 ${character.heroicInspiration ? "fill-yellow-400" : "fill-none"}`} strokeWidth={2} />
                </button>
              </div>
            </div>

            <HeaderMenu
              characters={characters}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
              onAllCharacters={() => router.push('/')}
              onNewCharacter={() => router.push('/')}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="space-y-6">
          <ActionsSection character={character} onUpdate={updateCharacter} />
          <div className="grid gap-6 lg:grid-cols-2">
            <AbilityScores character={character} onUpdate={updateCharacter} />
            <CombatStats character={character} onUpdate={updateCharacter} />
          </div>
          <SkillsProficiencies character={character} onUpdate={updateCharacter} />
          <SpellsSection character={character} onUpdate={updateCharacter} />
          <EquipmentInventory character={character} onUpdate={updateCharacter} />
          <CharacterBasicInfo character={character} onUpdate={updateCharacter} />
          <CharacterNotes character={character} onUpdate={updateCharacter} />
        </div>
      </main>
    </div>
  )
}

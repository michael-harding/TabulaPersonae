import type { Character } from "./character-types"

const STORAGE_KEY = "dnd-characters"
const ACTIVE_CHARACTER_KEY = "dnd-active-character"

export function saveCharacter(character: Character): void {
  const characters = getCharacters()
  const existingIndex = characters.findIndex((c) => c.id === character.id)

  if (existingIndex >= 0) {
    characters[existingIndex] = character
  } else {
    characters.push(character)
  }
  console.log("here");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters))
}

export function getCharacters(): Character[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function loadCharacters(): Character[] {
  return getCharacters()
}

export function getCharacter(id: string): Character | null {
  const characters = getCharacters()
  return characters.find((c) => c.id === id) || null
}

export function deleteCharacter(id: string): void {
  const characters = getCharacters()
  const filtered = characters.filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function getActiveCharacter(): string | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(ACTIVE_CHARACTER_KEY)
  return stored || null
}

export function setActiveCharacter(characterId: string): void {
  localStorage.setItem(ACTIVE_CHARACTER_KEY, characterId)
}

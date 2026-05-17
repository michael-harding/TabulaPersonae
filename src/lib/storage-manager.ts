import { createMemo } from 'solid-js'
import { useAuth } from './auth-context'
import {
  saveCharacterToFirebase,
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  deleteCharacterFromFirebase,
} from './firebase-storage'
import type { Character } from './character-types'

interface StorageAdapter {
  saveCharacter(character: Character): Promise<boolean>
  getCharacters(): Promise<Character[]>
  getCharacter(id: string): Promise<Character | null>
  deleteCharacter(id: string): Promise<boolean>
}

class LocalStorageAdapter implements StorageAdapter {
  private STORAGE_KEY = 'dnd-characters'

  async saveCharacter(character: Character): Promise<boolean> {
    try {
      const characters = await this.getCharacters()
      const existingIndex = characters.findIndex((c) => c.id === character.id)

      if (existingIndex >= 0) {
        characters[existingIndex] = character
      } else {
        characters.push(character)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(characters))
      return true
    } catch (error) {
      console.error('Failed to save character to localStorage:', error)
      return false
    }
  }

  async getCharacters(): Promise<Character[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return []
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  async getCharacter(id: string): Promise<Character | null> {
    const characters = await this.getCharacters()
    return characters.find((c) => c.id === id) || null
  }

  async deleteCharacter(id: string): Promise<boolean> {
    try {
      const characters = await this.getCharacters()
      const filtered = characters.filter((c) => c.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Failed to delete character from localStorage:', error)
      return false
    }
  }
}

const localAdapter = new LocalStorageAdapter()

export function useStorageManager() {
  const { user } = useAuth()

  // createMemo re-runs whenever user() changes, returning a new storage interface
  const storageManager = createMemo(() => {
    const u = user()

    const saveCharacter = async (character: Character): Promise<boolean> => {
      return u ? saveCharacterToFirebase(character, u.uid) : localAdapter.saveCharacter(character)
    }

    const getCharacters = async (): Promise<Character[]> => {
      return u ? getCharactersFromFirebase(u.uid) : localAdapter.getCharacters()
    }

    const getCharacter = async (id: string): Promise<Character | null> => {
      return u ? getCharacterFromFirebase(id, u.uid) : localAdapter.getCharacter(id)
    }

    const deleteCharacter = async (id: string): Promise<boolean> => {
      return u ? deleteCharacterFromFirebase(id, u.uid) : localAdapter.deleteCharacter(id)
    }

    const syncToFirebase = async (): Promise<boolean> => {
      if (!u) return false
      try {
        const localCharacters = await localAdapter.getCharacters()
        for (const character of localCharacters) {
          await saveCharacterToFirebase(character, u.uid)
        }
        localStorage.setItem('dnd-characters', '[]')
        return true
      } catch (error) {
        console.error('Failed to sync to Firebase:', error)
        return false
      }
    }

    return {
      saveCharacter,
      getCharacters,
      getCharacter,
      deleteCharacter,
      syncToFirebase,
      isAuthenticated: !!u,
      storageType: u ? 'firebase' : 'local',
    }
  })

  return storageManager
}

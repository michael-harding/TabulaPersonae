import { createMemo } from 'solid-js'

import { useAuth } from './auth-context'
import {
  saveCharacterToFirebase,
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  deleteCharacterFromFirebase,
} from './firebase-storage'
import type { Character } from './character-types'
import { readLocalCharacters, writeLocalCharacters } from './local-user-data'

interface StorageAdapter {
  saveCharacter(character: Character): Promise<boolean>
  getCharacters(): Promise<Character[]>
  getCharacter(id: string): Promise<Character | null>
  deleteCharacter(id: string): Promise<boolean>
}

class LocalStorageAdapter implements StorageAdapter {
  // Nothing may be awaited between reading the list and writing it back (here and in
  // deleteCharacter): saves started together would all read the same list, and the last write
  // would drop the others' characters.
  async saveCharacter(character: Character): Promise<boolean> {
    try {
      const characters = readLocalCharacters()
      const existingIndex = characters.findIndex((c) => c.id === character.id)

      if (existingIndex >= 0) {
        characters[existingIndex] = character
      } else {
        characters.push(character)
      }

      writeLocalCharacters(characters)
      return true
    } catch (error) {
      console.error('Failed to save character to localStorage:', error)
      return false
    }
  }

  async getCharacters(): Promise<Character[]> {
    return readLocalCharacters()
  }

  async getCharacter(id: string): Promise<Character | null> {
    return readLocalCharacters().find((c) => c.id === id) || null
  }

  async deleteCharacter(id: string): Promise<boolean> {
    try {
      writeLocalCharacters(readLocalCharacters().filter((c) => c.id !== id))
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
      return u ? deleteCharacterFromFirebase(id) : localAdapter.deleteCharacter(id)
    }

    return {
      saveCharacter,
      getCharacters,
      getCharacter,
      deleteCharacter,
      isAuthenticated: !!u,
      storageType: u ? 'firebase' : 'local',
    }
  })

  return storageManager
}

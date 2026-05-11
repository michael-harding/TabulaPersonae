import { useAuth } from './auth-context';
import {
  saveCharacterToFirebase,
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  deleteCharacterFromFirebase
} from './firebase-storage';
import { useMemo } from 'react';
import type { Character } from './character-types';

// Storage interface that both local and Firebase storage implement
interface StorageAdapter {
  saveCharacter(character: Character): Promise<boolean>;
  getCharacters(): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | null>;
  deleteCharacter(id: string): Promise<boolean>;
}

class LocalStorageAdapter {
  private STORAGE_KEY = "dnd-characters";

  async saveCharacter(character: Character): Promise<boolean> {
    try {
      const characters = await this.getCharacters();
      const existingIndex = characters.findIndex((c) => c.id === character.id);

      if (existingIndex >= 0) {
        characters[existingIndex] = character;
      } else {
        characters.push(character);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(characters));
      return true;
    } catch (error) {
      console.error('Failed to save character to localStorage:', error);
      return false;
    }
  }

  async getCharacters(): Promise<Character[]> {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  async getCharacter(id: string): Promise<Character | null> {
    const characters = await this.getCharacters();
    return characters.find((c) => c.id === id) || null;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    try {
      const characters = await this.getCharacters();
      const filtered = characters.filter((c) => c.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete character from localStorage:', error);
      return false;
    }
  }
}

export function useStorageManager() {
  const { user } = useAuth();
  const localStorageAdapter = useMemo(() => new LocalStorageAdapter(), []);

  console.log('useStorageManager called, user:', !!user);

  const storageManager = useMemo(() => {
    const saveCharacter = async (character: Character): Promise<boolean> => {
      if (user) {
        return saveCharacterToFirebase(character, user.uid);
      } else {
        return localStorageAdapter.saveCharacter(character);
      }
    };

    const getCharacters = async (): Promise<Character[]> => {
      if (user) {
        return getCharactersFromFirebase(user.uid);
      } else {
        return localStorageAdapter.getCharacters();
      }
    };

    const getCharacter = async (id: string): Promise<Character | null> => {
      if (user) {
        return getCharacterFromFirebase(id, user.uid);
      } else {
        return localStorageAdapter.getCharacter(id);
      }
    };

    const deleteCharacter = async (id: string): Promise<boolean> => {
      if (user) {
        return deleteCharacterFromFirebase(id, user.uid);
      } else {
        return localStorageAdapter.deleteCharacter(id);
      }
    };

    const syncToFirebase = async (): Promise<boolean> => {
      if (!user) return false;

      try {
        const localCharacters = await localStorageAdapter.getCharacters();

        for (const character of localCharacters) {
          await saveCharacterToFirebase(character, user.uid);
        }

        // Clear local storage after successful sync
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('dnd-characters', '[]');
        }

        return true;
      } catch (error) {
        console.error('Failed to sync to Firebase:', error);
        return false;
      }
    };

    return {
      saveCharacter,
      getCharacters,
      getCharacter,
      deleteCharacter,
      syncToFirebase,
      isAuthenticated: !!user,
      storageType: user ? 'firebase' : 'local',
    };
  }, [user, localStorageAdapter]);

  return storageManager;
}
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth-context';
import { useMemo } from 'react';
import type { Character } from './character-types';

const CHARACTERS_COLLECTION = 'characters';

export async function saveCharacterToFirebase(character: Character, userId: string): Promise<boolean> {
  try {
    const characterData = {
      ...character,
      userId,
      updatedAt: Timestamp.now(),
    };

    if (character.id) {
      // Update existing character or create new one with specific ID
      const characterRef = doc(db, CHARACTERS_COLLECTION, character.id);
      await setDoc(characterRef, characterData, { merge: true });
    } else {
      // Create new character
      const newCharacterData = {
        ...characterData,
        id: '', // Will be set by Firestore
      };
      const docRef = await addDoc(collection(db, CHARACTERS_COLLECTION), newCharacterData);
      character.id = docRef.id;
    }

    return true;
  } catch (error) {
    console.error('Failed to save character to Firebase:', error);
    return false;
  }
}

export async function getCharactersFromFirebase(userId: string): Promise<Character[]> {
  try {
    const q = query(
      collection(db, CHARACTERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const characters: Character[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      characters.push({
        ...data,
        id: doc.id,
      } as Character);
    });

    return characters;
  } catch (error) {
    console.error('Failed to get characters from Firebase:', error);
    return [];
  }
}

export async function getCharacterFromFirebase(id: string, userId: string): Promise<Character | null> {
  try {
    const characterRef = doc(db, CHARACTERS_COLLECTION, id);
    const characterSnap = await getDoc(characterRef);

    if (characterSnap.exists()) {
      const data = characterSnap.data();

      // Verify the character belongs to the user
      if (data.userId !== userId) {
        return null;
      }

      return {
        ...data,
        id: characterSnap.id,
      } as Character;
    }

    return null;
  } catch (error) {
    console.error('Failed to get character from Firebase:', error);
    return null;
  }
}

export async function deleteCharacterFromFirebase(id: string, userId: string): Promise<boolean> {
  try {
    const characterRef = doc(db, CHARACTERS_COLLECTION, id);
    const characterSnap = await getDoc(characterRef);

    if (characterSnap.exists()) {
      const data = characterSnap.data();

      // Verify the character belongs to the user
      if (data.userId !== userId) {
        return false;
      }

      await deleteDoc(characterRef);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to delete character from Firebase:', error);
    return false;
  }
}

// Hook to use Firebase storage with authentication
export function useFirebaseStorage() {
  console.log('useFirebaseStorage called');

  return useMemo(() => {
  const saveCharacter = async (character: Character, userId: string): Promise<boolean> => {
    return saveCharacterToFirebase(character, userId);
  };

  const getCharacters = async (userId: string): Promise<Character[]> => {
    return getCharactersFromFirebase(userId);
  };

  const getCharacter = async (id: string, userId: string): Promise<Character | null> => {
    return getCharacterFromFirebase(id, userId);
  };

  const deleteCharacter = async (id: string, userId: string): Promise<boolean> => {
    return deleteCharacterFromFirebase(id, userId);
  };

    return {
      saveCharacter,
      getCharacters,
      getCharacter,
      deleteCharacter,
    };
  }, []);
}
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Character } from './character-types';

const CHARACTERS_COLLECTION = 'characters';

export async function saveCharacterToFirebase(character: Character, userId: string): Promise<boolean> {
  try {
    const rawData = { ...character, userId };
    // Firestore rejects undefined values — strip them via JSON round-trip
    // updatedAt is set after to preserve the Timestamp type (JSON.stringify would convert it to a plain object)
    const characterData = JSON.parse(JSON.stringify(rawData));
    characterData.updatedAt = Timestamp.now();

    if (character.id) {
      const characterRef = doc(db, CHARACTERS_COLLECTION, character.id);
      await setDoc(characterRef, characterData, { merge: true });
    } else {
      const newCharacterData = {
        ...characterData,
        id: '',
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

export type CharacterSyncSnapshot = {
  hasPendingWrites: boolean
  updatedAt: Date | null
}

export function subscribeToCharacter(
  id: string,
  userId: string,
  callback: (snap: CharacterSyncSnapshot | null) => void
): () => void {
  const characterRef = doc(db, CHARACTERS_COLLECTION, id)
  return onSnapshot(
    characterRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists() || snap.data().userId !== userId) {
        callback(null)
        return
      }
      const raw = snap.data().updatedAt
      let updatedAt: Date | null = null
      if (raw instanceof Timestamp) {
        updatedAt = raw.toDate()
      } else if (raw?.seconds != null) {
        // Legacy: JSON-serialised Timestamp stored as a plain { seconds, nanoseconds } map
        updatedAt = new Timestamp(raw.seconds, raw.nanoseconds ?? 0).toDate()
      }
      callback({
        hasPendingWrites: snap.metadata.hasPendingWrites,
        updatedAt,
      })
    }
  )
}

export async function deleteCharacterFromFirebase(id: string, userId: string): Promise<boolean> {
  try {
    const characterRef = doc(db, CHARACTERS_COLLECTION, id);
    const characterSnap = await getDoc(characterRef);

    if (characterSnap.exists()) {
      const data = characterSnap.data();

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

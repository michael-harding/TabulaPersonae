import {
  collection,
  doc,
  getDocs,
  getDocsFromCache,
  getDoc,
  getDocFromCache,
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
import { isValidTabConfig } from './tab-config-types';
import type { UserTabConfig } from './tab-config-types';

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

    const querySnapshot = navigator.onLine
      ? await getDocs(q)
      : await getDocsFromCache(q);
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
    const characterSnap = navigator.onLine
      ? await getDoc(characterRef)
      : await getDocFromCache(characterRef);

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

const lastSyncedKey = (id: string) => `dnd-last-synced-${id}`

export function subscribeToCharacter(
  id: string,
  userId: string,
  callback: (snap: CharacterSyncSnapshot | null) => void
): () => void {
  // Seed from localStorage so confirmed sync time survives offline reloads
  const stored = localStorage.getItem(lastSyncedKey(id))
  let lastConfirmedAt: Date | null = stored ? new Date(stored) : null

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
      if (!snap.metadata.hasPendingWrites) {
        lastConfirmedAt = updatedAt
        if (lastConfirmedAt) {
          localStorage.setItem(lastSyncedKey(id), lastConfirmedAt.toISOString())
        }
      }
      callback({
        hasPendingWrites: snap.metadata.hasPendingWrites,
        updatedAt: lastConfirmedAt,
      })
    }
  )
}

export async function getPublicCharacterFromFirebase(id: string): Promise<Character | null> {
  // Dev-only: seed a public character via localStorage["dnd-public-char-{id}"] to skip Firebase.
  // Set to JSON.stringify(character) to return a character, or "null" to simulate not-found.
  if (import.meta.env.DEV) {
    const seed = localStorage.getItem(`dnd-public-char-${id}`)
    if (seed !== null) {
      try {
        const parsed = JSON.parse(seed) as Character | null
        if (parsed && !parsed.isPublic) return null
        return parsed
      } catch { /* fall through */ }
    }
  }
  try {
    const characterRef = doc(db, CHARACTERS_COLLECTION, id)
    const characterSnap = navigator.onLine
      ? await getDoc(characterRef)
      : await getDocFromCache(characterRef)
    if (!characterSnap.exists()) return null
    const data = characterSnap.data()
    if (!data.isPublic) return null
    return { ...data, id: characterSnap.id } as Character
  } catch (error) {
    console.error('Failed to get public character:', error)
    return null
  }
}

export async function deleteCharacterFromFirebase(id: string, userId: string): Promise<boolean> {
  try {
    const characterRef = doc(db, CHARACTERS_COLLECTION, id);
    await deleteDoc(characterRef);
    return true;
  } catch (error) {
    console.error('Failed to delete character from Firebase:', error);
    return false;
  }
}

const USER_SETTINGS_COLLECTION = 'userSettings';

export async function saveTabConfigToFirebase(config: UserTabConfig, userId: string): Promise<boolean> {
  try {
    const settingsRef = doc(db, USER_SETTINGS_COLLECTION, userId);
    await setDoc(settingsRef, { tabConfig: config }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save tab config to Firebase:', error);
    return false;
  }
}

export async function getTabConfigFromFirebase(userId: string): Promise<UserTabConfig | null> {
  try {
    const settingsRef = doc(db, USER_SETTINGS_COLLECTION, userId);
    const snap = navigator.onLine
      ? await getDoc(settingsRef)
      : await getDocFromCache(settingsRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const raw = data?.tabConfig;
    return isValidTabConfig(raw) ? raw : null;
  } catch (error) {
    const fe = error as { code?: string; message?: string }
    if (fe?.code === 'unavailable') {
      console.debug('Tab config not in Firestore cache (offline):', fe.message)
    } else {
      console.error('Failed to get tab config from Firebase:', error)
    }
    return null;
  }
}

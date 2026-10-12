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
  deleteField,
  FieldPath,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';

import { getDb } from './firebase';
import type { Character } from './character-types';
import { migrateCharacter } from './character-migrations';
import { isValidTabConfig } from './tab-config-types';
import type { UserTabConfig } from './tab-config-types';

const CHARACTERS_COLLECTION = 'characters';

// The top-level fields each character's document held when this client last read or wrote it.
// A save uses it to tell a field the user has cleared since (delete it) from one this client has
// never seen — set by another device or a newer app version — which must be left alone.
const knownFields = new Map<string, Set<string>>();

export async function saveCharacterToFirebase(character: Character, userId: string): Promise<boolean> {
  try {
    const rawData = { ...character, userId };
    // Firestore rejects undefined values — strip them via JSON round-trip
    // updatedAt is set after to preserve the Timestamp type (JSON.stringify would convert it to a plain object)
    const characterData = JSON.parse(JSON.stringify(rawData));
    characterData.updatedAt = Timestamp.now();

    if (character.id) {
      const characterRef = doc(getDb(), CHARACTERS_COLLECTION, character.id);
      const written = Object.keys(characterData);
      const previous = knownFields.get(character.id) ?? new Set<string>();
      // The JSON round-trip above drops cleared (undefined) fields, so they have to be deleted
      // explicitly or their old values would stay in Firestore.
      const cleared = [...previous].filter((field) => !(field in characterData));
      for (const field of cleared) characterData[field] = deleteField();

      // Recorded before the write settles: offline it stays pending until the server answers,
      // and a save made meanwhile must already count these fields as present.
      knownFields.set(character.id, new Set(written));
      try {
        // A mask of top-level fields rather than `merge: true` or a plain overwrite: each listed
        // field is replaced whole (`merge` deep-merges nested maps, keeping keys removed from
        // them), and fields not listed are untouched (an overwrite would drop them). FieldPath
        // keeps a field name containing a dot from being read as a nested path.
        await setDoc(characterRef, characterData, {
          mergeFields: [...written, ...cleared].map((field) => new FieldPath(field)),
        });
      } catch (error) {
        // The deletes may not have been applied, so keep those fields on record to retry.
        knownFields.set(character.id, new Set([...previous, ...written]));
        throw error;
      }
    } else {
      const newCharacterData = {
        ...characterData,
        id: '',
      };
      const docRef = await addDoc(collection(getDb(), CHARACTERS_COLLECTION), newCharacterData);
      character.id = docRef.id;
      knownFields.set(docRef.id, new Set(Object.keys(newCharacterData)));
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
      collection(getDb(), CHARACTERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = navigator.onLine
      ? await getDocs(q)
      : await getDocsFromCache(q);
    const characters: Character[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      knownFields.set(doc.id, new Set(Object.keys(data)));
      characters.push(migrateCharacter({
        ...data,
        id: doc.id,
      }));
    });

    return characters;
  } catch (error) {
    console.error('Failed to get characters from Firebase:', error);
    return [];
  }
}

export async function getCharacterFromFirebase(id: string, userId: string): Promise<Character | null> {
  try {
    const characterRef = doc(getDb(), CHARACTERS_COLLECTION, id);
    const characterSnap = navigator.onLine
      ? await getDoc(characterRef)
      : await getDocFromCache(characterRef);

    if (characterSnap.exists()) {
      const data = characterSnap.data();

      if (data.userId !== userId) {
        return null;
      }

      knownFields.set(characterSnap.id, new Set(Object.keys(data)));
      return migrateCharacter({
        ...data,
        id: characterSnap.id,
      });
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

  const characterRef = doc(getDb(), CHARACTERS_COLLECTION, id)
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
    if (seed != null) {
      try {
        const parsed = JSON.parse(seed) as Character | null
        if (parsed && !parsed.isPublic) return null
        return parsed ? migrateCharacter(parsed) : null
      } catch { /* fall through */ }
    }
  }
  try {
    const characterRef = doc(getDb(), CHARACTERS_COLLECTION, id)
    const characterSnap = navigator.onLine
      ? await getDoc(characterRef)
      : await getDocFromCache(characterRef)
    if (!characterSnap.exists()) return null
    const data = characterSnap.data()
    if (!data.isPublic) return null
    return migrateCharacter({ ...data, id: characterSnap.id })
  } catch (error) {
    console.error('Failed to get public character:', error)
    return null
  }
}

export async function deleteCharacterFromFirebase(id: string): Promise<boolean> {
  try {
    const characterRef = doc(getDb(), CHARACTERS_COLLECTION, id);
    await deleteDoc(characterRef);
    knownFields.delete(id);
    return true;
  } catch (error) {
    console.error('Failed to delete character from Firebase:', error);
    return false;
  }
}

const USER_SETTINGS_COLLECTION = 'userSettings';

export async function saveTabConfigToFirebase(config: UserTabConfig, userId: string): Promise<boolean> {
  try {
    const settingsRef = doc(getDb(), USER_SETTINGS_COLLECTION, userId);
    await setDoc(settingsRef, { tabConfig: config }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save tab config to Firebase:', error);
    return false;
  }
}

export async function getTabConfigFromFirebase(userId: string): Promise<UserTabConfig | null> {
  try {
    const settingsRef = doc(getDb(), USER_SETTINGS_COLLECTION, userId);
    const snap = navigator.onLine
      ? await getDoc(settingsRef)
      : await getDocFromCache(settingsRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const raw = data?.tabConfig;
    return isValidTabConfig(raw) ? raw : null;
  } catch (error) {
    const fe = error as { code?: string; message?: string }
    // `unavailable` is an offline cache miss — expected, so there is no error to report.
    if (fe?.code !== 'unavailable') {
      console.error('Failed to get tab config from Firebase:', error)
    }
    return null;
  }
}

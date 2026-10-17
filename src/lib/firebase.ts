/// <reference types="vite/client" />
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The Firebase Local Emulator Suite the e2e tests run against. The ports must match the
// "emulators" section of firebase.json.
const EMULATOR_HOST = '127.0.0.1';
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

// Only on the dev server, and only when asked: a production build can never talk to an emulator.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// Initialization can fail (missing or invalid configuration). The failure is kept instead of
// being thrown while this module loads, so the app can still start and run on local storage; the
// accessors below throw it at the point Firebase is actually needed.
function initFirebase(): FirebaseServices | Error {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    // One cache and one queue of unsent writes shared by every open tab. Signing out deletes that
    // cache (clearFirestoreCache), so the check for unsynced changes that precedes it has to see
    // what the other tabs have written — which a tab with its own cache could not.
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (useEmulators) {
      // Emulator data lives under a `demo-` project, which Firebase never connects to a real one.
      // Any other id means real configuration reached a test run, so nothing is connected at all.
      if (!firebaseConfig.projectId?.startsWith('demo-')) {
        throw new Error(`The Firebase emulators need a demo- project id (got "${firebaseConfig.projectId}")`);
      }
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, { disableWarnings: true });
      connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    }
    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return new Error('Firebase is unavailable because it failed to initialize', { cause: error });
  }
}

const services = initFirebase();

function requireServices(): FirebaseServices {
  if (services instanceof Error) throw services;
  return services;
}

/** The Firebase Auth instance. Throws if Firebase failed to initialize. */
export function getFirebaseAuth(): Auth {
  return requireServices().auth;
}

/** The Firestore instance. Throws if Firebase failed to initialize. */
export function getDb(): Firestore {
  return requireServices().db;
}

/**
 * Deletes Firestore's offline copy of the signed-in user's data from this device, including any
 * writes that have not reached the server. Firestore only allows this on an instance that has
 * been shut down, so the page must be reloaded before Firestore is used again. The cache is shared
 * with every other open tab, and Firestore shuts itself down in those too when it is deleted, so
 * they need the same reload (see AuthProvider).
 */
export async function clearFirestoreCache(): Promise<void> {
  const { db } = requireServices();
  await terminate(db);
  await clearIndexedDbPersistence(db);
}

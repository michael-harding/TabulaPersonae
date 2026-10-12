/// <reference types="vite/client" />
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
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
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
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
 * been shut down, so the page must be reloaded before Firestore is used again.
 */
export async function clearFirestoreCache(): Promise<void> {
  const { db } = requireServices();
  await terminate(db);
  await clearIndexedDbPersistence(db);
}

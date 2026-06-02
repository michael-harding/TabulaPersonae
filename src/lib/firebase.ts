/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// any is required: these are assigned inside the try block below and exported as
// module-level bindings. Narrowing to FirebaseApp | Auth | Firestore would require
// null-guards in every consumer (auth-context, firebase-storage, network-status).
// Consumers are only called after successful init, so the null case never occurs at runtime.
let app: any;
let auth: any;
let db: any;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { app, auth, db };
export default app;

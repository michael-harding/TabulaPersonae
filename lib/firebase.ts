import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCU7Qs0jZNnFjecByDfTSah12Mp4ePLh8A",
  authDomain: "dnd-character-803e4.firebaseapp.com",
  projectId: "dnd-character-803e4",
  storageBucket: "dnd-character-803e4.firebasestorage.app",
  messagingSenderId: "264209658611",
  appId: "1:264209658611:web:51f1d4ae4ca26e1944fd86"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
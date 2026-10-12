import { createContext, useContext, createSignal, onCleanup, ParentComponent } from 'solid-js'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'

import { toast } from '@/hooks/use-toast'

import { clearFirestoreCache, getFirebaseAuth } from './firebase'
import { saveCharacterToFirebase } from './firebase-storage'
import type { Character } from './character-types'
import { clearLocalUserData } from './local-user-data'

export interface AuthContextType {
  user: () => User | null
  loading: () => boolean
  skipAuth: () => boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  /**
   * Signs out. For a signed-in user this first removes all of their data from the device, and the
   * page must be reloaded afterwards (Firestore has been shut down to clear its cache). It
   * rejects, leaving the user signed in, if the offline data could not be removed.
   */
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>()

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { AuthContext }

const LOCAL_CHARACTERS_KEY = 'dnd-characters'

// Moves characters created without an account into the account that has just signed in. A
// character leaves this device's storage only once its upload has succeeded.
async function uploadLocalCharacters(userId: string) {
  // Offline, Firestore holds each write pending until the server answers, so waiting for them
  // would keep the app on its loading screen. They are uploaded on the next load with a connection.
  if (!navigator.onLine) return

  const stored = localStorage.getItem(LOCAL_CHARACTERS_KEY)
  const localChars: Character[] = stored ? JSON.parse(stored) : []
  if (localChars.length === 0) return

  const notUploaded: Character[] = []
  for (const char of localChars) {
    if (!(await saveCharacterToFirebase(char, userId))) notUploaded.push(char)
  }
  localStorage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(notUploaded))

  if (notUploaded.length > 0) {
    const count = notUploaded.length === 1 ? '1 character' : `${notUploaded.length} characters`
    toast({
      title: 'Characters not uploaded',
      description: `${count} created on this device could not be added to your account. They are kept on this device and retried the next time the app loads; signing out removes them.`,
      variant: 'destructive',
    })
  }
}

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null)
  const isSkipAuth = localStorage.getItem('dnd-skip-auth') === 'true'
  // Skip auth means we don't wait for Firebase — loading resolves immediately
  const [loading, setLoading] = createSignal(!isSkipAuth)
  // Fixed for the life of the page: the flag is only ever changed together with a reload (see
  // Auth.tsx and header-menu.tsx).
  const skipAuth = () => isSkipAuth

  if (!isSkipAuth) {
    try {
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (firebaseUser) {
          try {
            await uploadLocalCharacters(firebaseUser.uid)
          } catch (error) {
            // e.g. the stored characters are not valid JSON. Signing in must still complete.
            console.error('Failed to upload characters stored on this device:', error)
          }
        }
        setUser(firebaseUser)
        setLoading(false)
      })
      onCleanup(unsubscribe)
    } catch (error) {
      // Firebase could not be reached at all (see firebase.ts), so no sign-in state will ever
      // arrive. Finish loading signed out so the app runs on local storage instead of waiting
      // forever; signing in still reports the failure when it is attempted.
      console.error('Auth is unavailable; continuing signed out:', error)
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Without an account (skip-auth) the characters exist only on this device and stay there.
      if (user()) {
        // Before signOut, so the user is never signed out with their data left behind: if the
        // cache cannot be cleared this throws and they remain signed in.
        clearLocalUserData()
        await clearFirestoreCache()
      }
      await signOut(getFirebaseAuth())
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, skipAuth, signIn, signUp, logout, resetPassword }}>
      {props.children}
    </AuthContext.Provider>
  )
}

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
import { clearLocalUserData, readLocalCharacters, removeLocalCharacters } from './local-user-data'

export interface AuthContextType {
  user: () => User | null
  loading: () => boolean
  skipAuth: () => boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  /**
   * Signs out. For a signed-in user this first removes all of their data from the device, and the
   * page must be reloaded afterwards (Firestore has been shut down to clear its cache). It
   * rejects if the offline data could not be removed, leaving the user signed in and the rest of
   * their data in place — but Firestore may already be shut down, so the page must be reloaded
   * then too.
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

// Moves characters created without an account into the account that has just signed in. A
// character leaves this device's storage only once its upload has succeeded. Every write is
// handed to Firestore before this first waits for anything, so they are all queued ahead of
// whatever reads the account's characters in response to the sign-in.
async function uploadLocalCharacters(userId: string) {
  // Offline, Firestore holds each write pending until the server answers, so none of them could
  // be confirmed and removed from this device. They are uploaded on the next load with a connection.
  if (!navigator.onLine) return

  const localChars = readLocalCharacters()
  if (localChars.length === 0) return

  const results = await Promise.all(localChars.map(async (char) => {
    // Taken first: saving can give a character without an id a new one.
    const { id } = char
    return { id, uploaded: await saveCharacterToFirebase(char, userId) }
  }))
  removeLocalCharacters(results.filter((result) => result.uploaded).map((result) => result.id))

  const notUploaded = results.filter((result) => !result.uploaded)
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
      let wasSignedIn = false
      // Nothing here may wait: each event has to be fully applied before the next one arrives, or
      // a sign-in still waiting would overwrite the sign-out that followed it.
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
        if (firebaseUser) {
          // Not awaited: signing in must complete even if the upload never does (Firestore can
          // be unreachable while the browser reports a connection).
          // unknown: a rejected promise can carry any value
          uploadLocalCharacters(firebaseUser.uid).catch((error: unknown) => {
            // e.g. the browser refuses the write
            console.error('Failed to upload characters stored on this device:', error)
          })
        }
        setUser(firebaseUser)
        setLoading(false)
        // Signed out while the page was open — here, or in another tab. Either way the sign-out
        // deleted Firestore's cache, which shuts Firestore down in every tab (see
        // clearFirestoreCache), so this page can read and save nothing until it is reloaded.
        if (wasSignedIn && firebaseUser == null) window.location.reload()
        wasSignedIn = firebaseUser != null
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
        // cache cannot be cleared this throws and they remain signed in. The cache goes first
        // because it is the step that can fail, and nothing else is removed unless it succeeds.
        await clearFirestoreCache()
        clearLocalUserData()
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

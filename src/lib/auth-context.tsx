import { createContext, useContext, createSignal, onCleanup, ParentComponent } from 'solid-js'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'

import { getFirebaseAuth } from './firebase'
import { saveCharacterToFirebase } from './firebase-storage'
import type { Character } from './character-types'

export interface AuthContextType {
  user: () => User | null
  loading: () => boolean
  skipAuth: () => boolean
  setSkipAuth: (value: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
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

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null)
  const isSkipAuth = localStorage.getItem('dnd-skip-auth') === 'true'
  // Skip auth means we don't wait for Firebase — loading resolves immediately
  const [loading, setLoading] = createSignal(!isSkipAuth)
  const [skipAuth, setSkipAuthSignal] = createSignal(isSkipAuth)

  const setSkipAuth = (value: boolean) => {
    localStorage.setItem('dnd-skip-auth', String(value))
    setSkipAuthSignal(value)
  }

  if (!isSkipAuth) {
    try {
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (firebaseUser) {
          const stored = localStorage.getItem('dnd-characters')
          const localChars: Character[] = stored ? JSON.parse(stored) : []
          if (localChars.length > 0) {
            for (const char of localChars) {
              await saveCharacterToFirebase(char, firebaseUser.uid)
            }
            localStorage.setItem('dnd-characters', '[]')
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
      if (user()) {
        localStorage.removeItem('dnd-characters')
        localStorage.removeItem('dnd-active-character')
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
    <AuthContext.Provider value={{ user, loading, skipAuth, setSkipAuth, signIn, signUp, logout, resetPassword }}>
      {props.children}
    </AuthContext.Provider>
  )
}

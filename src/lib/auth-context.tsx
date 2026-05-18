import { createContext, useContext, createSignal, onCleanup, ParentComponent } from 'solid-js'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from './firebase'
import { saveCharacterToFirebase } from './firebase-storage'
import type { Character } from './character-types'

interface AuthContextType {
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
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
      await signOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
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

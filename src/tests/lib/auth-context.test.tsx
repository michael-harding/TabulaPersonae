vi.unmock("@/lib/auth-context")

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock("@/lib/firebase-storage", () => ({
  saveCharacterToFirebase: vi.fn(),
}))

import { cleanup, render } from "@solidjs/testing-library"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { saveCharacterToFirebase } from "@/lib/firebase-storage"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { createDefaultCharacter } from "@/lib/character-types"

const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged)
const mockSignOut = vi.mocked(signOut)
const mockSaveCharacterToFirebase = vi.mocked(saveCharacterToFirebase)

const testUser = { uid: "user-123", email: "test@test.com" } as any
const char1 = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const char2 = { ...createDefaultCharacter(), id: "char-2", name: "Gandalf" }
const CHARS_KEY = "dnd-characters"
const ACTIVE_KEY = "dnd-active-character"

// Renders AuthProvider and captures both the onAuthStateChanged callback
// (to simulate login/logout events) and the useAuth() return value.
function renderProvider() {
  let authStateCallback!: (user: any) => Promise<void>
  let capturedAuth!: ReturnType<typeof useAuth>

  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    authStateCallback = cb as any
    return vi.fn()
  })

  function Consumer() {
    capturedAuth = useAuth()
    return null
  }

  render(() => (
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  ))

  return { authStateCallback, capturedAuth }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockSignOut.mockResolvedValue(undefined as any)
  mockSaveCharacterToFirebase.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
})

describe("AuthProvider — sync local characters on login", () => {
  it("uploads a local character to Firebase when user signs in", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).toHaveBeenCalledWith(char1, "user-123")
    expect(localStorage.getItem(CHARS_KEY)).toBe("[]")
  })

  it("uploads all local characters when multiple exist", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1, char2]))
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).toHaveBeenCalledTimes(2)
    expect(mockSaveCharacterToFirebase).toHaveBeenCalledWith(char1, "user-123")
    expect(mockSaveCharacterToFirebase).toHaveBeenCalledWith(char2, "user-123")
    expect(localStorage.getItem(CHARS_KEY)).toBe("[]")
  })

  it("skips Firebase upload when there are no local characters", async () => {
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
  })

  it("skips Firebase upload when local characters array is empty", async () => {
    localStorage.setItem(CHARS_KEY, "[]")
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
  })

  it("sets user signal after sync completes", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    const { authStateCallback, capturedAuth } = renderProvider()

    expect(capturedAuth.user()).toBeNull()
    await authStateCallback(testUser)
    expect(capturedAuth.user()).toBe(testUser)
  })

  it("does not sync or modify localStorage when firebaseUser is null (logout event)", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    const { authStateCallback } = renderProvider()

    await authStateCallback(null)

    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
    expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
  })

  it("is idempotent on subsequent logins with an already-empty local store", async () => {
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)
    await authStateCallback(testUser) // simulate page reload while logged in

    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
  })
})

describe("AuthProvider — logout clears local data", () => {
  it("removes dnd-characters and dnd-active-character on logout", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    localStorage.setItem(ACTIVE_KEY, "char-1")
    const { authStateCallback, capturedAuth } = renderProvider()
    await authStateCallback(testUser)

    await capturedAuth.logout()

    expect(localStorage.getItem(CHARS_KEY)).toBeNull()
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull()
  })

  it("calls signOut after clearing local data", async () => {
    const { authStateCallback, capturedAuth } = renderProvider()
    await authStateCallback(testUser)

    await capturedAuth.logout()

    expect(mockSignOut).toHaveBeenCalled()
  })

  it("does not clear localStorage when user is null (skip-auth mode)", async () => {
    localStorage.setItem("dnd-skip-auth", "true")
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    localStorage.setItem(ACTIVE_KEY, "char-1")

    // In skip-auth mode AuthProvider never registers onAuthStateChanged,
    // so user() stays null — matching the handleBackToLogin flow.
    let capturedAuth!: ReturnType<typeof useAuth>
    function Consumer() {
      capturedAuth = useAuth()
      return null
    }
    render(() => (
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    ))

    await capturedAuth.logout()

    expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
    expect(localStorage.getItem(ACTIVE_KEY)).toBe("char-1")
    expect(mockSignOut).toHaveBeenCalled()
  })

  it("still calls signOut even when there is no local data to clear", async () => {
    const { authStateCallback, capturedAuth } = renderProvider()
    await authStateCallback(testUser)

    await capturedAuth.logout()

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})

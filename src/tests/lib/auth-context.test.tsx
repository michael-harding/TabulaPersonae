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
import { createRoot } from "solid-js"
import type { MockInstance } from "vitest"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"

import { getFirebaseAuth } from "@/lib/firebase"
import { saveCharacterToFirebase } from "@/lib/firebase-storage"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { createDefaultCharacter } from "@/lib/character-types"

import { createTestUser } from "../mocks/auth"

const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged)
const mockSignOut = vi.mocked(signOut)
const mockSignIn = vi.mocked(signInWithEmailAndPassword)
const mockCreateUser = vi.mocked(createUserWithEmailAndPassword)
const mockSendPasswordReset = vi.mocked(sendPasswordResetEmail)
const mockSaveCharacterToFirebase = vi.mocked(saveCharacterToFirebase)

const testUser = createTestUser({ uid: "user-123", email: "test@test.com" })
const char1 = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const char2 = { ...createDefaultCharacter(), id: "char-2", name: "Gandalf" }
const CHARS_KEY = "dnd-characters"
const ACTIVE_KEY = "dnd-active-character"

// Renders AuthProvider and captures both the onAuthStateChanged callback
// (to simulate login/logout events) and the useAuth() return value.
function renderProvider() {
  let authStateCallback!: (user: User | null) => Promise<void>
  let capturedAuth!: ReturnType<typeof useAuth>

  mockOnAuthStateChanged.mockImplementation((_auth, nextOrObserver) => {
    // The SDK accepts either a callback or an observer object; AuthProvider passes a callback.
    if (typeof nextOrObserver !== "function") throw new Error("Expected AuthProvider to pass onAuthStateChanged a callback")
    // AuthProvider's callback is async, so awaiting it lets a test wait for the login handling to finish.
    authStateCallback = async (user) => { await nextOrObserver(user) }
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
  mockSignOut.mockResolvedValue(undefined)
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

describe("AuthProvider — Firebase failed to initialize", () => {
  const failure = new Error("Firebase is unavailable because it failed to initialize")
  let errorSpy: MockInstance<Console["error"]>

  beforeEach(() => {
    // What the real accessor does when initialization failed (see firebase.ts)
    vi.mocked(getFirebaseAuth).mockImplementation(() => { throw failure })
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.mocked(getFirebaseAuth).mockReset()
    errorSpy.mockRestore()
  })

  it("finishes loading signed out instead of waiting for a sign-in state that will never arrive", () => {
    const { capturedAuth } = renderProvider()

    expect(capturedAuth.loading()).toBe(false)
    expect(capturedAuth.user()).toBeNull()
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith("Auth is unavailable; continuing signed out:", failure)
  })

  it("reports the failure when a sign-in is attempted", async () => {
    const { capturedAuth } = renderProvider()

    await expect(capturedAuth.signIn("test@test.com", "password")).rejects.toBe(failure)
  })
})

describe("AuthProvider — loading state", () => {
  it("is loading until Firebase reports the first sign-in state", async () => {
    const { authStateCallback, capturedAuth } = renderProvider()

    expect(capturedAuth.loading()).toBe(true)
    await authStateCallback(null)
    expect(capturedAuth.loading()).toBe(false)
  })

  it("does not wait for Firebase at all in skip-auth mode", () => {
    localStorage.setItem("dnd-skip-auth", "true")
    const { capturedAuth } = renderProvider()

    expect(capturedAuth.loading()).toBe(false)
    expect(capturedAuth.skipAuth()).toBe(true)
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled()
  })

  it("stops listening for sign-in state when the provider is disposed", () => {
    const unsubscribe = vi.fn()
    mockOnAuthStateChanged.mockReturnValue(unsubscribe)
    const { unmount } = render(() => <AuthProvider>{null}</AuthProvider>)

    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})

describe("AuthProvider — setSkipAuth", () => {
  it.each([true, false])("sets the skipAuth signal to %s and remembers the choice", (value) => {
    const { capturedAuth } = renderProvider()

    capturedAuth.setSkipAuth(value)

    expect(capturedAuth.skipAuth()).toBe(value)
    expect(localStorage.getItem("dnd-skip-auth")).toBe(String(value))
  })
})

describe("AuthProvider — account actions", () => {
  const failure = Object.assign(new Error("Firebase: Error (auth/too-many-requests)."), { code: "auth/too-many-requests" })
  let errorSpy: MockInstance<Console["error"]>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it("signs in with the given email and password", async () => {
    const { capturedAuth } = renderProvider()

    await capturedAuth.signIn("test@test.com", "hunter22")

    expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), "test@test.com", "hunter22")
  })

  it("creates an account with the given email and password", async () => {
    const { capturedAuth } = renderProvider()

    await capturedAuth.signUp("new@test.com", "hunter22")

    expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), "new@test.com", "hunter22")
  })

  it("sends a password reset email to the given address", async () => {
    const { capturedAuth } = renderProvider()

    await capturedAuth.resetPassword("test@test.com")

    expect(mockSendPasswordReset).toHaveBeenCalledWith(expect.anything(), "test@test.com")
  })

  // Each action must hand Firebase's own error (with its `code`) back to the caller, which maps
  // it to a message, and log it in full.
  it.each([
    { action: "signIn", logged: "Sign in error:", sdkCall: mockSignIn, run: (auth: ReturnType<typeof useAuth>) => auth.signIn("test@test.com", "hunter22") },
    { action: "signUp", logged: "Sign up error:", sdkCall: mockCreateUser, run: (auth: ReturnType<typeof useAuth>) => auth.signUp("test@test.com", "hunter22") },
    { action: "resetPassword", logged: "Password reset error:", sdkCall: mockSendPasswordReset, run: (auth: ReturnType<typeof useAuth>) => auth.resetPassword("test@test.com") },
    { action: "logout", logged: "Sign out error:", sdkCall: mockSignOut, run: (auth: ReturnType<typeof useAuth>) => auth.logout() },
  ])("$action rethrows a Firebase failure unchanged and logs it", async ({ logged, sdkCall, run }) => {
    sdkCall.mockRejectedValueOnce(failure)
    const { capturedAuth } = renderProvider()

    await expect(run(capturedAuth)).rejects.toBe(failure)
    expect(errorSpy).toHaveBeenCalledWith(logged, failure)
  })
})

describe("useAuth", () => {
  it("throws when used outside an AuthProvider", () => {
    expect(() => createRoot(() => useAuth())).toThrow("useAuth must be used within an AuthProvider")
  })
})

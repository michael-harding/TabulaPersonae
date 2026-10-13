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

vi.mock("@/hooks/use-toast", async () => (await import("../mocks/toast")).toastModuleMock)

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

import { clearFirestoreCache, getFirebaseAuth } from "@/lib/firebase"
import { saveCharacterToFirebase } from "@/lib/firebase-storage"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { createDefaultCharacter } from "@/lib/character-types"

import { createTestUser } from "../mocks/auth"
import { mockToast } from "../mocks/toast"

const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged)
const mockSignOut = vi.mocked(signOut)
const mockSignIn = vi.mocked(signInWithEmailAndPassword)
const mockCreateUser = vi.mocked(createUserWithEmailAndPassword)
const mockSendPasswordReset = vi.mocked(sendPasswordResetEmail)
const mockSaveCharacterToFirebase = vi.mocked(saveCharacterToFirebase)
const mockClearFirestoreCache = vi.mocked(clearFirestoreCache)

const testUser = createTestUser({ uid: "user-123", email: "test@test.com" })
const char1 = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const char2 = { ...createDefaultCharacter(), id: "char-2", name: "Gandalf" }
const CHARS_KEY = "dnd-characters"
const ACTIVE_KEY = "dnd-active-character"

// window.location.reload is non-configurable in jsdom by default — redefine once.
const reload = vi.fn()
Object.defineProperty(window, "location", {
  value: { ...window.location, reload },
  configurable: true,
  writable: true,
})

// Lets work that AuthProvider started without waiting for it run to completion. The storage it
// calls is mocked, so that work settles within microtasks.
const backgroundWork = () => new Promise<void>((resolve) => { setTimeout(resolve) })

// Renders AuthProvider and captures both the onAuthStateChanged callback
// (to simulate login/logout events) and the useAuth() return value.
function renderProvider() {
  let authStateCallback!: (user: User | null) => Promise<void>
  let capturedAuth!: ReturnType<typeof useAuth>

  mockOnAuthStateChanged.mockImplementation((_auth, nextOrObserver) => {
    // The SDK accepts either a callback or an observer object; AuthProvider passes a callback.
    if (typeof nextOrObserver !== "function") throw new Error("Expected AuthProvider to pass onAuthStateChanged a callback")
    // AuthProvider handles the event before this returns its promise; awaiting the promise also
    // waits for the upload the event started, which AuthProvider itself does not wait for.
    authStateCallback = async (user) => {
      nextOrObserver(user)
      await backgroundWork()
    }
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
  mockClearFirestoreCache.mockResolvedValue(undefined)
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

  // e.g. the browser reports a connection but Firestore cannot be reached: the upload never settles
  it("signs in without waiting for the upload", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    mockSaveCharacterToFirebase.mockReturnValue(new Promise(() => {}))
    const { authStateCallback, capturedAuth } = renderProvider()

    expect(capturedAuth.user()).toBeNull()
    void authStateCallback(testUser)

    expect(capturedAuth.user()).toBe(testUser)
    expect(capturedAuth.loading()).toBe(false)
    expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
  })

  // Whatever loads the account's characters in response to the sign-in must find these writes
  // already made.
  it("starts every upload at once, before the sign-in is reported", () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1, char2]))
    const { authStateCallback, capturedAuth } = renderProvider()
    const userWhenUploadStarted: (User | null)[] = []
    mockSaveCharacterToFirebase.mockImplementation(() => {
      userWhenUploadStarted.push(capturedAuth.user())
      return new Promise(() => {})
    })

    void authStateCallback(testUser)

    expect(userWhenUploadStarted).toEqual([null, null])
  })

  describe("when the page is signed out while the upload is still running", () => {
    let finishUpload!: (uploaded: boolean) => void

    beforeEach(() => {
      localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
      mockSaveCharacterToFirebase.mockReturnValue(new Promise((resolve) => { finishUpload = resolve }))
    })

    it("stays signed out, and reloads, once the upload finishes", async () => {
      const { authStateCallback, capturedAuth } = renderProvider()
      void authStateCallback(testUser)

      void authStateCallback(null)
      finishUpload(true)
      await backgroundWork()

      expect(capturedAuth.user()).toBeNull()
      expect(reload).toHaveBeenCalledOnce()
    })

    // Signing out removes the user's data from the device; an upload that then fails must not
    // leave its characters behind for whoever signs in next.
    it("does not put the characters back on a device that signing out has cleared", async () => {
      const { authStateCallback } = renderProvider()
      void authStateCallback(testUser)

      localStorage.clear()
      finishUpload(false)
      await backgroundWork()

      expect(localStorage.getItem(CHARS_KEY)).toBeNull()
    })
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

describe("AuthProvider — a local character that cannot be uploaded on login", () => {
  const storedCharacters = () => JSON.parse(localStorage.getItem(CHARS_KEY) ?? "null")

  it("keeps only the characters whose upload failed, and tells the user how many", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1, char2]))
    mockSaveCharacterToFirebase.mockImplementation(async (character) => character.id === "char-1")
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(storedCharacters()).toEqual([char2])
    expect(mockToast).toHaveBeenCalledExactlyOnceWith({
      title: "Characters not uploaded",
      description: "1 character created on this device could not be added to your account. They are kept on this device and retried the next time the app loads; signing out removes them.",
      variant: "destructive",
    })
  })

  it("counts every character that failed", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1, char2]))
    mockSaveCharacterToFirebase.mockResolvedValue(false)
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(storedCharacters()).toEqual([char1, char2])
    expect(mockToast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ description: expect.stringMatching(/^2 characters created/) }))
  })

  it("still signs the user in", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    mockSaveCharacterToFirebase.mockResolvedValue(false)
    const { authStateCallback, capturedAuth } = renderProvider()

    await authStateCallback(testUser)

    expect(capturedAuth.user()).toBe(testUser)
    expect(capturedAuth.loading()).toBe(false)
  })

  it("says nothing when every character uploads", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1, char2]))
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)

    expect(mockToast).not.toHaveBeenCalled()
  })

  it("retries a character kept from an earlier failure the next time the app loads", async () => {
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    mockSaveCharacterToFirebase.mockResolvedValueOnce(false)
    const first = renderProvider()
    await first.authStateCallback(testUser)
    cleanup()

    const second = renderProvider()
    await second.authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).toHaveBeenCalledTimes(2)
    expect(storedCharacters()).toEqual([])
  })
})

describe("AuthProvider — signing in without a connection", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Firestore would hold the uploads pending while offline; waiting for them would leave the app
  // on its loading screen.
  it("finishes signing in without uploading, leaving local characters for the next load", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    const { authStateCallback, capturedAuth } = renderProvider()

    await authStateCallback(testUser)

    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
    expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
    expect(capturedAuth.user()).toBe(testUser)
    expect(capturedAuth.loading()).toBe(false)
    expect(mockToast).not.toHaveBeenCalled()
  })
})

describe("AuthProvider — unreadable local characters on login", () => {
  it("signs the user in, logs the problem, and leaves the stored data as it was", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    localStorage.setItem(CHARS_KEY, "{not json")
    const { authStateCallback, capturedAuth } = renderProvider()

    await authStateCallback(testUser)

    expect(capturedAuth.user()).toBe(testUser)
    expect(capturedAuth.loading()).toBe(false)
    expect(consoleError).toHaveBeenCalledWith("Failed to read characters stored on this device:", expect.any(SyntaxError))
    expect(localStorage.getItem(CHARS_KEY)).toBe("{not json")
    expect(mockSaveCharacterToFirebase).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("AuthProvider — logout removes the signed-in user's data from the device", () => {
  async function signedIn() {
    const provider = renderProvider()
    await provider.authStateCallback(testUser)
    return provider.capturedAuth
  }

  it("removes every app key that belongs to the user, and keeps the device's own settings", async () => {
    const auth = await signedIn()
    const userKeys = [CHARS_KEY, ACTIVE_KEY, "dnd-tab-config", "dnd-last-synced-char-1", "dnd-collapsible-spells-char-1"]
    for (const key of userKeys) localStorage.setItem(key, "value")
    localStorage.setItem("dnd-terms-accepted", "true")
    localStorage.setItem("theme", "dark")

    await auth.logout()

    for (const key of userKeys) expect(localStorage.getItem(key)).toBeNull()
    expect(localStorage.getItem("dnd-terms-accepted")).toBe("true")
    expect(localStorage.getItem("theme")).toBe("dark")
  })

  // The cache is the step that can fail, so it goes first: nothing else is removed until it has
  // succeeded, and the user is signed out only once everything is gone.
  it("deletes Firestore's offline data first, then the rest of the user's data, then signs out", async () => {
    const auth = await signedIn()
    localStorage.setItem("dnd-tab-config", "value")
    const calls: string[] = []
    const record = (step: string) => { calls.push(`${step}, local data ${localStorage.getItem("dnd-tab-config") == null ? "removed" : "present"}`) }
    mockClearFirestoreCache.mockImplementation(async () => { record("clear cache") })
    mockSignOut.mockImplementation(async () => { record("sign out") })

    await auth.logout()

    expect(calls).toEqual(["clear cache, local data present", "sign out, local data removed"])
  })

  describe("when the offline data cannot be deleted", () => {
    const failure = Object.assign(new Error("another tab holds the cache"), { code: "failed-precondition" })
    let errorSpy: MockInstance<Console["error"]>

    beforeEach(() => {
      mockClearFirestoreCache.mockRejectedValue(failure)
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => {
      errorSpy.mockRestore()
    })

    it("does not sign the user out, so they are never signed out with data left behind", async () => {
      const auth = await signedIn()

      await expect(auth.logout()).rejects.toBe(failure)

      expect(mockSignOut).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith("Sign out error:", failure)
    })

    it("leaves the rest of their data on the device, since they are still signed in", async () => {
      const auth = await signedIn()
      localStorage.setItem("dnd-last-synced-char-1", "value")
      localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))

      await expect(auth.logout()).rejects.toBe(failure)

      expect(localStorage.getItem("dnd-last-synced-char-1")).toBe("value")
      expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
    })
  })

  it("leaves a guest's characters on the device: without an account they exist nowhere else", async () => {
    localStorage.setItem("dnd-skip-auth", "true")
    localStorage.setItem(CHARS_KEY, JSON.stringify([char1]))
    localStorage.setItem("dnd-collapsible-spells-char-1", "[1]")
    // In skip-auth mode AuthProvider never registers onAuthStateChanged, so user() stays null —
    // matching the menu's "Back to Login".
    const { capturedAuth } = renderProvider()

    await capturedAuth.logout()

    expect(localStorage.getItem(CHARS_KEY)).toBe(JSON.stringify([char1]))
    expect(localStorage.getItem("dnd-collapsible-spells-char-1")).toBe("[1]")
    expect(mockClearFirestoreCache).not.toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})

// Signing out deletes Firestore's cache, which shuts Firestore down in every open tab (see
// clearFirestoreCache). A tab that was signed in cannot go on without a reload, whichever tab the
// sign-out came from.
describe("AuthProvider — the page is signed out while it is open", () => {
  it("reloads a page that was signed in", async () => {
    const { authStateCallback, capturedAuth } = renderProvider()
    await authStateCallback(testUser)
    expect(reload).not.toHaveBeenCalled()

    await authStateCallback(null)

    expect(reload).toHaveBeenCalledOnce()
    expect(capturedAuth.user()).toBeNull()
  })

  it("does not reload a page that was never signed in", async () => {
    const { authStateCallback, capturedAuth } = renderProvider()

    await authStateCallback(null)

    expect(reload).not.toHaveBeenCalled()
    expect(capturedAuth.loading()).toBe(false)
  })

  it("does not reload when the signed-in state is reported again", async () => {
    const { authStateCallback } = renderProvider()

    await authStateCallback(testUser)
    await authStateCallback(testUser)

    expect(reload).not.toHaveBeenCalled()
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

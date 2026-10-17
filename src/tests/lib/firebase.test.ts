// setup.tsx mocks this module globally; these tests exercise the real one against a mocked SDK.
vi.unmock("@/lib/firebase")

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "app" })),
}))

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ name: "auth" })),
  connectAuthEmulator: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: vi.fn(),
  initializeFirestore: vi.fn(() => ({ name: "db" })),
  persistentLocalCache: vi.fn((settings) => ({ kind: "persistent", ...settings })),
  persistentMultipleTabManager: vi.fn(() => ({ kind: "persistentMultipleTab" })),
  terminate: vi.fn(),
  clearIndexedDbPersistence: vi.fn(),
}))

describe("firebase", () => {
  beforeEach(() => {
    // firebase.ts initializes when it is first imported, so each test needs a fresh copy
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("hands out the Auth and Firestore instances once initialized", async () => {
    const { getFirebaseAuth, getDb } = await import("@/lib/firebase")

    expect(getFirebaseAuth()).toEqual({ name: "auth" })
    expect(getDb()).toEqual({ name: "db" })
  })

  // One cache and one queue of unsent writes for every open tab: signing out deletes that cache,
  // and the check for unsynced changes has to see the writes made in the other tabs.
  it("keeps its offline cache in a form that every open tab shares", async () => {
    const { initializeFirestore } = await import("firebase/firestore")
    await import("@/lib/firebase")

    expect(initializeFirestore).toHaveBeenCalledWith({ name: "app" }, {
      localCache: { kind: "persistent", tabManager: { kind: "persistentMultipleTab" } },
    })
  })

  it("loads without throwing when initialization fails, and logs the failure", async () => {
    const cause = new Error("auth/invalid-api-key")
    const { initializeApp } = await import("firebase/app")
    vi.mocked(initializeApp).mockImplementation(() => { throw cause })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(import("@/lib/firebase")).resolves.toBeDefined()

    expect(errorSpy).toHaveBeenCalledWith("Firebase initialization error:", cause)
  })

  it("throws the initialization failure from each accessor", async () => {
    const cause = new Error("auth/invalid-api-key")
    const { initializeApp } = await import("firebase/app")
    vi.mocked(initializeApp).mockImplementation(() => { throw cause })
    vi.spyOn(console, "error").mockImplementation(() => {})

    const { getFirebaseAuth, getDb } = await import("@/lib/firebase")

    expect(() => getFirebaseAuth()).toThrow("Firebase is unavailable because it failed to initialize")
    expect(() => getDb()).toThrow("Firebase is unavailable because it failed to initialize")
    expect(() => getDb()).toThrow(expect.objectContaining({ cause }))
  })

  describe("clearFirestoreCache", () => {
    it("shuts Firestore down and then deletes its offline data, in that order", async () => {
      const { terminate, clearIndexedDbPersistence } = await import("firebase/firestore")
      const calls: string[] = []
      vi.mocked(terminate).mockImplementation(async () => { calls.push("terminate") })
      vi.mocked(clearIndexedDbPersistence).mockImplementation(async () => { calls.push("clear") })
      const { clearFirestoreCache } = await import("@/lib/firebase")

      await clearFirestoreCache()

      expect(calls).toEqual(["terminate", "clear"])
      expect(terminate).toHaveBeenCalledWith({ name: "db" })
      expect(clearIndexedDbPersistence).toHaveBeenCalledWith({ name: "db" })
    })

    it("rejects with Firestore's error when the offline data cannot be deleted", async () => {
      const { terminate, clearIndexedDbPersistence } = await import("firebase/firestore")
      const failure = Object.assign(new Error("another tab holds the cache"), { code: "failed-precondition" })
      vi.mocked(terminate).mockResolvedValue(undefined)
      vi.mocked(clearIndexedDbPersistence).mockRejectedValue(failure)
      const { clearFirestoreCache } = await import("@/lib/firebase")

      await expect(clearFirestoreCache()).rejects.toBe(failure)
    })

    it("does not try to delete anything when Firestore could not be shut down", async () => {
      const { terminate, clearIndexedDbPersistence } = await import("firebase/firestore")
      const failure = new Error("terminate failed")
      vi.mocked(terminate).mockRejectedValue(failure)
      vi.mocked(clearIndexedDbPersistence).mockClear()
      const { clearFirestoreCache } = await import("@/lib/firebase")

      await expect(clearFirestoreCache()).rejects.toBe(failure)
      expect(clearIndexedDbPersistence).not.toHaveBeenCalled()
    })

    it("rejects with the initialization failure when Firebase never started", async () => {
      const { initializeApp } = await import("firebase/app")
      vi.mocked(initializeApp).mockImplementation(() => { throw new Error("auth/invalid-api-key") })
      vi.spyOn(console, "error").mockImplementation(() => {})
      const { clearFirestoreCache } = await import("@/lib/firebase")

      await expect(clearFirestoreCache()).rejects.toThrow("Firebase is unavailable because it failed to initialize")
    })
  })

  // The e2e tests run against the Firebase Local Emulator Suite (see firebase.json).
  describe("emulators", () => {
    async function connectCalls() {
      const { connectAuthEmulator } = await import("firebase/auth")
      const { connectFirestoreEmulator } = await import("firebase/firestore")
      return { connectAuthEmulator, connectFirestoreEmulator }
    }

    beforeEach(async () => {
      const { connectAuthEmulator, connectFirestoreEmulator } = await connectCalls()
      vi.mocked(connectAuthEmulator).mockClear()
      vi.mocked(connectFirestoreEmulator).mockClear()
    })

    it("connects Auth and Firestore to the emulators when asked to on the dev server", async () => {
      vi.stubEnv("DEV", true)
      vi.stubEnv("VITE_FIREBASE_EMULATORS", "true")
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-tabulapersonae")
      const { connectAuthEmulator, connectFirestoreEmulator } = await connectCalls()
      const { getDb } = await import("@/lib/firebase")

      expect(getDb()).toEqual({ name: "db" })
      expect(connectAuthEmulator).toHaveBeenCalledWith({ name: "auth" }, "http://127.0.0.1:9099", { disableWarnings: true })
      expect(connectFirestoreEmulator).toHaveBeenCalledWith({ name: "db" }, "127.0.0.1", 8080)
    })

    it("connects to the real services when the emulators are not asked for", async () => {
      vi.stubEnv("DEV", true)
      vi.stubEnv("VITE_FIREBASE_EMULATORS", "")
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-tabulapersonae")
      const { connectAuthEmulator, connectFirestoreEmulator } = await connectCalls()
      await import("@/lib/firebase")

      expect(connectAuthEmulator).not.toHaveBeenCalled()
      expect(connectFirestoreEmulator).not.toHaveBeenCalled()
    })

    it("never connects to the emulators outside the dev server, even when asked to", async () => {
      vi.stubEnv("DEV", false)
      vi.stubEnv("VITE_FIREBASE_EMULATORS", "true")
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-tabulapersonae")
      const { connectAuthEmulator, connectFirestoreEmulator } = await connectCalls()
      await import("@/lib/firebase")

      expect(connectAuthEmulator).not.toHaveBeenCalled()
      expect(connectFirestoreEmulator).not.toHaveBeenCalled()
    })

    it("refuses to start with a project id that is not a demo- project, connecting nothing", async () => {
      vi.stubEnv("DEV", true)
      vi.stubEnv("VITE_FIREBASE_EMULATORS", "true")
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "tabulapersonae-prod")
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const { connectAuthEmulator, connectFirestoreEmulator } = await connectCalls()
      const { getDb } = await import("@/lib/firebase")

      expect(() => getDb()).toThrow("Firebase is unavailable because it failed to initialize")
      expect(errorSpy).toHaveBeenCalledWith("Firebase initialization error:", expect.objectContaining({
        message: expect.stringContaining("demo- project id"),
      }))
      expect(connectAuthEmulator).not.toHaveBeenCalled()
      expect(connectFirestoreEmulator).not.toHaveBeenCalled()
    })
  })
})

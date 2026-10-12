// setup.tsx mocks this module globally; these tests exercise the real one against a mocked SDK.
vi.unmock("@/lib/firebase")

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "app" })),
}))

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ name: "auth" })),
}))

vi.mock("firebase/firestore", () => ({
  initializeFirestore: vi.fn(() => ({ name: "db" })),
  persistentLocalCache: vi.fn(() => ({})),
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
  })

  it("hands out the Auth and Firestore instances once initialized", async () => {
    const { getFirebaseAuth, getDb } = await import("@/lib/firebase")

    expect(getFirebaseAuth()).toEqual({ name: "auth" })
    expect(getDb()).toEqual({ name: "db" })
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
})

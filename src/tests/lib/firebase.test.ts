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
})

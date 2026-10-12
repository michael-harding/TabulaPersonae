// Unmock the real implementation (setup.ts mocks this globally)
vi.unmock("@/lib/storage-manager")

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/lib/firebase-storage", () => ({
  saveCharacterToFirebase: vi.fn(),
  getCharactersFromFirebase: vi.fn(),
  getCharacterFromFirebase: vi.fn(),
  deleteCharacterFromFirebase: vi.fn(),
}))

import { createRoot } from "solid-js"

import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import {
  saveCharacterToFirebase,
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  deleteCharacterFromFirebase,
} from "@/lib/firebase-storage"
import { createDefaultCharacter } from "@/lib/character-types"

import { createMockAuth, createTestUser } from "../mocks/auth"

const mockUseAuth = vi.mocked(useAuth)
const mockSaveToFirebase = vi.mocked(saveCharacterToFirebase)
const mockGetFromFirebase = vi.mocked(getCharactersFromFirebase)
const mockGetOneFromFirebase = vi.mocked(getCharacterFromFirebase)
const mockDeleteFromFirebase = vi.mocked(deleteCharacterFromFirebase)

const testCharacter = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const testUser = createTestUser({ uid: "user-123" })

const STORAGE_KEY = "dnd-characters"

function renderManager() {
  let manager!: ReturnType<ReturnType<typeof useStorageManager>>
  createRoot(() => {
    manager = useStorageManager()()
  })
  return manager
}

function storedCharacters() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

describe("useStorageManager — unauthenticated (user: null)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUseAuth.mockReturnValue(createMockAuth())
  })

  it("getCharacters reads from localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
    const manager = renderManager()
    const result = await manager.getCharacters()
    expect(result).toEqual([testCharacter])
    expect(mockGetFromFirebase).not.toHaveBeenCalled()
  })

  it("saveCharacter writes to localStorage", async () => {
    const manager = renderManager()
    const ok = await manager.saveCharacter(testCharacter)
    expect(ok).toBe(true)
    expect(storedCharacters()).toEqual([testCharacter])
    expect(mockSaveToFirebase).not.toHaveBeenCalled()
  })

  it("saveCharacter updates an existing character in localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
    const updated = { ...testCharacter, name: "Thorin Updated" }
    const manager = renderManager()
    await manager.saveCharacter(updated)
    expect(storedCharacters()).toEqual([updated])
  })

  it("deleteCharacter removes from localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
    const manager = renderManager()
    const ok = await manager.deleteCharacter("char-1")
    expect(ok).toBe(true)
    expect(storedCharacters()).toEqual([])
    expect(mockDeleteFromFirebase).not.toHaveBeenCalled()
  })

  it("getCharacters returns [] when the stored data is not valid JSON", async () => {
    localStorage.setItem(STORAGE_KEY, "{not json")
    const manager = renderManager()
    expect(await manager.getCharacters()).toEqual([])
  })

  it("getCharacter finds a stored character by id", async () => {
    const other = { ...testCharacter, id: "char-2", name: "Gandalf" }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter, other]))
    const manager = renderManager()
    expect(await manager.getCharacter("char-2")).toEqual(other)
    expect(mockGetOneFromFirebase).not.toHaveBeenCalled()
  })

  it("getCharacter returns null for an id that is not stored", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
    const manager = renderManager()
    expect(await manager.getCharacter("missing")).toBeNull()
  })

  describe("when localStorage refuses the write", () => {
    const quotaError = new Error("QuotaExceededError")

    beforeEach(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw quotaError })
      vi.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("saveCharacter reports failure and logs, keeping what was stored", async () => {
      const manager = renderManager()
      expect(await manager.saveCharacter({ ...testCharacter, name: "Thorin Updated" })).toBe(false)
      expect(console.error).toHaveBeenCalledWith("Failed to save character to localStorage:", quotaError)
      expect(storedCharacters()).toEqual([testCharacter])
    })

    it("deleteCharacter reports failure and logs, keeping what was stored", async () => {
      const manager = renderManager()
      expect(await manager.deleteCharacter("char-1")).toBe(false)
      expect(console.error).toHaveBeenCalledWith("Failed to delete character from localStorage:", quotaError)
      expect(storedCharacters()).toEqual([testCharacter])
    })
  })

  it("syncToFirebase returns false when not authenticated", async () => {
    const manager = renderManager()
    const result = await manager.syncToFirebase()
    expect(result).toBe(false)
    expect(mockSaveToFirebase).not.toHaveBeenCalled()
  })

  it("storageType is 'local' and isAuthenticated is false", () => {
    const manager = renderManager()
    expect(manager.storageType).toBe("local")
    expect(manager.isAuthenticated).toBe(false)
  })

  it("getCharacters backfills useCalculatedArmorClass to true for a legacy character missing the key when its stored AC already matches the calculated AC", async () => {
    const legacy = { ...testCharacter }
    delete legacy.useCalculatedArmorClass
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacy]))
    const manager = renderManager()
    const result = await manager.getCharacters()
    expect(result[0].useCalculatedArmorClass).toBe(true)
  })
})

describe("useStorageManager — authenticated (user present)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUseAuth.mockReturnValue(createMockAuth({ user: () => testUser }))
    mockSaveToFirebase.mockResolvedValue(true)
    mockGetFromFirebase.mockResolvedValue([testCharacter])
    mockDeleteFromFirebase.mockResolvedValue(true)
  })

  it("saveCharacter calls saveCharacterToFirebase with uid", async () => {
    const manager = renderManager()
    await manager.saveCharacter(testCharacter)
    expect(mockSaveToFirebase).toHaveBeenCalledWith(testCharacter, "user-123")
  })

  it("getCharacters calls getCharactersFromFirebase with uid", async () => {
    const manager = renderManager()
    const result = await manager.getCharacters()
    expect(mockGetFromFirebase).toHaveBeenCalledWith("user-123")
    expect(result).toEqual([testCharacter])
  })

  it("getCharacter calls getCharacterFromFirebase with id and uid, not localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...testCharacter, name: "Local copy" }]))
    mockGetOneFromFirebase.mockResolvedValue(testCharacter)
    const manager = renderManager()
    expect(await manager.getCharacter("char-1")).toEqual(testCharacter)
    expect(mockGetOneFromFirebase).toHaveBeenCalledWith("char-1", "user-123")
  })

  it("deleteCharacter calls deleteCharacterFromFirebase with id", async () => {
    const manager = renderManager()
    await manager.deleteCharacter("char-1")
    expect(mockDeleteFromFirebase).toHaveBeenCalledWith("char-1")
  })

  it("storageType is 'firebase' and isAuthenticated is true", () => {
    const manager = renderManager()
    expect(manager.storageType).toBe("firebase")
    expect(manager.isAuthenticated).toBe(true)
  })

  describe("syncToFirebase", () => {
    it("copies local characters to Firebase and clears localStorage", async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
      const manager = renderManager()
      const result = await manager.syncToFirebase()
      expect(result).toBe(true)
      expect(mockSaveToFirebase).toHaveBeenCalledWith(testCharacter, "user-123")
      expect(localStorage.getItem(STORAGE_KEY)).toBe("[]")
    })

    it("returns false and does not clear localStorage when Firebase throws", async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([testCharacter]))
      mockSaveToFirebase.mockRejectedValueOnce(new Error("network error"))
      const manager = renderManager()
      const result = await manager.syncToFirebase()
      expect(result).toBe(false)
      // localStorage should NOT be cleared on failure
      expect(localStorage.getItem(STORAGE_KEY)).not.toBe("[]")
    })

    it("returns true with no local characters to sync", async () => {
      const manager = renderManager()
      const result = await manager.syncToFirebase()
      expect(result).toBe(true)
      expect(mockSaveToFirebase).not.toHaveBeenCalled()
    })
  })
})

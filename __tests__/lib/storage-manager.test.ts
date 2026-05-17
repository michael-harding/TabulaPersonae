// Unmock the real implementation (jest.setup.js mocks this globally)
jest.unmock("@/lib/storage-manager")

jest.mock("@/lib/auth-context", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/lib/firebase-storage", () => ({
  saveCharacterToFirebase: jest.fn(),
  getCharactersFromFirebase: jest.fn(),
  getCharacterFromFirebase: jest.fn(),
  deleteCharacterFromFirebase: jest.fn(),
}))

import { renderHook } from "@testing-library/react"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import {
  saveCharacterToFirebase,
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  deleteCharacterFromFirebase,
} from "@/lib/firebase-storage"
import { createDefaultCharacter } from "@/lib/character-types"

const mockUseAuth = jest.mocked(useAuth)
const mockSaveToFirebase = jest.mocked(saveCharacterToFirebase)
const mockGetFromFirebase = jest.mocked(getCharactersFromFirebase)
const mockDeleteFromFirebase = jest.mocked(deleteCharacterFromFirebase)

const testCharacter = { ...createDefaultCharacter(), id: "char-1", name: "Thorin" }
const testUser = { uid: "user-123" } as any

const STORAGE_KEY = "dnd-characters"

function renderManager() {
  return renderHook(() => useStorageManager()).result.current
}

function storedCharacters() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

describe("useStorageManager — unauthenticated (user: null)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      skipAuth: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
    })
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
})

describe("useStorageManager — authenticated (user present)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      user: testUser,
      loading: false,
      skipAuth: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
    })
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

  it("deleteCharacter calls deleteCharacterFromFirebase with id and uid", async () => {
    const manager = renderManager()
    await manager.deleteCharacter("char-1")
    expect(mockDeleteFromFirebase).toHaveBeenCalledWith("char-1", "user-123")
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

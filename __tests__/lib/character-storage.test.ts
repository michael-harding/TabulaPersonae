import {
  saveCharacter,
  getCharacters,
  loadCharacters,
  getCharacter,
  deleteCharacter,
  getActiveCharacter,
  setActiveCharacter,
} from "../../lib/character-storage"
import { createDefaultCharacter } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

describe("Character Storage", () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe("saveCharacter", () => {
    it("should save a new character to localStorage", () => {
      const character = createDefaultCharacter()
      character.name = "Test Character"

      saveCharacter(character)

      expect(localStorageMock.setItem).toHaveBeenCalledWith("dnd-characters", JSON.stringify([character]))
    })

    it("should update an existing character", () => {
      const character = createDefaultCharacter()
      character.name = "Test Character"

      // Save initial character
      saveCharacter(character)

      // Update character
      character.name = "Updated Character"
      saveCharacter(character)

      const characters = getCharacters()
      expect(characters).toHaveLength(1)
      expect(characters[0].name).toBe("Updated Character")
    })

    it("should add multiple characters", () => {
      const character1 = createDefaultCharacter()
      character1.name = "Character 1"

      const character2 = createDefaultCharacter()
      character2.name = "Character 2"

      saveCharacter(character1)
      saveCharacter(character2)

      const characters = getCharacters()
      expect(characters).toHaveLength(2)
      expect(characters.map((c) => c.name)).toEqual(["Character 1", "Character 2"])
    })
  })

  describe("getCharacters", () => {
    it("should return empty array when no characters exist", () => {
      const characters = getCharacters()
      expect(characters).toEqual([])
    })

    it("should return characters from localStorage", () => {
      const character = createDefaultCharacter()
      character.name = "Test Character"

      localStorageMock.setItem("dnd-characters", JSON.stringify([character]))

      const characters = getCharacters()
      expect(characters).toHaveLength(1)
      expect(characters[0].name).toBe("Test Character")
    })

    it("should handle corrupted localStorage data", () => {
      localStorageMock.setItem("dnd-characters", "invalid json")

      const characters = getCharacters()
      expect(characters).toEqual([])
    })

    it("should return empty array in server environment", () => {
      // Mock server environment
      const originalWindow = global.window
      delete (global as any).window

      const characters = getCharacters()
      expect(characters).toEqual([])

      // Restore window
      global.window = originalWindow
    })
  })

  describe("loadCharacters", () => {
    it("should be an alias for getCharacters", () => {
      const character = createDefaultCharacter()
      saveCharacter(character)

      const characters1 = getCharacters()
      const characters2 = loadCharacters()

      expect(characters1).toEqual(characters2)
    })
  })

  describe("getCharacter", () => {
    it("should return character by id", () => {
      const character = createDefaultCharacter()
      character.name = "Test Character"
      saveCharacter(character)

      const foundCharacter = getCharacter(character.id)
      expect(foundCharacter).toEqual(character)
    })

    it("should return null for non-existent character", () => {
      const foundCharacter = getCharacter("non-existent-id")
      expect(foundCharacter).toBeNull()
    })
  })

  describe("deleteCharacter", () => {
    it("should remove character by id", () => {
      const character1 = createDefaultCharacter()
      character1.name = "Character 1"

      const character2 = createDefaultCharacter()
      character2.name = "Character 2"

      saveCharacter(character1)
      saveCharacter(character2)

      deleteCharacter(character1.id)

      const characters = getCharacters()
      expect(characters).toHaveLength(1)
      expect(characters[0].name).toBe("Character 2")
    })

    it("should handle deleting non-existent character", () => {
      const character = createDefaultCharacter()
      saveCharacter(character)

      deleteCharacter("non-existent-id")

      const characters = getCharacters()
      expect(characters).toHaveLength(1)
    })
  })

  describe("Active Character Management", () => {
    describe("getActiveCharacter", () => {
      it("should return null when no active character is set", () => {
        const activeId = getActiveCharacter()
        expect(activeId).toBeNull()
      })

      it("should return active character id from localStorage", () => {
        const characterId = "test-character-id"
        localStorageMock.setItem("dnd-active-character", characterId)

        const activeId = getActiveCharacter()
        expect(activeId).toBe(characterId)
      })

      it("should return null in server environment", () => {
        // Mock server environment
        const originalWindow = global.window
        delete (global as any).window

        const activeId = getActiveCharacter()
        expect(activeId).toBeNull()

        // Restore window
        global.window = originalWindow
      })
    })

    describe("setActiveCharacter", () => {
      it("should set active character id in localStorage", () => {
        const characterId = "test-character-id"

        setActiveCharacter(characterId)

        expect(localStorageMock.setItem).toHaveBeenCalledWith("dnd-active-character", characterId)
      })
    })
  })
})

import { render, screen, fireEvent, waitFor } from "../test-utils"
import CharacterSheetApp from "../../app/page"
import { createDefaultCharacter, type Character } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "mock-uuid-123"),
  },
})

// Mock window.confirm
Object.defineProperty(window, "confirm", {
  writable: true,
  value: jest.fn(() => true),
})

// Mock sonner toast (virtual — package not installed)
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }), { virtual: true })

describe("CharacterSheetApp Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.mockStorageManager.getCharacters.mockResolvedValue([])
    global.mockStorageManager.saveCharacter.mockResolvedValue(true)
    global.mockStorageManager.deleteCharacter.mockResolvedValue(true)
    global.mockRouter.push.mockClear()
    ;(window.confirm as jest.Mock).mockReturnValue(true)
  })

  describe("Initial App State", () => {
    it("shows loading state initially", () => {
      render(<CharacterSheetApp />)
      expect(screen.getByText("Loading your characters...")).toBeInTheDocument()
    })

    it("shows empty state when no characters exist", async () => {
      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
        expect(screen.getByText("Create Your First Character")).toBeInTheDocument()
      })
    })

    it("shows character selection when characters exist but none active", async () => {
      const testCharacter: Character = {
        ...createDefaultCharacter(),
        id: "char-1",
        name: "Test Character",
        race: "Human",
        class: "Fighter",
        level: 5,
      }
      global.mockStorageManager.getCharacters.mockResolvedValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Test Character")).toBeInTheDocument()
        expect(screen.getByText("Level 5 Human Fighter")).toBeInTheDocument()
        expect(screen.getByText("Create New Character")).toBeInTheDocument()
      })
    })
  })

  describe("Character Creation Workflow", () => {
    it("creates a new character and navigates to character sheet", async () => {
      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Create Your First Character")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Create Your First Character"))

      await waitFor(() => {
        expect(global.mockStorageManager.saveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.any(String) }),
        )
        expect(global.mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("/character/"),
        )
      })
    })

    it("creates additional characters from character list", async () => {
      const existingCharacter: Character = { ...createDefaultCharacter(), id: "existing", name: "Existing Character" }
      global.mockStorageManager.getCharacters.mockResolvedValue([existingCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Create New Character")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Create New Character"))

      await waitFor(() => {
        expect(global.mockStorageManager.saveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.any(String) }),
        )
      })
    })
  })

  describe("Character Selection and Navigation", () => {
    it("selects a character and navigates to character sheet", async () => {
      const testCharacter: Character = {
        ...createDefaultCharacter(),
        id: "char-nav",
        name: "Navigator",
        race: "Elf",
        class: "Wizard",
        level: 3,
      }
      global.mockStorageManager.getCharacters.mockResolvedValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Navigator")).toBeInTheDocument()
      })

      // Character cards are Links — verify the link href points to the character page
      const characterLink = screen.getByText("Navigator").closest("a")
      expect(characterLink).toHaveAttribute("href", `/character/char-nav`)
    })
  })

  describe("Character Deletion Workflow", () => {
    it("deletes a character with confirmation", async () => {
      const testCharacter: Character = {
        ...createDefaultCharacter(),
        id: "del-char",
        name: "Deletable",
      }
      global.mockStorageManager.getCharacters.mockResolvedValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Deletable")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete deletable/i }))

      await waitFor(() => {
        expect(global.mockStorageManager.deleteCharacter).toHaveBeenCalledWith("del-char")
      })
    })

    it("cancels character deletion when user declines", async () => {
      ;(window.confirm as jest.Mock).mockReturnValue(false)

      const testCharacter: Character = {
        ...createDefaultCharacter(),
        id: "keep-char",
        name: "Keeper",
      }
      global.mockStorageManager.getCharacters.mockResolvedValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Keeper")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete keeper/i }))

      await waitFor(() => {
        expect(global.mockStorageManager.deleteCharacter).not.toHaveBeenCalled()
        expect(screen.getByText("Keeper")).toBeInTheDocument()
      })
    })
  })

  describe("Import/Export Integration", () => {
    it("renders import and export buttons", async () => {
      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
      })

      expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
    })
  })

  describe("Theme Integration", () => {
    it("renders the D&D Character Sheet title on the home page", async () => {
      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
      })
    })
  })

  describe("Error Handling", () => {
    it("handles storage errors gracefully and still renders", async () => {
      global.mockStorageManager.getCharacters.mockRejectedValue(new Error("Storage error"))

      render(<CharacterSheetApp />)

      // App should not crash; after error it finishes loading
      await waitFor(() => {
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
      })
    })
  })
})

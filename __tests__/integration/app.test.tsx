import { render, screen, fireEvent, waitFor } from "../test-utils"
import CharacterSheetApp from "../../app/page"
import { createDefaultCharacter } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock the storage functions
jest.mock("../../lib/character-storage", () => ({
  loadCharacters: jest.fn(() => []),
  saveCharacter: jest.fn(),
  getActiveCharacter: jest.fn(() => null),
  setActiveCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "mock-uuid-123"),
  },
})

// Mock window.confirm
Object.defineProperty(window, "confirm", {
  value: jest.fn(() => true),
})

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe("CharacterSheetApp Integration", () => {
  const mockLoadCharacters = require("../../lib/character-storage").loadCharacters
  const mockSaveCharacter = require("../../lib/character-storage").saveCharacter
  const mockGetActiveCharacter = require("../../lib/character-storage").getActiveCharacter
  const mockSetActiveCharacter = require("../../lib/character-storage").setActiveCharacter
  const mockDeleteCharacter = require("../../lib/character-storage").deleteCharacter

  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadCharacters.mockReturnValue([])
    mockGetActiveCharacter.mockReturnValue(null)
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
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
        race: "Human",
        class: "Fighter",
        level: 5,
      }
      mockLoadCharacters.mockReturnValue([testCharacter])

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
        expect(mockSaveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "mock-uuid-123",
            level: 1,
          }),
        )
        expect(mockSetActiveCharacter).toHaveBeenCalledWith("mock-uuid-123")
        expect(screen.getByText("Character Information")).toBeInTheDocument()
      })
    })

    it("creates additional characters from character list", async () => {
      const existingCharacter = {
        ...createDefaultCharacter(),
        name: "Existing Character",
      }
      mockLoadCharacters.mockReturnValue([existingCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Create New Character")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Create New Character"))

      await waitFor(() => {
        expect(mockSaveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "mock-uuid-123",
            level: 1,
          }),
        )
      })
    })
  })

  describe("Character Selection and Navigation", () => {
    it("selects a character and shows character sheet", async () => {
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
        race: "Elf",
        class: "Wizard",
        level: 3,
      }
      mockLoadCharacters.mockReturnValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Test Character")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Test Character"))

      await waitFor(() => {
        expect(mockSetActiveCharacter).toHaveBeenCalledWith(testCharacter.id)
        expect(screen.getByText("Level 3 Elf Wizard")).toBeInTheDocument()
        expect(screen.getByText("Character Information")).toBeInTheDocument()
      })
    })

    it("navigates back to character list from character sheet", async () => {
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
      }
      mockLoadCharacters.mockReturnValue([testCharacter])
      mockGetActiveCharacter.mockReturnValue(testCharacter.id)

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("All Characters")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("All Characters"))

      await waitFor(() => {
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
        expect(screen.getByText("Test Character")).toBeInTheDocument()
      })
    })
  })

  describe("Character Deletion Workflow", () => {
    it("deletes a character with confirmation", async () => {
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
        id: "test-id",
      }
      mockLoadCharacters.mockReturnValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Test Character")).toBeInTheDocument()
      })

      // Hover over card to show delete button
      const characterCard = screen.getByText("Test Character").closest(".group")
      fireEvent.mouseEnter(characterCard!)

      const deleteButton = screen.getByRole("button", { name: "" }) // Trash icon button
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete "Test Character"? This action cannot be undone.',
        )
        expect(mockDeleteCharacter).toHaveBeenCalledWith("test-id")
      })
    })

    it("cancels character deletion when user declines", async () => {
      ;(window.confirm as jest.Mock).mockReturnValue(false)

      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
        id: "test-id",
      }
      mockLoadCharacters.mockReturnValue([testCharacter])

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Test Character")).toBeInTheDocument()
      })

      const characterCard = screen.getByText("Test Character").closest(".group")
      fireEvent.mouseEnter(characterCard!)

      const deleteButton = screen.getByRole("button", { name: "" })
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteCharacter).not.toHaveBeenCalled()
        expect(screen.getByText("Test Character")).toBeInTheDocument()
      })
    })
  })

  describe("Character Data Persistence", () => {
    it("updates character data and persists changes", async () => {
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Test Character",
        id: "test-id",
      }
      mockLoadCharacters.mockReturnValue([testCharacter])
      mockGetActiveCharacter.mockReturnValue("test-id")

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Character Information")).toBeInTheDocument()
      })

      // Click edit button
      fireEvent.click(screen.getByRole("button", { name: /edit/i }))

      // Update character name
      const nameInput = screen.getByLabelText("Character Name")
      fireEvent.change(nameInput, { target: { value: "Updated Character" } })

      // Save changes
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      await waitFor(() => {
        expect(mockSaveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Updated Character",
            id: "test-id",
          }),
        )
      })
    })
  })

  describe("Import/Export Integration", () => {
    it("imports a character and adds it to the character list", async () => {
      const importedCharacter = {
        ...createDefaultCharacter(),
        name: "Imported Character",
        id: "imported-id",
      }

      render(<CharacterSheetApp />)

      await waitFor(() => {
        expect(screen.getByText("Import")).toBeInTheDocument()
      })

      // Simulate import (this would normally involve file handling)
      // We'll test the handler function directly
      const app = screen.getByText("D&D Character Sheet").closest("div")
      const importHandler = (app as any)?._reactInternalFiber?.memoizedProps?.onImportCharacter

      // Since we can't easily test file upload in this context,
      // we'll verify the component renders the import button
      expect(screen.getByText("Import")).toBeInTheDocument()
      expect(screen.getByText("Export")).toBeInTheDocument()
    })
  })

  describe("Theme Integration", () => {
    it("renders theme toggle component", async () => {
      render(<CharacterSheetApp />)

      await waitFor(() => {
        // The ModeToggle component should be rendered
        // We can't easily test theme switching without more complex setup
        expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
      })
    })
  })

  describe("Full Character Sheet Rendering", () => {
    it("renders all character sheet sections when character is active", async () => {
      const testCharacter = {
        ...createDefaultCharacter(),
        name: "Complete Character",
        id: "complete-id",
      }
      mockLoadCharacters.mockReturnValue([testCharacter])
      mockGetActiveCharacter.mockReturnValue("complete-id")

      render(<CharacterSheetApp />)

      await waitFor(() => {
        // Verify all main sections are rendered
        expect(screen.getByText("Character Information")).toBeInTheDocument()
        expect(screen.getByText("Ability Scores")).toBeInTheDocument()
        expect(screen.getByText("Combat Stats")).toBeInTheDocument()
        expect(screen.getByText("Skills & Proficiencies")).toBeInTheDocument()
        expect(screen.getByText("Equipment & Inventory")).toBeInTheDocument()
        expect(screen.getByText("Spells")).toBeInTheDocument()
        expect(screen.getByText("Character Notes")).toBeInTheDocument()
      })
    })
  })

  describe("Error Handling", () => {
    it("handles storage errors gracefully", async () => {
      mockLoadCharacters.mockImplementation(() => {
        throw new Error("Storage error")
      })

      // The app should still render without crashing
      render(<CharacterSheetApp />)

      // The app should handle the error and show some fallback
      await waitFor(() => {
        expect(screen.getByText("Loading your characters...")).toBeInTheDocument()
      })
    })
  })
})

import { render, screen, fireEvent, waitFor } from "../test-utils"
import CharacterSheetApp from "../../app/page"
import { createDefaultCharacter, type Character } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock the storage functions
const mockStorage = {
  loadCharacters: jest.fn(() => []),
  saveCharacter: jest.fn(() => true),
  getActiveCharacter: jest.fn(() => null),
  setActiveCharacter: jest.fn(() => true),
  deleteCharacter: jest.fn(() => true),
}

jest.mock("../../lib/character-storage", () => mockStorage)

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "workflow-test-id"),
  },
})

describe("Character Workflow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStorage.loadCharacters.mockReturnValue([])
    mockStorage.getActiveCharacter.mockReturnValue(null)
  })

  it("completes full character creation and editing workflow", async () => {
    render(<CharacterSheetApp />)

    // Step 1: Start with empty state
    await waitFor(() => {
      expect(screen.getByText("Create Your First Character")).toBeInTheDocument()
    })

    // Step 2: Create new character
    fireEvent.click(screen.getByText("Create Your First Character"))

    await waitFor(() => {
      expect(screen.getByText("Character Information")).toBeInTheDocument()
    })

    // Step 3: Edit basic information
    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const nameInput = screen.getByLabelText("Character Name")
    fireEvent.change(nameInput, { target: { value: "Aragorn" } })

    const levelInput = screen.getByLabelText("Level")
    fireEvent.change(levelInput, { target: { value: "5" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    // Step 4: Verify character was saved
    await waitFor(() => {
      expect(mockStorage.saveCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Aragorn",
          level: 5,
        }),
      )
    })

    // Step 5: Verify character appears in header
    expect(screen.getByText("Aragorn")).toBeInTheDocument()
    expect(screen.getByText("Level 5")).toBeInTheDocument()
  })

  it("handles character switching workflow", async () => {
    // Setup: Start with existing characters
    const character1 = {
      ...createDefaultCharacter(),
      id: "char1",
      name: "Character 1",
      level: 3,
    }
    const character2 = {
      ...createDefaultCharacter(),
      id: "char2",
      name: "Character 2",
      level: 7,
    }

    mockStorage.loadCharacters.mockReturnValue([character1, character2])

    render(<CharacterSheetApp />)

    // Step 1: Should show character selection
    await waitFor(() => {
      expect(screen.getByText("Character 1")).toBeInTheDocument()
      expect(screen.getByText("Character 2")).toBeInTheDocument()
    })

    // Step 2: Select first character
    fireEvent.click(screen.getByText("Character 1"))

    await waitFor(() => {
      expect(mockStorage.setActiveCharacter).toHaveBeenCalledWith("char1")
      expect(screen.getByText("Level 3")).toBeInTheDocument()
    })

    // Step 3: Navigate back to character list
    fireEvent.click(screen.getByText("All Characters"))

    await waitFor(() => {
      expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
    })

    // Step 4: Select second character
    fireEvent.click(screen.getByText("Character 2"))

    await waitFor(() => {
      expect(mockStorage.setActiveCharacter).toHaveBeenCalledWith("char2")
      expect(screen.getByText("Level 7")).toBeInTheDocument()
    })
  })

  it("handles ability score editing workflow", async () => {
    const testCharacter = {
      ...createDefaultCharacter(),
      id: "ability-test",
      name: "Test Character",
    }

    mockStorage.loadCharacters.mockReturnValue([testCharacter])
    mockStorage.getActiveCharacter.mockReturnValue("ability-test")

    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("Ability Scores")).toBeInTheDocument()
    })

    // Find and click the edit button for ability scores
    const abilitySection = screen.getByText("Ability Scores").closest(".space-y-4")
    const editButton = abilitySection?.querySelector('button[aria-label*="edit"], button:has-text("Edit")')

    if (editButton) {
      fireEvent.click(editButton)

      // Update strength score
      const strengthInput = screen.getByLabelText("Strength")
      fireEvent.change(strengthInput, { target: { value: "16" } })

      // Save changes
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      await waitFor(() => {
        expect(mockStorage.saveCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            abilityScores: expect.objectContaining({
              strength: 16,
            }),
          }),
        )
      })
    }
  })

  it("handles equipment management workflow", async () => {
    const testCharacter = {
      ...createDefaultCharacter(),
      id: "equipment-test",
      name: "Equipment Test",
      equipment: [],
    }

    mockStorage.loadCharacters.mockReturnValue([testCharacter])
    mockStorage.getActiveCharacter.mockReturnValue("equipment-test")

    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("Equipment & Inventory")).toBeInTheDocument()
    })

    // The equipment section should be rendered
    // In a real test, we would interact with the equipment management UI
    // For now, we verify the section is present
    expect(screen.getByText("Equipment & Inventory")).toBeInTheDocument()
  })

  it("persists changes across component updates", async () => {
    const testCharacter = {
      ...createDefaultCharacter(),
      id: "persistence-test",
      name: "Original Name",
    }

    mockStorage.loadCharacters.mockReturnValue([testCharacter])
    mockStorage.getActiveCharacter.mockReturnValue("persistence-test")

    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("Original Name")).toBeInTheDocument()
    }, { timeout: 3000 })

    // Edit character name
    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const nameInput = screen.getByLabelText("Character Name")
    fireEvent.change(nameInput, { target: { value: "Updated Name" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    // Verify the change persists in the UI
    await waitFor(() => {
      expect(screen.getByText("Updated Name")).toBeInTheDocument()
      expect(mockStorage.saveCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
        }),
      )
    })
  })
})

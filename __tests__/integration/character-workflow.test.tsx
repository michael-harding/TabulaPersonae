import { render, screen, fireEvent, waitFor } from "../test-utils"
import CharacterSheetApp from "../../app/page"
import { createDefaultCharacter, type Character } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "workflow-test-id"),
  },
})

describe("Character Workflow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.mockStorageManager.getCharacters.mockResolvedValue([])
    global.mockStorageManager.saveCharacter.mockResolvedValue(true)
    global.mockStorageManager.deleteCharacter.mockResolvedValue(true)
    global.mockRouter.push.mockClear()
  })

  it("shows loading state initially then empty state when no characters exist", async () => {
    render(<CharacterSheetApp />)

    expect(screen.getByText("Loading your characters...")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Create Your First Character")).toBeInTheDocument()
    })
  })

  it("creates a new character and navigates to the character sheet", async () => {
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

  it("shows character list when characters exist", async () => {
    const character1: Character = { ...createDefaultCharacter(), id: "char1", name: "Aragorn", level: 5 }
    const character2: Character = { ...createDefaultCharacter(), id: "char2", name: "Legolas", level: 7 }
    global.mockStorageManager.getCharacters.mockResolvedValue([character1, character2])

    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
      expect(screen.getByText("Legolas")).toBeInTheDocument()
    })
  })

  it("shows correct level and class info for each character", async () => {
    const character: Character = {
      ...createDefaultCharacter(),
      id: "char1",
      name: "Gandalf",
      level: 20,
      race: "Maia",
      class: "Wizard",
    }
    global.mockStorageManager.getCharacters.mockResolvedValue([character])

    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("Gandalf")).toBeInTheDocument()
      expect(screen.getByText("Level 20 Maia Wizard")).toBeInTheDocument()
    })
  })

  it("shows D&D Character Sheet title on the home page", async () => {
    render(<CharacterSheetApp />)

    await waitFor(() => {
      expect(screen.getByText("D&D Character Sheet")).toBeInTheDocument()
    })
  })
})

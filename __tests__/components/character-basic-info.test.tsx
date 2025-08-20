import { render, screen, fireEvent, waitFor } from "../test-utils"
import { CharacterBasicInfo } from "../../components/character-basic-info"
import { createDefaultCharacter } from "../../lib/character-types"
import { jest } from "@jest/globals"

describe("CharacterBasicInfo", () => {
  const mockOnUpdate = jest.fn()
  const defaultCharacter = createDefaultCharacter()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders character information in view mode", () => {
    const character = {
      ...defaultCharacter,
      name: "Test Character",
      race: "Human",
      class: "Fighter",
      level: 5,
      background: "Soldier",
      alignment: "Lawful Good",
      experiencePoints: 6500,
    }

    render(<CharacterBasicInfo character={character} onUpdate={mockOnUpdate} />)

    expect(screen.getByText("Test Character")).toBeInTheDocument()
    expect(screen.getByText("Human")).toBeInTheDocument()
    expect(screen.getByText("Fighter")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Soldier")).toBeInTheDocument()
    expect(screen.getByText("Lawful Good")).toBeInTheDocument()
    expect(screen.getByText("6,500 XP")).toBeInTheDocument()
  })

  it("shows default values for empty character fields", () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    expect(screen.getByText("Unnamed Character")).toBeInTheDocument()
    expect(screen.getAllByText("Not specified")).toHaveLength(4) // race, class, background, alignment
    expect(screen.getByText("0 XP")).toBeInTheDocument()
  })

  it("enters edit mode when edit button is clicked", () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    fireEvent.click(editButton)

    expect(screen.getByText("Edit Character Information")).toBeInTheDocument()
    expect(screen.getByLabelText("Character Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Level")).toBeInTheDocument()
  })

  it("updates character name in edit mode", async () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    // Update name
    const nameInput = screen.getByLabelText("Character Name")
    fireEvent.change(nameInput, { target: { value: "New Character Name" } })

    // Save changes
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Character Name",
        }),
      )
    })
  })

  it("updates character level in edit mode", async () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const levelInput = screen.getByLabelText("Level")
    fireEvent.change(levelInput, { target: { value: "10" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 10,
        }),
      )
    })
  })

  it("updates experience points in edit mode", async () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const xpInput = screen.getByLabelText("Experience Points")
    fireEvent.change(xpInput, { target: { value: "5000" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          experiencePoints: 5000,
        }),
      )
    })
  })

  it("cancels edit mode without saving changes", () => {
    const character = { ...defaultCharacter, name: "Original Name" }
    render(<CharacterBasicInfo character={character} onUpdate={mockOnUpdate} />)

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    // Make changes
    const nameInput = screen.getByLabelText("Character Name")
    fireEvent.change(nameInput, { target: { value: "Changed Name" } })

    // Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

    // Should not call onUpdate
    expect(mockOnUpdate).not.toHaveBeenCalled()

    // Should return to view mode with original data
    expect(screen.getByText("Original Name")).toBeInTheDocument()
  })

  it("handles invalid level input", async () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const levelInput = screen.getByLabelText("Level")
    fireEvent.change(levelInput, { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 1, // Should default to 1
        }),
      )
    })
  })

  it("handles invalid experience points input", async () => {
    render(<CharacterBasicInfo character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const xpInput = screen.getByLabelText("Experience Points")
    fireEvent.change(xpInput, { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          experiencePoints: 0, // Should default to 0
        }),
      )
    })
  })
})

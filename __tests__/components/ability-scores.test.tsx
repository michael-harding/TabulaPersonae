import { render, screen, fireEvent, waitFor } from "../test-utils"
import { AbilityScores } from "../../components/ability-scores"
import { createDefaultCharacter } from "../../lib/character-types"
import { jest } from "@jest/globals"

describe("AbilityScores", () => {
  const mockOnUpdate = jest.fn()
  const defaultCharacter = createDefaultCharacter()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders all ability scores with modifiers", () => {
    const character = {
      ...defaultCharacter,
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      },
    }

    render(<AbilityScores character={character} onUpdate={mockOnUpdate} />)

    // Check ability scores are displayed
    expect(screen.getByText("16")).toBeInTheDocument() // Strength
    expect(screen.getByText("14")).toBeInTheDocument() // Dexterity
    expect(screen.getByText("13")).toBeInTheDocument() // Constitution
    expect(screen.getByText("12")).toBeInTheDocument() // Intelligence
    expect(screen.getByText("10")).toBeInTheDocument() // Wisdom
    expect(screen.getByText("8")).toBeInTheDocument() // Charisma

    // Check modifiers are calculated correctly
    expect(screen.getByText("+3")).toBeInTheDocument() // Strength modifier
    expect(screen.getByText("+2")).toBeInTheDocument() // Dexterity modifier
    expect(screen.getByText("+1")).toBeInTheDocument() // Constitution modifier
    expect(screen.getByText("+0")).toBeInTheDocument() // Wisdom modifier
    expect(screen.getByText("-1")).toBeInTheDocument() // Charisma modifier
  })

  it("enters edit mode when edit button is clicked", () => {
    render(<AbilityScores character={defaultCharacter} onUpdate={mockOnUpdate} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    fireEvent.click(editButton)

    expect(screen.getByText("Edit Ability Scores")).toBeInTheDocument()
    expect(screen.getByLabelText("Strength")).toBeInTheDocument()
  })

  it("updates ability scores in edit mode", async () => {
    render(<AbilityScores character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const strengthInput = screen.getByLabelText("Strength")
    fireEvent.change(strengthInput, { target: { value: "18" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          abilityScores: expect.objectContaining({
            strength: 18,
          }),
        }),
      )
    })
  })

  it("toggles saving throw proficiencies", async () => {
    render(<AbilityScores character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    // Find and click the strength saving throw checkbox
    const strengthSaveCheckbox = screen.getByRole("checkbox", { name: /strength saving throw/i })
    fireEvent.click(strengthSaveCheckbox)

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          savingThrows: expect.objectContaining({
            strength: true,
          }),
        }),
      )
    })
  })

  it("handles invalid ability score input", async () => {
    render(<AbilityScores character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const strengthInput = screen.getByLabelText("Strength")
    fireEvent.change(strengthInput, { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          abilityScores: expect.objectContaining({
            strength: 10, // Should default to 10
          }),
        }),
      )
    })
  })

  it("cancels edit mode without saving changes", () => {
    render(<AbilityScores character={defaultCharacter} onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByRole("button", { name: /edit/i }))

    const strengthInput = screen.getByLabelText("Strength")
    fireEvent.change(strengthInput, { target: { value: "18" } })

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

    expect(mockOnUpdate).not.toHaveBeenCalled()
    expect(screen.getByText("10")).toBeInTheDocument() // Should show original value
  })
})

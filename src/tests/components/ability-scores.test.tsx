import { render, screen, fireEvent } from "../test-utils"
import { AbilityScores } from "@/components/ability-scores"
import { createDefaultCharacter } from "@/lib/character-types"

function makeCharacter(overrides: Record<string, any> = {}) {
  return {
    ...createDefaultCharacter(),
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 12,
      intelligence: 10,
      wisdom: 8,
      charisma: 13,
    },
    proficiencyBonus: 3,
    savingThrows: {
      strength: true,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false,
    },
    ...overrides,
  }
}

// The edit button is icon-only. It is the only button in view mode.
function clickEditButton() {
  fireEvent.click(screen.getAllByRole("button")[0])
}

// Ability order in the component: strength, dexterity, constitution, intelligence, wisdom, charisma
describe("AbilityScores", () => {
  describe("view mode", () => {
    it("renders all 6 ability abbreviations", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("STR")).toBeInTheDocument()
      expect(screen.getByText("DEX")).toBeInTheDocument()
      expect(screen.getByText("CON")).toBeInTheDocument()
      expect(screen.getByText("INT")).toBeInTheDocument()
      expect(screen.getByText("WIS")).toBeInTheDocument()
      expect(screen.getByText("CHA")).toBeInTheDocument()
    })

    it("renders score values", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("16")).toBeInTheDocument()
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("renders ability modifiers", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      // STR 16 → +3
      expect(screen.getAllByText("+3").length).toBeGreaterThan(0)
      // WIS 8 → -1
      expect(screen.getByText("-1")).toBeInTheDocument()
    })

    it("shows saving throw section for proficient abilities", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Saving Throw")).toBeInTheDocument()
      expect(screen.getByText("Prof")).toBeInTheDocument()
    })

    it("does not show saving throw section for non-proficient abilities", () => {
      render(<AbilityScores character={makeCharacter({ savingThrows: { strength: false, dexterity: false, constitution: false, intelligence: false, wisdom: false, charisma: false } })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Prof")).not.toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    it("shows 6 number inputs when edit button is clicked", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getAllByRole("spinbutton")).toHaveLength(6)
    })

    it("shows save and cancel buttons in the header when editing", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("shows a save prof checkbox for each ability", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getAllByRole("checkbox")).toHaveLength(6)
    })

    it("calls onUpdate with updated strength score on save", () => {
      const onUpdate = vi.fn()
      render(<AbilityScores character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      // spinbuttons ordered: strength(0), dexterity(1), constitution(2), intelligence(3), wisdom(4), charisma(5)
      const strInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(strInput, { target: { value: "18" } })
      fireEvent.blur(strInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          abilityScores: expect.objectContaining({ strength: 18 }),
        })
      )
    })

    it("enables dexterity saving throw proficiency on save", () => {
      const onUpdate = vi.fn()
      render(<AbilityScores character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("checkbox", { name: /dexterity saving throw/i }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          savingThrows: expect.objectContaining({ dexterity: true }),
        })
      )
    })

    it("disables strength saving throw proficiency on save", () => {
      const onUpdate = vi.fn()
      render(<AbilityScores character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      // strength is already proficient — uncheck it
      fireEvent.click(screen.getByRole("checkbox", { name: /strength saving throw/i }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          savingThrows: expect.objectContaining({ strength: false }),
        })
      )
    })

    it("does not call onUpdate when cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(<AbilityScores character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const strInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(strInput, { target: { value: "8" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("reverts to original scores after cancel", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      const strInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(strInput, { target: { value: "8" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.getByText("16")).toBeInTheDocument()
    })

    it("returns to view mode after save", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    })

    it("returns to view mode after cancel", () => {
      render(<AbilityScores character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    })
  })
})

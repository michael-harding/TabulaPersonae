import { axe } from "vitest-axe"
import { render, screen, fireEvent, waitFor, cleanupPortals } from "../test-utils"
import { AbilityScoresModule } from "@/components/ability-scores-module"
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

function makeMagicItem(overrides: Record<string, any> = {}) {
  return {
    id: "item-1",
    name: "Test Item",
    description: "",
    quantity: 1,
    weight: 0,
    equipped: true,
    type: "other" as const,
    magic: true,
    requiresAttunement: true,
    attuned: true,
    rarity: "rare" as const,
    ...overrides,
  }
}

function clickEditButton() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

// Ability order in the component: strength, dexterity, constitution, intelligence, wisdom, charisma
describe("AbilityScoresModule", () => {
  describe("view mode", () => {
    it("renders all 6 ability abbreviations", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("STR")).toBeInTheDocument()
      expect(screen.getByText("DEX")).toBeInTheDocument()
      expect(screen.getByText("CON")).toBeInTheDocument()
      expect(screen.getByText("INT")).toBeInTheDocument()
      expect(screen.getByText("WIS")).toBeInTheDocument()
      expect(screen.getByText("CHA")).toBeInTheDocument()
    })

    it("renders score values", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("16")).toBeInTheDocument()
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("renders ability modifiers", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // STR 16 → +3
      expect(screen.getAllByText("+3").length).toBeGreaterThan(0)
      // WIS 8 → -1
      expect(screen.getByText("-1")).toBeInTheDocument()
    })

    it("shows saving throw section for proficient abilities", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Saving Throw")).toBeInTheDocument()
      expect(screen.getByText("Prof")).toBeInTheDocument()
    })

    it("does not show saving throw section for non-proficient abilities", () => {
      render(<AbilityScoresModule character={makeCharacter({ savingThrows: { strength: false, dexterity: false, constitution: false, intelligence: false, wisdom: false, charisma: false } })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Prof")).not.toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    it("shows 6 number inputs when edit button is clicked", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getAllByRole("spinbutton")).toHaveLength(6)
    })

    it("shows save and cancel buttons in the header when editing", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("shows a save prof checkbox for each ability", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getAllByRole("checkbox")).toHaveLength(6)
    })

    it("calls onUpdate with updated strength score on save", () => {
      const onUpdate = vi.fn()
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const strInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(strInput, { target: { value: "8" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("reverts to original scores after cancel", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      const strInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(strInput, { target: { value: "8" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.getByText("16")).toBeInTheDocument()
    })

    it("returns to view mode after save", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    })

    it("returns to view mode after cancel", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("calculation tooltips", () => {
    beforeEach(() => cleanupPortals())

    it("renders a focusable trigger for each ability card and each proficient saving throw in view mode", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // 6 ability cards + 1 STR saving throw (only STR is proficient in makeCharacter)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers).toHaveLength(7)
    })

    it("shows ability modifier formula in tooltip when card is focused", async () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // STR card is the first focusable trigger (contains "+3" modifier, score 16)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("(16 − 10) / 2 = +3")
    })

    it("shows saving throw formula in tooltip when the saving throw section is focused", async () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // STR saving throw trigger is at index 1 (after the STR ability card at index 0)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[1])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // STR 16 → +3, Prof +3 → total +6
      expect(screen.getByRole("tooltip")).toHaveTextContent("STR +3 + Prof +3 = +6")
    })

    it("renders one focusable effective-score tooltip trigger per ability in edit mode", () => {
      render(<AbilityScoresModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // Each ability's "Effective" CalculatedValue control renders its own focusable tooltip trigger
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers).toHaveLength(6)
    })
  })

  describe("item modifiers", () => {
    it("raises the displayed effective score and modifier when an active item boosts an ability", () => {
      const character = makeCharacter({
        equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
      })
      render(<AbilityScoresModule character={character} onUpdate={vi.fn()} />)
      // base STR 16 + item +2 = 18 -> modifier +4
      expect(screen.getByText("18")).toBeInTheDocument()
      expect(screen.getByText("+4")).toBeInTheDocument()
    })

    it("shows an item bonus badge next to the boosted score", () => {
      const character = makeCharacter({
        equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
      })
      render(<AbilityScoresModule character={character} onUpdate={vi.fn()} />)
      expect(screen.getByText("item +2")).toBeInTheDocument()
    })

    it("ignores an item's ability bonus when it requires attunement and is not attuned", () => {
      const character = makeCharacter({
        equipment: [makeMagicItem({ attuned: false, modifiers: { abilityScores: { strength: 2 } } })],
      })
      render(<AbilityScoresModule character={character} onUpdate={vi.fn()} />)
      expect(screen.getByText("16")).toBeInTheDocument()
      expect(screen.queryByText("item +2")).not.toBeInTheDocument()
    })

    it("keeps the base-score input in edit mode unaffected by the item bonus", () => {
      const character = makeCharacter({
        equipment: [makeMagicItem({ modifiers: { abilityScores: { strength: 2 } } })],
      })
      render(<AbilityScoresModule character={character} onUpdate={vi.fn()} />)
      clickEditButton()
      const strInput = screen.getAllByRole("spinbutton")[0]
      expect(strInput).toHaveValue(16)
    })

    it("reflects a per-ability saving throw item bonus", () => {
      const character = makeCharacter({
        equipment: [makeMagicItem({ modifiers: { savingThrows: { strength: 1 } } })],
      })
      render(<AbilityScoresModule character={character} onUpdate={vi.fn()} />)
      // STR 16 -> +3, Prof +3, Item +1 -> total +7
      expect(screen.getByText("+7")).toBeInTheDocument()
    })

    it("persists a manual effective-score override on save", () => {
      const onUpdate = vi.fn()
      const character = makeCharacter()
      render(<AbilityScoresModule character={character} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom strength effective score/i }))
      const overrideInput = screen.getByRole("spinbutton", { name: /strength effective score/i })
      fireEvent.input(overrideInput, { target: { value: "20" } })
      fireEvent.blur(overrideInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          abilityScoreOverrides: expect.objectContaining({ strength: 20 }),
          useCalculatedAbilityScores: expect.objectContaining({ strength: false }),
        })
      )
    })
  })
})

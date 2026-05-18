import { render, screen, fireEvent } from "../test-utils"
import { CharacterNotes } from "@/components/character-notes"
import { createDefaultCharacter } from "@/lib/character-types"

const emptyCharacter = createDefaultCharacter()

const populatedCharacter = {
  ...emptyCharacter,
  personalityTraits: "Brave and curious",
  ideals: "Justice for all",
  bonds: "My hometown",
  flaws: "Overconfident",
  backstory: "A wandering hero",
  notes: "Remember the tavern",
}

function enterEditMode() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

describe("CharacterNotes", () => {
  describe("view mode", () => {
    it("shows default text for all empty fields", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("No personality traits defined yet.")).toBeInTheDocument()
      expect(screen.getByText("No ideals defined yet.")).toBeInTheDocument()
      expect(screen.getByText("No bonds defined yet.")).toBeInTheDocument()
      expect(screen.getByText("No flaws defined yet.")).toBeInTheDocument()
      expect(screen.getByText("No backstory written yet.")).toBeInTheDocument()
      expect(screen.getByText("No additional notes yet.")).toBeInTheDocument()
    })

    it("shows populated field values", () => {
      render(<CharacterNotes character={populatedCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("Brave and curious")).toBeInTheDocument()
      expect(screen.getByText("Justice for all")).toBeInTheDocument()
      expect(screen.getByText("My hometown")).toBeInTheDocument()
      expect(screen.getByText("Overconfident")).toBeInTheDocument()
      expect(screen.getByText("A wandering hero")).toBeInTheDocument()
      expect(screen.getByText("Remember the tavern")).toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    it("enters edit mode when edit button is clicked", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      enterEditMode()
      expect(screen.getByLabelText(/personality traits/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^ideals$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^bonds$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^flaws$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/backstory/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()
    })

    it("calls onUpdate with updated personalityTraits on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={emptyCharacter} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/personality traits/i), {
        target: { value: "Curious and bold" },
      })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ personalityTraits: "Curious and bold" })
      )
    })

    it.each([
      ["^ideals$", "Protect the innocent"],
      ["^bonds$", "My mentor"],
      ["^flaws$", "Greedy"],
      ["backstory", "Born in the mountains"],
      ["additional notes", "Seek the sword"],
    ] as const)("saves updated field matching /%s/i", (labelPattern, value) => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={emptyCharacter} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(new RegExp(labelPattern, "i")), {
        target: { value },
      })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it("does not call onUpdate when cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={emptyCharacter} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/personality traits/i), {
        target: { value: "Sneaky" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("reverts to original content after cancel", () => {
      render(<CharacterNotes character={populatedCharacter} onUpdate={vi.fn()} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/personality traits/i), {
        target: { value: "Changed text" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.getByText("Brave and curious")).toBeInTheDocument()
    })
  })

  describe("physical details", () => {
    const charWithPhysical = { ...emptyCharacter, age: "30", height: "6'0\"", weight: "180lb", eyes: "Blue", skin: "Fair", hair: "Brown" }

    it("shows physical detail values in view mode", () => {
      render(<CharacterNotes character={charWithPhysical} onUpdate={vi.fn()} />)
      expect(screen.getByText(/30/)).toBeInTheDocument()
      expect(screen.getByText(/Blue/)).toBeInTheDocument()
      expect(screen.getByText(/Brown/)).toBeInTheDocument()
    })

    it("shows dashes for empty physical details in view mode", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      // Six dashes — one per physical field
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(6)
    })

    it("shows physical detail inputs in edit mode", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      enterEditMode()
      expect(screen.getByLabelText(/^age$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^height$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^weight$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^eyes$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^skin$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^hair$/i)).toBeInTheDocument()
    })

    it("saves updated age on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={emptyCharacter} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/^age$/i), { target: { value: "25" } })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ age: "25" }))
    })
  })

  describe("appearance", () => {
    it("shows empty-state text when appearance is empty", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("No appearance description yet.")).toBeInTheDocument()
    })

    it("shows appearance value when set", () => {
      render(<CharacterNotes character={{ ...emptyCharacter, appearance: "Tall and lean" }} onUpdate={vi.fn()} />)
      expect(screen.getByText("Tall and lean")).toBeInTheDocument()
    })

    it("shows appearance textarea in edit mode", () => {
      render(<CharacterNotes character={emptyCharacter} onUpdate={vi.fn()} />)
      enterEditMode()
      expect(screen.getByLabelText(/appearance/i)).toBeInTheDocument()
    })

    it("saves updated appearance on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={emptyCharacter} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/appearance/i), { target: { value: "Short with a scar" } })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ appearance: "Short with a scar" }))
    })
  })

  describe("2024-only fields", () => {
    const char2024 = { ...emptyCharacter, edition: "2024" as const }

    it("does not render class features textarea in 2024 mode (managed in FeaturesSection)", () => {
      render(<CharacterNotes character={char2024} onUpdate={vi.fn()} />)
      expect(screen.queryByText("No class features listed yet.")).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/class features/i)).not.toBeInTheDocument()
    })

    it("does not render species traits textarea in 2024 mode (managed in FeaturesSection)", () => {
      render(<CharacterNotes character={char2024} onUpdate={vi.fn()} />)
      expect(screen.queryByText("No species traits listed yet.")).not.toBeInTheDocument()
    })

    it("does not render feats textarea in 2024 mode (managed in FeaturesSection)", () => {
      render(<CharacterNotes character={char2024} onUpdate={vi.fn()} />)
      expect(screen.queryByText("No feats listed yet.")).not.toBeInTheDocument()
    })
  })

  describe("2014-only fields", () => {
    const char2014 = { ...emptyCharacter, edition: "2014" as const }

    it("shows empty-state text for allies & organizations in 2014 mode", () => {
      render(<CharacterNotes character={char2014} onUpdate={vi.fn()} />)
      expect(screen.getByText("No allies or organizations listed yet.")).toBeInTheDocument()
    })

    it("shows empty-state text for treasure in 2014 mode", () => {
      render(<CharacterNotes character={char2014} onUpdate={vi.fn()} />)
      expect(screen.getByText("No treasure listed yet.")).toBeInTheDocument()
    })

    it("does not render 2014-only fields in 2024 mode", () => {
      render(<CharacterNotes character={{ ...emptyCharacter, edition: "2024" }} onUpdate={vi.fn()} />)
      expect(screen.queryByText("No allies or organizations listed yet.")).not.toBeInTheDocument()
      expect(screen.queryByText("No treasure listed yet.")).not.toBeInTheDocument()
    })

    it("saves allies & organizations on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterNotes character={char2014} onUpdate={onUpdate} />)
      enterEditMode()
      fireEvent.input(screen.getByLabelText(/allies & organizations/i), { target: { value: "The Harpers" } })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ alliesAndOrganizations: "The Harpers" }))
    })
  })
})

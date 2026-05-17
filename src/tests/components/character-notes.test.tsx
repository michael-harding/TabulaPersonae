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

// The edit button is icon-only (no aria-label). It is the only button in view mode.
function enterEditMode() {
  fireEvent.click(screen.getAllByRole("button")[0])
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
})

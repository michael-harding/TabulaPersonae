import { render, screen, fireEvent } from "../test-utils"
import { CharacterBasicInfo } from "@/components/character-basic-info"
import { createDefaultCharacter } from "@/lib/character-types"

const emptyCharacter = createDefaultCharacter()

const populatedCharacter = {
  ...emptyCharacter,
  name: "Aragorn",
  level: 10,
  race: "Human",
  class: "Ranger",
  background: "Outlander",
  alignment: "Chaotic Good",
  experiencePoints: 64000,
}

const char2014 = { ...emptyCharacter, edition: "2014" as const }
const char2024 = { ...emptyCharacter, edition: "2024" as const, subclass: "Champion" }

function clickEditButton() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

describe("CharacterBasicInfo", () => {
  describe("view mode", () => {
    it("shows 'Unnamed Character' when name is empty", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("Unnamed Character")).toBeInTheDocument()
    })

    it("shows populated character values", () => {
      render(<CharacterBasicInfo character={populatedCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
      expect(screen.getByText("Human")).toBeInTheDocument()
      expect(screen.getByText("Ranger")).toBeInTheDocument()
      expect(screen.getByText("Outlander")).toBeInTheDocument()
      expect(screen.getByText("Chaotic Good")).toBeInTheDocument()
      expect(screen.getByText(/64,000 XP/)).toBeInTheDocument()
    })

    it("shows level", () => {
      render(<CharacterBasicInfo character={populatedCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("10")).toBeInTheDocument()
    })

    it("shows 'Not specified' for unset optional fields", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0)
    })

    it("calls onUpdate when heroic inspiration checkbox is toggled", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={onUpdate} />)
      const checkbox = screen.getByLabelText(/heroic inspiration/i)
      fireEvent.click(checkbox)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ heroicInspiration: true })
      )
    })
  })

  describe("edit mode", () => {
    it("shows name input when edit button is clicked", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument()
    })

    it("shows save and cancel buttons in the header when editing", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("calls onUpdate with updated name on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/character name/i), {
        target: { value: "Legolas" },
      })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Legolas" })
      )
    })

    it("calls onUpdate with updated level on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const levelInput = screen.getByLabelText(/^level$/i)
      fireEvent.input(levelInput, { target: { value: "5" } })
      fireEvent.blur(levelInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ level: 5 })
      )
    })

    it("does not call onUpdate when cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/character name/i), {
        target: { value: "Gimli" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("reverts to original name after cancel", () => {
      render(<CharacterBasicInfo character={populatedCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/character name/i), {
        target: { value: "Changed" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
    })

    it("returns to view mode after save", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(screen.queryByLabelText(/character name/i)).not.toBeInTheDocument()
    })

    it("returns to view mode after cancel", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.queryByLabelText(/character name/i)).not.toBeInTheDocument()
    })
  })

  describe("edition switch", () => {
    it("renders the edition switch", () => {
      render(<CharacterBasicInfo character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("2014")).toBeInTheDocument()
      expect(screen.getByText("2024")).toBeInTheDocument()
    })

    it("calls onUpdate with edition '2014' when switch is toggled to 2014", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={char2024} onUpdate={onUpdate} />)
      // The hidden checkbox is labelled by both edition labels "2014 2024"
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2014" }))
    })

    it("calls onUpdate with edition '2024' when switch is toggled to 2024", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={char2014} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2024" }))
    })
  })

  describe("race vs species label", () => {
    it("shows 'Race' label in 2014 mode", () => {
      render(<CharacterBasicInfo character={char2014} onUpdate={vi.fn()} />)
      expect(screen.getByText("Race")).toBeInTheDocument()
    })

    it("shows 'Species' label in 2024 mode", () => {
      render(<CharacterBasicInfo character={char2024} onUpdate={vi.fn()} />)
      expect(screen.getByText("Species")).toBeInTheDocument()
    })
  })

  describe("inspiration label", () => {
    it("shows 'Inspiration' label in 2014 mode", () => {
      render(<CharacterBasicInfo character={char2014} onUpdate={vi.fn()} />)
      expect(screen.getByText("Inspiration")).toBeInTheDocument()
    })

    it("shows 'Heroic Inspiration' label in 2024 mode", () => {
      render(<CharacterBasicInfo character={char2024} onUpdate={vi.fn()} />)
      expect(screen.getByText("Heroic Inspiration")).toBeInTheDocument()
    })
  })

  describe("subclass (2024 only)", () => {
    it("shows subclass value in 2024 view mode", () => {
      render(<CharacterBasicInfo character={char2024} onUpdate={vi.fn()} />)
      expect(screen.getByText("Champion")).toBeInTheDocument()
    })

    it("shows 'Not specified' for empty subclass in 2024 mode", () => {
      render(<CharacterBasicInfo character={{ ...emptyCharacter, edition: "2024" }} onUpdate={vi.fn()} />)
      // There will be multiple "Not specified" entries; subclass is one of them
      expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0)
    })

    it("does not render subclass section in 2014 mode", () => {
      render(<CharacterBasicInfo character={char2014} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Subclass")).not.toBeInTheDocument()
    })

    it("shows subclass input in edit mode for 2024", () => {
      render(<CharacterBasicInfo character={char2024} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByLabelText(/subclass/i)).toBeInTheDocument()
    })

    it("saves updated subclass on save", () => {
      const onUpdate = vi.fn()
      render(<CharacterBasicInfo character={char2024} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/subclass/i), { target: { value: "Battlemaster" } })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ subclass: "Battlemaster" }))
    })
  })
})

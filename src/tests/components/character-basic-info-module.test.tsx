import { axe } from "vitest-axe"

import { CharacterBasicInfoModule } from "@/components/character-basic-info-module"
import { createDefaultCharacter } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { render, screen, fireEvent } from "../test-utils"

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

describe("CharacterBasicInfoModule", () => {
  describe("view mode", () => {
    it("shows 'Unnamed Character' when name is empty", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("Unnamed Character")).toBeInTheDocument()
    })

    it("shows populated character values", () => {
      render(() => <CharacterBasicInfoModule character={populatedCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
      expect(screen.getByText("Human")).toBeInTheDocument()
      expect(screen.getByText("Ranger")).toBeInTheDocument()
      expect(screen.getByText("Outlander")).toBeInTheDocument()
      expect(screen.getByText("Chaotic Good")).toBeInTheDocument()
      expect(screen.getByText(/64,000 XP/)).toBeInTheDocument()
    })

    it("shows level", () => {
      render(() => <CharacterBasicInfoModule character={populatedCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("10")).toBeInTheDocument()
    })

    it("shows 'Not specified' for unset optional fields", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0)
    })

  })

  describe("edit mode", () => {
    it("shows name input when edit button is clicked", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument()
    })

    it("names the Class combobox via its visible label", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("combobox", { name: "Class" })).toBeInTheDocument()
    })

    it("shows save and cancel buttons in the header when editing", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("calls onUpdate with updated name on save", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
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
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const levelInput = screen.getByLabelText(/^level$/i)
      fireEvent.input(levelInput, { target: { value: "5" } })
      fireEvent.blur(levelInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ level: 5 })
      )
    })

    it("persists edits on Ctrl+S without leaving edit mode", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const nameInput = screen.getByLabelText(/character name/i)
      fireEvent.input(nameInput, { target: { value: "Legolas" } })
      fireEvent.keyDown(nameInput, { key: "s", ctrlKey: true })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Legolas" })
      )
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
    })

    it("does not call onUpdate when cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/character name/i), {
        target: { value: "Gimli" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("reverts to original name after cancel", () => {
      render(() => <CharacterBasicInfoModule character={populatedCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/character name/i), {
        target: { value: "Changed" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
    })

    it("returns to view mode after save", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(screen.queryByLabelText(/character name/i)).not.toBeInTheDocument()
    })

    it("returns to view mode after cancel", () => {
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(screen.queryByLabelText(/character name/i)).not.toBeInTheDocument()
    })
  })

  describe("race vs species label", () => {
    it("shows 'Race' label in 2014 mode", () => {
      render(() => <CharacterBasicInfoModule character={char2014} onUpdate={vi.fn()} />)
      expect(screen.getByText("Race")).toBeInTheDocument()
    })

    it("shows 'Species' label in 2024 mode", () => {
      render(() => <CharacterBasicInfoModule character={char2024} onUpdate={vi.fn()} />)
      expect(screen.getByText("Species")).toBeInTheDocument()
    })
  })

  describe("subclass (2024 only)", () => {
    it("shows subclass value in 2024 view mode", () => {
      render(() => <CharacterBasicInfoModule character={char2024} onUpdate={vi.fn()} />)
      expect(screen.getByText("Champion")).toBeInTheDocument()
    })

    it("shows 'Not specified' for empty subclass in 2024 mode", () => {
      render(() => <CharacterBasicInfoModule character={{ ...emptyCharacter, edition: "2024" }} onUpdate={vi.fn()} />)
      // There will be multiple "Not specified" entries; subclass is one of them
      expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0)
    })

    it("does not render subclass section in 2014 mode", () => {
      render(() => <CharacterBasicInfoModule character={char2014} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Subclass")).not.toBeInTheDocument()
    })

    it("shows subclass input in edit mode for 2024", () => {
      render(() => <CharacterBasicInfoModule character={char2024} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByLabelText(/subclass/i)).toBeInTheDocument()
    })

    it("saves updated subclass on save", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={char2024} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.input(screen.getByLabelText(/subclass/i), { target: { value: "Battlemaster" } })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ subclass: "Battlemaster" }))
    })
  })

  // Moved from Combat Stats: size belongs with the species that sets it
  describe("size (2024 only)", () => {
    const powerfulBuild = {
      id: "feature-1", name: "Powerful Build", description: "", source: "species-trait" as const,
      levelEffects: [{ level: 1, effects: { size: "Large" } }],
    }
    const withSize = (overrides: Partial<typeof char2024> = {}) => ({ ...char2024, ...overrides })

    it("shows a placeholder when nothing has defined a size yet — no hardcoded 'Medium' default", () => {
      render(() => <CharacterBasicInfoModule character={withSize()} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("size-display")).toHaveTextContent("—")
    })

    it("does not render size in 2014 mode", () => {
      render(() => <CharacterBasicInfoModule character={char2014} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Size")).not.toBeInTheDocument()
    })

    it("shows the size a Species Trait grants", () => {
      render(() => <CharacterBasicInfoModule character={withSize({ speciesTraits: [powerfulBuild] })} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("size-display")).toHaveTextContent("Large")
    })

    it("shows a manually-entered custom size when useCalculatedSize is false", () => {
      render(() => <CharacterBasicInfoModule character={withSize({ size: "Small", useCalculatedSize: false })} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("size-display")).toHaveTextContent("Small")
    })

    it("lines up with the fields around it rather than as a stat block", () => {
      render(() => <CharacterBasicInfoModule character={withSize()} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("size")).toHaveClass("items-start")
      expect(screen.getByTestId("size-label")).toHaveClass("text-sm", "font-medium", "text-muted-foreground")
    })

    it("shows the Size combobox only after switching to custom entry", () => {
      render(() => <CharacterBasicInfoModule character={withSize()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.queryByRole("combobox", { name: /^size$/i })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /use custom size/i }))
      expect(screen.getByRole("combobox", { name: /^size$/i })).toBeInTheDocument()
    })

    it("saves a custom size value typed into the Size combobox", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={withSize()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom size/i }))
      const sizeInput = screen.getByRole("combobox", { name: /^size$/i })
      fireEvent.focus(sizeInput)
      fireEvent.input(sizeInput, { target: { value: "Colossal" } })
      fireEvent.blur(sizeInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Colossal", useCalculatedSize: false }))
    })

    it("saves a predefined size option selected from the dropdown", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={withSize()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom size/i }))
      const sizeInput = screen.getByRole("combobox", { name: /^size$/i })
      fireEvent.focus(sizeInput)
      fireEvent.click(screen.getByRole("option", { name: "Huge" }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Huge", useCalculatedSize: false }))
    })

    it("shows the feature-granted size read-only, with no combobox, when a feature grants size", () => {
      render(() => <CharacterBasicInfoModule character={withSize({ speciesTraits: [powerfulBuild] })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.queryByRole("combobox", { name: /^size$/i })).not.toBeInTheDocument()
      expect(screen.getByTestId("size-display")).toHaveTextContent("Large")
    })

    it("switching to custom size and back to calculated restores the feature-granted value", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={withSize({ speciesTraits: [powerfulBuild] })} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom size/i }))
      fireEvent.click(screen.getByRole("button", { name: /use calculated size/i }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Large", useCalculatedSize: true }))
    })

    it("leaves a 2014 character's stored size alone when saving", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={{ ...char2014, size: "Small", useCalculatedSize: false }} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Small", useCalculatedSize: false }))
    })

    it("treats a character saved without the size fields as calculated", () => {
      const legacy: Partial<typeof char2024> = withSize()
      delete legacy.size
      delete legacy.useCalculatedSize
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={{ ...legacy, speciesTraits: [powerfulBuild] } as typeof char2024} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Large", useCalculatedSize: true }))
    })
  })

  describe("combobox fields", () => {
    it("saves a custom race value typed into the race combobox", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const inputs = screen.getAllByRole("combobox")
      const raceInput = inputs.find((el) => (el as HTMLInputElement).placeholder?.match(/race|species/i))!
      fireEvent.focus(raceInput)
      fireEvent.input(raceInput, { target: { value: "Warforged" } })
      fireEvent.blur(raceInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ race: "Warforged" }))
    })

    it("saves a custom class value typed into the class combobox", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const inputs = screen.getAllByRole("combobox")
      const classInput = inputs.find((el) => (el as HTMLInputElement).placeholder?.match(/class/i))!
      fireEvent.focus(classInput)
      fireEvent.input(classInput, { target: { value: "Mystic" } })
      fireEvent.blur(classInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ class: "Mystic" }))
    })

    it("saves a predefined race option selected from the dropdown", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const inputs = screen.getAllByRole("combobox")
      const raceInput = inputs.find((el) => (el as HTMLInputElement).placeholder?.match(/race|species/i))!
      fireEvent.focus(raceInput)
      fireEvent.click(screen.getByRole("option", { name: "Elf" }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ race: "Elf" }))
    })
  })

  describe("XP field in edit mode", () => {
    it("calls onUpdate with updated experiencePoints when XP changes", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      const xpInput = screen.getByLabelText(/experience points/i)
      fireEvent.input(xpInput, { target: { value: "6500" } })
      fireEvent.blur(xpInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ experiencePoints: 6500 })
      )
    })
  })

  describe("alignment selection", () => {
    it("calls onUpdate with updated alignment when an alignment option is selected", () => {
      const onUpdate = vi.fn()
      render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("combobox", { name: "Alignment" }))
      fireEvent.click(screen.getByRole("option", { name: "Chaotic Good" }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ alignment: "Chaotic Good" })
      )
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {

    it("still renders the character name display", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <CharacterBasicInfoModule character={populatedCharacter} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.getByText("Aragorn")).toBeInTheDocument()
    })

    it("does not render the Edit button", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <CharacterBasicInfoModule character={emptyCharacter} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })
  })
})

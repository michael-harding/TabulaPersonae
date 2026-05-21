import { render, screen, fireEvent, within } from "../test-utils"
import { FeaturesSection } from "@/components/features-section"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Feature } from "@/lib/character-types"

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "feat-1",
    name: "Action Surge",
    description: "Once per turn, you can take an additional action.",
    source: "class-feature",
    ...overrides,
  }
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
}

describe("FeaturesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("section heading and structure", () => {
    it("renders the section heading", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Class Features, Species Traits & Feats")).toBeInTheDocument()
    })

    it("renders the Class Features section header", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Class Features")).toBeInTheDocument()
    })

    it("renders the Species Traits section header", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Species Traits")).toBeInTheDocument()
    })

    it("renders the Feats section header", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Feats")).toBeInTheDocument()
    })

    it("renders Add buttons for each section", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add class feature/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add species trait/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add feat/i })).toBeInTheDocument()
    })
  })

  describe("empty state", () => {
    it("shows empty state for class features", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })

    it("shows empty state for species traits", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No species traits added yet.")).toBeInTheDocument()
    })

    it("shows empty state for feats", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No feats added yet.")).toBeInTheDocument()
    })
  })

  describe("displaying features", () => {
    it("renders a class feature name", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Action Surge")).toBeInTheDocument()
    })

    it("renders a class feature description", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ description: "Once per short rest." })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Once per short rest.")).toBeInTheDocument()
    })

    it("renders a species trait name", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "t-1", name: "Darkvision", source: "species-trait" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Darkvision")).toBeInTheDocument()
    })

    it("renders a feat name", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ feats: [makeFeature({ id: "f-1", name: "War Caster", source: "feat" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("War Caster")).toBeInTheDocument()
    })

    it("shows action badge when actionKind is 'action'", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Action")).toBeInTheDocument()
    })

    it("shows bonus action badge when actionKind is 'bonus-action'", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Bonus Action")).toBeInTheDocument()
    })

    it("shows reaction badge when actionKind is 'reaction'", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Reaction")).toBeInTheDocument()
    })

    it("does not show an action badge when actionKind is not set", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: undefined })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Action")).not.toBeInTheDocument()
      expect(screen.queryByText("Bonus Action")).not.toBeInTheDocument()
      expect(screen.queryByText("Reaction")).not.toBeInTheDocument()
    })
  })

  describe("backward compatibility", () => {
    it("renders no entries when classFeatures is a legacy string", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: "old text data" as never })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })

    it("renders no entries when classFeatures is undefined", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: undefined })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })
  })

  describe("Add Class Feature modal", () => {
    it("opens the add modal when Add Class Feature is clicked", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const dialog = screen.getByRole("dialog")
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText("Add Class Feature")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when name is empty", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with new class feature on valid submit", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Action Surge" } })
      fireEvent.input(within(modal).getByLabelText(/^description$/i), { target: { value: "Extra action." } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Action Surge", description: "Extra action.", source: "class-feature" }),
          ]),
        })
      )
    })

    it("new class feature has no actionKind when 'Not an action' is selected (default)", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Second Wind" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ actionKind: undefined }),
          ]),
        })
      )
    })

    it("new class feature has actionKind='action' when Action is selected", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Action Surge" } })
      // Open action kind select and pick "Action"
      fireEvent.click(within(modal).getByRole("button", { name: /used as action/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ actionKind: "action" }),
          ]),
        })
      )
    })

    it("new class feature has actionKind='bonus-action' when Bonus Action is selected", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Cunning Action" } })
      fireEvent.click(within(modal).getByRole("button", { name: /used as action/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Bonus Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ actionKind: "bonus-action" }),
          ]),
        })
      )
    })
  })

  describe("Add Species Trait modal", () => {
    it("calls onUpdate with source='species-trait'", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Darkvision" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          speciesTraits: expect.arrayContaining([
            expect.objectContaining({ name: "Darkvision", source: "species-trait" }),
          ]),
        })
      )
    })
  })

  describe("Add Feat modal", () => {
    it("calls onUpdate with source='feat'", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add feat/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "War Caster" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          feats: expect.arrayContaining([
            expect.objectContaining({ name: "War Caster", source: "feat" }),
          ]),
        })
      )
    })
  })

  describe("Edit Feature modal", () => {
    it("opens the edit modal when edit button is clicked", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText("Edit Class Feature")).toBeInTheDocument()
    })

    it("pre-fills the form with existing feature name", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      expect(screen.getByLabelText(/^name$/i)).toHaveValue("Action Surge")
    })

    it("pre-fills the form with existing feature description", () => {
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge", description: "Extra action." })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      expect(screen.getByLabelText(/^description$/i)).toHaveValue("Extra action.")
    })

    it("calls onUpdate with updated name on save", () => {
      const onUpdate = vi.fn()
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      const nameInput = screen.getByLabelText(/^name$/i)
      fireEvent.input(nameInput, { target: { value: "Surge of Action" } })
      fireEvent.click(screen.getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Surge of Action" }),
          ]),
        })
      )
    })

    it("calls onUpdate with updated actionKind on save", () => {
      const onUpdate = vi.fn()
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge", actionKind: undefined })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      fireEvent.click(screen.getByRole("button", { name: /used as action/i }))
      fireEvent.click(screen.getByRole("option", { name: "Reaction" }))
      fireEvent.click(screen.getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ actionKind: "reaction" }),
          ]),
        })
      )
    })
  })

  describe("action fields in form", () => {
    it("does not show type/range/uses/recharge fields when no actionKind is selected", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByRole("combobox")).not.toBeInTheDocument() // type combobox hidden
      expect(within(modal).queryByLabelText(/^range$/i)).not.toBeInTheDocument()
      expect(within(modal).queryByLabelText(/max uses/i)).not.toBeInTheDocument()
      expect(within(modal).queryByLabelText(/recharge on/i)).not.toBeInTheDocument()
    })

    it("shows type/range/uses/recharge fields after selecting an actionKind", () => {
      render(<FeaturesSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /used as action/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      expect(within(modal).getByRole("combobox")).toBeInTheDocument() // type combobox
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
      expect(within(modal).getByLabelText(/max uses/i)).toBeInTheDocument()
      expect(within(modal).getByLabelText(/recharge on/i)).toBeInTheDocument()
    })

    it("saves range and rechargeOn when actionKind is set", () => {
      const onUpdate = vi.fn()
      render(<FeaturesSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Lay on Hands" } })
      fireEvent.click(within(modal).getByRole("button", { name: /used as action/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.input(within(modal).getByLabelText(/^range$/i), { target: { value: "Touch" } })
      const maxUsesInput = within(modal).getByLabelText(/max uses/i)
      fireEvent.input(maxUsesInput, { target: { value: "5" } })
      fireEvent.blur(maxUsesInput)
      fireEvent.click(within(modal).getByLabelText(/recharge on/i))
      fireEvent.click(within(modal).getByRole("option", { name: "Long Rest" }))
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({
              name: "Lay on Hands",
              actionKind: "action",
              range: "Touch",
              maxUses: 5,
              rechargeOn: "long-rest",
            }),
          ]),
        })
      )
    })

    it("clears action fields when actionKind is unset on edit", () => {
      const onUpdate = vi.fn()
      const feature = makeFeature({ name: "Lay on Hands", actionKind: "action", maxUses: 5, rechargeOn: "long-rest" })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /edit lay on hands/i }))
      fireEvent.click(screen.getByRole("button", { name: /used as action/i }))
      fireEvent.click(screen.getByRole("option", { name: "Not an action" }))
      fireEvent.click(screen.getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ actionKind: undefined, maxUses: undefined, rechargeOn: undefined }),
          ]),
        })
      )
    })

    it("pre-fills range and rechargeOn in edit modal for action-type features", () => {
      const feature = makeFeature({ name: "Lay on Hands", actionKind: "action", range: "Touch", maxUses: 5, rechargeOn: "long-rest" })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /edit lay on hands/i }))
      expect(screen.getByLabelText(/^range$/i)).toHaveValue("Touch")
      expect(screen.getByLabelText(/max uses/i)).toHaveValue(5)
    })
  })

  describe("uses tracker in feature card", () => {
    it("shows pip tracker when feature has maxUses > 0", () => {
      const feature = makeFeature({ actionKind: "action", maxUses: 3, uses: 0 })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(3)
    })

    it("does not show pip tracker when feature has no maxUses", () => {
      const feature = makeFeature({ actionKind: "action" })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("reflects used pips correctly", () => {
      const feature = makeFeature({ actionKind: "action", maxUses: 3, uses: 1 })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Charge spent (click to restore)")).toHaveLength(1)
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with updated uses when pip is clicked", () => {
      const onUpdate = vi.fn()
      const feature = makeFeature({ id: "f-1", actionKind: "action", maxUses: 3, uses: 0 })
      render(<FeaturesSection character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ id: "f-1", uses: 1 }),
          ]),
        })
      )
    })
  })

  describe("Delete feature", () => {
    it("calls onUpdate with the feature removed", () => {
      const onUpdate = vi.fn()
      render(
        <FeaturesSection
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /delete action surge/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ classFeatures: [] })
      )
    })

    it("removes only the targeted feature, leaving others intact", () => {
      const onUpdate = vi.fn()
      render(
        <FeaturesSection
          character={makeCharacter({
            classFeatures: [
              makeFeature({ id: "f-1", name: "Action Surge" }),
              makeFeature({ id: "f-2", name: "Second Wind" }),
            ],
          })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /delete action surge/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Second Wind" }),
          ]),
        })
      )
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.not.arrayContaining([
            expect.objectContaining({ name: "Action Surge" }),
          ]),
        })
      )
    })
  })
})

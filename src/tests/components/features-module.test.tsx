import { axe } from "vitest-axe"
import { render, screen, fireEvent, within, cleanupPortals } from "../test-utils"
import { FeaturesModule } from "@/components/features-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Feature } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

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

describe("FeaturesModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("section heading and structure", () => {
    it("renders the section heading", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Class Features, Species Traits, Background & Feats")).toBeInTheDocument()
    })

    it("renders the Class Features section header", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Class Features")).toBeInTheDocument()
    })

    it("renders the Species Traits section header", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Species Traits")).toBeInTheDocument()
    })

    it("renders the Feats section header", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Feats")).toBeInTheDocument()
    })

    it("renders the Background section header", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Background")).toBeInTheDocument()
    })

    it("renders Add buttons for each section", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add class feature/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add species trait/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add feat/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add background feature/i })).toBeInTheDocument()
    })
  })

  describe("Background group", () => {
    it("adds a Background Feature and persists it under backgroundFeatures", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add background feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Acolyte" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Acolyte", source: "background" }),
          ]),
        })
      )
    })

    it("shows an existing background feature under the Background section", () => {
      const feature = makeFeature({ name: "Acolyte", source: "background" })
      render(<FeaturesModule character={makeCharacter({ backgroundFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Acolyte")).toBeInTheDocument()
    })

    it("deletes a background feature", () => {
      const onUpdate = vi.fn()
      const feature = makeFeature({ name: "Acolyte", source: "background" })
      render(<FeaturesModule character={makeCharacter({ backgroundFeatures: [feature] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /delete acolyte/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ backgroundFeatures: [] }))
    })
  })

  describe("empty state", () => {
    it("shows empty state for class features", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })

    it("shows empty state for species traits", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No species traits added yet.")).toBeInTheDocument()
    })

    it("shows empty state for feats", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No feats added yet.")).toBeInTheDocument()
    })
  })

  describe("displaying features", () => {
    it("renders a class feature name", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Action Surge")).toBeInTheDocument()
    })

    it("renders a class feature description", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ description: "Once per short rest." })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Once per short rest.")).toBeInTheDocument()
    })

    it("renders a species trait name", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "t-1", name: "Darkvision", source: "species-trait" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Darkvision")).toBeInTheDocument()
    })

    it("renders a feat name", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ feats: [makeFeature({ id: "f-1", name: "War Caster", source: "feat" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("War Caster")).toBeInTheDocument()
    })

    it("shows action badge when actionKind is 'action'", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Action")).toBeInTheDocument()
    })

    it("shows bonus action badge when actionKind is 'bonus-action'", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Bonus Action")).toBeInTheDocument()
    })

    it("shows reaction badge when actionKind is 'reaction'", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Reaction")).toBeInTheDocument()
    })

    it("does not show an action badge when actionKind is not set", () => {
      render(
        <FeaturesModule
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
        <FeaturesModule
          character={makeCharacter({ classFeatures: "old text data" as never })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })

    it("renders no entries when classFeatures is undefined", () => {
      render(
        <FeaturesModule
          character={makeCharacter({ classFeatures: undefined })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("No class features added yet.")).toBeInTheDocument()
    })
  })

  describe("Add Class Feature modal", () => {
    it("opens the add modal when Add Class Feature is clicked", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const dialog = screen.getByRole("dialog")
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText("Add Class Feature")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when name is empty", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with new class feature on valid submit", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
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

    it("new class feature has actionKind='action' when Action is selected", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Action Surge" } })
      // Feature Type = Action reveals the "Action Kind" sub-select; pick "Action" there
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /action kind/i }))
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

    it("defaults actionKind to 'action' as soon as Feature Type is set to Action, without touching Action Kind", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Second Wind" } })
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      // Type/Range/Uses/Recharge should already be visible — no need to touch the Action Kind sub-select
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Second Wind", actionKind: "action" }),
          ]),
        })
      )
    })

    it("new class feature has actionKind='bonus-action' when Bonus Action is selected", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Cunning Action" } })
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /Action Kind/i }))
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
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
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
        <FeaturesModule
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
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      expect(screen.getByLabelText(/^name$/i)).toHaveValue("Action Surge")
    })

    it("pre-fills the form with existing feature description", () => {
      render(
        <FeaturesModule
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
        <FeaturesModule
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
        <FeaturesModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Action Surge", actionKind: undefined })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit action surge/i }))
      fireEvent.click(screen.getByRole("button", { name: /feature type/i }))
      fireEvent.click(screen.getByRole("option", { name: "Action" }))
      fireEvent.click(screen.getByRole("button", { name: /Action Kind/i }))
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
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByRole("combobox")).not.toBeInTheDocument() // type combobox hidden
      expect(within(modal).queryByLabelText(/^range$/i)).not.toBeInTheDocument()
      expect(within(modal).queryByLabelText(/max uses/i)).not.toBeInTheDocument()
      expect(within(modal).queryByLabelText(/recharge on/i)).not.toBeInTheDocument()
    })

    it("shows type/range/uses/recharge fields after selecting an actionKind", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /Action Kind/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      expect(within(modal).getByRole("combobox")).toBeInTheDocument() // type combobox
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
      expect(within(modal).getByLabelText(/max uses/i)).toBeInTheDocument()
      expect(within(modal).getByLabelText(/recharge on/i)).toBeInTheDocument()
    })

    it("saves range and rechargeOn when actionKind is set", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Lay on Hands" } })
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      fireEvent.click(within(modal).getByRole("button", { name: /Action Kind/i }))
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
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /edit lay on hands/i }))
      fireEvent.click(screen.getByRole("button", { name: /feature type/i }))
      fireEvent.click(screen.getByRole("option", { name: "None" }))
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
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /edit lay on hands/i }))
      expect(screen.getByLabelText(/^range$/i)).toHaveValue("Touch")
      expect(screen.getByLabelText(/max uses/i)).toHaveValue(5)
    })
  })

  describe("mechanical effect fields (Feature Type)", () => {
    it("shows no effect fields until a mechanical Feature Type is selected", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByRole("button", { name: /add level/i })).not.toBeInTheDocument()
      expect(within(modal).queryByRole("button", { name: /^spellcasting ability$/i })).not.toBeInTheDocument()
      expect(within(modal).queryByRole("button", { name: /^hit die$/i })).not.toBeInTheDocument()
    })

    it("does not persist levelEffects when no Feature Type is selected", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Second Wind" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Second Wind", actionKind: undefined, levelEffects: undefined }),
          ]),
        })
      )
    })

    describe("Spellcasting Ability / Hit Die (not level-dependent)", () => {
      it("shows only the Spellcasting Ability control, with no Add Level button", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Spellcasting Ability" }))
        expect(within(modal).getByRole("button", { name: /^spellcasting ability$/i })).toBeInTheDocument()
        expect(within(modal).queryByRole("button", { name: /add level/i })).not.toBeInTheDocument()
        expect(within(modal).queryByLabelText("Add skill")).not.toBeInTheDocument()
        expect(within(modal).queryByRole("checkbox", { name: "WIS" })).not.toBeInTheDocument()
        // the action-only fields must not appear for a mechanical Feature Type
        expect(within(modal).queryByLabelText(/^range$/i)).not.toBeInTheDocument()
      })

      it("persists a spellcasting ability grant with no At Level input", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Spellcasting" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Spellcasting Ability" }))
        expect(within(modal).queryByLabelText(/at level/i)).not.toBeInTheDocument()
        fireEvent.click(within(modal).getByRole("button", { name: /^spellcasting ability$/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Wisdom" }))
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Spellcasting",
                actionKind: undefined,
                level: undefined,
                levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }],
              }),
            ]),
          })
        )
      })

      it("shows only the Hit Die control, with no Add Level button", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Hit Die" }))
        expect(within(modal).getByRole("button", { name: /^hit die$/i })).toBeInTheDocument()
        expect(within(modal).queryByRole("button", { name: /add level/i })).not.toBeInTheDocument()
      })

      it("persists a hit die grant", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Draconic Resilience" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Hit Die" }))
        fireEvent.click(within(modal).getByRole("button", { name: /^hit die$/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "d10" }))
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Draconic Resilience",
                levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }],
              }),
            ]),
          })
        )
      })

      it("pre-fills and round-trips the Spellcasting Ability control when editing", () => {
        const onUpdate = vi.fn()
        const feature = makeFeature({
          name: "Spellcasting",
          levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }],
        })
        render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /edit spellcasting/i }))
        expect(screen.getByRole("button", { name: /^spellcasting ability$/i })).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Spellcasting",
                levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Saving Throw / Skill / Other Proficiency (level-tiered)", () => {
      it("shows the Add Level button after selecting a level-tiered Feature Type", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Saving Throw Proficiency" }))
        expect(within(modal).getByRole("button", { name: /add level/i })).toBeInTheDocument()
      })

      it("automatically adds a level 1 entry when a level-tiered Feature Type is selected", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Saving Throw Proficiency" }))
        expect(within(modal).getByRole("button", { name: /remove level 1 entry/i })).toBeInTheDocument()
        expect(within(modal).getByLabelText(/at level/i)).toHaveValue(1)
      })

      it("auto-adds a level 1 entry for a Saving Throw Proficiency grant, and removing it clears levelEffects", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Test" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Saving Throw Proficiency" }))
        fireEvent.click(within(modal).getByRole("button", { name: /remove level 1 entry/i }))
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({ name: "Test", levelEffects: undefined }),
            ]),
          })
        )
      })

      it("pre-fills the Feature Type and shows existing level effects when editing", () => {
        const feature = makeFeature({
          name: "Divine Sense",
          levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["wisdom"] } }],
        })
        render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /edit divine sense/i }))
        expect(screen.getByRole("button", { name: /add level/i })).toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: "WIS" })).toBeChecked()
      })

      it("round-trips levelEffects through edit and save unchanged", () => {
        const onUpdate = vi.fn()
        const feature = makeFeature({
          name: "Divine Sense",
          levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["wisdom"] } }],
        })
        render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /edit divine sense/i }))
        fireEvent.click(screen.getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Divine Sense",
                levelEffects: [{ level: 1, effects: { savingThrowProficiencies: ["wisdom"] } }],
              }),
            ]),
          })
        )
      })

      it("pressing Enter in the Add other proficiency input adds it without submitting the form", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Test" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Other Proficiency" }))
        const input = within(modal).getByLabelText(/add other proficiency/i)
        fireEvent.input(input, { target: { value: "Light Armor" } })
        fireEvent.keyDown(input, { key: "Enter" })
        expect(within(modal).getByText("Light Armor")).toBeInTheDocument()
        expect(within(modal).getByLabelText(/add other proficiency/i)).toHaveValue("")
        // the modal must still be open — Enter should not have submitted the form
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(onUpdate).not.toHaveBeenCalled()
      })

      it("pressing Enter in the Add skill input adds the selected skill without submitting the form", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Test" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Skill Proficiency" }))
        const input = within(modal).getByLabelText(/add skill/i)
        fireEvent.input(input, { target: { value: "Perception" } })
        fireEvent.keyDown(input, { key: "Enter" })
        expect(within(modal).getByText("Perception")).toBeInTheDocument()
        // the modal must still be open — Enter should not have submitted the form
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(onUpdate).not.toHaveBeenCalled()
      })
    })

    describe("Size (not level-dependent)", () => {
      it("shows only the Size control, with no Add Level button", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Size" }))
        expect(within(modal).getByRole("button", { name: /^size$/i })).toBeInTheDocument()
        expect(within(modal).queryByRole("button", { name: /add level/i })).not.toBeInTheDocument()
      })

      it("persists a size grant with no At Level input", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Powerful Build" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Size" }))
        expect(within(modal).queryByLabelText(/at level/i)).not.toBeInTheDocument()
        fireEvent.click(within(modal).getByRole("button", { name: /^size$/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Large" }))
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Powerful Build",
                levelEffects: [{ level: 1, effects: { size: "Large" } }],
              }),
            ]),
          })
        )
      })

      it("pre-fills and round-trips the Size control when editing", () => {
        const onUpdate = vi.fn()
        const feature = makeFeature({
          name: "Powerful Build",
          levelEffects: [{ level: 1, effects: { size: "Large" } }],
        })
        render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /edit powerful build/i }))
        expect(screen.getByRole("button", { name: /^size$/i })).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Powerful Build",
                levelEffects: [{ level: 1, effects: { size: "Large" } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Speed (level-tiered)", () => {
      it("shows the Add Level button and persists Walk/Fly values", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Fleet of Foot" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Speed" }))
        expect(within(modal).getByRole("button", { name: /add level/i })).toBeInTheDocument()
        fireEvent.input(within(modal).getByLabelText(/^walk$/i), { target: { value: "10" } })
        fireEvent.keyDown(within(modal).getByLabelText(/^walk$/i), { key: "Enter" })
        fireEvent.input(within(modal).getByLabelText(/^fly$/i), { target: { value: "30" } })
        fireEvent.keyDown(within(modal).getByLabelText(/^fly$/i), { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Fleet of Foot",
                levelEffects: [{ level: 1, effects: { speed: 10, flySpeed: 30 } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Senses (level-tiered)", () => {
      it("persists a Darkvision grant", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Darkvision" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Senses" }))
        fireEvent.input(within(modal).getByLabelText(/^darkvision$/i), { target: { value: "60" } })
        fireEvent.keyDown(within(modal).getByLabelText(/^darkvision$/i), { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Darkvision",
                levelEffects: [{ level: 1, effects: { senses: { darkvision: 60 } } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Damage Resistance/Immunity/Vulnerability (level-tiered)", () => {
      it("persists a granted damage resistance", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Dwarven Resilience" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Damage Resistance/Immunity/Vulnerability" }))
        const input = within(modal).getByLabelText(/^damage resistance$/i)
        fireEvent.input(input, { target: { value: "Poison" } })
        fireEvent.keyDown(input, { key: "Enter" })
        expect(within(modal).getByText("Poison")).toBeInTheDocument()
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Dwarven Resilience",
                levelEffects: [{ level: 1, effects: { resistances: ["Poison"] } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Condition Immunity (level-tiered)", () => {
      it("persists a granted condition immunity", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Fey Ancestry" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Condition Immunity" }))
        const input = within(modal).getByLabelText(/^condition immunity$/i)
        fireEvent.input(input, { target: { value: "Charmed" } })
        fireEvent.keyDown(input, { key: "Enter" })
        expect(within(modal).getByText("Charmed")).toBeInTheDocument()
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Fey Ancestry",
                levelEffects: [{ level: 1, effects: { conditionImmunities: ["Charmed"] } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Language (level-tiered)", () => {
      it("persists a granted language", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Draconic Ancestry" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Language" }))
        const input = within(modal).getByLabelText(/add language/i)
        fireEvent.input(input, { target: { value: "Draconic" } })
        fireEvent.keyDown(input, { key: "Enter" })
        expect(within(modal).getByText("Draconic")).toBeInTheDocument()
        // Enter should not have submitted the form
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(onUpdate).not.toHaveBeenCalled()
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Draconic Ancestry",
                levelEffects: [{ level: 1, effects: { languages: ["Draconic"] } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Carrying Capacity (level-tiered)", () => {
      it("persists a bonus and multiplier", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Powerful Build" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Carrying Capacity" }))
        const multiplierInput = within(modal).getByLabelText(/multiplier/i)
        fireEvent.input(multiplierInput, { target: { value: "2" } })
        fireEvent.keyDown(multiplierInput, { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Powerful Build",
                levelEffects: [{ level: 1, effects: { carryingCapacityMultiplier: 2 } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Ability Score Bonus (level-tiered)", () => {
      it("shows the Add Level button and persists a bonus to a Species Trait", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Hill Dwarf Toughness" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Ability Score Bonus" }))
        expect(within(modal).getByRole("button", { name: /add level/i })).toBeInTheDocument()
        const conBonus = within(modal).getByLabelText(/^con bonus$/i)
        fireEvent.input(conBonus, { target: { value: "2" } })
        fireEvent.keyDown(conBonus, { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Hill Dwarf Toughness",
                levelEffects: [{ level: 1, effects: { abilityScores: { constitution: 2 } } }],
              }),
            ]),
          })
        )
      })

      it("persists an ability score floor to a Feat", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add feat/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Boon of Combat Prowess" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Ability Score Bonus" }))
        const strFloor = within(modal).getByLabelText(/^str floor$/i)
        fireEvent.input(strFloor, { target: { value: "19" } })
        fireEvent.keyDown(strFloor, { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            feats: expect.arrayContaining([
              expect.objectContaining({
                name: "Boon of Combat Prowess",
                levelEffects: [{ level: 1, effects: { abilityScoreFloors: { strength: 19 } } }],
              }),
            ]),
          })
        )
      })

      it("persists a Background-granted ability score bonus (2024 Background ASI)", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add background feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Acolyte" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Ability Score Bonus" }))
        const wisBonus = within(modal).getByLabelText(/^wis bonus$/i)
        fireEvent.input(wisBonus, { target: { value: "2" } })
        fireEvent.keyDown(wisBonus, { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            backgroundFeatures: expect.arrayContaining([
              expect.objectContaining({
                name: "Acolyte",
                source: "background",
                levelEffects: [{ level: 1, effects: { abilityScores: { wisdom: 2 } } }],
              }),
            ]),
          })
        )
      })

      it("pre-fills the Feature Type and shows the existing bonus when editing", () => {
        const feature = makeFeature({
          name: "Hill Dwarf Toughness",
          source: "species-trait",
          levelEffects: [{ level: 1, effects: { abilityScores: { constitution: 2 } } }],
        })
        render(<FeaturesModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /edit hill dwarf toughness/i }))
        expect(screen.getByRole("button", { name: /add level/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/^con bonus$/i)).toHaveValue(2)
      })

      it("round-trips levelEffects through edit and save unchanged", () => {
        const onUpdate = vi.fn()
        const feature = makeFeature({
          name: "Hill Dwarf Toughness",
          source: "species-trait",
          levelEffects: [{ level: 1, effects: { abilityScores: { constitution: 2 } } }],
        })
        render(<FeaturesModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /edit hill dwarf toughness/i }))
        fireEvent.click(screen.getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Hill Dwarf Toughness",
                levelEffects: [{ level: 1, effects: { abilityScores: { constitution: 2 } } }],
              }),
            ]),
          })
        )
      })
    })

    describe("Max HP Bonus (level-tiered)", () => {
      it("shows the Add Level button and persists a per-level HP bonus to a Species Trait", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add species trait/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Dwarven Toughness" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Max HP Bonus" }))
        expect(within(modal).getByRole("button", { name: /add level/i })).toBeInTheDocument()
        const bonusInput = within(modal).getByLabelText(/max hp bonus/i)
        fireEvent.input(bonusInput, { target: { value: "1" } })
        fireEvent.keyDown(bonusInput, { key: "Enter" })
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Dwarven Toughness",
                levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
              }),
            ]),
          })
        )
      })

      it("pre-fills the Feature Type and shows the existing bonus when editing", () => {
        const feature = makeFeature({
          name: "Dwarven Toughness",
          source: "species-trait",
          levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
        })
        render(<FeaturesModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /edit dwarven toughness/i }))
        expect(screen.getByRole("button", { name: /add level/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/max hp bonus/i)).toHaveValue(1)
      })

      it("round-trips levelEffects through edit and save unchanged", () => {
        const onUpdate = vi.fn()
        const feature = makeFeature({
          name: "Dwarven Toughness",
          source: "species-trait",
          levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
        })
        render(<FeaturesModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /edit dwarven toughness/i }))
        fireEvent.click(screen.getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            speciesTraits: expect.arrayContaining([
              expect.objectContaining({
                name: "Dwarven Toughness",
                levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
              }),
            ]),
          })
        )
      })
    })

    it("clears level effects and action fields when switching the Feature Type", () => {
      const onUpdate = vi.fn()
      render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Test" } })
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Spellcasting Ability" }))
      fireEvent.click(within(modal).getByRole("button", { name: /^spellcasting ability$/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Wisdom" }))
      // switching away from Spellcasting Ability should drop the value that was just set
      fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      expect(within(modal).queryByRole("button", { name: /^spellcasting ability$/i })).not.toBeInTheDocument()
      expect(within(modal).getByRole("button", { name: /Action Kind/i })).toBeInTheDocument()
      fireEvent.click(within(modal).getByRole("button", { name: /Action Kind/i }))
      fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([
            expect.objectContaining({ name: "Test", actionKind: "action", levelEffects: undefined }),
          ]),
        })
      )
    })

    describe("Action At Level", () => {
      it("shows an At Level input defaulting to 1 when Feature Type is Action", () => {
        render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
        expect(within(modal).getByLabelText(/at level/i)).toHaveValue(1)
      })

      it("persists the At Level value on a new action feature", () => {
        const onUpdate = vi.fn()
        render(<FeaturesModule character={makeCharacter()} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /add class feature/i }))
        const modal = screen.getByRole("dialog")
        fireEvent.input(within(modal).getByLabelText(/^name$/i), { target: { value: "Extra Attack" } })
        fireEvent.click(within(modal).getByRole("button", { name: /feature type/i }))
        fireEvent.click(within(modal).getByRole("option", { name: "Action" }))
        const atLevel = within(modal).getByLabelText(/at level/i)
        fireEvent.input(atLevel, { target: { value: "5" } })
        fireEvent.blur(atLevel)
        fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            classFeatures: expect.arrayContaining([
              expect.objectContaining({ name: "Extra Attack", actionKind: "action", level: 5 }),
            ]),
          })
        )
      })

      it("pre-fills the At Level input when editing an existing action feature", () => {
        const feature = makeFeature({ name: "Extra Attack", actionKind: "action", level: 5 })
        render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: /edit extra attack/i }))
        expect(screen.getByLabelText(/at level/i)).toHaveValue(5)
      })
    })
  })

  describe("uses tracker in feature card", () => {
    it("shows pip tracker when feature has maxUses > 0", () => {
      const feature = makeFeature({ actionKind: "action", maxUses: 3, uses: 0 })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(3)
    })

    it("does not show pip tracker when feature has no maxUses", () => {
      const feature = makeFeature({ actionKind: "action" })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("reflects used pips correctly", () => {
      const feature = makeFeature({ actionKind: "action", maxUses: 3, uses: 1 })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Charge spent (click to restore)")).toHaveLength(1)
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with updated uses when pip is clicked", () => {
      const onUpdate = vi.fn()
      const feature = makeFeature({ id: "f-1", actionKind: "action", maxUses: 3, uses: 0 })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
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

  describe("spent hit dice tracker in feature card", () => {
    it("shows the pip tracker on the card of the feature currently granting hitDiceSize", () => {
      const feature = makeFeature({ name: "Hit Points", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature], level: 1, spentHitDice: 0 })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spent Hit Dice")).toBeInTheDocument()
      expect(screen.getAllByTitle("Hit die available")).toHaveLength(1)
    })

    it("does not show the tracker on a feature that doesn't grant hitDiceSize", () => {
      const feature = makeFeature({ name: "Action Surge" })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spent Hit Dice")).not.toBeInTheDocument()
    })

    it("does not show the tracker anywhere when no feature grants hitDiceSize", () => {
      render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spent Hit Dice")).not.toBeInTheDocument()
    })

    it("shows a stepper instead of pips when character level is above 5", () => {
      const feature = makeFeature({ name: "Hit Points", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature], level: 8, spentHitDice: 2 })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spent Hit Dice")).toBeInTheDocument()
      expect(screen.queryByTitle("Hit die available")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
    })

    it("calls onUpdate with the character's spentHitDice updated when a pip is clicked", () => {
      const onUpdate = vi.fn()
      const feature = makeFeature({ name: "Hit Points", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [feature], level: 1, spentHitDice: 0 })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByTitle("Hit die available")[0])
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ spentHitDice: 1 }))
    })

    it("shows the tracker only once when multiple features could grant hitDiceSize", () => {
      const featureA = makeFeature({ id: "f-a", name: "A", levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }] })
      const featureB = makeFeature({ id: "f-b", name: "B", levelEffects: [{ level: 1, effects: { hitDiceSize: 10 } }] })
      render(<FeaturesModule character={makeCharacter({ classFeatures: [featureA, featureB], level: 1 })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Hit die available")).toHaveLength(1)
    })
  })

  describe("Delete feature", () => {
    it("calls onUpdate with the feature removed", () => {
      const onUpdate = vi.fn()
      render(
        <FeaturesModule
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
        <FeaturesModule
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

  it("has no accessibility violations", async () => {
    const { container } = render(<FeaturesModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    const feature = makeFeature({ name: "Action Surge" })

    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(
        <ReadOnlyProvider value={true}>
          <FeaturesModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
    }

    it("does not render the Add Class Feature button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add class feature/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Species Trait button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add species trait/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Feat button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add feat/i })).not.toBeInTheDocument()
    })

    it("does not render edit buttons for existing features", () => {
      renderReadOnly({ classFeatures: [feature] })
      expect(screen.queryByRole("button", { name: /edit action surge/i })).not.toBeInTheDocument()
    })

    it("does not render delete buttons for existing features", () => {
      renderReadOnly({ classFeatures: [feature] })
      expect(screen.queryByRole("button", { name: /delete action surge/i })).not.toBeInTheDocument()
    })

    it("still renders the feature name", () => {
      renderReadOnly({ classFeatures: [feature] })
      expect(screen.getByText("Action Surge")).toBeInTheDocument()
    })
  })
})

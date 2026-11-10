import { axe } from "vitest-axe"
import { createStore, reconcile } from "solid-js/store"

import { SpellsModule } from "@/components/spells-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Spell, Equipment } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { render, screen, fireEvent, within, cleanupPortals, confirmClick, expectTapTooltip } from "../test-utils"

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: "spell-1",
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "A mote of fire.",
    prepared: false,
    known: true,
    ...overrides,
  }
}

function makeMagicItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "item-1",
    name: "Ring of Spell Storing",
    quantity: 1,
    weight: 0,
    description: "",
    equipped: true,
    type: "other",
    magic: true,
    requiresAttunement: true,
    attuned: true,
    ...overrides,
  }
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

describe("SpellsModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode — empty", () => {
    it("renders the Spells heading", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spells")).toBeInTheDocument()
    })

    it("renders the Add Spell button", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add spell/i })).toBeInTheDocument()
    })

    // Like Edit Slots beside Spell Slots: the button heads the section it adds to, not the module
    it("puts Add Spell beside the Spell List heading, above the search and the spells", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const add = screen.getByRole("button", { name: /add spell/i })
      const heading = screen.getByRole("heading", { name: "Spell List" })
      expect(screen.getByTestId("spells-module-content")).toContainElement(add)
      expect(add.parentElement).toContainElement(heading)
      expect(add.compareDocumentPosition(screen.getByTestId("spell-search-input")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it("shows the empty state message when no spells", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText(/no spells added yet/i)).toBeInTheDocument()
    })

    it("renders the Spell Slots heading", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spell Slots")).toBeInTheDocument()
    })

    it("shows 'No spell slots configured.' when all totals are 0", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No spell slots configured.")).toBeInTheDocument()
    })

    it("renders the search input", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText("Search spells...")).toBeInTheDocument()
    })
  })

  describe("view mode — with spells", () => {
    it("shows Spell Save DC stat bar when spells exist", () => {
      render(() => <SpellsModule character={makeCharacter({ spells: [makeSpell()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spell Save DC")).toBeInTheDocument()
    })

    it("shows prepared spell count", () => {
      render(() => <SpellsModule character={makeCharacter({ spells: [makeSpell()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Prepared Spells")).toBeInTheDocument()
    })

    it("does not show stat bar when there are no spells", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spell Save DC")).not.toBeInTheDocument()
    })

    it("renders a cantrip spell name (default expanded)", () => {
      render(() => (
        <SpellsModule character={makeCharacter({ spells: [makeSpell({ name: "Prestidigitation" })] })} onUpdate={vi.fn()} />
      ))
      expect(screen.getByText("Prestidigitation")).toBeInTheDocument()
    })

    it("renders the spell school badge", () => {
      render(() => (
        <SpellsModule character={makeCharacter({ spells: [makeSpell({ school: "Illusion" })] })} onUpdate={vi.fn()} />
      ))
      expect(screen.getByText("Illusion")).toBeInTheDocument()
    })

    it("filters spells by name — hides non-matching spells", () => {
      render(() => (
        <SpellsModule
          character={makeCharacter({
            spells: [
              makeSpell({ id: "s1", name: "Fire Bolt" }),
              makeSpell({ id: "s2", name: "Mage Hand", level: 0 }),
            ],
          })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.input(screen.getByPlaceholderText("Search spells..."), {
        target: { value: "fire bolt" },
      })
      expect(screen.getByText("Fire Bolt")).toBeInTheDocument()
      expect(screen.queryByText("Mage Hand")).not.toBeInTheDocument()
    })
  })

  describe("custom spell attack and save DC", () => {
    function makeSpellcaster(overrides: Partial<Character> = {}): Character {
      return makeCharacter({
        classFeatures: [{
          id: "spellcasting-1", name: "Spellcasting", description: "", source: "class-feature",
          levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }],
        }],
        abilityScores: { ...createDefaultCharacter().abilityScores, intelligence: 16 },
        proficiencyBonus: 3,
        spells: [makeSpell()],
        ...overrides,
      })
    }

    function clickEditButton() {
      fireEvent.click(screen.getByRole("button", { name: /^edit$/i }))
    }

    it("does not show an Edit button in view mode when read-only", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <SpellsModule character={makeSpellcaster()} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    })

    it("shows a custom-value toggle for spell attack and spell save DC in edit mode", () => {
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      clickEditButton()
      for (const id of ["spell-attack", "spell-save-dc"]) {
        expect(screen.getByTestId(`${id}-toggle`)).toBeInTheDocument()
      }
    })

    it("shows the stats while editing even when the character has no spells yet", () => {
      render(() => <SpellsModule character={makeSpellcaster({ spells: [] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spell Save DC")).not.toBeInTheDocument()
      clickEditButton()
      expect(screen.getByTestId("spell-save-dc-toggle")).toBeInTheDocument()
      expect(screen.getByTestId("spell-attack-toggle")).toBeInTheDocument()
    })

    it("keeps Add Spell available while editing", () => {
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /add spell/i })).toBeInTheDocument()
    })

    it("shows the ability-derived spell attack and save DC in view mode", () => {
      // INT 16 -> mod +3, prof +3 => spell attack +6, DC 8+3+3=14
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      expect(screen.getByText("+6")).toBeInTheDocument()
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("cascades an equipped ability-score-boosting item into spell attack and save DC", () => {
      const headband = makeMagicItem({ name: "Headband of Intellect", rarity: "rare", modifiers: { abilityScores: { intelligence: 2 } } })
      // INT 16 + item +2 = 18 -> mod +4, prof +3 => spell attack +7, DC 8+3+4=15
      render(() => <SpellsModule character={makeSpellcaster({ equipment: [headband] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("+7")).toBeInTheDocument()
      expect(screen.getByText("15")).toBeInTheDocument()
    })

    it("shows a NumericInput for spell attack once switched to custom in edit mode", () => {
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell attack/i }))
      expect(screen.getByRole("spinbutton", { name: /spell attack/i })).toBeInTheDocument()
    })

    it("saves a custom spell save DC override on save", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell save dc/i }))
      const input = screen.getByRole("spinbutton", { name: /spell save dc/i })
      fireEvent.input(input, { target: { value: "18" } })
      fireEvent.blur(input)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useCalculatedSpellSaveDC: false, spellSaveDC: 18 })
      )
    })

    it("saves the calculated spell attack value when the flag stays enabled", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeSpellcaster({ spellAttackBonus: 0 })} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useCalculatedSpellAttackBonus: true, spellAttackBonus: 6 })
      )
    })

    it("persists edits on Ctrl+S without leaving edit mode", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell save dc/i }))
      const input = screen.getByRole("spinbutton", { name: /spell save dc/i })
      fireEvent.input(input, { target: { value: "18" } })
      fireEvent.blur(input)
      fireEvent.keyDown(input, { key: "s", ctrlKey: true })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useCalculatedSpellSaveDC: false, spellSaveDC: 18 })
      )
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
    })

    it("discards an in-progress override when Cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell attack/i }))
      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.queryByRole("spinbutton", { name: /spell attack/i })).not.toBeInTheDocument()
    })

    it("drops the previous character's in-progress edits when the character is switched mid-edit", () => {
      // The sheet swaps characters in place (same mounted module, new id), so edits started on
      // one character must not be saved onto the next.
      const onUpdate = vi.fn()
      const [character, setCharacter] = createStore(
        makeSpellcaster({ id: "char-a", useCalculatedSpellSaveDC: false, spellSaveDC: 20 })
      )
      render(() => <SpellsModule character={character} onUpdate={onUpdate} />)
      clickEditButton()
      setCharacter(reconcile(makeSpellcaster({ id: "char-b", useCalculatedSpellSaveDC: false, spellSaveDC: 11 })))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "char-b", spellSaveDC: 11 }))
    })

    it("falls back to the calculated value instead of rendering 'undefined' when legacy data has no stored spellAttackBonus/spellSaveDC", () => {
      // Simulates legacy/partially-populated character data: the "use calculated" flags are off,
      // but the manual value was never persisted, so it's undefined at runtime.
      const char = makeSpellcaster({
        useCalculatedSpellAttackBonus: false,
        spellAttackBonus: undefined as unknown as number,
        useCalculatedSpellSaveDC: false,
        spellSaveDC: undefined as unknown as number,
      })
      render(() => <SpellsModule character={char} onUpdate={vi.fn()} />)
      clickEditButton()
      const attackInput = screen.getByRole("spinbutton", { name: /spell attack/i }) as HTMLInputElement
      const dcInput = screen.getByRole("spinbutton", { name: /spell save dc/i }) as HTMLInputElement
      expect(attackInput.value).toBe("6")
      expect(dcInput.value).toBe("14")
    })
  })

  describe("SpellSlotTracker integration", () => {
    it("renders slot circles when a level has total > 0", () => {
      const spellSlots = {
        ...createDefaultCharacter().spellSlots,
        1: { total: 2, used: 0 },
      }
      render(() => <SpellsModule character={makeCharacter({ spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getAllByLabelText("Available slot (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with incremented used count when a slot circle is clicked", () => {
      const onUpdate = vi.fn()
      const spellSlots = {
        ...createDefaultCharacter().spellSlots,
        1: { total: 2, used: 0 },
      }
      render(() => <SpellsModule character={makeCharacter({ spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByLabelText("Available slot (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }) }),
        })
      )
    })
  })

  describe("Add Spell modal", () => {
    it("opens the Add New Spell modal when Add Spell is clicked", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      expect(screen.getByText("Add New Spell")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when the spell name is empty", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with the new spell when valid name is submitted", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/spell name/i), {
        target: { value: "Lightning Bolt" },
      })
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ name: "Lightning Bolt" })]),
        })
      )
    })
  })

  describe("spell operations", () => {
    // In a list, "Edit spell" or "Delete spell" alone could be any of them
    it("names the spell each edit and delete button belongs to", () => {
      const spells = [makeSpell({ id: "a", name: "Fire Bolt" }), makeSpell({ id: "b", name: "Mage Hand" })]
      render(() => <SpellsModule character={makeCharacter({ spells })} onUpdate={vi.fn()} />)
      for (const name of ["Fire Bolt", "Mage Hand"]) {
        expect(screen.getByRole("button", { name: `Edit ${name}` })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: `Delete ${name}` })).toBeInTheDocument()
      }
      expect(screen.queryByRole("button", { name: "Edit spell" })).not.toBeInTheDocument()
    })

    it("calls onUpdate when a spell is deleted", () => {
      const onUpdate = vi.fn()
      const cantrip = makeSpell({ name: "Fire Bolt", level: 0 })
      render(() => <SpellsModule character={makeCharacter({ spells: [cantrip] })} onUpdate={onUpdate} />)
      // In view with one cantrip (expanded), buttons: Add Spell, Edit Slots, Edit (ghost), Delete (ghost)
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[buttons.length - 1]
      confirmClick(deleteButton)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ spells: [] })
      )
    })

    it("toggles prepared when a level 1 spell's name (the checkbox's label) is clicked", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "s1", name: "Fireball", level: 1, prepared: false, known: true })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByText("1st Level"))
      const name = screen.getByTestId("spell-name-s1")
      expect(name.tagName).toBe("LABEL")
      expect(screen.getByRole("heading", { name: "Fireball" })).toContainElement(name)
      fireEvent.click(name)
      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ spells: expect.arrayContaining([expect.objectContaining({ prepared: true })]) })
      )
    })

    it("toggles prepared state when the prepared checkbox is clicked for a level 1 spell", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "s1", name: "Fireball", level: 1, prepared: true, known: true })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
      const checkboxes = screen.getAllByRole("checkbox")
      fireEvent.click(checkboxes[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ prepared: false })]),
        })
      )
    })

    it("shows level 1 spells without clicking the header first", () => {
      const spell = makeSpell({ name: "Fireball", level: 1 })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fireball")).toBeInTheDocument()
    })

    it("toggles aria-expanded on the level header when clicked", () => {
      const spell = makeSpell({ name: "Fireball", level: 1 })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("1st Level").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })
  })

  describe("At Higher Level field", () => {
    it("renders the At Higher Level input in the Add Spell modal", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/at higher level/i)).toBeInTheDocument()
    })

    it("saves atHigherLevel when adding a spell with a value", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/spell name/i), { target: { value: "Fireball" } })
      fireEvent.input(within(modal).getByLabelText(/at higher level/i), { target: { value: "+1d6 per level" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([
            expect.objectContaining({ name: "Fireball", atHigherLevel: "+1d6 per level" }),
          ]),
        })
      )
    })

    it("pre-populates atHigherLevel in the Edit Spell modal", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, atHigherLevel: "+1d10 per level" })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[buttons.length - 2]) // Edit button (second-to-last)
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/at higher level/i)).toHaveValue("+1d10 per level")
    })

    it("saves the updated atHigherLevel when editing a spell", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ name: "Fire Bolt", level: 0, atHigherLevel: "+1d10 per level" })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[buttons.length - 2]) // Edit button
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/at higher level/i), { target: { value: "+2d6 per level" } })
      fireEvent.click(within(modal).getByRole("button", { name: /update spell/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([
            expect.objectContaining({ name: "Fire Bolt", atHigherLevel: "+2d6 per level" }),
          ]),
        })
      )
    })
  })

  describe("Edit Spell Slots modal", () => {
    it("opens the Edit Spell Slots modal when Edit Slots is clicked", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /edit slots/i }))
      expect(screen.getByText("Edit Spell Slots")).toBeInTheDocument()
    })

    it("calls onUpdate when a slot total is changed in the modal", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /edit slots/i }))
      const modal = screen.getByRole("dialog")
      // First spinbutton is the Level 1 total
      const spinbutton = within(modal).getAllByRole("spinbutton")[0]
      fireEvent.input(spinbutton, { target: { value: "3" } })
      fireEvent.blur(spinbutton)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ total: 3 }) }),
        })
      )
    })

    it("uses the shared stepper: + raises a level's slot total by one", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /edit slots/i }))
      fireEvent.click(screen.getByTestId("spell-slot-level-1-total-increase"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ total: 1 }) }),
        })
      )
      expect(screen.getByRole("spinbutton", { name: "Level 1 total slots" })).toBeInTheDocument()
    })
  })

  const bless = makeSpell({ id: "bless", name: "Bless", level: 1, prepared: true, concentration: true, duration: "Concentration, up to 1 minute" })
  const armor = makeSpell({ id: "armor", name: "Mage Armor", level: 1, prepared: true, duration: "8 hours" })

  describe("deleting a spell in effect", () => {
    beforeEach(() => cleanupPortals())

    it("ends the spell along with deleting it", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter({ spells: [bless, armor], activeSpellIds: ["bless", "armor"] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByText("1st Level"))
      confirmClick(screen.getByTestId("delete-spell-bless"))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ activeSpellIds: ["armor"] }))
    })
  })

  // Its card leaves the Actions module, which is where it's ended from
  describe("unpreparing a spell in effect", () => {
    it("ends a spell when it's unprepared", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter({ spells: [bless, armor], activeSpellIds: ["bless", "armor"] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepared: Bless/ }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ activeSpellIds: ["armor"] }))
    })

    it("ends a cantrip when it's no longer known", () => {
      const onUpdate = vi.fn()
      const guidance = makeSpell({ id: "guidance", name: "Guidance", concentration: true, duration: "Concentration, up to 1 minute" })
      render(() => <SpellsModule character={makeCharacter({ spells: [guidance, armor], activeSpellIds: ["guidance", "armor"] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /Known: Guidance/ }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ activeSpellIds: ["armor"] }))
    })
  })

  describe("concentration and ritual badges", () => {
    it("shows 'R' badge for a ritual spell, tooltipped 'Ritual'", async () => {
      const spell = makeSpell({ name: "Detect Magic", level: 1, ritual: true })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByText("1st Level"))
      await expectTapTooltip(screen.getByText("R"), "Ritual")
      expect(screen.getByRole("group", { name: "Ritual" })).toContainElement(screen.getByText("R"))
    })

    it("does not show C or R badges for a plain spell", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, concentration: false, ritual: false })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("C")).not.toBeInTheDocument()
      expect(screen.queryByText("R")).not.toBeInTheDocument()
    })
  })

  describe("concentration and ritual in edit form", () => {
    beforeEach(() => cleanupPortals())

    it("renders Concentration label in the add spell modal", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByText(/^concentration$/i)).toBeInTheDocument()
    })

    it("renders Ritual label in the add spell modal", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByText(/^ritual$/i)).toBeInTheDocument()
    })
  })

  describe("granted spells / free casts", () => {
    beforeEach(() => cleanupPortals())

    it("does not show the Granted By field when the character has no magic items", () => {
      render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByText(/granted by/i)).not.toBeInTheDocument()
    })

    it("saves grantedBy and freeCast when a magic item is selected", () => {
      const item = makeMagicItem()
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter({ equipment: [item] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/spell name/i), { target: { value: "Magic Missile" } })
      fireEvent.click(within(modal).getByLabelText(/granted by/i))
      fireEvent.click(screen.getByRole("option", { name: "Ring of Spell Storing" }))
      fireEvent.click(within(modal).getByText(/free cast/i))
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([
            expect.objectContaining({ name: "Magic Missile", grantedBy: "item-1", freeCast: true }),
          ]),
        })
      )
    })

    it("shows a 'Granted:' badge on a spell tagged with grantedBy", () => {
      const item = makeMagicItem()
      const spell = makeSpell({ name: "Identify", level: 1, grantedBy: item.id })
      render(() => <SpellsModule character={makeCharacter({ equipment: [item], spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByText("1st Level"))
      expect(screen.getByText(/granted: ring of spell storing/i)).toBeInTheDocument()
    })

    it("shows the Free Cast badge only when both grantedBy and freeCast are set", () => {
      const item = makeMagicItem()
      const spell = makeSpell({ name: "Identify", level: 1, grantedBy: item.id, freeCast: true })
      render(() => <SpellsModule character={makeCharacter({ equipment: [item], spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByText("1st Level"))
      expect(screen.getByText("Free Cast")).toBeInTheDocument()
    })

    it("does not show a Granted badge when the granting item no longer exists", () => {
      const spell = makeSpell({ name: "Identify", level: 1, grantedBy: "missing-item" })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByText("1st Level"))
      expect(screen.queryByText(/granted:/i)).not.toBeInTheDocument()
    })

    it("resolves the correct item when two magic items share the same display name", () => {
      const itemA = makeMagicItem({ id: "item-a", name: "Ring of Protection" })
      const itemB = makeMagicItem({ id: "item-b", name: "Ring of Protection" })
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter({ equipment: [itemA, itemB] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/spell name/i), { target: { value: "Shield" } })
      fireEvent.click(within(modal).getByLabelText(/granted by/i))
      const options = screen.getAllByRole("option", { name: "Ring of Protection" })
      fireEvent.click(options[1])
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ name: "Shield", grantedBy: "item-b" })]),
        })
      )
    })

    it("shows the 'Not item-granted' placeholder in the trigger after clearing a selection", () => {
      const item = makeMagicItem()
      render(() => <SpellsModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      const trigger = within(modal).getByLabelText(/granted by/i)
      fireEvent.click(trigger)
      fireEvent.click(screen.getByRole("option", { name: "Ring of Spell Storing" }))
      fireEvent.click(trigger)
      fireEvent.click(screen.getByRole("option", { name: /not item-granted/i }))
      expect(trigger).toHaveTextContent(/not item-granted/i)
    })
  })

  describe("combobox fields in spell form", () => {
    it("saves a custom spell school typed into the School combobox", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^spell name$/i), { target: { value: "Void Bolt" } })
      const schoolInput = within(modal).getAllByRole("combobox").find(
        (el) => (el as HTMLInputElement).value === "Evocation"
      )!
      fireEvent.focus(schoolInput)
      fireEvent.input(schoolInput, { target: { value: "Void" } })
      fireEvent.blur(schoolInput)
      fireEvent.click(within(modal).getByRole("button", { name: /^add spell$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ school: "Void" })]),
        })
      )
    })

    it("saves a custom casting time typed into the Casting Time combobox", () => {
      const onUpdate = vi.fn()
      render(() => <SpellsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^spell name$/i), { target: { value: "Slow Ritual" } })
      const castingTimeInput = within(modal).getAllByRole("combobox").find(
        (el) => (el as HTMLInputElement).value === "1 action"
      )!
      fireEvent.focus(castingTimeInput)
      fireEvent.input(castingTimeInput, { target: { value: "3 rounds" } })
      fireEvent.blur(castingTimeInput)
      fireEvent.click(within(modal).getByRole("button", { name: /^add spell$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ castingTime: "3 rounds" })]),
        })
      )
    })
  })

  describe("known / prepared checkbox logic", () => {
    it("shows 'Known' checkbox for cantrips (level 0) — not 'Prepared'", () => {
      const cantrip = makeSpell({ name: "Prestidigitation", level: 0, known: true })
      render(() => <SpellsModule character={makeCharacter({ spells: [cantrip] })} onUpdate={vi.fn()} />)
      // One checkbox visible: the Known toggle for the cantrip
      const checkboxes = screen.getAllByRole("checkbox")
      expect(checkboxes).toHaveLength(1)
    })

    it("shows 'Prepared' checkbox for level 1 spells — not a separate 'Known'", () => {
      const spell = makeSpell({ name: "Fireball", level: 1, known: true, prepared: false })
      render(() => <SpellsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      const checkboxes = screen.getAllByRole("checkbox")
      // One checkbox: the Prepared toggle
      expect(checkboxes).toHaveLength(1)
    })

    it("toggling known off for a cantrip sets known: false and prepared: false", () => {
      const onUpdate = vi.fn()
      const cantrip = makeSpell({ name: "Fire Bolt", level: 0, known: true, prepared: true })
      render(() => <SpellsModule character={makeCharacter({ spells: [cantrip] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("checkbox")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([
            expect.objectContaining({ known: false, prepared: false }),
          ]),
        })
      )
    })

    it("toggling known on for an unknown cantrip sets known: true", () => {
      const onUpdate = vi.fn()
      const cantrip = makeSpell({ name: "Fire Bolt", level: 0, known: false, prepared: false })
      render(() => <SpellsModule character={makeCharacter({ spells: [cantrip] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("checkbox")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ known: true })]),
        })
      )
    })
  })

  describe("search by description", () => {
    it("shows a spell whose description matches the search term even if the name does not", () => {
      render(() => (
        <SpellsModule
          character={makeCharacter({
            spells: [
              makeSpell({ id: "s1", name: "Fire Bolt", description: "A mote of fire." }),
              makeSpell({ id: "s2", name: "Mage Hand", level: 0, description: "A spectral hand." }),
            ],
          })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.input(screen.getByPlaceholderText("Search spells..."), {
        target: { value: "spectral" },
      })
      expect(screen.queryByText("Fire Bolt")).not.toBeInTheDocument()
      expect(screen.getByText("Mage Hand")).toBeInTheDocument()
    })
  })

  describe("spellcasting class (2014 only)", () => {
    it("renders the spellcasting class input in 2014 mode when spells exist", () => {
      const spell = makeSpell()
      render(() => <SpellsModule character={makeCharacter({ edition: "2014", spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText(/e\.g\. Wizard/i)).toBeInTheDocument()
    })

    it("does not render the spellcasting class input in 2024 mode", () => {
      const spell = makeSpell()
      render(() => <SpellsModule character={makeCharacter({ edition: "2024", spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.queryByPlaceholderText(/e\.g\. Wizard/i)).not.toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <SpellsModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    const spell = makeSpell({ id: "s1", name: "Fire Bolt", level: 0, known: true })
    const level1Spell = makeSpell({ id: "s2", name: "Fireball", level: 1, prepared: true, known: true })

    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(() => (
        <ReadOnlyProvider value={true}>
          <SpellsModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
    }

    it("does not render the Add Spell button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add spell/i })).not.toBeInTheDocument()
    })

    it("does not render the Edit Slots button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /edit slots/i })).not.toBeInTheDocument()
    })

    it("does not render per-spell edit and delete buttons", () => {
      renderReadOnly({ spells: [spell] })
      expect(screen.queryByRole("button", { name: /edit fire bolt/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /delete fire bolt/i })).not.toBeInTheDocument()
    })

    it("does not render known/prepared checkboxes", () => {
      renderReadOnly({ spells: [spell, level1Spell] })
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
    })

    it("still renders the spell name", () => {
      renderReadOnly({ spells: [spell] })
      expect(screen.getByText("Fire Bolt")).toBeInTheDocument()
    })

    it("still renders the search input", () => {
      renderReadOnly()
      expect(screen.getByPlaceholderText("Search spells...")).toBeInTheDocument()
    })

    it("does not show the 'Click Edit Slots' instruction when spell slots are empty", () => {
      renderReadOnly()
      expect(screen.getByText("No spell slots configured.")).toBeInTheDocument()
      expect(screen.queryByText(/click.*edit slots/i)).not.toBeInTheDocument()
    })

    it("renders spellcastingClass as static text for 2014-edition characters", () => {
      renderReadOnly({ edition: "2014", spells: [spell], spellcastingClass: "Wizard" })
      expect(screen.queryByRole("textbox", { name: /spellcasting class/i })).not.toBeInTheDocument()
      expect(screen.getByText("Wizard")).toBeInTheDocument()
    })

    it("does not render a spinbutton for spellcastingClass in 2014-edition read-only mode", () => {
      renderReadOnly({ edition: "2014", spells: [spell] })
      expect(screen.queryByPlaceholderText("e.g. Wizard")).not.toBeInTheDocument()
    })
  })
})

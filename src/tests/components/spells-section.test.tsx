import { render, screen, fireEvent, within } from "../test-utils"
import { SpellsSection } from "@/components/spells-section"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Spell } from "@/lib/character-types"

vi.mock("@/lib/character-storage", () => ({ saveCharacter: vi.fn() }))

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

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

function cleanupPortals() {
  // Kobalte portals modals into a body-level div and marks test-container siblings
  // aria-hidden when open. In jsdom, CSS animationend never fires so modals never
  // fully unmount — both the portal div and the hidden siblings accumulate. Remove
  // any body child that either is aria-hidden OR contains a [role="dialog"] element.
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
}

describe("SpellsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode — empty", () => {
    it("renders the Spells heading", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spells")).toBeInTheDocument()
    })

    it("renders the Add Spell button", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add spell/i })).toBeInTheDocument()
    })

    it("shows the empty state message when no spells", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText(/no spells added yet/i)).toBeInTheDocument()
    })

    it("renders the Spell Slots heading", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spell Slots")).toBeInTheDocument()
    })

    it("shows 'No spell slots configured.' when all totals are 0", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No spell slots configured.")).toBeInTheDocument()
    })

    it("renders the search input", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText("Search spells...")).toBeInTheDocument()
    })
  })

  describe("view mode — with spells", () => {
    it("shows Spell Save DC stat bar when spells exist", () => {
      render(<SpellsSection character={makeCharacter({ spells: [makeSpell()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spell Save DC")).toBeInTheDocument()
    })

    it("shows prepared spell count", () => {
      render(<SpellsSection character={makeCharacter({ spells: [makeSpell()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Prepared Spells")).toBeInTheDocument()
    })

    it("does not show stat bar when there are no spells", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spell Save DC")).not.toBeInTheDocument()
    })

    it("renders a cantrip spell name (default expanded)", () => {
      render(
        <SpellsSection character={makeCharacter({ spells: [makeSpell({ name: "Prestidigitation" })] })} onUpdate={vi.fn()} />
      )
      expect(screen.getByText("Prestidigitation")).toBeInTheDocument()
    })

    it("renders the spell school badge", () => {
      render(
        <SpellsSection character={makeCharacter({ spells: [makeSpell({ school: "Illusion" })] })} onUpdate={vi.fn()} />
      )
      expect(screen.getByText("Illusion")).toBeInTheDocument()
    })

    it("filters spells by name — hides non-matching spells", () => {
      render(
        <SpellsSection
          character={makeCharacter({
            spells: [
              makeSpell({ id: "s1", name: "Fire Bolt" }),
              makeSpell({ id: "s2", name: "Mage Hand", level: 0 }),
            ],
          })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.input(screen.getByPlaceholderText("Search spells..."), {
        target: { value: "fire bolt" },
      })
      expect(screen.getByText("Fire Bolt")).toBeInTheDocument()
      expect(screen.queryByText("Mage Hand")).not.toBeInTheDocument()
    })
  })

  describe("SpellSlotTracker integration", () => {
    it("renders slot circles when a level has total > 0", () => {
      const spellSlots = {
        ...createDefaultCharacter().spellSlots,
        1: { total: 2, used: 0 },
      }
      render(<SpellsSection character={makeCharacter({ spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with incremented used count when a slot circle is clicked", () => {
      const onUpdate = vi.fn()
      const spellSlots = {
        ...createDefaultCharacter().spellSlots,
        1: { total: 2, used: 0 },
      }
      render(<SpellsSection character={makeCharacter({ spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByTitle("Available slot (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }) }),
        })
      )
    })
  })

  describe("Add Spell modal", () => {
    it("opens the Add New Spell modal when Add Spell is clicked", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      expect(screen.getByText("Add New Spell")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when the spell name is empty", () => {
      const onUpdate = vi.fn()
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /add spell/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate and saveCharacter with the new spell when valid name is submitted", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
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
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("spell operations", () => {
    it("calls onUpdate and saveCharacter when a spell is deleted", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      const cantrip = makeSpell({ name: "Fire Bolt", level: 0 })
      render(<SpellsSection character={makeCharacter({ spells: [cantrip] })} onUpdate={onUpdate} />)
      // In view with one cantrip (expanded), buttons: Add Spell, Edit Slots, Edit (ghost), Delete (ghost)
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[buttons.length - 1]
      fireEvent.click(deleteButton)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ spells: [] })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("toggles prepared state when the prepared checkbox is clicked for a level 1 spell", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "s1", name: "Fireball", level: 1, prepared: true, known: true })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
      const checkboxes = screen.getAllByRole("checkbox")
      fireEvent.click(checkboxes[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spells: expect.arrayContaining([expect.objectContaining({ prepared: false })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("shows level 1 spells without clicking the header first", () => {
      const spell = makeSpell({ name: "Fireball", level: 1 })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fireball")).toBeInTheDocument()
    })

    it("toggles aria-expanded on the level header when clicked", () => {
      const spell = makeSpell({ name: "Fireball", level: 1 })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
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
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add spell/i })[0])
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/at higher level/i)).toBeInTheDocument()
    })

    it("saves atHigherLevel when adding a spell with a value", () => {
      const onUpdate = vi.fn()
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[buttons.length - 2]) // Edit button (second-to-last)
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/at higher level/i)).toHaveValue("+1d10 per level")
    })

    it("saves the updated atHigherLevel when editing a spell", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ name: "Fire Bolt", level: 0, atHigherLevel: "+1d10 per level" })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
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
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /edit slots/i }))
      expect(screen.getByText("Edit Spell Slots")).toBeInTheDocument()
    })

    it("calls onUpdate when a slot total is changed in the modal", () => {
      const onUpdate = vi.fn()
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /edit slots/i }))
      const modal = screen.getByRole("dialog")
      // First spinbutton is Level 1 total (title="Total slots")
      const spinbutton = within(modal).getAllByRole("spinbutton")[0]
      fireEvent.input(spinbutton, { target: { value: "3" } })
      fireEvent.blur(spinbutton)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ total: 3 }) }),
        })
      )
    })
  })

  describe("concentration and ritual badges", () => {
    it("shows 'R' badge for a ritual spell", () => {
      const spell = makeSpell({ name: "Detect Magic", level: 1, ritual: true })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByText("1st Level"))
      expect(screen.getByTitle("Ritual")).toBeInTheDocument()
      expect(screen.getByText("R")).toBeInTheDocument()
    })

    it("does not show C or R badges for a plain spell", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, concentration: false, ritual: false })
      render(<SpellsSection character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.queryByTitle("Concentration")).not.toBeInTheDocument()
      expect(screen.queryByTitle("Ritual")).not.toBeInTheDocument()
    })
  })

  describe("concentration and ritual in edit form", () => {
    beforeEach(() => cleanupPortals())

    it("renders Concentration label in the add spell modal", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByText(/^concentration$/i)).toBeInTheDocument()
    })

    it("renders Ritual label in the add spell modal", () => {
      render(<SpellsSection character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add spell/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByText(/^ritual$/i)).toBeInTheDocument()
    })
  })

  describe("combobox fields in spell form", () => {
    it("saves a custom spell school typed into the School combobox", () => {
      const onUpdate = vi.fn()
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<SpellsSection character={makeCharacter()} onUpdate={onUpdate} />)
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

  describe("spellcasting class (2014 only)", () => {
    it("renders the spellcasting class input in 2014 mode when spells exist", () => {
      const spell = makeSpell()
      render(<SpellsSection character={makeCharacter({ edition: "2014", spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText(/e\.g\. Wizard/i)).toBeInTheDocument()
    })

    it("does not render the spellcasting class input in 2024 mode", () => {
      const spell = makeSpell()
      render(<SpellsSection character={makeCharacter({ edition: "2024", spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.queryByPlaceholderText(/e\.g\. Wizard/i)).not.toBeInTheDocument()
    })
  })
})

import { axe } from "vitest-axe"
import { createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import userEvent from "@testing-library/user-event"

import { ActionsModule } from "@/components/actions-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Attack, BonusAction, Reaction, Spell, Feature, Equipment, ActionType } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { cleanup, render, screen, fireEvent, within, waitFor, cleanupPortals, confirmClick, finishClosing } from "../test-utils"

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

function makeAttack(overrides: Partial<Attack> = {}): Attack {
  return {
    id: "atk-1",
    name: "Longsword",
    type: "attack",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "slashing",
    range: "5 ft",
    description: "",
    ...overrides,
  }
}

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: "sp-1",
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "",
    prepared: false,
    known: true,
    ...overrides,
  }
}

describe("ActionsModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode", () => {
    it("renders the Actions & Attacks heading", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions & Attacks")).toBeInTheDocument()
    })

    it("renders Actions, Bonus Actions, and Reactions section headings", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions")).toBeInTheDocument()
      expect(screen.getByText("Bonus Actions")).toBeInTheDocument()
      expect(screen.getByText("Reactions")).toBeInTheDocument()
    })

    it("does not render the Spell Attack, Spell Modifier, and Spell Save DC stats: each spell card shows its own", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Spell Attack")).not.toBeInTheDocument()
      expect(screen.queryByText("Spell Modifier")).not.toBeInTheDocument()
      expect(screen.queryByText("Spell Save DC")).not.toBeInTheDocument()
    })

    it("does not render an Attack Bonus stat", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Attack Bonus")).not.toBeInTheDocument()
    })

    it("renders the Add Action, Add Bonus Action, Add Reaction, Add Other buttons", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add action/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add bonus action/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add reaction/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add other/i })).toBeInTheDocument()
    })

    it("opens the Add Other modal when Add Other is clicked and saves a new other action", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add other/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/other name/i), { target: { value: "Sneak Attack" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add other/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          otherActions: expect.arrayContaining([expect.objectContaining({ name: "Sneak Attack" })]),
        })
      )
    })

    it("renders an existing other action's name", () => {
      const other = { id: "o1", name: "Sneak Attack", type: "ability" as ActionType, description: "", uses: 0, maxUses: 0 }
      render(() => <ActionsModule character={makeCharacter({ otherActions: [other] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Sneak Attack")).toBeInTheDocument()
    })

    it("renders an existing attack's name", () => {
      render(() => (
        <ActionsModule character={makeCharacter({ attacks: [makeAttack({ name: "Longsword" })] })} onUpdate={vi.fn()} />
      ))
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("shows the attack damage string", () => {
      render(() => (
        <ActionsModule character={makeCharacter({ attacks: [makeAttack({ damage: "2d6+4" })] })} onUpdate={vi.fn()} />
      ))
      expect(screen.getByText(/2d6\+4/)).toBeInTheDocument()
    })
  })

  describe("spell attack and save badges", () => {
    // INT 16 -> mod +3, prof +3 => spell attack +6, DC 8+3+3=14
    function makeSpellcaster(overrides: Partial<Character> = {}): Character {
      return makeCharacter({
        classFeatures: [{
          id: "spellcasting-1", name: "Spellcasting", description: "", source: "class-feature",
          levelEffects: [{ level: 1, effects: { spellcastingAbility: "intelligence" } }],
        }],
        abilityScores: { ...createDefaultCharacter().abilityScores, intelligence: 16 },
        proficiencyBonus: 3,
        ...overrides,
      })
    }
    const badge = (part: string) => screen.getByTestId(`action-card-action-spell-sp-1-${part}`)
    const tooltipTrigger = (part: string) => badge(part).closest('[data-sem="tooltip-trigger"]')!

    it("shows the character's spell attack bonus on a spell with an attack roll, explained in a tooltip", async () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackRoll: true })] })} onUpdate={vi.fn()} />)
      expect(badge("attack-badge")).toHaveTextContent("Attack+6")
      fireEvent.focus(tooltipTrigger("attack-badge"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("+3 (Int) + 3 (Prof)"))
    })

    it("shows no attack badge on a spell without an attack roll", () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell()] })} onUpdate={vi.fn()} />)
      expect(screen.queryByTestId("action-card-action-spell-sp-1-attack-badge")).not.toBeInTheDocument()
    })

    it("shows a save ability with the character's spell save DC, explained in a tooltip", async () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackSave: "dex" })] })} onUpdate={vi.fn()} />)
      expect(badge("attack-save-badge")).toHaveTextContent("DEX SaveDC 14")
      fireEvent.focus(tooltipTrigger("attack-save-badge"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("8 + 3 (Prof) + 3 (Int)"))
    })

    it("shows both badges on a spell with an attack roll and a save, attack first", () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackRoll: true, attackSave: "CON" })] })} onUpdate={vi.fn()} />)
      const attack = badge("attack-badge")
      const save = badge("attack-save-badge")
      expect(attack.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it("shows custom spell attack and save DC values, with a Custom tooltip", async () => {
      const character = makeSpellcaster({
        spells: [makeSpell({ attackRoll: true, attackSave: "WIS" })],
        useCalculatedSpellAttackBonus: false, spellAttackBonus: 9,
        useCalculatedSpellSaveDC: false, spellSaveDC: 17,
      })
      render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
      expect(badge("attack-badge")).toHaveTextContent("Attack+9")
      expect(badge("attack-save-badge")).toHaveTextContent("WIS SaveDC 17")
      fireEvent.focus(tooltipTrigger("attack-save-badge"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Custom"))
    })

    // Regression: "STR/Athletics" was shown as plain text, without the DC
    it("gives a save written out from its ability the character's DC, keeping the text", async () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackSave: "STR/Athletics" })] })} onUpdate={vi.fn()} />)
      expect(badge("attack-save-badge")).toHaveTextContent("STR/AthleticsDC 14")
      expect(screen.getByRole("group", { name: "STR/Athletics DC 14" })).toContainElement(badge("attack-save-badge"))
      fireEvent.focus(tooltipTrigger("attack-save-badge"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("8 + 3 (Prof) + 3 (Int)"))
    })

    it("replaces a DC typed into the save with the character's", () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackSave: "DEX save DC 13" })] })} onUpdate={vi.fn()} />)
      expect(badge("attack-save-badge")).toHaveTextContent("DEX saveDC 14")
      expect(badge("attack-save-badge")).not.toHaveTextContent("13")
    })

    it("shows Attack/Save text that names no ability as written, without a DC or tooltip", () => {
      render(() => <ActionsModule character={makeSpellcaster({ spells: [makeSpell({ attackSave: "Special" })] })} onUpdate={vi.fn()} />)
      expect(badge("attack-save-badge")).toHaveTextContent("Attack/SaveSpecial")
      expect(badge("attack-save-badge").closest('[data-sem="tooltip-trigger"]')).toBeNull()
    })
  })

  describe("edit mode", () => {
    function clickEditButton() {
      fireEvent.click(screen.getByRole("button", { name: /^edit$/i }))
    }

    it("does not show an Edit button in view mode when read-only", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    })

    it("leaves the character unchanged when saved", () => {
      const onUpdate = vi.fn()
      const character = makeCharacter({ useCalculatedSpellSaveDC: false, spellSaveDC: 18 })
      render(() => <ActionsModule character={character} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(character)
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument()
    })

    it("leaves edit mode when Cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument()
    })
  })

  describe("SpellSlotTracker integration", () => {
    it("renders slot circles for levels with total > 0", () => {
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 3, used: 1 } }
      render(() => <ActionsModule character={makeCharacter({ spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getAllByLabelText("Used slot (click to restore)")).toHaveLength(1)
      expect(screen.getAllByLabelText("Available slot (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with incremented used count when a slot circle is clicked", () => {
      const onUpdate = vi.fn()
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(() => <ActionsModule character={makeCharacter({ spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByLabelText("Available slot (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }) }),
        })
      )
    })
  })

  describe("Add Action modal", () => {
    it("opens the Add Custom Action modal when Add Action is clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      expect(screen.getByText("Add Custom Action")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^cancel$/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when the action name is empty", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with the new action (including UUID) on valid submit", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^action name$/i), { target: { value: "Lay on Hands" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          attacks: expect.arrayContaining([
            expect.objectContaining({ name: "Lay on Hands", id: expect.stringMatching(/^test-uuid-/) }),
          ]),
        })
      )
    })

    it("shows the Range field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })

    it("does not show the Trigger field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByLabelText(/^trigger$/i)).not.toBeInTheDocument()
    })
  })

  describe("Delete attack", () => {
    it("calls onUpdate without the deleted attack when delete is confirmed via edit modal", async () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({ attacks: [makeAttack({ name: "Longsword" })] })}
          onUpdate={onUpdate}
        />
      ))
      // Edit is in the card's expanded view
      fireEvent.click(screen.getByRole("button", { name: "Longsword" }))
      fireEvent.click(screen.getByRole("button", { name: /edit longsword/i }))
      finishClosing(screen.getByRole("dialog", { name: "Longsword" }))
      const modal = await screen.findByRole("dialog", { name: "Edit Action" })
      confirmClick(within(modal).getByRole("button", { name: /^delete$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ attacks: [] })
      )
    })
  })

  describe("Add Bonus Action modal", () => {
    it("opens the Add Custom Bonus Action modal", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      expect(screen.getByText("Add Custom Bonus Action")).toBeInTheDocument()
    })

    it("does not add a bonus action when name is empty", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^add bonus action$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with a valid bonus action", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^bonus action name$/i), {
        target: { value: "Second Wind" },
      })
      fireEvent.click(within(modal).getByRole("button", { name: /^add bonus action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          bonusActions: expect.arrayContaining([expect.objectContaining({ name: "Second Wind" })]),
        })
      )
    })

    it("shows the Range field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })

    it("does not show the Trigger field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByLabelText(/^trigger$/i)).not.toBeInTheDocument()
    })
  })

  describe("Add Reaction modal", () => {
    it("opens the Add Custom Reaction modal", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      expect(screen.getByText("Add Custom Reaction")).toBeInTheDocument()
    })

    it("does not add a reaction when trigger is empty", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^reaction name$/i), { target: { value: "Shield" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add reaction$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("does not add a reaction when name is empty", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^trigger$/i), { target: { value: "When hit" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add reaction$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with a valid reaction when both name and trigger are provided", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^reaction name$/i), { target: { value: "Shield" } })
      fireEvent.input(within(modal).getByLabelText(/^trigger$/i), {
        target: { value: "When targeted by an attack" },
      })
      fireEvent.click(within(modal).getByRole("button", { name: /^add reaction$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reactions: expect.arrayContaining([
            expect.objectContaining({ name: "Shield", trigger: "When targeted by an attack" }),
          ]),
        })
      )
    })

    it("shows the Trigger field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^trigger$/i)).toBeInTheDocument()
    })

    it("shows the Range field", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })
  })

  describe("Spell display", () => {
    it("shows prepared 1-action spells in the Actions section", () => {
      const spell = makeSpell({ name: "Eldritch Blast", level: 0, castingTime: "1 action", known: true })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Eldritch Blast")).toBeInTheDocument()
    })

    it("shows prepared bonus-action spells in the Bonus Actions section", () => {
      const spell = makeSpell({ name: "Healing Word", level: 1, castingTime: "1 bonus action", prepared: true, known: true })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Healing Word")).toBeInTheDocument()
    })

    it("renders an enabled Cast button for a non-cantrip when slots are available", () => {
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).not.toBeDisabled()
    })

    it("renders a disabled Cast button when no slots remain", () => {
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 2 } }
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).toBeDisabled()
    })

    it("calls onUpdate with incremented used count when Cast is clicked", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /cast/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }) }),
        })
      )
    })

    // Regression: freeCast spells (item-granted, no-slot-cost) previously used the same
    // canCast/onCast path as normal spells, so they gated on and consumed a real slot
    // exactly like any other prepared spell.
    it("keeps a freeCast spell castable even when all slots at its level are used", () => {
      const spell = makeSpell({ id: "sp-free", name: "Free Fireball", level: 1, castingTime: "1 action", prepared: true, known: true, freeCast: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 1, used: 1 } }
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).not.toBeDisabled()
    })

    it("does not consume a spell slot when casting a freeCast spell", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "sp-free", name: "Free Fireball", level: 1, castingTime: "1 action", prepared: true, known: true, freeCast: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 1, used: 1 } }
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /cast/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe("casting at a higher level", () => {
    function makeUpcastSpell(overrides: Partial<Spell> = {}): Spell {
      return makeSpell({
        id: "sp-upcast",
        name: "Magic Missile",
        level: 1,
        castingTime: "1 action",
        prepared: true,
        known: true,
        atHigherLevel: "+1d4+1 per level",
        ...overrides,
      })
    }

    function makeCharacterWithUpcast({
      level1Used = 0,
      level2Total = 1,
      level2Used = 0,
      spellOverrides = {} as Partial<Spell>,
    } = {}): Character {
      return makeCharacter({
        spells: [makeUpcastSpell(spellOverrides)],
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 2, used: level1Used },
          2: { total: level2Total, used: level2Used },
        },
      })
    }

    const slotSelect = () => screen.getByRole("combobox", { name: "Cast Magic Missile at level" })
    const castButton = () => screen.getByRole("button", { name: "Cast Magic Missile" })

    it("shows At Higher Levels in the spell's expanded view", () => {
      render(() => <ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Magic Missile" }))
      expect(within(screen.getByRole("dialog")).getByText("+1d4+1 per level")).toBeInTheDocument()
    })

    it("offers no slot-level select when atHigherLevel is not set", () => {
      render(() => <ActionsModule character={makeCharacterWithUpcast({ spellOverrides: { atHigherLevel: undefined } })} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("combobox", { name: /at level/i })).not.toBeInTheDocument()
    })

    it("offers no slot-level select when the character has no higher-level spell slots", () => {
      render(() => <ActionsModule character={makeCharacterWithUpcast({ level2Total: 0 })} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("combobox", { name: /at level/i })).not.toBeInTheDocument()
    })

    it("offers no slot-level select for a free cast", () => {
      render(() => <ActionsModule character={makeCharacterWithUpcast({ spellOverrides: { grantedBy: "item-1", freeCast: true } })} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("combobox", { name: /at level/i })).not.toBeInTheDocument()
    })

    it("defaults the select to the spell's own level and casts with that slot", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacterWithUpcast()} onUpdate={onUpdate} />)
      expect(slotSelect()).toHaveTextContent("1st")
      fireEvent.click(castButton())
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }), 2: expect.objectContaining({ used: 0 }) }),
      }))
    })

    it("casts with a chosen higher slot, leaving the base slot alone", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacterWithUpcast()} onUpdate={onUpdate} />)
      fireEvent.click(slotSelect())
      fireEvent.click(screen.getByRole("option", { name: "2nd" }))
      fireEvent.click(castButton())
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 0 }), 2: expect.objectContaining({ used: 1 }) }),
      }))
    })

    it("still lists a spent higher level, as unavailable", () => {
      render(() => <ActionsModule character={makeCharacterWithUpcast({ level2Used: 1 })} onUpdate={vi.fn()} />)
      fireEvent.click(slotSelect())
      expect(screen.getByRole("option", { name: "2nd no slots" })).toHaveClass("text-muted-foreground")
    })

    it("lists only the spell's own level and those above it", () => {
      const char = makeCharacter({
        spells: [makeUpcastSpell({ level: 2 })],
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 2, used: 0 },
          2: { total: 2, used: 0 },
          3: { total: 1, used: 0 },
        },
      })
      render(() => <ActionsModule character={char} onUpdate={vi.fn()} />)
      fireEvent.click(slotSelect())
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["2nd", "3rd"])
    })

    // TESTING.md §6: a spell cast as a bonus action or a reaction is listed in both sections, so
    // each copy needs its own hooks, and choosing a level on one must not change the other
    it("keeps a spell listed in two sections apart by section", () => {
      const char = makeCharacter({
        spells: [makeUpcastSpell({ castingTime: "1 bonus action or 1 reaction" })],
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 2, used: 0 },
          2: { total: 1, used: 0 },
        },
      })
      render(() => <ActionsModule character={char} onUpdate={vi.fn()} />)
      const bonusSelect = screen.getByTestId("action-card-bonus-spell-sp-upcast-slot-select")
      const reactionSelect = screen.getByTestId("action-card-reaction-spell-sp-upcast-slot-select")
      fireEvent.click(bonusSelect)
      fireEvent.click(screen.getByRole("option", { name: "2nd" }))
      expect(bonusSelect).toHaveTextContent("2nd")
      expect(reactionSelect).toHaveTextContent("1st")
    })
  })

  describe("Action uses tracker", () => {
    function makeBonusAction(overrides: Partial<BonusAction> = {}): BonusAction {
      return { id: "ba-1", name: "Second Wind", type: "ability", description: "", ...overrides }
    }

    function makeReaction(overrides: Partial<Reaction> = {}): Reaction {
      return { id: "rx-1", name: "Shield", type: "ability", description: "", trigger: "When hit", ...overrides }
    }

    describe("BonusAction with maxUses <= 5", () => {
      it("renders pip buttons when maxUses = 3", () => {
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 3 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(3)
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
      })

      it("clicking a pip calls onUpdate with incremented uses on the correct bonus action", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 3 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusActions: expect.arrayContaining([expect.objectContaining({ id: "ba-1", uses: 1 })]),
          })
        )
      })
    })

    describe("BonusAction with maxUses > 5", () => {
      it("renders stepper +/- buttons when maxUses = 8", () => {
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 8 })] })} onUpdate={vi.fn()} />)
        expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
      })

      it("clicking + (more available) calls onUpdate with uses - 1", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 2, maxUses: 8 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /increase/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusActions: expect.arrayContaining([expect.objectContaining({ id: "ba-1", uses: 1 })]),
          })
        )
      })

      it("clicking - (fewer available) calls onUpdate with uses + 1", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 2, maxUses: 8 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusActions: expect.arrayContaining([expect.objectContaining({ id: "ba-1", uses: 3 })]),
          })
        )
      })
    })

    describe("BonusAction with maxUses = 0", () => {
      it("renders no tracker UI", () => {
        render(() => <ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 0 })] })} onUpdate={vi.fn()} />)
        expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
      })
    })

    describe("Reaction with maxUses <= 5", () => {
      it("renders pip buttons when maxUses = 2", () => {
        render(() => <ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 2 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(2)
      })

      it("clicking a pip calls onUpdate with incremented uses on the correct reaction", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 2 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            reactions: expect.arrayContaining([expect.objectContaining({ id: "rx-1", uses: 1 })]),
          })
        )
      })
    })

    describe("Reaction with maxUses = 0", () => {
      it("renders no tracker UI", () => {
        render(() => <ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 0 })] })} onUpdate={vi.fn()} />)
        expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
      })
    })

    describe("Attack with maxUses", () => {
      it("renders 2 pip buttons on an attack card with maxUses = 2", () => {
        render(() => <ActionsModule character={makeCharacter({ attacks: [makeAttack({ uses: 0, maxUses: 2 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(2)
      })

      it("clicking a pip calls onUpdate with updated uses on the attack", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ attacks: [makeAttack({ uses: 0, maxUses: 2 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            attacks: expect.arrayContaining([expect.objectContaining({ id: "atk-1", uses: 1 })]),
          })
        )
      })
    })
  })

  describe("combobox fields in action form", () => {
    it("saves a custom action type typed into the Type combobox", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^action name$/i), { target: { value: "Bardic Inspiration" } })
      const typeInput = within(modal).getAllByRole("combobox").find((el) => !el.closest("label[for]") && (el as HTMLInputElement).value !== "Bardic Inspiration")!
      fireEvent.focus(typeInput)
      fireEvent.input(typeInput, { target: { value: "Bardic Resource" } })
      fireEvent.blur(typeInput)
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          attacks: expect.arrayContaining([expect.objectContaining({ type: "Bardic Resource" })]),
        })
      )
    })

    it("saves a predefined action type selected from the dropdown", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^action name$/i), { target: { value: "Rage" } })
      const typeInput = within(modal).getAllByRole("combobox").find((el) => (el as HTMLInputElement).value !== "Rage")!
      fireEvent.focus(typeInput)
      fireEvent.click(within(modal).getByRole("option", { name: "Ability" }))
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          attacks: expect.arrayContaining([expect.objectContaining({ type: "Ability" })]),
        })
      )
    })

    it("saves a custom damage type when type is attack", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^action name$/i), { target: { value: "Claw" } })
      // Set type to Attack to reveal damage fields
      const typeInput = within(modal).getAllByRole("combobox").find((el) => (el as HTMLInputElement).value !== "Claw")!
      fireEvent.focus(typeInput)
      fireEvent.click(within(modal).getByRole("option", { name: "Attack" }))
      // Now set a custom damage type (find by its default value "Slashing")
      const damageTypeInput = within(modal).getAllByRole("combobox").find(
        (el) => (el as HTMLInputElement).value === "Slashing"
      )!
      fireEvent.focus(damageTypeInput)
      fireEvent.input(damageTypeInput, { target: { value: "Void" } })
      fireEvent.blur(damageTypeInput)
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          attacks: expect.arrayContaining([expect.objectContaining({ damageType: "Void" })]),
        })
      )
    })
  })

  describe("rechargeOn field in action form", () => {
    it("renders a 'Recharge On' select in the Add Action modal", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/recharge on/i)).toBeInTheDocument()
    })

    it("submits the action with rechargeOn undefined when None is selected (default)", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^action name$/i), { target: { value: "Strike" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          attacks: expect.arrayContaining([
            expect.objectContaining({ name: "Strike", rechargeOn: undefined }),
          ]),
        })
      )
    })
  })

  describe("Feature-derived actions", () => {
    function makeFeature(overrides: Partial<Feature> = {}): Feature {
      return {
        id: "feat-1",
        name: "Action Surge",
        description: "Take an extra action.",
        source: "class-feature",
        ...overrides,
      }
    }

    it("feature with actionKind='action' appears in the Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Action Surge")).toBeInTheDocument()
    })

    it("feature with actionKind='bonus-action' appears in the Bonus Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Cunning Action", actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Cunning Action")).toBeInTheDocument()
    })

    it("feature with actionKind='reaction' appears in the Reactions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Uncanny Dodge", actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Uncanny Dodge")).toBeInTheDocument()
    })

    it("feature without actionKind does not appear in the actions grid", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Expertise", actionKind: undefined })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.queryByText("Expertise")).not.toBeInTheDocument()
    })

    it("action feature granted at a later level is hidden below that level", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ level: 3, classFeatures: [makeFeature({ name: "Extra Attack", actionKind: "action", level: 5 })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.queryByText("Extra Attack")).not.toBeInTheDocument()
    })

    it("action feature granted at a later level appears once the character reaches that level", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ level: 5, classFeatures: [makeFeature({ name: "Extra Attack", actionKind: "action", level: 5 })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Extra Attack")).toBeInTheDocument()
    })

    it("species trait with actionKind='action' appears in the Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "t-1", name: "Breath Weapon", source: "species-trait", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Breath Weapon")).toBeInTheDocument()
    })

    it("feat with actionKind='action' appears in the Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ feats: [makeFeature({ id: "f-1", name: "Shield Master", source: "feat", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Shield Master")).toBeInTheDocument()
    })

    it("shows source badge for class feature action", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getAllByText("Class Feature").length).toBeGreaterThanOrEqual(1)
    })

    it("renders the uses tracker for a repeatable (per-level) max uses feature using the computed total", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({
            level: 3,
            classFeatures: [makeFeature({
              name: "Lay on Hands", actionKind: "action",
              maxUsesMode: "per-level", maxUsesPerLevel: 5, uses: 0,
            })],
          })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue("15")).toBeInTheDocument()
    })

    it("feature description is shown in the card", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", description: "Take an extra action." })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Take an extra action.")).toBeInTheDocument()
    })

    it("shows range in the feature card stats row", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", range: "30 ft" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
    })

    it("shows pip tracker when feature has maxUses > 0", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", maxUses: 3, uses: 0 })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(3)
    })

    it("does not show pip tracker when feature has no maxUses", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("clicking pip calls onUpdate with updated classFeatures uses", () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ id: "cf-1", actionKind: "action", maxUses: 3, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([expect.objectContaining({ id: "cf-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated speciesTraits uses", () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "st-1", source: "species-trait", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          speciesTraits: expect.arrayContaining([expect.objectContaining({ id: "st-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated feats uses", () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({ feats: [makeFeature({ id: "ft-1", source: "feat", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          feats: expect.arrayContaining([expect.objectContaining({ id: "ft-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated backgroundFeatures uses", () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({ backgroundFeatures: [makeFeature({ id: "bg-1", source: "background", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundFeatures: expect.arrayContaining([expect.objectContaining({ id: "bg-1", uses: 1 })]),
        })
      )
    })

    it("feature with range shows Range: label in stats row", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", range: "30 ft" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/Range:/i)).toBeInTheDocument()
    })

    it("feature detail popover opens and shows full description", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", description: "Take an extra action on your turn." })] })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.click(screen.getByRole("button", { name: "Action Surge" }))
      expect(within(screen.getByRole("dialog")).getByText("Take an extra action on your turn.")).toBeInTheDocument()
    })
  })

  describe("Equipment-derived actions", () => {
    function makeConsumable(overrides: Partial<Equipment> = {}): Equipment {
      return {
        id: "item-1",
        name: "Potion of Healing",
        quantity: 1,
        weight: 0.5,
        description: "Restores hit points.",
        equipped: false,
        type: "consumable",
        ...overrides,
      }
    }

    describe("a weapon used as an action", () => {
      const flameTongue = (overrides: Partial<Equipment> = {}): Equipment => ({
        id: "mw-1", name: "Flame Tongue", quantity: 1, weight: 3, description: "", equipped: true, type: "weapon",
        magic: true, maxUses: 3, charges: 1, rechargeOn: "long-rest", actionKind: "action",
        weaponStats: { damage: "1d8", damageType: "Slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
        ...overrides,
      })
      const cards = () => [...document.querySelectorAll<HTMLElement>('li[data-test^="action-card-"]')].map((li) => li.dataset.test)

      it("is one card when equipped, its weapon card, which tracks the item's charges", () => {
        const onUpdate = vi.fn()
        render(() => <ActionsModule character={makeCharacter({ equipment: [flameTongue()] })} onUpdate={onUpdate} />)
        expect(cards()).toEqual(["action-card-weapon-mw-1"])
        expect(screen.getByTestId("action-card-weapon-mw-1-uses")).toBeInTheDocument()

        // One of three charges spent: using another spends two
        fireEvent.click(within(screen.getByTestId("action-card-weapon-mw-1-uses")).getAllByRole("button")[1])

        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ equipment: [expect.objectContaining({ id: "mw-1", charges: 2 })] }))
      })

      // You can't stab someone with a dagger that's still in your pack: it's only in the inventory
      it.each(["action", "bonus-action", "reaction", "other"] as const)("has no card at all when not equipped (used as %s)", (actionKind) => {
        render(() => <ActionsModule character={makeCharacter({ equipment: [flameTongue({ equipped: false, actionKind })] })} onUpdate={vi.fn()} />)
        expect(cards()).toEqual([])
      })

      it("used as another kind of action, keeps its card in that section beside its weapon card", () => {
        render(() => <ActionsModule character={makeCharacter({ equipment: [flameTongue({ actionKind: "bonus-action" })] })} onUpdate={vi.fn()} />)
        expect(cards()).toEqual(["action-card-weapon-mw-1", "action-card-item-mw-1"])
        expect(screen.queryByTestId("action-card-weapon-mw-1-uses")).not.toBeInTheDocument()
      })
    })

    it("item with actionKind='action' appears in the Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Scroll of Fireball", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Scroll of Fireball")).toBeInTheDocument()
    })

    it("item with actionKind='bonus-action' appears in the Bonus Actions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Potion of Healing")).toBeInTheDocument()
    })

    it("item with actionKind='reaction' appears in the Reactions subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Ring of Parrying", actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Ring of Parrying")).toBeInTheDocument()
    })

    it("item with actionKind='other' appears in the Other subsection", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Bag of Tricks", actionKind: "other" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Bag of Tricks")).toBeInTheDocument()
    })

    it("item without actionKind does not appear in the actions grid", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Rope", actionKind: undefined })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.queryByText("Rope")).not.toBeInTheDocument()
    })

    it("shows the item type badge on the derived equipment action card", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Consumable")).toBeInTheDocument()
    })

    it("marks each available use on an equipment action card with a backpack, as the inventory does", () => {
      render(() => (
        <ActionsModule
          character={makeCharacter({
            equipment: [makeConsumable({ id: "item-2", actionKind: "bonus-action", maxUses: 3, consumedUses: 0 })],
          })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getAllByLabelText("Charge available (click to use)")[0].querySelector(".lucide-backpack")).not.toBeNull()
    })

    it("clicking the uses tracker on an equipment action card updates the item's uses", () => {
      const onUpdate = vi.fn()
      render(() => (
        <ActionsModule
          character={makeCharacter({
            equipment: [makeConsumable({ id: "item-2", actionKind: "bonus-action", maxUses: 3, consumedUses: 0 })],
          })}
          onUpdate={onUpdate}
        />
      ))
      const pips = screen.getAllByLabelText("Charge available (click to use)")
      fireEvent.click(pips[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ id: "item-2", consumedUses: 1 })]),
        })
      )
    })
  })

  describe("expanded view in section context", () => {
    it("shows a spell's casting time", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, castingTime: "1 action", known: true })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Fire Bolt" }))
      expect(within(screen.getByRole("dialog")).getByText(/1 action/)).toBeInTheDocument()
    })

    it("shows a spell's school", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, school: "Evocation", known: true })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Fire Bolt" }))
      expect(within(screen.getByRole("dialog")).getByText("School:").parentElement).toHaveTextContent("School: Evocation")
    })

    it("names the item that grants a spell, and its free cast", () => {
      const ring: Equipment = { id: "ring-1", name: "Ring of Shielding", quantity: 1, weight: 0, description: "", equipped: true, type: "other", magic: true }
      const spell = makeSpell({ name: "Shield", level: 1, castingTime: "1 reaction", prepared: true, grantedBy: "ring-1", freeCast: true })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell], equipment: [ring] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Shield" }))
      const view = screen.getByRole("dialog")
      expect(within(view).getByText("Granted By:").parentElement).toHaveTextContent("Granted By: Ring of Shielding")
      expect(within(view).getByText("Free Cast")).toBeInTheDocument()
    })

    it("shows the level a feature is gained at", () => {
      const feature: Feature = { id: "f-1", name: "Action Surge", description: "", source: "class-feature", actionKind: "action", level: 2 }
      render(() => <ActionsModule character={makeCharacter({ level: 5, classFeatures: [feature] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Action Surge" }))
      expect(within(screen.getByRole("dialog")).getByText("At Level:").parentElement).toHaveTextContent("At Level: 2")
    })

    it("shows an item's rarity, attunement, and quantity", () => {
      const wand: Equipment = {
        id: "wand-1", name: "Wand of Web", quantity: 2, weight: 1, description: "", equipped: true, type: "other",
        magic: true, rarity: "very-rare", requiresAttunement: true, attuned: false, actionKind: "action",
      }
      render(() => <ActionsModule character={makeCharacter({ equipment: [wand] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Wand of Web" }))
      const view = screen.getByRole("dialog")
      expect(within(view).getByText("Rarity:").parentElement).toHaveTextContent("Rarity: Very Rare")
      expect(within(view).getByText("Attunement:").parentElement).toHaveTextContent("Attunement: Required, not attuned")
      expect(within(view).getByText("Quantity:").parentElement).toHaveTextContent("Quantity: 2")
    })

    // Its uses are its quantity, already shown as Max Uses
    it("shows no quantity for a consumable without charges", () => {
      const potion: Equipment = { id: "p-1", name: "Potion of Healing", quantity: 3, weight: 0.5, description: "", equipped: false, type: "consumable", actionKind: "action" }
      render(() => <ActionsModule character={makeCharacter({ equipment: [potion] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Potion of Healing" }))
      const view = screen.getByRole("dialog")
      expect(within(view).queryByText("Quantity:")).not.toBeInTheDocument()
      expect(within(view).getByText("Max Uses:").parentElement).toHaveTextContent("Max Uses: 3")
    })

    it("shows an equipped weapon's rarity and attunement", () => {
      const sword: Equipment = {
        id: "wpn-9", name: "Flame Tongue", quantity: 1, weight: 3, description: "", equipped: true, type: "weapon",
        magic: true, rarity: "rare", requiresAttunement: true, attuned: true,
        weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
      }
      render(() => <ActionsModule character={makeCharacter({ equipment: [sword] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Flame Tongue" }))
      const view = screen.getByRole("dialog")
      expect(within(view).getByText("Rarity:").parentElement).toHaveTextContent("Rarity: Rare")
      expect(within(view).getByText("Attunement:").parentElement).toHaveTextContent("Attunement: Attuned")
    })
  })

  describe("effect pills", () => {
    it("shows gain pill for a spell with gain", () => {
      const spell = makeSpell({ name: "Cure Wounds", level: 1, castingTime: "1 action", prepared: true, gain: "1d8+3" })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("1d8+3")).toBeInTheDocument()
    })
  })

  describe("derived weapon attacks from equipped equipment", () => {
    function makeWeaponEquipment(overrides: Partial<Equipment> = {}): Equipment {
      return {
        id: "wpn-1",
        name: "Longsword",
        quantity: 1,
        weight: 3,
        description: "",
        equipped: true,
        type: "weapon",
        weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
        ...overrides,
      }
    }

    it("renders equipped weapon name in Actions section", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("shows 'Weapon' badge on derived attack card", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Weapon")).toBeInTheDocument()
    })

    it("does not show a delete button on derived weapon attack", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /delete longsword/i })).not.toBeInTheDocument()
    })

    it("does not render weapon when not equipped", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment({ equipped: false })] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Longsword")).not.toBeInTheDocument()
    })

    it("does not render weapon when weaponStats is absent", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment({ weaponStats: undefined })] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Longsword")).not.toBeInTheDocument()
    })

    it("explains the weapon's damage in a tooltip that follows a change to the ability score", async () => {
      const [character, setCharacter] = createStore(makeCharacter({ equipment: [makeWeaponEquipment()] }))
      setCharacter("abilityScores", "strength", 16)
      render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
      const pillTrigger = () => screen.getByTestId("action-card-weapon-wpn-1-damage-badge").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.focus(pillTrigger())
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("1d8 + 3 (Str)"))
      // The derived attack is rebuilt, so its card (and the open tooltip) is replaced.
      setCharacter("abilityScores", "strength", 18)
      fireEvent.focus(pillTrigger())
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("1d8 + 4 (Str)"))
    })

    it("explains the weapon's attack bonus in a tooltip", async () => {
      const character = makeCharacter({ equipment: [makeWeaponEquipment()], proficiencyBonus: 2 })
      character.abilityScores = { ...character.abilityScores, strength: 16 }
      render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
      fireEvent.focus(screen.getByTestId("action-card-weapon-wpn-1-attack-badge").closest('[data-sem="tooltip-trigger"]')!)
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("+3 (Str) + 2 (Prof)"))
    })
  })

  describe("collapsible section headers", () => {
    it("renders all four section headers", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions")).toBeInTheDocument()
      expect(screen.getByText("Bonus Actions")).toBeInTheDocument()
      expect(screen.getByText("Reactions")).toBeInTheDocument()
      expect(screen.getByText("Other")).toBeInTheDocument()
    })

    it("shows action content by default (sections start expanded)", () => {
      const attack = makeAttack({ name: "Longsword" })
      render(() => <ActionsModule character={makeCharacter({ attacks: [attack] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("all section trigger buttons start with aria-expanded=true", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Bonus Actions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Reactions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Other").closest("button")).toHaveAttribute("aria-expanded", "true")
    })

    it("toggles aria-expanded on the Actions trigger when clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Actions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })

    it("toggles aria-expanded on the Bonus Actions trigger when clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Bonus Actions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("toggles aria-expanded on the Reactions trigger when clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Reactions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("toggles aria-expanded on the Other trigger when clicked", () => {
      render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Other").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    describe("when the character is switched in place", () => {
      beforeEach(() => localStorage.clear())
      afterEach(() => localStorage.clear())

      it("keeps each character's collapsed sections separate", () => {
        const [character, setCharacter] = createStore(makeCharacter({ id: "char-a" }))
        render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
        const trigger = screen.getByText("Actions").closest("button")!
        fireEvent.click(trigger)
        expect(trigger).toHaveAttribute("aria-expanded", "false")

        setCharacter(reconcile(makeCharacter({ id: "char-b" })))
        expect(trigger).toHaveAttribute("aria-expanded", "true")

        setCharacter(reconcile(makeCharacter({ id: "char-a" })))
        expect(trigger).toHaveAttribute("aria-expanded", "false")
      })
    })

    it("shows a count badge of 1 in the Actions section when one attack is present", () => {
      const attack = makeAttack({ name: "Longsword" })
      render(() => <ActionsModule character={makeCharacter({ attacks: [attack] })} onUpdate={vi.fn()} />)
      const actionsHeader = screen.getByText("Actions").closest("button")!
      expect(within(actionsHeader).getByText("1")).toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("has no accessibility violations with an equipped weapon's calculated attack and damage", async () => {
    const longsword: Equipment = {
      id: "wpn-1", name: "Longsword", quantity: 1, weight: 3, description: "", equipped: true, type: "weapon",
      weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
    }
    const { container } = render(() => <ActionsModule character={makeCharacter({ equipment: [longsword] })} onUpdate={vi.fn()} />)
    expect(screen.getByTestId("action-card-weapon-wpn-1-attack-badge")).toBeInTheDocument()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(() => (
        <ReadOnlyProvider value={true}>
          <ActionsModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
    }

    it("does not render the Add Action button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add action/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Bonus Action button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add bonus action/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Reaction button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add reaction/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Other button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add other/i })).not.toBeInTheDocument()
    })

    it("still renders existing action cards", () => {
      renderReadOnly({ attacks: [makeAttack({ name: "Longsword" })] })
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })
  })

  describe("new card fields from each source", () => {
    const weapon: Equipment = {
      id: "wpn-1", name: "Sword of Wounding", quantity: 1, weight: 3, description: "", equipped: true, type: "weapon", highlights: "Wounds **stack**",
      weaponStats: { damage: "2d6", damageType: "slashing", damageRecurring: true, weaponRange: "5 ft", attackAbility: "str", proficient: true },
    }
    const potion: Equipment = {
      id: "pot-1", name: "Potion of Healing", quantity: 1, weight: 0.5, description: "", equipped: false, type: "consumable",
      actionKind: "bonus-action", gain: "2d4+2", gainType: "Healing", highlights: "Drink it",
    }
    const feature: Feature = {
      id: "ft-1", name: "Breath Weapon", description: "", source: "species-trait", actionKind: "action",
      attackSave: "DEX save DC 13", damage: "2d6", damageType: "Fire", highlights: "15 ft cone",
    }

    it("shows a spell's damage type, recurring damage and highlights", () => {
      const spell = makeSpell({ name: "Acid Arrow", level: 2, prepared: true, damage: "4d4", damageType: "Acid", damageRecurring: true, highlights: "Then **2d4**" })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      const badge = screen.getByTestId("action-card-action-spell-sp-1-damage-badge")
      expect(badge).toHaveTextContent("4d4")
      expect(badge).toHaveTextContent("Acid")
      expect(within(badge).getByText(", recurs each turn")).toBeInTheDocument()
      expect(within(screen.getByTestId("action-card-action-spell-sp-1")).getByText("2d4").tagName).toBe("STRONG")
    })

    it("shows a weapon's recurring damage and its item's highlights", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [weapon] })} onUpdate={vi.fn()} />)
      expect(within(screen.getByTestId("action-card-weapon-wpn-1-damage-badge")).getByText(", recurs each turn")).toBeInTheDocument()
      expect(within(screen.getByTestId("action-card-weapon-wpn-1")).getByText("stack")).toBeInTheDocument()
    })

    it("shows a potion's healing", () => {
      render(() => <ActionsModule character={makeCharacter({ equipment: [potion] })} onUpdate={vi.fn()} />)
      const badge = screen.getByTestId("action-card-item-pot-1-gain-badge")
      expect(badge).toHaveTextContent("2d4+2")
      expect(badge).toHaveTextContent("Healing")
    })

    it("shows a feature's attack/save, damage and highlights", () => {
      render(() => <ActionsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      const card = screen.getByTestId("action-card-feature-ft-1")
      expect(within(card).getByText(/DEX save DC 13/)).toBeInTheDocument()
      expect(within(card).getByTestId("action-card-feature-ft-1-damage-badge")).toHaveTextContent("Fire")
      expect(within(card).getByText("15 ft cone")).toBeInTheDocument()
    })

    it("shows a custom action's gain", () => {
      render(() => <ActionsModule character={makeCharacter({ bonusActions: [{ id: "ba-1", name: "Second Wind", type: "ability", description: "", gain: "1d10+5", gainType: "Healing" }] })} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("action-card-bonus-ba-1-gain-badge")).toHaveTextContent("1d10+5")
    })

    it("saves highlights and gain from the custom action form", () => {
      const onUpdate = vi.fn()
      render(() => <ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/bonus action name/i), { target: { value: "Second Wind" } })
      fireEvent.input(within(modal).getByLabelText("Highlights"), { target: { value: "Heal *yourself*" } })
      fireEvent.input(within(modal).getByLabelText("Gain"), { target: { value: "1d10" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add bonus action/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        bonusActions: [expect.objectContaining({ name: "Second Wind", highlights: "Heal *yourself*", gain: "1d10", gainRecurring: undefined })],
      }))
    })
  })

  describe("Edit from every card", () => {
    // The form opens once the expanded view has finished closing
    const openEditFor = async (name: string, form: string) => {
      fireEvent.click(screen.getByRole("button", { name }))
      fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }))
      finishClosing(screen.getByRole("dialog", { name }))
      return screen.findByRole("dialog", { name: form })
    }

    it("edits a spell in the spell form and saves it to the spell list", async () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ name: "Fire Bolt", highlights: "Old" })
      render(() => <ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={onUpdate} />)
      const modal = await openEditFor("Fire Bolt", "Edit Spell")
      expect(within(modal).getByLabelText("Highlights")).toHaveValue("Old")
      fireEvent.input(within(modal).getByLabelText("Highlights"), { target: { value: "New" } })
      fireEvent.click(within(modal).getByTestId("spell-form-submit"))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ spells: [expect.objectContaining({ id: "sp-1", highlights: "New" })] }))
    })

    it("edits a feature in the feature form and saves it to its source's list", async () => {
      const onUpdate = vi.fn()
      const feature: Feature = { id: "ft-1", name: "Second Wind", description: "", source: "class-feature", featureType: "Action", actionKind: "bonus-action" }
      render(() => <ActionsModule character={makeCharacter({ classFeatures: [feature] })} onUpdate={onUpdate} />)
      const modal = await openEditFor("Second Wind", "Edit Class Feature")
      fireEvent.input(within(modal).getByLabelText("Gain"), { target: { value: "1d10" } })
      fireEvent.click(within(modal).getByRole("button", { name: /save/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        classFeatures: [expect.objectContaining({ id: "ft-1", gain: "1d10", source: "class-feature" })],
      }))
    })

    it("edits an equipped weapon in the item form", async () => {
      const onUpdate = vi.fn()
      const sword: Equipment = {
        id: "wpn-1", name: "Longsword", quantity: 1, weight: 3, description: "", equipped: true, type: "weapon",
        weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
      }
      render(() => <ActionsModule character={makeCharacter({ equipment: [sword] })} onUpdate={onUpdate} />)
      const modal = await openEditFor("Longsword", "Edit Item")
      fireEvent.click(within(modal).getByRole("checkbox", { name: "Damage recurs each turn" }))
      fireEvent.click(within(modal).getByRole("button", { name: /update item/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        equipment: [expect.objectContaining({ id: "wpn-1", weaponStats: expect.objectContaining({ damageRecurring: true }) })],
      }))
    })

    it("edits an item used as an action in the item form", async () => {
      const onUpdate = vi.fn()
      const potion: Equipment = { id: "pot-1", name: "Potion of Healing", quantity: 2, weight: 0.5, description: "", equipped: false, type: "consumable", actionKind: "action" }
      render(() => <ActionsModule character={makeCharacter({ equipment: [potion] })} onUpdate={onUpdate} />)
      const modal = await openEditFor("Potion of Healing", "Edit Item")
      fireEvent.input(within(modal).getByLabelText("Gain"), { target: { value: "2d4+2" } })
      fireEvent.click(within(modal).getByRole("button", { name: /update item/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ equipment: [expect.objectContaining({ id: "pot-1", gain: "2d4+2", quantity: 2 })] }))
    })

    it("offers no Edit on any card when read-only", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <ActionsModule character={makeCharacter({ spells: [makeSpell()] })} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      fireEvent.click(screen.getByRole("button", { name: "Fire Bolt" }))
      expect(screen.queryByRole("button", { name: /^edit/i })).not.toBeInTheDocument()
    })
  })

  describe("card layout: order and More", () => {
    const a1 = makeAttack({ id: "a1", name: "Longsword" })
    const a2 = makeAttack({ id: "a2", name: "Dagger" })
    const a3 = makeAttack({ id: "a3", name: "Shove" })

    /** Renders the module with a character that each update replaces, as the sheet does. */
    function renderLive(initial: Character) {
      const [character, setCharacter] = createSignal(initial)
      const onUpdate = vi.fn((next: Character) => setCharacter(next))
      render(() => <ActionsModule character={character()} onUpdate={onUpdate} />)
      return { onUpdate, character }
    }
    const cards = () => [...document.querySelectorAll<HTMLElement>('li[data-test^="action-card-"]')].map((li) => li.dataset.test)
    /** The Actions section's cards either side of its "More" heading (edit mode) or toggle (view mode). */
    const parts = (divider: HTMLElement) => {
      const main: (string | undefined)[] = [], more: (string | undefined)[] = []
      for (const li of document.querySelectorAll<HTMLElement>('li[data-test^="action-card-"]')) {
        (divider.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_FOLLOWING ? more : main).push(li.dataset.test)
      }
      return { main, more }
    }
    const startEditing = () => fireEvent.click(screen.getByRole("button", { name: /^edit$/i }))
    const save = () => fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    afterEach(() => {
      localStorage.clear()
    })

    describe("view mode", () => {
      it("shows each source's cards in the default order when there's no stored layout", () => {
        const feature: Feature = { id: "f1", name: "Action Surge", source: "class-feature", description: "", actionKind: "action" }
        render(() => <ActionsModule character={makeCharacter({ attacks: [a1], spells: [makeSpell()], classFeatures: [feature] })} onUpdate={vi.fn()} />)
        expect(cards()).toEqual(["action-card-action-spell-sp-1", "action-card-feature-f1", "action-card-attack-a1"])
        expect(screen.queryByTestId("actions-action-more-toggle")).not.toBeInTheDocument()
      })

      it("follows the stored order, read-only too", () => {
        render(() => (
          <ReadOnlyProvider value={true}>
            <ActionsModule character={makeCharacter({ attacks: [a1, a2], spells: [makeSpell()], actionLayout: { action: { main: ["custom:a2", "spell:sp-1", "custom:a1"] } } })} onUpdate={vi.fn()} />
          </ReadOnlyProvider>
        ))
        expect(cards()).toEqual(["action-card-attack-a2", "action-card-action-spell-sp-1", "action-card-attack-a1"])
      })

      it("puts cards added since the layout was saved at the end of the shown cards, never under More", () => {
        render(() => <ActionsModule character={makeCharacter({ attacks: [a1, a2, a3], actionLayout: { action: { main: ["custom:a2"], more: ["custom:a1"] } } })} onUpdate={vi.fn()} />)
        const toggle = screen.getByTestId("actions-action-more-toggle")
        fireEvent.click(toggle)
        expect(parts(toggle)).toEqual({ main: ["action-card-attack-a2", "action-card-attack-a3"], more: ["action-card-attack-a1"] })
      })

      it("keeps set-aside cards under a collapsed More list, named for the section and counting its cards", () => {
        render(() => <ActionsModule character={makeCharacter({ attacks: [a1, a2], actionLayout: { action: { main: ["custom:a1"], more: ["custom:a2"] } } })} onUpdate={vi.fn()} />)
        const toggle = screen.getByTestId("actions-action-more-toggle")
        expect(toggle).toHaveAttribute("aria-expanded", "false")
        expect(toggle).toHaveTextContent("More actions1")

        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByTestId("action-card-attack-a2")).toBeVisible()
      })

      it("remembers an opened More list for the character", () => {
        const character = makeCharacter({ id: "char-more", attacks: [a1, a2], actionLayout: { action: { more: ["custom:a2"] } } })
        render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
        fireEvent.click(screen.getByTestId("actions-action-more-toggle"))
        cleanup()

        render(() => <ActionsModule character={character} onUpdate={vi.fn()} />)
        expect(screen.getByTestId("actions-action-more-toggle")).toHaveAttribute("aria-expanded", "true")
      })

      it("counts set-aside cards in the section's total", () => {
        render(() => <ActionsModule character={makeCharacter({ attacks: [a1, a2], actionLayout: { action: { more: ["custom:a2"] } } })} onUpdate={vi.fn()} />)
        expect(screen.getByText("Actions").closest("button")).toHaveTextContent("Actions2")
      })
    })

    describe("edit mode", () => {
      it("shows both parts, with reorder controls in place of each card's own", () => {
        const limited = makeAttack({ id: "a1", name: "Longsword", maxUses: 3 })
        renderLive(makeCharacter({ attacks: [limited] }))
        expect(screen.getByTestId("action-card-attack-a1-uses")).toBeInTheDocument()

        startEditing()

        expect(screen.queryByTestId("action-card-attack-a1-uses")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Reorder Longsword" })).toBeInTheDocument()
        expect(screen.getByTestId("actions-action-more-heading")).toHaveTextContent("More actions0")
        expect(screen.getByTestId("actions-action-more-empty")).toHaveTextContent("Move cards here to keep them out of the way.")
      })

      it("doesn't open a card's expanded view: the card is dragged instead", () => {
        renderLive(makeCharacter({ attacks: [a1] }))
        startEditing()

        fireEvent.click(screen.getByTestId("action-card-attack-a1"))

        expect(screen.queryByRole("button", { name: "Longsword" })).not.toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })

      it("marks the More list as where set-aside cards go", () => {
        renderLive(makeCharacter({ attacks: [a1] }))
        startEditing()
        expect(screen.getByTestId("actions-action-more-list")).toContainElement(screen.getByTestId("actions-action-more-empty"))
      })

      it("moves a card with its arrow buttons, disabled at the ends of the section", () => {
        renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()
        expect(screen.getByRole("button", { name: "Move Longsword earlier" })).toBeDisabled()

        fireEvent.click(screen.getByRole("button", { name: "Move Longsword later" }))

        expect(cards()).toEqual(["action-card-attack-a2", "action-card-attack-a1"])
      })

      it("moves the last shown card into More with Move later, and back with Move earlier", () => {
        renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()
        const heading = screen.getByTestId("actions-action-more-heading")

        fireEvent.click(screen.getByRole("button", { name: "Move Dagger later" }))
        expect(parts(heading)).toEqual({ main: ["action-card-attack-a1"], more: ["action-card-attack-a2"] })
        expect(screen.getByRole("button", { name: "Move Dagger later" })).toBeDisabled()

        fireEvent.click(screen.getByRole("button", { name: "Move Dagger earlier" }))
        expect(parts(heading)).toEqual({ main: ["action-card-attack-a1", "action-card-attack-a2"], more: [] })
      })

      it("announces where a moved card went", async () => {
        renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()

        fireEvent.click(screen.getByRole("button", { name: "Move Dagger later" }))

        await waitFor(() => expect(screen.getByTestId("actions-action-sortable-announcement")).toHaveTextContent("Dagger moved to More actions, position 1 of 1"))
      })

      it("moves a card from its handle's menu: to the start or end of its part, or across to the other part", async () => {
        const user = userEvent.setup()
        renderLive(makeCharacter({ attacks: [a1, a2, a3] }))
        startEditing()
        const heading = screen.getByTestId("actions-action-more-heading")

        await user.click(screen.getByRole("button", { name: "Reorder Longsword" }))
        // By hook: jsdom keeps each closed menu in the page (see dropdown-menu.test.tsx)
        await user.click(await screen.findByTestId("actions-action-card-custom:a1-move-to-more"))
        expect(parts(heading)).toEqual({ main: ["action-card-attack-a2", "action-card-attack-a3"], more: ["action-card-attack-a1"] })

        await user.click(screen.getByRole("button", { name: "Reorder Shove" }))
        await user.click(await screen.findByTestId("actions-action-card-custom:a3-move-start"))
        expect(parts(heading)).toEqual({ main: ["action-card-attack-a3", "action-card-attack-a2"], more: ["action-card-attack-a1"] })

        await user.click(screen.getByRole("button", { name: "Reorder Longsword" }))
        // Start and end are of the card's own part: alone in More, it's at both
        expect(await screen.findByTestId("actions-action-card-custom:a1-move-end")).toHaveAttribute("aria-disabled", "true")
        await user.click(screen.getByTestId("actions-action-card-custom:a1-move-to-main"))
        expect(parts(heading)).toEqual({ main: ["action-card-attack-a3", "action-card-attack-a2", "action-card-attack-a1"], more: [] })
      })

      it("saves the layout of each section moved in", () => {
        const { onUpdate } = renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()
        fireEvent.click(screen.getByRole("button", { name: "Move Dagger later" }))
        expect(onUpdate).not.toHaveBeenCalled()

        save()

        expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ actionLayout: { action: { main: ["custom:a1"], more: ["custom:a2"] } } }))
        expect(screen.getByTestId("actions-action-more-toggle")).toHaveAttribute("aria-expanded", "false")
      })

      it("saves with Ctrl+Enter from a card's handle, rather than opening its menu", () => {
        const { onUpdate } = renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()
        fireEvent.click(screen.getByRole("button", { name: "Move Dagger later" }))

        fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Longsword" }), { key: "Enter", ctrlKey: true })

        expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ actionLayout: { action: { main: ["custom:a1"], more: ["custom:a2"] } } }))
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
      })

      it("discards the moves on Cancel", () => {
        const { onUpdate } = renderLive(makeCharacter({ attacks: [a1, a2] }))
        startEditing()
        fireEvent.click(screen.getByRole("button", { name: "Move Longsword later" }))

        fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }))

        expect(onUpdate).not.toHaveBeenCalled()
        expect(cards()).toEqual(["action-card-attack-a1", "action-card-attack-a2"])
      })

      it("lays out a spell listed in two sections separately in each", () => {
        const shield = makeSpell({ id: "sh", name: "Shield", level: 1, prepared: true, castingTime: "1 bonus action or 1 reaction" })
        const { onUpdate } = renderLive(makeCharacter({ spells: [shield], spellSlots: { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } } }))
        startEditing()

        const bonusCard = screen.getByTestId("action-card-bonus-spell-sh")
        fireEvent.click(within(bonusCard).getByRole("button", { name: "Move Shield later" }))
        save()

        expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ actionLayout: { "bonus-action": { main: [], more: ["spell:sh"] } } }))
        expect(screen.getByTestId("actions-bonus-action-more-toggle")).toBeInTheDocument()
        expect(screen.queryByTestId("actions-reaction-more-toggle")).not.toBeInTheDocument()
      })

      it("shows a drop hint for an empty shown part", () => {
        renderLive(makeCharacter({ attacks: [a1], actionLayout: { action: { more: ["custom:a1"] } } }))
        startEditing()
        expect(screen.getByTestId("actions-action-main-empty")).toHaveTextContent("Move cards here to show them in this section.")
      })

      it("has no accessibility violations", async () => {
        const { container } = render(() => <ActionsModule character={makeCharacter({ attacks: [a1, a2], actionLayout: { action: { more: ["custom:a2"] } } })} onUpdate={vi.fn()} />)
        startEditing()
        const results = await axe(container)
        expect(results.violations).toHaveLength(0)
      })
    })
  })
})

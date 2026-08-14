import { axe } from "vitest-axe"
import { render, screen, fireEvent, within, cleanupPortals } from "../test-utils"
import { ActionsModule } from "@/components/actions-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Attack, BonusAction, Reaction, Spell, Feature, Equipment, ActionType } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

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
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions & Attacks")).toBeInTheDocument()
    })

    it("renders Actions, Bonus Actions, and Reactions section headings", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions")).toBeInTheDocument()
      expect(screen.getByText("Bonus Actions")).toBeInTheDocument()
      expect(screen.getByText("Reactions")).toBeInTheDocument()
    })

it("renders Spell Attack, Spell Modifier, and Spell Save DC stats", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Spell Attack")).toBeInTheDocument()
      expect(screen.getByText("Spell Modifier")).toBeInTheDocument()
      expect(screen.getByText("Spell Save DC")).toBeInTheDocument()
    })

    it("does not render an Attack Bonus stat", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Attack Bonus")).not.toBeInTheDocument()
    })

    it("renders the Add Action, Add Bonus Action, Add Reaction, Add Other buttons", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add action/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add bonus action/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add reaction/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add other/i })).toBeInTheDocument()
    })

    it("opens the Add Other modal when Add Other is clicked and saves a new other action", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter({ otherActions: [other] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Sneak Attack")).toBeInTheDocument()
    })

    it("renders an existing attack's name", () => {
      render(
        <ActionsModule character={makeCharacter({ attacks: [makeAttack({ name: "Longsword" })] })} onUpdate={vi.fn()} />
      )
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("shows the attack damage string", () => {
      render(
        <ActionsModule character={makeCharacter({ attacks: [makeAttack({ damage: "2d6+4" })] })} onUpdate={vi.fn()} />
      )
      expect(screen.getByText(/2d6\+4/)).toBeInTheDocument()
    })
  })

  describe("calculated spell stats", () => {
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

    function clickEditButton() {
      fireEvent.click(screen.getByRole("button", { name: /^edit$/i }))
    }

    it("does not show an Edit button in view mode when read-only", () => {
      render(
        <ReadOnlyProvider value={true}>
          <ActionsModule character={makeSpellcaster()} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    })

    it("shows a custom-value toggle for spell attack, spell modifier, and spell save DC in edit mode", () => {
      render(<ActionsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(document.querySelectorAll('[data-test="calculated-value-toggle"]')).toHaveLength(3)
    })

    it("shows the ability-derived spell attack and save DC in view mode", () => {
      // INT 16 -> mod +3, prof +3 => spell attack +6, DC 8+3+3=14
      render(<ActionsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      expect(screen.getByText("+6")).toBeInTheDocument()
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("cascades an equipped ability-score-boosting item into spell modifier, attack, and save DC", () => {
      const magicItem: Equipment = {
        id: "item-1",
        name: "Headband of Intellect",
        quantity: 1,
        weight: 0,
        description: "",
        equipped: true,
        type: "other",
        magic: true,
        requiresAttunement: true,
        attuned: true,
        rarity: "rare",
        modifiers: { abilityScores: { intelligence: 2 } },
      }
      // INT 16 + item +2 = 18 -> mod +4, prof +3 => spell attack +7, DC 8+3+4=15
      render(<ActionsModule character={makeSpellcaster({ equipment: [magicItem] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("+7")).toBeInTheDocument()
      expect(screen.getByText("15")).toBeInTheDocument()
      expect(screen.getByText("+4")).toBeInTheDocument()
    })

    it("shows a NumericInput for spell attack once switched to custom in edit mode", () => {
      render(<ActionsModule character={makeSpellcaster()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell attack/i }))
      expect(screen.getByRole("spinbutton", { name: /spell attack/i })).toBeInTheDocument()
    })

    it("saves a custom spell save DC override on save", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
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

    it("saves the calculated spell modifier value when the flag stays enabled", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useCalculatedSpellModifier: true, spellModifier: 3 })
      )
    })

    it("discards an in-progress override when Cancel is clicked", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeSpellcaster()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom spell attack/i }))
      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.queryByRole("spinbutton", { name: /spell attack/i })).not.toBeInTheDocument()
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
      render(<ActionsModule character={char} onUpdate={vi.fn()} />)
      clickEditButton()
      const attackInput = screen.getByRole("spinbutton", { name: /spell attack/i }) as HTMLInputElement
      const dcInput = screen.getByRole("spinbutton", { name: /spell save dc/i }) as HTMLInputElement
      expect(attackInput.value).toBe("6")
      expect(dcInput.value).toBe("14")
    })
  })


  describe("SpellSlotTracker integration", () => {
    it("renders slot circles for levels with total > 0", () => {
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 3, used: 1 } }
      render(<ActionsModule character={makeCharacter({ spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getAllByTitle("Used slot (click to restore)")).toHaveLength(1)
      expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(2)
    })

    it("calls onUpdate with incremented used count when a slot circle is clicked", () => {
      const onUpdate = vi.fn()
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(<ActionsModule character={makeCharacter({ spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByTitle("Available slot (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 1 }) }),
        })
      )
    })
  })

  describe("Add Action modal", () => {
    it("opens the Add Custom Action modal when Add Action is clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      expect(screen.getByText("Add Custom Action")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^cancel$/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when the action name is empty", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^add action$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with the new action (including UUID) on valid submit", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })

    it("does not show the Trigger field", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByLabelText(/^trigger$/i)).not.toBeInTheDocument()
    })
  })

  describe("Delete attack", () => {
    it("calls onUpdate without the deleted attack when delete is confirmed via edit modal", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({ attacks: [makeAttack({ name: "Longsword" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit longsword/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^delete$/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ attacks: [] })
      )
    })
  })

  describe("Add Bonus Action modal", () => {
    it("opens the Add Custom Bonus Action modal", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      expect(screen.getByText("Add Custom Bonus Action")).toBeInTheDocument()
    })

    it("does not add a bonus action when name is empty", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /^add bonus action$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with a valid bonus action", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })

    it("does not show the Trigger field", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add bonus action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).queryByLabelText(/^trigger$/i)).not.toBeInTheDocument()
    })
  })

  describe("Add Reaction modal", () => {
    it("opens the Add Custom Reaction modal", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      expect(screen.getByText("Add Custom Reaction")).toBeInTheDocument()
    })

    it("does not add a reaction when trigger is empty", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^reaction name$/i), { target: { value: "Shield" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add reaction$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("does not add a reaction when name is empty", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/^trigger$/i), { target: { value: "When hit" } })
      fireEvent.click(within(modal).getByRole("button", { name: /^add reaction$/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate with a valid reaction when both name and trigger are provided", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^trigger$/i)).toBeInTheDocument()
    })

    it("shows the Range field", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add reaction/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/^range$/i)).toBeInTheDocument()
    })
  })

  describe("Spell display", () => {
    it("shows prepared 1-action spells in the Actions section", () => {
      const spell = makeSpell({ name: "Eldritch Blast", level: 0, castingTime: "1 action", known: true })
      render(<ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Eldritch Blast")).toBeInTheDocument()
    })

    it("shows prepared bonus-action spells in the Bonus Actions section", () => {
      const spell = makeSpell({ name: "Healing Word", level: 1, castingTime: "1 bonus action", prepared: true, known: true })
      render(<ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Healing Word")).toBeInTheDocument()
    })

    it("renders an enabled Cast button for a non-cantrip when slots are available", () => {
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(<ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).not.toBeDisabled()
    })

    it("renders a disabled Cast button when no slots remain", () => {
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 2 } }
      render(<ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).toBeDisabled()
    })

    it("calls onUpdate with incremented used count when Cast is clicked", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "sp-1", name: "Bless", level: 1, castingTime: "1 action", prepared: true, known: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 2, used: 0 } }
      render(<ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /cast/i })).not.toBeDisabled()
    })

    it("does not consume a spell slot when casting a freeCast spell", () => {
      const onUpdate = vi.fn()
      const spell = makeSpell({ id: "sp-free", name: "Free Fireball", level: 1, castingTime: "1 action", prepared: true, known: true, freeCast: true })
      const spellSlots = { ...createDefaultCharacter().spellSlots, 1: { total: 1, used: 1 } }
      render(<ActionsModule character={makeCharacter({ spells: [spell], spellSlots })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /cast/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe("Upcast (At Higher Level) feature", () => {
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

    it("displays 'At Higher Level:' on a spell card when atHigherLevel is set", () => {
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      expect(screen.getByText("At Higher Level:")).toBeInTheDocument()
    })

    it("does not display 'At Higher Level:' when atHigherLevel is not set", () => {
      render(
        <ActionsModule
          character={makeCharacterWithUpcast({ spellOverrides: { atHigherLevel: undefined } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("At Higher Level:")).not.toBeInTheDocument()
    })

    it("does not show the upcast button when atHigherLevel is not set", () => {
      render(
        <ActionsModule
          character={makeCharacterWithUpcast({ spellOverrides: { atHigherLevel: undefined } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByRole("button", { name: /upcast/i })).not.toBeInTheDocument()
    })

    it("does not show the upcast button when the character has no higher-level spell slots", () => {
      render(
        <ActionsModule
          character={makeCharacterWithUpcast({ level2Total: 0 })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByRole("button", { name: /upcast/i })).not.toBeInTheDocument()
    })

    it("shows an enabled upcast button when atHigherLevel is set and higher slots are available", () => {
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /upcast/i })).not.toBeDisabled()
    })

    it("shows a disabled upcast button when all higher-level slots are exhausted", () => {
      render(
        <ActionsModule
          character={makeCharacterWithUpcast({ level2Total: 1, level2Used: 1 })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByRole("button", { name: /upcast/i })).toBeDisabled()
    })

    it("clicking the upcast button reveals level picker buttons", () => {
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: "2nd" })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      expect(screen.getByRole("button", { name: "2nd" })).toBeInTheDocument()
    })

    it("clicking a level picker button calls onUpdate consuming that slot level", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      fireEvent.click(screen.getByRole("button", { name: "2nd" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 2: expect.objectContaining({ used: 1 }) }),
        })
      )
    })

    it("clicking a level picker button does not consume the base spell slot", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      fireEvent.click(screen.getByRole("button", { name: "2nd" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spellSlots: expect.objectContaining({ 1: expect.objectContaining({ used: 0 }) }),
        })
      )
    })

    it("level picker closes after a level is selected", () => {
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      expect(screen.getByRole("button", { name: "2nd" })).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: "2nd" }))
      expect(screen.queryByRole("button", { name: "2nd" })).not.toBeInTheDocument()
    })

    it("clicking the upcast button again closes the level picker", () => {
      render(<ActionsModule character={makeCharacterWithUpcast()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      expect(screen.getByRole("button", { name: "2nd" })).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      expect(screen.queryByRole("button", { name: "2nd" })).not.toBeInTheDocument()
    })

    it("level picker shows only slots above the spell's base level", () => {
      const char = makeCharacter({
        spells: [makeUpcastSpell({ level: 2 })],
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 2, used: 0 },
          2: { total: 2, used: 0 },
          3: { total: 1, used: 0 },
        },
      })
      render(<ActionsModule character={char} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /upcast/i }))
      expect(screen.queryByRole("button", { name: "1st" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "2nd" })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "3rd" })).toBeInTheDocument()
    })

    it("upcast button works for bonus action spells", () => {
      const char = makeCharacter({
        spells: [makeUpcastSpell({ castingTime: "1 bonus action" })],
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 2, used: 0 },
          2: { total: 1, used: 0 },
        },
      })
      render(<ActionsModule character={char} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /upcast/i })).toBeInTheDocument()
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
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 3 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(3)
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
      })

      it("clicking a pip calls onUpdate with incremented uses on the correct bonus action", () => {
        const onUpdate = vi.fn()
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 3 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusActions: expect.arrayContaining([expect.objectContaining({ id: "ba-1", uses: 1 })]),
          })
        )
      })
    })

    describe("BonusAction with maxUses > 5", () => {
      it("renders stepper +/- buttons when maxUses = 8", () => {
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 8 })] })} onUpdate={vi.fn()} />)
        expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
      })

      it("clicking + (more available) calls onUpdate with uses - 1", () => {
        const onUpdate = vi.fn()
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 2, maxUses: 8 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole("button", { name: /increase/i }))
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusActions: expect.arrayContaining([expect.objectContaining({ id: "ba-1", uses: 1 })]),
          })
        )
      })

      it("clicking - (fewer available) calls onUpdate with uses + 1", () => {
        const onUpdate = vi.fn()
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 2, maxUses: 8 })] })} onUpdate={onUpdate} />)
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
        render(<ActionsModule character={makeCharacter({ bonusActions: [makeBonusAction({ uses: 0, maxUses: 0 })] })} onUpdate={vi.fn()} />)
        expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
      })
    })

    describe("Reaction with maxUses <= 5", () => {
      it("renders pip buttons when maxUses = 2", () => {
        render(<ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 2 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(2)
      })

      it("clicking a pip calls onUpdate with incremented uses on the correct reaction", () => {
        const onUpdate = vi.fn()
        render(<ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 2 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            reactions: expect.arrayContaining([expect.objectContaining({ id: "rx-1", uses: 1 })]),
          })
        )
      })
    })

    describe("Reaction with maxUses = 0", () => {
      it("renders no tracker UI", () => {
        render(<ActionsModule character={makeCharacter({ reactions: [makeReaction({ uses: 0, maxUses: 0 })] })} onUpdate={vi.fn()} />)
        expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
      })
    })

    describe("Attack with maxUses", () => {
      it("renders 2 pip buttons on an attack card with maxUses = 2", () => {
        render(<ActionsModule character={makeCharacter({ attacks: [makeAttack({ uses: 0, maxUses: 2 })] })} onUpdate={vi.fn()} />)
        expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(2)
      })

      it("clicking a pip calls onUpdate with updated uses on the attack", () => {
        const onUpdate = vi.fn()
        render(<ActionsModule character={makeCharacter({ attacks: [makeAttack({ uses: 0, maxUses: 2 })] })} onUpdate={onUpdate} />)
        fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
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
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add action/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByLabelText(/recharge on/i)).toBeInTheDocument()
    })

    it("submits the action with rechargeOn undefined when None is selected (default)", () => {
      const onUpdate = vi.fn()
      render(<ActionsModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Action Surge")).toBeInTheDocument()
    })

    it("feature with actionKind='bonus-action' appears in the Bonus Actions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Cunning Action", actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Cunning Action")).toBeInTheDocument()
    })

    it("feature with actionKind='reaction' appears in the Reactions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Uncanny Dodge", actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Uncanny Dodge")).toBeInTheDocument()
    })

    it("feature without actionKind does not appear in the actions grid", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ name: "Expertise", actionKind: undefined })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Expertise")).not.toBeInTheDocument()
    })

    it("action feature granted at a later level is hidden below that level", () => {
      render(
        <ActionsModule
          character={makeCharacter({ level: 3, classFeatures: [makeFeature({ name: "Extra Attack", actionKind: "action", level: 5 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Extra Attack")).not.toBeInTheDocument()
    })

    it("action feature granted at a later level appears once the character reaches that level", () => {
      render(
        <ActionsModule
          character={makeCharacter({ level: 5, classFeatures: [makeFeature({ name: "Extra Attack", actionKind: "action", level: 5 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Extra Attack")).toBeInTheDocument()
    })

    it("species trait with actionKind='action' appears in the Actions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "t-1", name: "Breath Weapon", source: "species-trait", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Breath Weapon")).toBeInTheDocument()
    })

    it("feat with actionKind='action' appears in the Actions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ feats: [makeFeature({ id: "f-1", name: "Shield Master", source: "feat", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Shield Master")).toBeInTheDocument()
    })

    it("shows source badge for class feature action", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getAllByText("Class Feature").length).toBeGreaterThanOrEqual(1)
    })

    it("renders the uses tracker for a repeatable (per-level) max uses feature using the computed total", () => {
      render(
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
      )
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue("15")).toBeInTheDocument()
    })

    it("feature description is shown in the card", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", description: "Take an extra action." })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Take an extra action.")).toBeInTheDocument()
    })

    it("shows range in the feature card stats row", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", range: "30 ft" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
    })

    it("shows pip tracker when feature has maxUses > 0", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", maxUses: 3, uses: 0 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(3)
    })

    it("does not show pip tracker when feature has no maxUses", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("clicking pip calls onUpdate with updated classFeatures uses", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ id: "cf-1", actionKind: "action", maxUses: 3, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          classFeatures: expect.arrayContaining([expect.objectContaining({ id: "cf-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated speciesTraits uses", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({ speciesTraits: [makeFeature({ id: "st-1", source: "species-trait", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          speciesTraits: expect.arrayContaining([expect.objectContaining({ id: "st-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated feats uses", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({ feats: [makeFeature({ id: "ft-1", source: "feat", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          feats: expect.arrayContaining([expect.objectContaining({ id: "ft-1", uses: 1 })]),
        })
      )
    })

    it("clicking pip calls onUpdate with updated backgroundFeatures uses", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({ backgroundFeatures: [makeFeature({ id: "bg-1", source: "background", actionKind: "action", maxUses: 2, uses: 0 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundFeatures: expect.arrayContaining([expect.objectContaining({ id: "bg-1", uses: 1 })]),
        })
      )
    })

    it("feature with range shows Range: label in stats row", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", range: "30 ft" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/Range:/i)).toBeInTheDocument()
    })

    it("feature detail popover opens and shows full description", () => {
      render(
        <ActionsModule
          character={makeCharacter({ classFeatures: [makeFeature({ actionKind: "action", description: "Take an extra action on your turn." })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /details for action surge/i }))
      expect(screen.getAllByText("Take an extra action on your turn.").length).toBeGreaterThanOrEqual(1)
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

    it("item with actionKind='action' appears in the Actions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Scroll of Fireball", actionKind: "action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Scroll of Fireball")).toBeInTheDocument()
    })

    it("item with actionKind='bonus-action' appears in the Bonus Actions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Potion of Healing")).toBeInTheDocument()
    })

    it("item with actionKind='reaction' appears in the Reactions subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Ring of Parrying", actionKind: "reaction" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Ring of Parrying")).toBeInTheDocument()
    })

    it("item with actionKind='other' appears in the Other subsection", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Bag of Tricks", actionKind: "other" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Bag of Tricks")).toBeInTheDocument()
    })

    it("item without actionKind does not appear in the actions grid", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ name: "Rope", actionKind: undefined })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Rope")).not.toBeInTheDocument()
    })

    it("shows the item type badge on the derived equipment action card", () => {
      render(
        <ActionsModule
          character={makeCharacter({ equipment: [makeConsumable({ actionKind: "bonus-action" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Consumable")).toBeInTheDocument()
    })

    it("clicking the uses tracker on an equipment action card updates the item's uses", () => {
      const onUpdate = vi.fn()
      render(
        <ActionsModule
          character={makeCharacter({
            equipment: [makeConsumable({ id: "item-2", actionKind: "bonus-action", maxUses: 3, uses: 0 })],
          })}
          onUpdate={onUpdate}
        />
      )
      const pips = screen.getAllByTitle("Charge available (click to use)")
      fireEvent.click(pips[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ id: "item-2", uses: 1 })]),
        })
      )
    })
  })

  describe("detail popover in section context", () => {
    it("spell detail popover opens and shows castingTime", () => {
      const spell = makeSpell({ name: "Fire Bolt", level: 0, castingTime: "1 action", known: true })
      render(<ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /details for fire bolt/i }))
      expect(screen.getByText(/1 action/)).toBeInTheDocument()
    })
  })

  describe("effect pills", () => {
    it("shows gain pill for a spell with gain", () => {
      const spell = makeSpell({ name: "Cure Wounds", level: 1, castingTime: "1 action", prepared: true, gain: "1d8+3" })
      render(<ActionsModule character={makeCharacter({ spells: [spell] })} onUpdate={vi.fn()} />)
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
      render(<ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("shows 'Weapon' badge on derived attack card", () => {
      render(<ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Weapon")).toBeInTheDocument()
    })

    it("does not show a delete button on derived weapon attack", () => {
      render(<ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment()] })} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /delete longsword/i })).not.toBeInTheDocument()
    })

    it("does not render weapon when not equipped", () => {
      render(<ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment({ equipped: false })] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Longsword")).not.toBeInTheDocument()
    })

    it("does not render weapon when weaponStats is absent", () => {
      render(<ActionsModule character={makeCharacter({ equipment: [makeWeaponEquipment({ weaponStats: undefined })] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Longsword")).not.toBeInTheDocument()
    })
  })

  describe("collapsible section headers", () => {
    it("renders all four section headers", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions")).toBeInTheDocument()
      expect(screen.getByText("Bonus Actions")).toBeInTheDocument()
      expect(screen.getByText("Reactions")).toBeInTheDocument()
      expect(screen.getByText("Other")).toBeInTheDocument()
    })

    it("shows action content by default (sections start expanded)", () => {
      const attack = makeAttack({ name: "Longsword" })
      render(<ActionsModule character={makeCharacter({ attacks: [attack] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Longsword")).toBeInTheDocument()
    })

    it("all section trigger buttons start with aria-expanded=true", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Actions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Bonus Actions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Reactions").closest("button")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Other").closest("button")).toHaveAttribute("aria-expanded", "true")
    })

    it("toggles aria-expanded on the Actions trigger when clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Actions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })

    it("toggles aria-expanded on the Bonus Actions trigger when clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Bonus Actions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("toggles aria-expanded on the Reactions trigger when clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Reactions").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("toggles aria-expanded on the Other trigger when clicked", () => {
      render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const trigger = screen.getByText("Other").closest("button")!
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("shows a count badge of 1 in the Actions section when one attack is present", () => {
      const attack = makeAttack({ name: "Longsword" })
      render(<ActionsModule character={makeCharacter({ attacks: [attack] })} onUpdate={vi.fn()} />)
      const actionsHeader = screen.getByText("Actions").closest("button")!
      expect(within(actionsHeader).getByText("1")).toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ActionsModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(
        <ReadOnlyProvider value={true}>
          <ActionsModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
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
})

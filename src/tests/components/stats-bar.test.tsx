import { axe } from "vitest-axe"

import { StatsBar } from "@/components/stats-bar"
import { createDefaultCharacter, type Spell } from "@/lib/character-types"

import { render, screen, fireEvent, waitFor, cleanupPortals } from "../test-utils"

function makeCharacter(current: number, maximum: number) {
  return {
    ...createDefaultCharacter(),
    hitPoints: { current, maximum, temporary: 0 },
  }
}

function makeSpellcaster() {
  return {
    ...createDefaultCharacter(),
    hitPoints: { current: 8, maximum: 10, temporary: 0 },
    classFeatures: [{
      id: "spellcasting-1", name: "Spellcasting", description: "", source: "class-feature" as const,
      levelEffects: [{ level: 1, effects: { spellcastingAbility: "wisdom" as const } }],
    }],
    abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 18 },
    proficiencyBonus: 3,
  }
}

describe("StatsBar", () => {
  it("renders HP in current/max format", () => {
    render(() => <StatsBar character={makeCharacter(8, 10)} />)
    expect(screen.getByText(/8/)).toBeInTheDocument()
    expect(screen.getByText(/\/10/)).toBeInTheDocument()
  })

  it("shows 0 HP correctly", () => {
    render(() => <StatsBar character={makeCharacter(0, 10)} />)
    expect(screen.getByText(/\/10/)).toBeInTheDocument()
  })

  it("shows full HP correctly", () => {
    render(() => <StatsBar character={makeCharacter(10, 10)} />)
    expect(screen.getAllByText(/10/).length).toBeGreaterThan(0)
  })

  it("does not divide by zero when maxHP is 0, flooring effective max at 1", () => {
    render(() => <StatsBar character={makeCharacter(0, 0)} />)
    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it("handles missing hitPoints by defaulting to 0/1", () => {
    const character = { ...createDefaultCharacter(), hitPoints: undefined }
    // @ts-expect-error hitPoints is required on Character; this simulates a stored record that lost it
    render(() => <StatsBar character={character} />)
    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <StatsBar character={makeCharacter(8, 10)} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("has no accessibility violations with temporary HP, conditions and spellcasting shown", async () => {
    const character = { ...makeSpellcaster(), hitPoints: { current: 8, maximum: 10, temporary: 5 }, conditions: ["Poisoned"] }
    const { container } = render(() => <StatsBar character={character} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("temporary HP", () => {
    it("shows temporary HP as an addition between current and maximum", () => {
      const character = { ...createDefaultCharacter(), hitPoints: { current: 8, maximum: 10, temporary: 5 } }
      render(() => <StatsBar character={character} />)
      expect(screen.getByTestId("current-hp")).toHaveTextContent("8")
      expect(screen.getByText("+5")).toBeInTheDocument()
      expect(screen.getByText("/10")).toBeInTheDocument()
    })

    it("marks the temporary HP so tests can find it apart from other +N values", () => {
      const character = { ...createDefaultCharacter(), hitPoints: { current: 8, maximum: 10, temporary: 5 } }
      render(() => <StatsBar character={character} />)
      expect(screen.getByTestId("temp-hp")).toHaveTextContent("+5")
    })
  })

  describe("conditions", () => {
    it("lists each active condition by name", () => {
      const character = { ...makeCharacter(8, 10), conditions: ["Poisoned", "Prone"] }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("Poisoned")).toBeInTheDocument()
      expect(screen.getByText("Prone")).toBeInTheDocument()
    })

    it("lists exhaustion with its level", () => {
      const character = { ...makeCharacter(8, 10), conditions: ["Prone"], exhaustionLevel: 3 }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("Exhaustion 3")).toBeInTheDocument()
    })

    it("shows the condition list for exhaustion alone", () => {
      const character = { ...makeCharacter(8, 10), conditions: [], exhaustionLevel: 1 }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("Exhaustion 1")).toBeInTheDocument()
    })
  })

  describe("spells in effect", () => {
    const spell = (overrides: Partial<Spell>): Spell => ({
      id: "s", name: "Spell", description: "", level: 1, school: "Abjuration", castingTime: "1 action",
      range: "Self", components: "V", duration: "Instantaneous", prepared: true, known: true, ...overrides,
    })
    const spells = [
      spell({ id: "armor", name: "Mage Armor", duration: "8 hours" }),
      spell({ id: "bless", name: "Bless", concentration: true, duration: "Concentration, up to 1 minute" }),
    ]
    const withSpells = (activeSpellIds: string[]) => ({ ...makeCharacter(8, 10), spells, activeSpellIds })

    it("shows a concentration spell as a solid gold pill, named for a screen reader", () => {
      render(() => <StatsBar character={withSpells(["bless"])} />)
      const pill = screen.getByTestId("status-concentration-bless")
      expect(pill).toHaveTextContent("Concentrating on Bless")
      expect(pill).toHaveClass("bg-amber-400", "text-amber-950")
      expect(screen.getByText("Concentrating on")).toHaveClass("sr-only")
    })

    it("shows a duration spell as a gold outline pill", () => {
      render(() => <StatsBar character={withSpells(["armor"])} />)
      const pill = screen.getByTestId("status-duration-armor")
      expect(pill).toHaveTextContent("Active: Mage Armor")
      expect(pill).toHaveClass("border-amber-600", "text-amber-800")
      expect(pill).not.toHaveClass("bg-amber-400")
    })

    it("puts concentration first, then the other spells, then conditions", () => {
      render(() => <StatsBar character={{ ...withSpells(["armor", "bless"]), conditions: ["Prone"] }} />)
      const pills = screen.getByTestId("status-concentration-bless").parentElement!.children
      expect([...pills].map((pill) => pill.textContent)).toEqual(["Concentrating on Bless", "Active: Mage Armor", "Prone"])
    })

    it("leaves out the ids of deleted spells", () => {
      render(() => <StatsBar character={withSpells(["gone"])} />)
      expect(screen.queryByText(/Concentrating on|Active:/)).not.toBeInTheDocument()
    })

    it("has no accessibility violations with spell pills shown", async () => {
      const { container } = render(() => <StatsBar character={withSpells(["armor", "bless"])} />)
      expect((await axe(container)).violations).toHaveLength(0)
    })
  })

  describe("AC and initiative", () => {
    it("computes AC live from equipped armor rather than a stale stored field", () => {
      const character = {
        ...createDefaultCharacter(),
        armorClass: 99, // stale/unsaved value — should be ignored while useCalculatedArmorClass is true (default)
        abilityScores: { ...createDefaultCharacter().abilityScores, dexterity: 14 },
        equipment: [{
          id: "arm-1", name: "Chain Shirt", quantity: 1, weight: 20, description: "",
          equipped: true, type: "armor" as const,
          armorStats: { baseAC: 13, armorType: "light" as const },
        }],
      }
      render(() => <StatsBar character={character} />)
      // 13 base + DEX +2 = 15, not the stale armorClass: 99
      expect(screen.getByText("15")).toBeInTheDocument()
    })

    it("shows the manually-entered armorClass when useCalculatedArmorClass is false", () => {
      const character = { ...createDefaultCharacter(), armorClass: 17, useCalculatedArmorClass: false }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("17")).toBeInTheDocument()
    })

    it("computes initiative live from DEX when useCalculatedInitiative is true", () => {
      const character = {
        ...createDefaultCharacter(),
        initiative: 99, // stale/unsaved value
        abilityScores: { ...createDefaultCharacter().abilityScores, dexterity: 16 },
        useCalculatedInitiative: true,
      }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("+3")).toBeInTheDocument()
    })

    it("shows the manually-entered initiative when useCalculatedInitiative is false (default)", () => {
      const character = { ...createDefaultCharacter(), initiative: 5 }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("+5")).toBeInTheDocument()
    })
  })

  describe("custom spell hit and DC", () => {
    it("shows the manually-entered spell attack bonus and save DC when they are not calculated", () => {
      const character = {
        ...makeSpellcaster(),
        useCalculatedSpellAttackBonus: false,
        spellAttackBonus: 9,
        useCalculatedSpellSaveDC: false,
        spellSaveDC: 19,
      }
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("+9")).toBeInTheDocument()
      expect(screen.getByText("DC 19")).toBeInTheDocument()
    })
  })

  describe("stored values that are missing", () => {
    it("falls back to AC 10 and initiative +0 when custom values were never stored", () => {
      const character = { ...createDefaultCharacter(), useCalculatedArmorClass: false, useCalculatedInitiative: false }
      const sparse: Partial<typeof character> = character
      delete sparse.armorClass
      delete sparse.initiative
      render(() => <StatsBar character={character} />)
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("+0")).toBeInTheDocument()
    })
  })

  describe("spell hit/DC tooltip", () => {
    beforeEach(() => cleanupPortals())

    it("renders a focusable tooltip trigger on the spell hit/DC section when spellcasting ability is set", () => {
      render(() => <StatsBar character={makeSpellcaster()} />)
      // triggerFocusable sets role="group" together with tabIndex 0, so the
      // accessible role is a direct proxy for "focusable trigger is present".
      expect(screen.getByRole("group")).toBeInTheDocument()
    })

    it("does not render a focusable tooltip trigger when no spellcasting ability is set", () => {
      render(() => <StatsBar character={makeCharacter(8, 10)} />)
      expect(screen.queryByRole("group")).not.toBeInTheDocument()
    })

    it("shows spell hit and DC formula in tooltip when focused", async () => {
      render(() => <StatsBar character={makeSpellcaster()} />)
      fireEvent.focus(screen.getByRole("group"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // WIS 18 → +4, Prof +3 → Hit +7, DC 15
      expect(screen.getByRole("tooltip")).toHaveTextContent(/^Spell Hit: \+4 \(Wis\) \+ 3 \(Prof\) · DC: 8 \+ 3 \(Prof\) \+ 4 \(Wis\)$/)
    })

    it("names the spell hit/DC trigger with both values, since its icon and short labels carry no context", () => {
      render(() => <StatsBar character={makeSpellcaster()} />)
      expect(screen.getByRole("group", { name: "Spell Hit +7, Spell Save DC 15" })).toBeInTheDocument()
    })

    it("shows Custom, with no breakdown, for a custom spell attack bonus or save DC", async () => {
      render(() => <StatsBar character={{ ...makeSpellcaster(), useCalculatedSpellAttackBonus: false, spellAttackBonus: 9, useCalculatedSpellSaveDC: false, spellSaveDC: 17 }} />)
      fireEvent.focus(screen.getByRole("group"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent(/^Spell Hit: Custom · DC: Custom$/))
    })

    it("explains only the calculated value when the other is custom", async () => {
      render(() => <StatsBar character={{ ...makeSpellcaster(), useCalculatedSpellSaveDC: false, spellSaveDC: 17 }} />)
      fireEvent.focus(screen.getByRole("group"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent(/^Spell Hit: \+4 \(Wis\) \+ 3 \(Prof\) · DC: Custom$/))
    })

    it("reflects an item-boosted spellcasting ability score in the tooltip breakdown", async () => {
      const character = {
        ...makeSpellcaster(),
        equipment: [{
          id: "item-1", name: "Headband of Intellect", quantity: 1, weight: 0, description: "",
          equipped: true, type: "other" as const, magic: true, requiresAttunement: false,
          modifiers: { abilityScores: { wisdom: 2 } },
        }],
      }
      render(() => <StatsBar character={character} />)
      fireEvent.focus(screen.getByRole("group"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // WIS 18+2=20 → +5, Prof +3 → Hit +8, DC 16
      expect(screen.getByRole("tooltip")).toHaveTextContent(/^Spell Hit: \+5 \(Wis\) \+ 3 \(Prof\) · DC: 8 \+ 3 \(Prof\) \+ 5 \(Wis\)$/)
    })
  })
})

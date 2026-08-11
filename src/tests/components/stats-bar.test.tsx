import { axe } from "vitest-axe"
import { render, screen, fireEvent, waitFor, cleanupPortals } from "../test-utils"
import { StatsBar } from "@/components/stats-bar"
import { createDefaultCharacter } from "@/lib/character-types"

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
    render(<StatsBar character={makeCharacter(8, 10)} />)
    expect(screen.getByText(/8/)).toBeInTheDocument()
    expect(screen.getByText(/\/10/)).toBeInTheDocument()
  })

  it("shows 0 HP correctly", () => {
    render(<StatsBar character={makeCharacter(0, 10)} />)
    expect(screen.getByText(/\/10/)).toBeInTheDocument()
  })

  it("shows full HP correctly", () => {
    render(<StatsBar character={makeCharacter(10, 10)} />)
    expect(screen.getAllByText(/10/).length).toBeGreaterThan(0)
  })

  it("does not divide by zero when maxHP is 0, flooring effective max at 1", () => {
    render(<StatsBar character={makeCharacter(0, 0)} />)
    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it("handles missing hitPoints by defaulting to 0/1", () => {
    const character = { ...createDefaultCharacter(), hitPoints: undefined as any }
    render(<StatsBar character={character} />)
    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StatsBar character={makeCharacter(8, 10)} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
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
      render(<StatsBar character={character} />)
      // 13 base + DEX +2 = 15, not the stale armorClass: 99
      expect(screen.getByText("15")).toBeInTheDocument()
    })

    it("shows the manually-entered armorClass when useCalculatedArmorClass is false", () => {
      const character = { ...createDefaultCharacter(), armorClass: 17, useCalculatedArmorClass: false }
      render(<StatsBar character={character} />)
      expect(screen.getByText("17")).toBeInTheDocument()
    })

    it("computes initiative live from DEX when useCalculatedInitiative is true", () => {
      const character = {
        ...createDefaultCharacter(),
        initiative: 99, // stale/unsaved value
        abilityScores: { ...createDefaultCharacter().abilityScores, dexterity: 16 },
        useCalculatedInitiative: true,
      }
      render(<StatsBar character={character} />)
      expect(screen.getByText("+3")).toBeInTheDocument()
    })

    it("shows the manually-entered initiative when useCalculatedInitiative is false (default)", () => {
      const character = { ...createDefaultCharacter(), initiative: 5 }
      render(<StatsBar character={character} />)
      expect(screen.getByText("+5")).toBeInTheDocument()
    })
  })

  describe("spell hit/DC tooltip", () => {
    beforeEach(() => cleanupPortals())

    it("renders a focusable tooltip trigger on the spell hit/DC section when spellcasting ability is set", () => {
      render(<StatsBar character={makeSpellcaster()} />)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers.length).toBeGreaterThan(0)
    })

    it("does not render a focusable tooltip trigger when no spellcasting ability is set", () => {
      render(<StatsBar character={makeCharacter(8, 10)} />)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers).toHaveLength(0)
    })

    it("shows spell hit and DC formula in tooltip when focused", async () => {
      render(<StatsBar character={makeSpellcaster()} />)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // WIS 18 → +4, Prof +3 → Hit +7, DC 15
      expect(screen.getByRole("tooltip")).toHaveTextContent("Spell Hit: WIS +4 + Prof +3 = +7")
      expect(screen.getByRole("tooltip")).toHaveTextContent("DC: 8 + WIS +4 + Prof +3 = 15")
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
      render(<StatsBar character={character} />)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // WIS 18+2=20 → +5, Prof +3 → Hit +8, DC 16 — the tooltip's own arithmetic must match
      expect(screen.getByRole("tooltip")).toHaveTextContent("Spell Hit: WIS +5 + Prof +3 = +8")
      expect(screen.getByRole("tooltip")).toHaveTextContent("DC: 8 + WIS +5 + Prof +3 = 16")
    })
  })
})

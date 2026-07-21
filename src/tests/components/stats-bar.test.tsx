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
    spellcastingAbility: "wisdom",
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

  it("does not divide by zero when maxHP is 0", () => {
    render(<StatsBar character={makeCharacter(0, 0)} />)
    expect(screen.getByText(/\/0/)).toBeInTheDocument()
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
  })
})

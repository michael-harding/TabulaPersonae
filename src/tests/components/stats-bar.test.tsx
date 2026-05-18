import { render, screen } from "../test-utils"
import { StatsBar } from "@/components/stats-bar"
import { createDefaultCharacter } from "@/lib/character-types"

function makeCharacter(current: number, maximum: number) {
  return {
    ...createDefaultCharacter(),
    hitPoints: { current, maximum, temporary: 0 },
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
})

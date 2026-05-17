import { render, screen } from "../test-utils"
import { HpProgressBar } from "@/components/hp-progress-bar"
import { createDefaultCharacter } from "@/lib/character-types"

function makeCharacter(current: number, maximum: number) {
  return {
    ...createDefaultCharacter(),
    hitPoints: { current, maximum, temporary: 0 },
  }
}

describe("HpProgressBar", () => {
  it("renders HP text in current/max format", () => {
    render(<HpProgressBar character={makeCharacter(8, 10)} />)
    expect(screen.getByText("HP: 8/10")).toBeInTheDocument()
  })

  it("shows 0 HP correctly", () => {
    render(<HpProgressBar character={makeCharacter(0, 10)} />)
    expect(screen.getByText("HP: 0/10")).toBeInTheDocument()
  })

  it("shows full HP correctly", () => {
    render(<HpProgressBar character={makeCharacter(10, 10)} />)
    expect(screen.getByText("HP: 10/10")).toBeInTheDocument()
  })

  it("does not divide by zero when maxHP is 0", () => {
    // Should render without throwing and show 0/0
    render(<HpProgressBar character={makeCharacter(0, 0)} />)
    expect(screen.getByText("HP: 0/0")).toBeInTheDocument()
  })

  it("handles missing hitPoints by defaulting to 0/1", () => {
    const character = { ...createDefaultCharacter(), hitPoints: undefined as any }
    render(<HpProgressBar character={character} />)
    expect(screen.getByText("HP: 0/1")).toBeInTheDocument()
  })
})

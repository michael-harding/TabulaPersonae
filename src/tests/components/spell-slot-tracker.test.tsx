import { render, screen, fireEvent } from "../test-utils"
import { SpellSlotTracker } from "@/components/spell-slot-tracker"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character } from "@/lib/character-types"

type SpellSlots = Character["spellSlots"]

function makeSpellSlots(overrides: Partial<SpellSlots> = {}): SpellSlots {
  return { ...createDefaultCharacter().spellSlots, ...overrides }
}

describe("SpellSlotTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when all slot totals are 0", () => {
    render(<SpellSlotTracker spellSlots={makeSpellSlots()} onToggle={vi.fn()} />)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("only renders levels with total > 0", () => {
    render(
      <SpellSlotTracker
        spellSlots={makeSpellSlots({ 1: { total: 3, used: 0 }, 3: { total: 2, used: 0 } })}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText("1st")).toBeInTheDocument()
    expect(screen.getByText("3rd")).toBeInTheDocument()
    expect(screen.queryByText("2nd")).not.toBeInTheDocument()
  })

  it("renders correct ordinal suffixes for all levels 1–9", () => {
    const allSlots = makeSpellSlots(
      Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => [l, { total: 1, used: 0 }]))
    )
    render(<SpellSlotTracker spellSlots={allSlots} onToggle={vi.fn()} />)
    for (const label of ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("renders the correct number of circle buttons for a level", () => {
    render(
      <SpellSlotTracker spellSlots={makeSpellSlots({ 1: { total: 3, used: 0 } })} onToggle={vi.fn()} />
    )
    expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(3)
  })

  it("renders used slots with the correct title", () => {
    render(
      <SpellSlotTracker spellSlots={makeSpellSlots({ 1: { total: 3, used: 2 } })} onToggle={vi.fn()} />
    )
    expect(screen.getAllByTitle("Used slot (click to restore)")).toHaveLength(2)
    expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(1)
  })

  it("calls onToggle with level and used+1 when an available slot is clicked", () => {
    const onToggle = vi.fn()
    render(
      <SpellSlotTracker spellSlots={makeSpellSlots({ 1: { total: 3, used: 0 } })} onToggle={onToggle} />
    )
    fireEvent.click(screen.getAllByTitle("Available slot (click to use)")[0])
    expect(onToggle).toHaveBeenCalledWith(1, 1)
  })

  it("calls onToggle with level and used-1 when a used slot is clicked", () => {
    const onToggle = vi.fn()
    render(
      <SpellSlotTracker spellSlots={makeSpellSlots({ 1: { total: 3, used: 2 } })} onToggle={onToggle} />
    )
    fireEvent.click(screen.getAllByTitle("Used slot (click to restore)")[0])
    expect(onToggle).toHaveBeenCalledWith(1, 1)
  })

  it("clamps newUsed to total when clicking the last available slot at full capacity", () => {
    const onToggle = vi.fn()
    render(
      <SpellSlotTracker spellSlots={makeSpellSlots({ 1: { total: 2, used: 1 } })} onToggle={onToggle} />
    )
    // slot at index 1 (>= used=1) → newUsed = 2, clamped to min(2, 2) = 2
    fireEvent.click(screen.getAllByTitle("Available slot (click to use)")[0])
    expect(onToggle).toHaveBeenCalledWith(1, 2)
  })

  it("renders multiple levels independently", () => {
    render(
      <SpellSlotTracker
        spellSlots={makeSpellSlots({ 1: { total: 2, used: 0 }, 2: { total: 4, used: 0 } })}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(6)
  })
})

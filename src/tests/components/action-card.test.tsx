import { render, screen, fireEvent } from "../test-utils"
import { ActionCard } from "@/components/action-card"
import type { ActionCardProps } from "@/components/action-card"

function makeProps(overrides: Partial<ActionCardProps> = {}): ActionCardProps {
  return {
    name: "Test Action",
    badgeLabel: "Ability",
    ...overrides,
  }
}

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
}

describe("ActionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("detail popover", () => {
    it("renders the ? icon button", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.getByRole("button", { name: /details for test action/i })).toBeInTheDocument()
    })

    it("opens when ? button is clicked", () => {
      render(<ActionCard {...makeProps({ description: "A great action." })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for test action/i }))
      expect(screen.getAllByText("A great action.").length).toBeGreaterThanOrEqual(1)
    })

    it("shows full description (not clamped) in popover", () => {
      const desc = "A".repeat(300)
      render(<ActionCard {...makeProps({ description: desc })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(desc).length).toBeGreaterThanOrEqual(1)
    })

    it("shows castingTime in popover when provided", () => {
      render(<ActionCard {...makeProps({ castingTime: "1 action" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getByText(/1 action/)).toBeInTheDocument()
    })

    it("shows Range and Components in popover when provided", () => {
      render(<ActionCard {...makeProps({ range: "60 ft", components: "V, S" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/60 ft/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/V, S/).length).toBeGreaterThanOrEqual(1)
    })

    it("shows Max Uses and Recharge On in popover when provided", () => {
      render(<ActionCard {...makeProps({ maxUses: 3, rechargeOn: "short-rest", onUsesChange: vi.fn() })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getByText(/Short Rest/)).toBeInTheDocument()
    })

    it("shows Trigger in popover when provided", () => {
      render(<ActionCard {...makeProps({ trigger: "When hit by an attack" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/When hit by an attack/).length).toBeGreaterThanOrEqual(1)
    })

    it("shows At Higher Levels in popover when provided", () => {
      render(<ActionCard {...makeProps({ atHigherLevel: "+1d6 per level" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/\+1d6 per level/).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("effect pills", () => {
    it("shows red pill when damage provided", () => {
      render(<ActionCard {...makeProps({ damage: "2d6", damageType: "fire" })} />)
      expect(screen.getByText("2d6 fire")).toBeInTheDocument()
    })

    it("shows green pill when gain provided", () => {
      render(<ActionCard {...makeProps({ gain: "1d8+3" })} />)
      const pill = screen.getByText("1d8+3")
      expect(pill.className).toMatch(/green/)
    })

    it("shows blue pill when tempHp provided", () => {
      render(<ActionCard {...makeProps({ tempHp: "5" })} />)
      const pill = screen.getByText("5")
      expect(pill.className).toMatch(/blue/)
    })

    it("gain takes priority over tempHp and damage", () => {
      render(<ActionCard {...makeProps({ gain: "1d8", tempHp: "5", damage: "2d6" })} />)
      expect(screen.getByText("1d8")).toBeInTheDocument()
      expect(screen.queryByText("5")).not.toBeInTheDocument()
      expect(screen.queryByText(/2d6/)).not.toBeInTheDocument()
    })

    it("tempHp takes priority over damage", () => {
      render(<ActionCard {...makeProps({ tempHp: "5", damage: "2d6" })} />)
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.queryByText(/2d6/)).not.toBeInTheDocument()
    })

    it("no pill rendered when none provided", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByText(/border-(red|green|blue)/)).not.toBeInTheDocument()
    })
  })

  describe("spell subtitle", () => {
    it("shows 'Cantrip • Evocation' when spellLevel=0", () => {
      render(<ActionCard {...makeProps({ spellLevel: 0, spellSchool: "Evocation" })} />)
      expect(screen.getByText("Cantrip • Evocation")).toBeInTheDocument()
    })

    it("shows '1st level • Evocation' when spellLevel=1", () => {
      render(<ActionCard {...makeProps({ spellLevel: 1, spellSchool: "Evocation" })} />)
      expect(screen.getByText("1st level • Evocation")).toBeInTheDocument()
    })

    it("shows '3rd level • Necromancy' when spellLevel=3", () => {
      render(<ActionCard {...makeProps({ spellLevel: 3, spellSchool: "Necromancy" })} />)
      expect(screen.getByText("3rd level • Necromancy")).toBeInTheDocument()
    })

    it("shows no subtitle when spellLevel is undefined", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByText(/level/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/cantrip/i)).not.toBeInTheDocument()
    })
  })

  describe("concentration badge", () => {
    it("not rendered when concentration is falsy", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByText("Concentration")).not.toBeInTheDocument()
    })

    it("rendered when concentration={true}", () => {
      render(<ActionCard {...makeProps({ concentration: true })} />)
      expect(screen.getByText("Concentration")).toBeInTheDocument()
    })

    it("toggles styling on click without calling onUpdate", () => {
      render(<ActionCard {...makeProps({ concentration: true })} />)
      const badge = screen.getByText("Concentration")
      expect(badge.className).toMatch(/text-muted-foreground/)
      fireEvent.click(badge)
      expect(badge.className).not.toMatch(/text-muted-foreground/)
      fireEvent.click(badge)
      expect(badge.className).toMatch(/text-muted-foreground/)
    })
  })

  describe("stats row", () => {
    it("shows Trigger in stats row when provided", () => {
      render(<ActionCard {...makeProps({ trigger: "When targeted" })} />)
      expect(screen.getByText(/When targeted/)).toBeInTheDocument()
    })

    it("shows Range when provided", () => {
      render(<ActionCard {...makeProps({ range: "30 ft" })} />)
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
    })

    it("shows Attack with formatted bonus when attackBonus provided", () => {
      render(<ActionCard {...makeProps({ attackBonus: 5 })} />)
      expect(screen.getByText(/\+5 to hit/)).toBeInTheDocument()
    })

    it("shows Attack when attackBonus=0", () => {
      render(<ActionCard {...makeProps({ attackBonus: 0 })} />)
      expect(screen.getByText(/\+0 to hit/)).toBeInTheDocument()
    })

    it("does not show Attack when attackBonus is undefined", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByText(/to hit/)).not.toBeInTheDocument()
    })

    it("entire stats row hidden when no stats or pill props set", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByText(/Range:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Attack:/)).not.toBeInTheDocument()
    })
  })

  describe("edit button", () => {
    it("rendered when onEdit is provided", () => {
      render(<ActionCard {...makeProps({ onEdit: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /edit test action/i })).toBeInTheDocument()
    })

    it("not rendered when onEdit is omitted", () => {
      render(<ActionCard {...makeProps()} />)
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("calls onEdit when clicked", () => {
      const onEdit = vi.fn()
      render(<ActionCard {...makeProps({ onEdit })} />)
      fireEvent.click(screen.getByRole("button", { name: /edit test action/i }))
      expect(onEdit).toHaveBeenCalledOnce()
    })
  })

  describe("uses tracker vs cast buttons", () => {
    it("shows PipTracker when maxUses=3 and onCast is not provided", () => {
      render(<ActionCard {...makeProps({ maxUses: 3, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.getAllByTitle("Charge available (click to use)")).toHaveLength(3)
    })

    it("shows StepperInput when maxUses=8 and onCast is not provided", () => {
      render(<ActionCard {...makeProps({ maxUses: 8, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
    })

    it("shows no tracker when maxUses=0", () => {
      render(<ActionCard {...makeProps({ maxUses: 0, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /increase/i })).not.toBeInTheDocument()
    })

    it("shows Cast button when onCast is provided; no pip tracker shown", () => {
      render(<ActionCard {...makeProps({ onCast: vi.fn(), castable: () => true, maxUses: 3, onUsesChange: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /^cast$/i })).toBeInTheDocument()
      expect(screen.queryByTitle("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("Cast button is disabled when castable returns false", () => {
      render(<ActionCard {...makeProps({ onCast: vi.fn(), castable: () => false })} />)
      expect(screen.getByRole("button", { name: /^cast$/i })).toBeDisabled()
    })

    it("calls onCast when Cast button is clicked", () => {
      const onCast = vi.fn()
      render(<ActionCard {...makeProps({ onCast, castable: () => true })} />)
      fireEvent.click(screen.getByRole("button", { name: /^cast$/i }))
      expect(onCast).toHaveBeenCalledOnce()
    })
  })
})

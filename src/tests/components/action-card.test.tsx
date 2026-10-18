import { axe } from "vitest-axe"

import { ActionCard } from "@/components/action-card"
import type { ActionCardProps } from "@/components/action-card"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { render, screen, fireEvent, cleanupPortals } from "../test-utils"

function makeProps(overrides: Partial<ActionCardProps> = {}): ActionCardProps {
  return {
    "data-test": "action-card-test",
    name: "Test Action",
    badgeLabel: "Ability",
    ...overrides,
  }
}

describe("ActionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  // TESTING.md §6: names repeat (a bonus action and a spell can both be Hunter's Mark), so every
  // hook comes from the unique one the list gives the card
  describe("test hooks", () => {
    it("prefixes every hook with the card's own data-test, so two cards with one name stay apart", () => {
      const props = { name: "Hunter's Mark", onEdit: vi.fn(), maxUses: 8, uses: 1, onUsesChange: vi.fn() }
      render(() => (
        <>
          <ActionCard {...makeProps({ ...props, "data-test": "action-card-bonus-ba1" })} />
          <ActionCard {...makeProps({ ...props, "data-test": "action-card-spell-sp1" })} />
        </>
      ))
      for (const card of ["action-card-bonus-ba1", "action-card-spell-sp1"]) {
        expect(screen.getByTestId(card)).toBeInTheDocument()
        for (const part of ["details-trigger", "edit-button", "uses-stepper"]) expect(screen.getByTestId(`${card}-${part}`)).toBeInTheDocument()
      }
    })
  })

  // In a list, "Cast" or "Upcast" alone could be any spell's
  it("names the spell its Cast and Upcast buttons belong to", () => {
    render(() => (
      <ActionCard {...makeProps({
        name: "Fireball", spellId: "sp1", onCast: vi.fn(), castable: () => true,
        atHigherLevel: "+1d6 per level", hasHigherSlots: () => true, upcastLevels: () => [4], upcastSpellId: () => null,
      })} />
    ))
    expect(screen.getByRole("button", { name: "Cast Fireball" })).toHaveTextContent("Cast")
    expect(screen.getByRole("button", { name: "Upcast Fireball" })).toBeInTheDocument()
  })

  describe("detail popover", () => {
    it("renders the ? icon button", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.getByRole("button", { name: /details for test action/i })).toBeInTheDocument()
    })

    // ACCESSIBILITY.md §13: a real 44×44 box rather than an invisible hit area, which could cover
    // the edit button beside it on a card with a long name
    it("gives the ? button a 44×44 touch target", () => {
      render(() => <ActionCard {...makeProps()} />)
      const button = screen.getByRole("button", { name: /details for test action/i })
      expect(button).toHaveClass("min-h-11", "min-w-11")
      // Not pulled into a shorter row, where the next row would cover its lower edge
      expect(button).not.toHaveClass("-my-3")
    })

    it("opens when ? button is clicked", () => {
      render(() => <ActionCard {...makeProps({ description: "A great action." })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for test action/i }))
      expect(screen.getAllByText("A great action.").length).toBeGreaterThanOrEqual(1)
    })

    it("shows full description (not clamped) in popover", () => {
      const desc = "A".repeat(300)
      render(() => <ActionCard {...makeProps({ description: desc })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(desc).length).toBeGreaterThanOrEqual(1)
    })

    it("shows castingTime in popover when provided", () => {
      render(() => <ActionCard {...makeProps({ castingTime: "1 action" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getByText(/1 action/)).toBeInTheDocument()
    })

    it("shows Range and Components in popover when provided", () => {
      render(() => <ActionCard {...makeProps({ range: "60 ft", components: "V, S" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/60 ft/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/V, S/).length).toBeGreaterThanOrEqual(1)
    })

    it("shows Max Uses and Recharge On in popover when provided", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 3, rechargeOn: "short-rest", onUsesChange: vi.fn() })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getByText(/Short Rest/)).toBeInTheDocument()
    })

    it("shows Trigger in popover when provided", () => {
      render(() => <ActionCard {...makeProps({ trigger: "When hit by an attack" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/When hit by an attack/).length).toBeGreaterThanOrEqual(1)
    })

    it("shows At Higher Levels in popover when provided", () => {
      render(() => <ActionCard {...makeProps({ atHigherLevel: "+1d6 per level" })} />)
      fireEvent.click(screen.getByRole("button", { name: /details for/i }))
      expect(screen.getAllByText(/\+1d6 per level/).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("effect pills", () => {
    it("shows red pill when damage provided", () => {
      render(() => <ActionCard {...makeProps({ damage: "2d6", damageType: "fire" })} />)
      expect(screen.getByText("2d6 fire")).toBeInTheDocument()
    })

    it("shows green pill when gain provided", () => {
      render(() => <ActionCard {...makeProps({ gain: "1d8+3" })} />)
      expect(screen.getByTestId("action-card-test-effect-pill-green")).toHaveTextContent("1d8+3")
    })

    it("shows blue pill when tempHp provided", () => {
      render(() => <ActionCard {...makeProps({ tempHp: "5" })} />)
      expect(screen.getByTestId("action-card-test-effect-pill-blue")).toHaveTextContent("5")
    })

    it("gain takes priority over tempHp and damage", () => {
      render(() => <ActionCard {...makeProps({ gain: "1d8", tempHp: "5", damage: "2d6" })} />)
      expect(screen.getByText("1d8")).toBeInTheDocument()
      expect(screen.queryByText("5")).not.toBeInTheDocument()
      expect(screen.queryByText(/2d6/)).not.toBeInTheDocument()
    })

    it("tempHp takes priority over damage", () => {
      render(() => <ActionCard {...makeProps({ tempHp: "5", damage: "2d6" })} />)
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.queryByText(/2d6/)).not.toBeInTheDocument()
    })

    it("no pill rendered when none provided", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText(/border-(red|green|blue)/)).not.toBeInTheDocument()
    })
  })

  describe("spell subtitle", () => {
    it("shows 'Cantrip • Evocation' when spellLevel=0", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 0, spellSchool: "Evocation" })} />)
      expect(screen.getByText("Cantrip • Evocation")).toBeInTheDocument()
    })

    it("shows '1st level • Evocation' when spellLevel=1", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 1, spellSchool: "Evocation" })} />)
      expect(screen.getByText("1st level • Evocation")).toBeInTheDocument()
    })

    it("shows '3rd level • Necromancy' when spellLevel=3", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 3, spellSchool: "Necromancy" })} />)
      expect(screen.getByText("3rd level • Necromancy")).toBeInTheDocument()
    })

    it("shows no subtitle when spellLevel is undefined", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText(/level/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/cantrip/i)).not.toBeInTheDocument()
    })
  })

  describe("badge", () => {
    it("shows badgeLabel when spellLevel is undefined", () => {
      render(() => <ActionCard {...makeProps({ badgeLabel: "Weapon" })} />)
      expect(screen.getByText("Weapon")).toBeInTheDocument()
    })

    it("shows 'Cantrip' instead of badgeLabel when spellLevel=0", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 0, spellSchool: "Evocation" })} />)
      expect(screen.getAllByText("Cantrip").length).toBe(1)
      expect(screen.queryByText("Ability")).not.toBeInTheDocument()
    })

    it("shows '2nd' instead of badgeLabel when spellLevel=2", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 2, spellSchool: "Evocation" })} />)
      expect(screen.getByText("2nd")).toBeInTheDocument()
      expect(screen.queryByText("Ability")).not.toBeInTheDocument()
    })
  })

  describe("concentration badge", () => {
    it("not rendered when concentration is falsy", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText("Concentration")).not.toBeInTheDocument()
    })

    it("rendered when concentration={true}", () => {
      render(() => <ActionCard {...makeProps({ concentration: true })} />)
      expect(screen.getByText("Concentration")).toBeInTheDocument()
    })

    it("toggles styling on click without calling onUpdate", () => {
      render(() => <ActionCard {...makeProps({ concentration: true })} />)
      expect(screen.getByTestId("action-card-test-concentration-badge-inactive")).toBeInTheDocument()
      fireEvent.click(screen.getByTestId("action-card-test-concentration-badge-inactive"))
      expect(screen.getByTestId("action-card-test-concentration-badge-active")).toBeInTheDocument()
      fireEvent.click(screen.getByTestId("action-card-test-concentration-badge-active"))
      expect(screen.getByTestId("action-card-test-concentration-badge-inactive")).toBeInTheDocument()
    })
  })

  describe("stats row", () => {
    it("shows Trigger in stats row when provided", () => {
      render(() => <ActionCard {...makeProps({ trigger: "When targeted" })} />)
      expect(screen.getByText(/When targeted/)).toBeInTheDocument()
    })

    it("shows Range when provided", () => {
      render(() => <ActionCard {...makeProps({ range: "30 ft" })} />)
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
    })

    it("shows Attack with formatted bonus when attackBonus provided", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 5 })} />)
      expect(screen.getByText(/\+5 to hit/)).toBeInTheDocument()
    })

    it("shows Attack when attackBonus=0", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 0 })} />)
      expect(screen.getByText(/\+0 to hit/)).toBeInTheDocument()
    })

    it("does not show Attack when attackBonus is undefined", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText(/to hit/)).not.toBeInTheDocument()
    })

    it("entire stats row hidden when no stats or pill props set", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText(/Range:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Attack:/)).not.toBeInTheDocument()
    })
  })

  describe("edit button", () => {
    it("rendered when onEdit is provided", () => {
      render(() => <ActionCard {...makeProps({ onEdit: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /edit test action/i })).toBeInTheDocument()
    })

    it("not rendered when onEdit is omitted", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("calls onEdit when clicked", () => {
      const onEdit = vi.fn()
      render(() => <ActionCard {...makeProps({ onEdit })} />)
      fireEvent.click(screen.getByRole("button", { name: /edit test action/i }))
      expect(onEdit).toHaveBeenCalledOnce()
    })
  })

  describe("uses tracker vs cast buttons", () => {
    it("shows PipTracker when maxUses=3 and onCast is not provided", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 3, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(3)
    })

    it("shows StepperInput when maxUses=8 and onCast is not provided", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 8, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
    })

    it("shows no tracker when maxUses=0", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 0, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /increase/i })).not.toBeInTheDocument()
    })

    it("shows Cast button when onCast is provided; no pip tracker shown", () => {
      render(() => <ActionCard {...makeProps({ onCast: vi.fn(), castable: () => true, maxUses: 3, onUsesChange: vi.fn() })} />)
      expect(screen.getByRole("button", { name: /^cast test action$/i })).toBeInTheDocument()
      expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("Cast button is disabled when castable returns false", () => {
      render(() => <ActionCard {...makeProps({ onCast: vi.fn(), castable: () => false })} />)
      expect(screen.getByRole("button", { name: /^cast test action$/i })).toBeDisabled()
    })

    it("calls onCast when Cast button is clicked", () => {
      const onCast = vi.fn()
      render(() => <ActionCard {...makeProps({ onCast, castable: () => true })} />)
      fireEvent.click(screen.getByRole("button", { name: /^cast test action$/i }))
      expect(onCast).toHaveBeenCalledOnce()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <ActionCard {...makeProps()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(props: Partial<ActionCardProps> = {}) {
      return render(() => (
        <ReadOnlyProvider value={true}>
          <ActionCard {...makeProps(props)} />
        </ReadOnlyProvider>
      ))
    }

    it("does not render the edit button even when onEdit is provided", () => {
      renderReadOnly({ onEdit: vi.fn() })
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("does not render the Cast button when onCast is provided", () => {
      renderReadOnly({ onCast: vi.fn(), castable: () => true })
      expect(screen.queryByRole("button", { name: /^cast /i })).not.toBeInTheDocument()
    })

    it("renders PipTracker uses as non-interactive spans when maxUses is set", () => {
      renderReadOnly({ maxUses: 3, uses: 0, onUsesChange: vi.fn() })
      expect(screen.queryByRole("button", { name: /charge/i })).not.toBeInTheDocument()
      // Read-only: named by state, since they cannot be clicked
      expect(screen.getAllByRole("img", { name: "Charge available" })).toHaveLength(3)
    })

    it("renders StepperInput without ± buttons when maxUses is large", () => {
      renderReadOnly({ maxUses: 8, uses: 0, onUsesChange: vi.fn() })
      expect(screen.queryByRole("button", { name: /increase/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /decrease/i })).not.toBeInTheDocument()
      expect(screen.getByRole("spinbutton")).toBeInTheDocument()
    })
  })
})

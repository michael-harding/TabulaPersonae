import type { JSX } from "solid-js"
import { axe } from "vitest-axe"

import { ActionCard, ActionCardList } from "@/components/action-card"
import type { ActionCardProps } from "@/components/action-card"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { render as renderUi, screen, fireEvent, waitFor, within, cleanup, cleanupPortals, finishClosing } from "../test-utils"

// A card is a list item, so every test renders it in the list it always sits in
const render = (ui: () => JSX.Element) => renderUi(() => <ActionCardList>{ui()}</ActionCardList>)

function makeProps(overrides: Partial<ActionCardProps> = {}): ActionCardProps {
  return {
    "data-test": "action-card-test",
    name: "Test Action",
    badgeLabel: "Ability",
    ...overrides,
  }
}

// hidden: the open expanded view is modal, which hides the page behind it, card included, from
// assistive technology
const nameButton = (name = "Test Action") => screen.getByRole("button", { name, hidden: true })
const expand = (name?: string) => fireEvent.click(nameButton(name))
const expandedView = () => screen.getByRole("dialog")
// Kobalte keeps closed content mounted, marked data-closed, until its CSS exit animation ends,
// which jsdom never runs
const expectClosed = () => {
  expect(expandedView()).toHaveAttribute("data-closed")
  expect(nameButton()).toHaveAttribute("aria-expanded", "false")
}

describe("ActionCard", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  // TESTING.md §6: names repeat (a bonus action and a spell can both be Hunter's Mark), so every
  // hook comes from the unique one the list gives the card
  describe("test hooks", () => {
    it("prefixes every hook with the card's own data-test, so two cards with one name stay apart", () => {
      const props = { name: "Hunter's Mark", maxUses: 8, uses: 1, onUsesChange: vi.fn() }
      render(() => (
        <>
          <ActionCard {...makeProps({ ...props, "data-test": "action-card-bonus-ba1" })} />
          <ActionCard {...makeProps({ ...props, "data-test": "action-card-bonus-spell-sp1" })} />
        </>
      ))
      for (const card of ["action-card-bonus-ba1", "action-card-bonus-spell-sp1"]) {
        expect(screen.getByTestId(card)).toBeInTheDocument()
        for (const part of ["name", "uses-stepper"]) expect(screen.getByTestId(`${card}-${part}`)).toBeInTheDocument()
      }
    })

    it("prefixes the expanded view's hooks apart from the card face's", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 2, uses: 0, onUsesChange: vi.fn(), onEdit: vi.fn() })} />)
      expand()
      expect(screen.getByTestId("action-card-test-expanded")).toBeInTheDocument()
      for (const part of ["close", "edit-button", "uses"]) expect(screen.getByTestId(`action-card-test-expanded-${part}`)).toBeInTheDocument()
      expect(screen.getByTestId("action-card-test-uses")).toBeInTheDocument()
    })
  })

  describe("card face", () => {
    it("shows the name and the type badge", () => {
      render(() => <ActionCard {...makeProps({ badgeLabel: "Weapon" })} />)
      expect(nameButton()).toBeInTheDocument()
      expect(screen.getByText("Weapon")).toBeInTheDocument()
    })

    it("shows a spell's level as its badge, with no subtitle line", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 3, spellSchool: "Necromancy" })} />)
      expect(screen.getByText("3rd")).toBeInTheDocument()
      expect(screen.queryByText("Ability")).not.toBeInTheDocument()
      expect(screen.queryByText(/Necromancy/)).not.toBeInTheDocument()
      expect(screen.queryByText(/level/i)).not.toBeInTheDocument()
    })

    it("shows 'Cantrip' as the badge for a level 0 spell", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 0, spellSchool: "Evocation" })} />)
      expect(screen.getAllByText("Cantrip")).toHaveLength(1)
    })

    it("is an item in the list of cards", () => {
      render(() => <ActionCard {...makeProps()} />)
      const card = screen.getByTestId("action-card-test")
      expect(card.tagName).toBe("LI")
      expect(card.parentElement).toHaveAttribute("role", "list")
    })

    it("shows Trigger, Range and Attack/Save as a list", () => {
      render(() => <ActionCard {...makeProps({ trigger: "When targeted", range: "30 ft", attackSave: "DEX save" })} />)
      const list = within(screen.getByTestId("action-card-test")).getByRole("list")
      expect(within(list).getByText(/When targeted/)).toBeInTheDocument()
      expect(within(list).getByText(/30 ft/)).toBeInTheDocument()
      expect(within(list).getByText(/DEX save/)).toBeInTheDocument()
    })

    it("shows no stats list when there are no stats", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(within(screen.getByTestId("action-card-test")).queryByRole("list")).not.toBeInTheDocument()
    })
  })

  describe("highlights", () => {
    it("shows the highlights as Markdown", () => {
      render(() => <ActionCard {...makeProps({ highlights: "Deals **double** damage", description: "Long text" })} />)
      expect(screen.getByText("double").tagName).toBe("STRONG")
      expect(screen.queryByText("Long text")).not.toBeInTheDocument()
    })

    it("falls back to the start of the description without highlights", () => {
      render(() => <ActionCard {...makeProps({ description: "A great action." })} />)
      expect(screen.getByText("A great action.")).toHaveClass("line-clamp-2")
    })

    // Either one is the card's summary text, so they look the same
    it("shows the description in the highlights' text color", () => {
      render(() => <ActionCard {...makeProps({ description: "A great action." })} />)
      expect(screen.getByText("A great action.")).not.toHaveClass("text-muted-foreground")
    })
  })

  describe("stat badges", () => {
    it("shows the attack bonus as a two-line badge", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 5 })} />)
      const badge = screen.getByTestId("action-card-test-attack-badge")
      expect(badge).toHaveTextContent("Attack")
      expect(badge).toHaveTextContent("+5")
    })

    it("shows an attack bonus of 0", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 0 })} />)
      expect(screen.getByTestId("action-card-test-attack-badge")).toHaveTextContent("+0")
    })

    it("shows no attack badge without an attack bonus", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByTestId("action-card-test-attack-badge")).not.toBeInTheDocument()
    })

    it("shows the attack bonus breakdown in a tooltip when given one", async () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 6, attackBonusTooltip: "+3 (Str) + 1 (Weapon Bonus) + 2 (Prof)" })} />)
      const trigger = screen.getByRole("group", { name: "Attack +6" })
      expect(trigger).toContainElement(screen.getByTestId("action-card-test-attack-badge"))
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("+3 (Str) + 1 (Weapon Bonus) + 2 (Prof)"))
    })

    it("gives an entered attack bonus no tooltip trigger", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 5 })} />)
      expect(screen.queryByRole("group")).not.toBeInTheDocument()
    })

    it("shows the damage over its type in red", () => {
      render(() => <ActionCard {...makeProps({ damage: "2d6", damageType: "Fire" })} />)
      const badge = screen.getByTestId("action-card-test-damage-badge")
      expect(badge).toHaveTextContent("2d6")
      expect(badge).toHaveTextContent("Fire")
      expect(badge).toHaveClass("border-red-500")
    })

    it("shows the damage breakdown in a tooltip when given one", async () => {
      render(() => <ActionCard {...makeProps({ damage: "1d8+4", damageType: "slashing", damageTooltip: "1d8 + 3 (Str) + 1 (Weapon Bonus)" })} />)
      const trigger = screen.getByRole("group", { name: "Damage 1d8+4 slashing" })
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("1d8 + 3 (Str) + 1 (Weapon Bonus)"))
    })

    it("marks recurring damage with an icon and words for screen readers", () => {
      render(() => <ActionCard {...makeProps({ damage: "1d4", damageType: "Fire", damageRecurring: true })} />)
      const badge = screen.getByTestId("action-card-test-damage-badge")
      expect(badge.querySelector(".lucide-refresh-cw")).toHaveAttribute("aria-hidden", "true")
      expect(within(badge).getByText(", recurs each turn")).toHaveClass("sr-only")
    })

    it("shows no recurring mark on damage that doesn't recur", () => {
      render(() => <ActionCard {...makeProps({ damage: "1d4" })} />)
      expect(screen.getByTestId("action-card-test-damage-badge").querySelector(".lucide-refresh-cw")).toBeNull()
    })

    it("shows healing in green", () => {
      render(() => <ActionCard {...makeProps({ gain: "2d4+2", gainType: "Healing" })} />)
      const badge = screen.getByTestId("action-card-test-gain-badge")
      expect(badge).toHaveTextContent("2d4+2")
      expect(badge).toHaveTextContent("Healing")
      expect(badge).toHaveClass("border-green-500")
    })

    // Matches the health bar's temp HP segment
    it("shows temp HP in blue", () => {
      render(() => <ActionCard {...makeProps({ gain: "5", gainType: "Temp HP" })} />)
      expect(screen.getByTestId("action-card-test-gain-badge")).toHaveClass("border-blue-500")
    })

    it("labels a gain with no type \"Gain\"", () => {
      render(() => <ActionCard {...makeProps({ gain: "2d4+3 healing" })} />)
      expect(screen.getByTestId("action-card-test-gain-badge")).toHaveTextContent("Gain")
    })

    it("marks recurring gain", () => {
      render(() => <ActionCard {...makeProps({ gain: "1d4", gainType: "Temp HP", gainRecurring: true })} />)
      expect(screen.getByTestId("action-card-test-gain-badge").querySelector(".lucide-refresh-cw")).not.toBeNull()
    })

    // Regression: the card showed one pill, and a gain hid the damage (e.g. Vampiric Touch)
    it("shows damage and gain together", () => {
      render(() => <ActionCard {...makeProps({ attackBonus: 5, damage: "3d6", damageType: "Necrotic", gain: "half", gainType: "Healing" })} />)
      expect(screen.getByTestId("action-card-test-attack-badge")).toBeInTheDocument()
      expect(screen.getByTestId("action-card-test-damage-badge")).toBeInTheDocument()
      expect(screen.getByTestId("action-card-test-gain-badge")).toBeInTheDocument()
    })
  })

  describe("concentration badge", () => {
    it("not rendered when concentration is falsy", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(screen.queryByText("Concentration")).not.toBeInTheDocument()
    })

    it("toggles styling on click, shared with the expanded view", () => {
      render(() => <ActionCard {...makeProps({ concentration: true })} />)
      fireEvent.click(screen.getByTestId("action-card-test-concentration-badge-inactive"))
      expect(screen.getByTestId("action-card-test-concentration-badge-active")).toBeInTheDocument()
      expand()
      expect(screen.getByTestId("action-card-test-expanded-concentration-badge-active")).toBeInTheDocument()
    })
  })

  describe("expanded view", () => {
    it("opens from the name button, which reports that it's expanded", () => {
      render(() => <ActionCard {...makeProps()} />)
      expect(nameButton()).toHaveAttribute("aria-expanded", "false")
      expand()
      expect(nameButton()).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByRole("dialog", { name: "Test Action" })).toBeInTheDocument()
    })

    it("takes focus itself, not its first control", async () => {
      render(() => <ActionCard {...makeProps({ onEdit: vi.fn() })} />)
      expand()
      await waitFor(() => expect(expandedView()).toHaveFocus())
    })

    // A click outside only closing it is pointer behavior, tested in e2e (character-sheet.spec.ts)
    it("is modal, hiding the page behind it from assistive technology", () => {
      render(() => <ActionCard {...makeProps()} />)
      expand()
      expect(screen.queryByRole("button", { name: "Test Action" })).not.toBeInTheDocument()
      expect(nameButton()).toBeInTheDocument()
    })

    it("looks like the card, with the card's hover border", () => {
      render(() => <ActionCard {...makeProps()} />)
      expand()
      expect(expandedView()).toHaveClass("bg-card", "text-card-foreground", "border-primary")
      expect(expandedView()).not.toHaveClass("bg-popover")
      expect(screen.getByTestId("action-card-test")).toHaveClass("hover:border-primary")
    })

    it("opens on a click anywhere on the card that isn't a control", () => {
      render(() => <ActionCard {...makeProps({ range: "30 ft" })} />)
      fireEvent.click(screen.getByText(/30 ft/))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("does not open from a click on the card's controls", () => {
      const onCast = vi.fn()
      render(() => (
        <>
          <ActionCard {...makeProps({ "data-test": "pips", name: "Pips", maxUses: 2, uses: 0, onUsesChange: vi.fn() })} />
          <ActionCard {...makeProps({ "data-test": "cast", name: "Spell", spellLevel: 1, onCast, castable: () => true })} />
          <ActionCard {...makeProps({ "data-test": "tip", name: "Tip", attackBonus: 6, attackBonusTooltip: "+6 (Str)" })} />
        </>
      ))
      fireEvent.click(screen.getAllByLabelText("Charge available (click to use)")[0])
      fireEvent.click(screen.getByRole("button", { name: "Cast Spell" }))
      fireEvent.click(screen.getByRole("group", { name: "Attack +6" }))
      expect(onCast).toHaveBeenCalledOnce()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Focus returns to the name button once the content unmounts after its exit animation, which
    // jsdom never runs: tests/e2e covers it
    it("closes with its close button", () => {
      render(() => <ActionCard {...makeProps()} />)
      expand()
      fireEvent.click(screen.getByRole("button", { name: "Close Test Action" }))
      expectClosed()
    })

    it("closes on Escape", () => {
      render(() => <ActionCard {...makeProps()} />)
      expand()
      fireEvent.keyDown(expandedView(), { key: "Escape" })
      expectClosed()
    })

    it("shows every detail, including the full description and highlights", () => {
      const description = "A".repeat(300)
      render(() => (
        <ActionCard {...makeProps({
          spellLevel: 3, spellSchool: "Evocation", ritual: true, concentration: true, castingTime: "1 action", range: "60 ft",
          components: "V, S", duration: "Concentration, up to 1 minute", attackSave: "DEX save", trigger: "When hit",
          maxUses: 3, rechargeOn: "short-rest", onUsesChange: vi.fn(), atHigherLevel: "+1d6 per level",
          highlights: "Big **boom**", description, damage: "8d6", damageType: "Fire", damageRecurring: true,
          gain: "1d4", gainType: "Temp HP", gainRecurring: true,
        })} />
      ))
      expand()
      const view = expandedView()
      for (const text of [
        "3rd level • Evocation (ritual) · Concentration", "1 action", "60 ft", "V, S", "Concentration, up to 1 minute", "DEX save",
        "When hit", "Short Rest", "+1d6 per level", description, "8d6 Fire, recurs each turn", "1d4 Temp HP, recurs each turn",
      ]) expect(within(view).getByText(text, { exact: false })).toBeInTheDocument()
      expect(within(view).getByText("boom").tagName).toBe("STRONG")
    })

    it("offers Edit in its footer, which closes it and opens the form", async () => {
      const onEdit = vi.fn()
      render(() => <ActionCard {...makeProps({ onEdit })} />)
      expect(screen.queryByRole("button", { name: "Edit Test Action" })).not.toBeInTheDocument()
      expand()
      const edit = within(expandedView()).getByRole("button", { name: "Edit Test Action" })
      expect(edit).toHaveTextContent("Edit")
      fireEvent.click(edit)
      expectClosed()
      // Not until the view has finished closing and handed focus back to the card's name, which
      // would otherwise pull focus out of the form just opened
      expect(onEdit).not.toHaveBeenCalled()
      finishClosing(expandedView())
      await waitFor(() => expect(onEdit).toHaveBeenCalledOnce())
      expect(nameButton()).toHaveFocus()
    })

    it("has no Edit button without onEdit", () => {
      render(() => <ActionCard {...makeProps()} />)
      expand()
      expect(within(expandedView()).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("works the uses tracker from the expanded view too", () => {
      const onUsesChange = vi.fn()
      render(() => <ActionCard {...makeProps({ maxUses: 2, uses: 0, onUsesChange })} />)
      expand()
      fireEvent.click(within(expandedView()).getAllByLabelText("Charge available (click to use)")[0])
      expect(onUsesChange).toHaveBeenCalled()
    })

    it("has no accessibility violations", async () => {
      render(() => <ActionCard {...makeProps({ damage: "1d6", gain: "1d4", onEdit: vi.fn(), maxUses: 2, uses: 0, onUsesChange: vi.fn() })} />)
      expand()
      expect((await axe(expandedView())).violations).toHaveLength(0)
    })
  })

  describe("uses tracker vs casting", () => {
    it("shows PipTracker when maxUses=3 and onCast is not provided", () => {
      render(() => <ActionCard {...makeProps({ maxUses: 3, uses: 0, onUsesChange: vi.fn() })} />)
      expect(screen.getAllByLabelText("Charge available (click to use)")).toHaveLength(3)
    })

    it("marks available uses with a sparkle unless given another icon", () => {
      const CustomIcon = () => <svg class="custom-icon" aria-hidden="true" />
      render(() => (
        <>
          <ActionCard {...makeProps({ "data-test": "plain", name: "Plain", maxUses: 1, uses: 0, onUsesChange: vi.fn() })} />
          <ActionCard {...makeProps({ "data-test": "custom", name: "Custom", maxUses: 1, uses: 0, onUsesChange: vi.fn(), pipIcon: CustomIcon })} />
        </>
      ))
      expect(screen.getByTestId("plain-uses-slot-0").querySelector(".lucide-sparkle")).not.toBeNull()
      expect(screen.getByTestId("custom-uses-slot-0").querySelector(".custom-icon")).not.toBeNull()
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

    // In a list, "Cast" alone could be any spell's
    it("shows a Cast button named for the spell, and no pip tracker", () => {
      render(() => <ActionCard {...makeProps({ name: "Fireball", onCast: vi.fn(), castable: () => true, maxUses: 3, onUsesChange: vi.fn() })} />)
      expect(screen.getByRole("button", { name: "Cast Fireball" })).toHaveTextContent("Cast")
      expect(screen.queryByLabelText("Charge available (click to use)")).not.toBeInTheDocument()
    })

    it("disables Cast when castable returns false", () => {
      render(() => <ActionCard {...makeProps({ onCast: vi.fn(), castable: () => false })} />)
      expect(screen.getByRole("button", { name: "Cast Test Action" })).toBeDisabled()
    })

    it("casts at the spell's own level", () => {
      const onCast = vi.fn()
      render(() => <ActionCard {...makeProps({ spellLevel: 2, onCast, castable: () => true })} />)
      fireEvent.click(screen.getByRole("button", { name: "Cast Test Action" }))
      expect(onCast).toHaveBeenCalledWith(2)
    })
  })

  describe("slot-level select", () => {
    const levels = (remaining: Record<number, number>) => () => Object.entries(remaining).map(([level, r]) => ({ level: Number(level), remaining: r }))
    const renderFireball = (overrides: Partial<ActionCardProps> = {}) => render(() => (
      <ActionCard {...makeProps({ name: "Fireball", spellLevel: 3, castable: () => true, slotLevels: levels({ 3: 1, 4: 0, 5: 2 }), ...overrides })} />
    ))
    const select = () => screen.getByRole("combobox", { name: "Cast Fireball at level" })

    it("is hidden with only the spell's own level to choose", () => {
      renderFireball({ onCast: vi.fn(), slotLevels: levels({ 3: 1 }) })
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    })

    it("is hidden without slot levels", () => {
      renderFireball({ onCast: vi.fn(), slotLevels: undefined })
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    })

    it("defaults to the spell's own level", () => {
      renderFireball({ onCast: vi.fn() })
      expect(select()).toHaveTextContent("3rd")
    })

    it("lists each level, marking available ones with an icon and muting the rest", () => {
      renderFireball({ onCast: vi.fn() })
      fireEvent.click(select())
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["3rd", "4th no slots", "5th"])
      expect(screen.getByRole("option", { name: "3rd" }).querySelector(".lucide-wand-sparkles")).not.toBeNull()
      const unavailable = screen.getByRole("option", { name: "4th no slots" })
      expect(unavailable).toHaveClass("text-muted-foreground")
      expect(unavailable.querySelector(".lucide-wand-sparkles")).toBeNull()
    })

    it("casts at the chosen level, then resets to the spell's own level", () => {
      const onCast = vi.fn()
      renderFireball({ onCast })
      fireEvent.click(select())
      fireEvent.click(screen.getByRole("option", { name: "5th" }))
      fireEvent.click(screen.getByRole("button", { name: "Cast Fireball" }))
      expect(onCast).toHaveBeenCalledWith(5)
      expect(select()).toHaveTextContent("3rd")
    })

    it("disables Cast while the chosen level has no slots left", () => {
      renderFireball({ onCast: vi.fn() })
      fireEvent.click(select())
      fireEvent.click(screen.getByRole("option", { name: "4th no slots" }))
      expect(screen.getByRole("button", { name: "Cast Fireball" })).toBeDisabled()
      expect(select().firstElementChild).toHaveClass("text-muted-foreground")
    })

    // A higher slot is never spent without being chosen
    it("keeps the spell's own level selected, with Cast disabled, when its slots are used up", () => {
      renderFireball({ onCast: vi.fn(), slotLevels: levels({ 3: 0, 5: 2 }) })
      expect(select()).toHaveTextContent("3rd")
      expect(screen.getByRole("button", { name: "Cast Fireball" })).toBeDisabled()
      fireEvent.click(select())
      fireEvent.click(screen.getByRole("option", { name: "5th" }))
      expect(screen.getByRole("button", { name: "Cast Fireball" })).toBeEnabled()
    })

    it("has no accessibility violations while open", async () => {
      const { container } = renderFireball({ onCast: vi.fn() })
      fireEvent.click(select())
      expect((await axe(container)).violations).toHaveLength(0)
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <ActionCard {...makeProps()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("has no accessibility violations with calculated attack bonus and damage tooltips", async () => {
    const { container } = render(() => (
      <ActionCard {...makeProps({ attackBonus: 6, attackBonusTooltip: "+3 (Str) + 1 (Weapon Bonus) + 2 (Prof)", damage: "1d8+4", damageType: "slashing", damageTooltip: "1d8 + 3 (Str) + 1 (Weapon Bonus)" })} />
    ))
    expect(screen.getAllByRole("group")).toHaveLength(2)
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

    it("still expands, without an Edit button", () => {
      renderReadOnly({ onEdit: vi.fn() })
      expand()
      expect(within(expandedView()).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("does not render the Cast button or the slot select", () => {
      renderReadOnly({ onCast: vi.fn(), castable: () => true, spellLevel: 1, slotLevels: () => [{ level: 1, remaining: 1 }, { level: 2, remaining: 1 }] })
      expect(screen.queryByRole("button", { name: /^cast /i })).not.toBeInTheDocument()
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
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

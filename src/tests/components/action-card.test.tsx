import { createSignal, type JSX } from "solid-js"
import { axe } from "vitest-axe"

import { ActionCard, ActionCardList, CAST_FEEDBACK_MS } from "@/components/action-card"
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

    it("shows Trigger and Range as a list, and Attack/Save as a badge instead", () => {
      render(() => <ActionCard {...makeProps({ trigger: "When targeted", range: "30 ft", attackSave: "DEX save" })} />)
      const list = within(screen.getByTestId("action-card-test")).getByRole("list")
      expect(within(list).getByText(/When targeted/)).toBeInTheDocument()
      expect(within(list).getByText(/30 ft/)).toBeInTheDocument()
      expect(within(list).queryByText(/DEX save/)).not.toBeInTheDocument()
      expect(screen.getByTestId("action-card-test-attack-save-badge")).toHaveTextContent("DEX save")
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

    it("shows a save's label with its DC, explained in a tooltip", async () => {
      render(() => <ActionCard {...makeProps({ attackSave: "DEX Save", attackSaveDC: 15, attackSaveTooltip: "8 + 2 (Prof) + 5 (Int)" })} />)
      const badge = screen.getByTestId("action-card-test-attack-save-badge")
      expect(badge).toHaveTextContent("DEX Save")
      expect(badge).toHaveTextContent("DC 15")
      const trigger = screen.getByRole("group", { name: "DEX Save DC 15" })
      expect(trigger).toContainElement(badge)
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("8 + 2 (Prof) + 5 (Int)"))
    })

    it("shows Attack/Save text without a DC as written, with no tooltip trigger", () => {
      render(() => <ActionCard {...makeProps({ attackSave: "DEX save DC 13" })} />)
      const badge = screen.getByTestId("action-card-test-attack-save-badge")
      expect(badge).toHaveTextContent("Attack/Save")
      expect(badge).toHaveTextContent("DEX save DC 13")
      expect(screen.queryByRole("group")).not.toBeInTheDocument()
    })

    it("orders the badges Attack, Attack/Save, Damage, Gain", () => {
      render(() => <ActionCard {...makeProps({ gain: "1d4", damage: "2d6", attackSave: "CON Save", attackSaveDC: 13, attackBonus: 5 })} />)
      const card = screen.getByTestId("action-card-test")
      const order = ["attack-badge", "attack-save-badge", "damage-badge", "gain-badge"].map((part) => screen.getByTestId(`action-card-test-${part}`))
      expect([...card.querySelectorAll('[data-sem="stat-badge"]')]).toEqual(order)
    })

    it("shows the Attack/Save badge in the expanded view rather than as a detail row", () => {
      render(() => <ActionCard {...makeProps({ attackSave: "WIS Save", attackSaveDC: 14 })} />)
      expand()
      expect(screen.getByTestId("action-card-test-expanded-attack-save-badge")).toHaveTextContent("WIS SaveDC 14")
      expect(within(expandedView()).queryByText("Attack/Save:")).not.toBeInTheDocument()
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

    // Beside the Range/Trigger list the chips stack, Concentration on top; alone they share a row
    it("stacks Concentration above the duration beside the stats list", () => {
      render(() => <ActionCard {...makeProps({ concentration: true, duration: "Concentration, up to 1 minute", range: "60 ft" })} />)
      const chips = screen.getByTestId("action-card-test-concentration-badge").parentElement!
      expect(chips).toHaveClass("flex-col")
      expect(chips.children[0]).toHaveTextContent("Concentration")
      expect(chips.children[1]).toHaveTextContent("up to 1 minute")
    })

    it("keeps Concentration and the duration in a row without a stats list", () => {
      render(() => <ActionCard {...makeProps({ concentration: true, duration: "Concentration, up to 1 minute" })} />)
      expect(screen.getByTestId("action-card-test-concentration-badge").parentElement).not.toHaveClass("flex-col")
    })

    // Casting the spell puts it in effect, so the chip only says the spell needs concentration
    it("is a static chip, unchanged by a click", () => {
      render(() => <ActionCard {...makeProps({ concentration: true })} />)
      const chip = screen.getByTestId("action-card-test-concentration-badge")
      expect(chip.tagName).toBe("SPAN")
      expect(chip).toHaveClass("text-muted-foreground")
      fireEvent.click(chip)
      expect(screen.getByTestId("action-card-test-concentration-badge")).toHaveClass("text-muted-foreground")
      expand()
      expect(screen.getByTestId("action-card-test-expanded-concentration-badge")).toBeInTheDocument()
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
        "Evocation", "Ritual", "1 action", "60 ft", "V, S", "Concentration, up to 1 minute", "DEX save",
        "When hit", "Short Rest", "+1d6 per level", description, "8d6 Fire, recurs each turn", "1d4 Temp HP, recurs each turn",
      ]) expect(within(view).getByText(text, { exact: false })).toBeInTheDocument()
      expect(within(view).getByText("boom").tagName).toBe("STRONG")
    })

    it("has no subtitle under its name", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 3, spellSchool: "Evocation", ritual: true, concentration: true })} />)
      expand()
      const heading = within(expandedView()).getByRole("heading", { name: "Test Action" })
      expect(heading.parentElement!.textContent).not.toMatch(/level|Evocation|ritual/i)
      expect(within(expandedView()).queryByText(/3rd level/)).not.toBeInTheDocument()
    })

    it("shows a spell's school, the item granting it, and a free cast", () => {
      render(() => <ActionCard {...makeProps({ spellLevel: 1, spellSchool: "Abjuration", grantedBy: "Ring of Shielding", freeCast: true })} />)
      expand()
      const view = expandedView()
      expect(within(view).getByText("School:").parentElement).toHaveTextContent("School: Abjuration")
      expect(within(view).getByText("Granted By:").parentElement).toHaveTextContent("Granted By: Ring of Shielding")
      expect(within(view).getByText("Free Cast")).toBeInTheDocument()
    })

    it("shows the level a feature is gained at", () => {
      render(() => <ActionCard {...makeProps({ atLevel: 3 })} />)
      expand()
      expect(within(expandedView()).getByText("At Level:").parentElement).toHaveTextContent("At Level: 3")
    })

    it("shows an item's rarity, attunement, and quantity", () => {
      render(() => <ActionCard {...makeProps({ rarity: "Very Rare", requiresAttunement: true, attuned: true, quantity: 2 })} />)
      expand()
      const view = expandedView()
      expect(within(view).getByText("Rarity:").parentElement).toHaveTextContent("Rarity: Very Rare")
      expect(within(view).getByText("Attunement:").parentElement).toHaveTextContent("Attunement: Attuned")
      expect(within(view).getByText("Quantity:").parentElement).toHaveTextContent("Quantity: 2")
    })

    it("says when an item requiring attunement isn't attuned, and omits a quantity of one", () => {
      render(() => <ActionCard {...makeProps({ requiresAttunement: true, attuned: false, quantity: 1 })} />)
      expand()
      const view = expandedView()
      expect(within(view).getByText("Attunement:").parentElement).toHaveTextContent("Attunement: Required, not attuned")
      expect(within(view).queryByText("Quantity:")).not.toBeInTheDocument()
    })

    it("omits attunement for an item that doesn't require it", () => {
      render(() => <ActionCard {...makeProps({ attuned: false })} />)
      expand()
      expect(within(expandedView()).queryByText("Attunement:")).not.toBeInTheDocument()
    })

    // The same size as the detail rows and description around them
    it("shows the highlights at the size of the text around them", () => {
      render(() => <ActionCard {...makeProps({ highlights: "Big **boom**", description: "Details", castingTime: "1 action" })} />)
      expand()
      const highlights = within(expandedView()).getByText("boom").closest("[data-sem='markdown-content']")!
      expect(highlights).toHaveClass("text-xs")
      expect(highlights).not.toHaveClass("text-sm")
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

  describe("cast feedback", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }))
    afterEach(() => vi.useRealTimers())

    const castButton = () => screen.getByRole("button", { name: "Cast Fireball" })
    const status = () => screen.getByTestId("action-card-test-cast-status")

    it("fills with the sheet colour and shows the wand for a moment after a cast, then reverts", () => {
      render(() => <ActionCard {...makeProps({ name: "Fireball", spellLevel: 3, onCast: vi.fn(), castable: () => true })} />)
      expect(status()).toHaveAttribute("aria-live", "polite")
      expect(status()).toHaveTextContent("")
      fireEvent.click(castButton())
      expect(castButton()).toHaveClass("bg-primary", "text-primary-foreground")
      expect(castButton()).not.toHaveClass("border-input")
      // The label stays, hidden, holding the button's width
      expect(within(castButton()).getByText("Cast")).toHaveClass("invisible")
      expect(castButton().querySelector(".lucide-wand-sparkles")).not.toBeNull()
      expect(status()).toHaveTextContent("Fireball cast")
      vi.advanceTimersByTime(CAST_FEEDBACK_MS)
      expect(within(castButton()).getByText("Cast")).not.toHaveClass("invisible")
      expect(castButton()).toHaveClass("border-input")
      expect(castButton()).not.toHaveClass("bg-primary")
      expect(castButton().querySelector(".lucide-wand-sparkles")).toBeNull()
      expect(status()).toHaveTextContent("")
    })

    // A double tap spends one slot
    it("ignores presses while the feedback shows", () => {
      const onCast = vi.fn()
      render(() => <ActionCard {...makeProps({ name: "Fireball", spellLevel: 3, onCast, castable: () => true })} />)
      fireEvent.click(castButton())
      fireEvent.click(castButton())
      expect(onCast).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(CAST_FEEDBACK_MS)
      fireEvent.click(castButton())
      expect(onCast).toHaveBeenCalledTimes(2)
    })

    it("shows the feedback unfaded when the cast spent the last slot, then disables Cast", () => {
      const [slots, setSlots] = createSignal(1)
      render(() => (
        <ActionCard {...makeProps({ name: "Fireball", spellLevel: 3, onCast: () => setSlots((n) => n - 1), castable: () => slots() > 0 })} />
      ))
      fireEvent.click(castButton())
      expect(castButton()).toBeEnabled()
      expect(castButton().querySelector(".lucide-wand-sparkles")).not.toBeNull()
      vi.advanceTimersByTime(CAST_FEEDBACK_MS)
      expect(castButton()).toBeDisabled()
    })

    it("shows the same feedback on the expanded view's Cast button", () => {
      render(() => <ActionCard {...makeProps({ name: "Fireball", spellLevel: 3, onCast: vi.fn(), castable: () => true })} />)
      expand("Fireball")
      const expandedCast = within(expandedView()).getByRole("button", { name: "Cast Fireball" })
      fireEvent.click(expandedCast)
      expect(expandedCast).toHaveClass("bg-primary")
      expect(screen.getByTestId("action-card-test-expanded-cast-status")).toHaveTextContent("Fireball cast")
    })
  })

  describe("spell in effect", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }))
    afterEach(() => vi.useRealTimers())

    const levels = () => [{ level: 1, remaining: 1 }, { level: 2, remaining: 1 }]
    const spellProps = (overrides: Partial<ActionCardProps> = {}) => makeProps({
      name: "Bless", spellLevel: 1, concentration: true, onCast: vi.fn(), castable: () => true, onEnd: vi.fn(), ...overrides,
    })
    const endButton = () => screen.getByRole("button", { name: "End Bless" })
    const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

    it("replaces Cast and the slot select with an end button, on the card and in the expanded view", () => {
      render(() => <ActionCard {...spellProps({ active: true, slotLevels: levels })} />)
      expect(endButton()).toHaveAttribute("data-test", "action-card-test-end-button")
      expect(endButton()).toHaveClass("h-11", "w-11")
      expect(endButton().querySelector(".lucide-x")).not.toBeNull()
      expect(screen.queryByRole("button", { name: "Cast Bless" })).not.toBeInTheDocument()
      expect(screen.queryByRole("combobox", { name: "Cast Bless at level" })).not.toBeInTheDocument()
      expand("Bless")
      expect(within(expandedView()).getByRole("button", { name: "End Bless" })).toHaveAttribute("data-test", "action-card-test-expanded-end-button")
      expect(within(expandedView()).queryByRole("button", { name: "Cast Bless" })).not.toBeInTheDocument()
    })

    it("shows Cast while the spell isn't in effect", () => {
      render(() => <ActionCard {...spellProps({ active: false })} />)
      expect(screen.getByRole("button", { name: "Cast Bless" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "End Bless" })).not.toBeInTheDocument()
    })

    it("ends the spell on a single click and announces it", () => {
      const [active, setActive] = createSignal(true)
      const onEnd = vi.fn(() => setActive(false))
      render(() => <ActionCard {...spellProps({ active: active(), onEnd })} />)
      fireEvent.click(endButton())
      expect(onEnd).toHaveBeenCalledOnce()
      expect(screen.getByRole("button", { name: "Cast Bless" })).toBeInTheDocument()
      expect(screen.getByTestId("action-card-test-cast-status")).toHaveTextContent("Bless ended")
    })

    it("moves focus to the Cast button that replaces the end button", async () => {
      const [active, setActive] = createSignal(true)
      render(() => <ActionCard {...spellProps({ active: active(), onEnd: () => setActive(false) })} />)
      endButton().focus()
      fireEvent.click(endButton())
      await flush()
      expect(screen.getByRole("button", { name: "Cast Bless" })).toHaveFocus()
    })

    it("moves focus to the card's name when the Cast button that replaces it is disabled", async () => {
      const [active, setActive] = createSignal(true)
      render(() => <ActionCard {...spellProps({ active: active(), castable: () => false, onEnd: () => setActive(false) })} />)
      fireEvent.click(endButton())
      await flush()
      expect(screen.getByRole("button", { name: "Cast Bless" })).toBeDisabled()
      expect(nameButton("Bless")).toHaveFocus()
    })

    // A double tap spends one slot and doesn't end the spell it just cast
    it("keeps the cast feedback showing before the end button appears, then moves focus to it", async () => {
      const [active, setActive] = createSignal(false)
      const onCast = vi.fn(() => setActive(true))
      render(() => <ActionCard {...spellProps({ active: active(), onCast })} />)
      const cast = screen.getByRole("button", { name: "Cast Bless" })
      cast.focus()
      fireEvent.click(cast)
      fireEvent.click(screen.getByRole("button", { name: "Cast Bless" }))
      expect(onCast).toHaveBeenCalledOnce()
      expect(screen.getByRole("button", { name: "Cast Bless" }).querySelector(".lucide-wand-sparkles")).not.toBeNull()
      expect(screen.queryByRole("button", { name: "End Bless" })).not.toBeInTheDocument()
      vi.advanceTimersByTime(CAST_FEEDBACK_MS)
      await flush()
      expect(endButton()).toHaveFocus()
    })

    it("clears the announcement once the spell is cast again", () => {
      const [active, setActive] = createSignal(true)
      render(() => <ActionCard {...spellProps({ active: active(), onEnd: () => setActive(false), onCast: () => setActive(true) })} />)
      fireEvent.click(endButton())
      fireEvent.click(screen.getByRole("button", { name: "Cast Bless" }))
      vi.advanceTimersByTime(CAST_FEEDBACK_MS)
      expect(screen.getByTestId("action-card-test-cast-status")).toHaveTextContent("")
    })

    it("has no end button on a read-only sheet", () => {
      render(() => <ReadOnlyProvider value={true}><ActionCard {...spellProps({ active: true })} /></ReadOnlyProvider>)
      expect(screen.queryByRole("button", { name: "End Bless" })).not.toBeInTheDocument()
    })

    it("has no accessibility violations while in effect", async () => {
      vi.useRealTimers()
      const { container } = render(() => <ActionCard {...spellProps({ active: true })} />)
      expect((await axe(container)).violations).toHaveLength(0)
    })
  })

  describe("upcast scaling", () => {
    const levels = () => [{ level: 3, remaining: 1 }, { level: 4, remaining: 1 }, { level: 5, remaining: 2 }]
    const renderSpell = (overrides: Partial<ActionCardProps> = {}) => render(() => (
      <ActionCard {...makeProps({
        name: "Fireball", spellLevel: 3, onCast: vi.fn(), castable: () => true, slotLevels: levels,
        damage: "8d6", damageType: "Fire", damagePerLevel: "1d6", gain: "2d8+3", gainType: "Healing", gainPerLevel: "1d8",
        ...overrides,
      })} />
    ))
    const choose = (level: string) => {
      fireEvent.click(screen.getByRole("combobox", { name: "Cast Fireball at level" }))
      fireEvent.click(screen.getByRole("option", { name: level }))
    }

    it("shows the base damage and gain, without a breakdown, at the spell's own level", () => {
      renderSpell()
      expect(screen.getByTestId("action-card-test-damage-badge")).toHaveTextContent("8d6")
      expect(screen.getByTestId("action-card-test-gain-badge")).toHaveTextContent("2d8+3")
      expect(screen.queryByRole("group")).not.toBeInTheDocument()
    })

    it("scales damage and gain to the chosen slot, with the breakdown as their tooltips", () => {
      renderSpell()
      choose("5th")
      expect(screen.getByTestId("action-card-test-damage-badge")).toHaveTextContent("10d6")
      expect(screen.getByTestId("action-card-test-gain-badge")).toHaveTextContent("4d8+3")
      const damage = screen.getByRole("group", { name: "Damage 10d6 Fire" })
      fireEvent.click(damage)
      expect(screen.getByText("8d6 (3rd Level) + 2d6 (Upcast to 5th)")).toBeInTheDocument()
      expect(screen.getByRole("group", { name: "Gain 4d8+3 Healing" })).toBeInTheDocument()
    })

    it("scales the expanded view's badges too", () => {
      renderSpell()
      choose("4th")
      expand("Fireball")
      expect(screen.getByTestId("action-card-test-expanded-damage-badge")).toHaveTextContent("9d6")
      expect(screen.getByTestId("action-card-test-expanded-gain-badge")).toHaveTextContent("3d8+3")
    })

    it("returns to the base values after a cast", () => {
      renderSpell()
      choose("5th")
      fireEvent.click(screen.getByRole("button", { name: "Cast Fireball" }))
      expect(screen.getByTestId("action-card-test-damage-badge")).toHaveTextContent("8d6")
    })

    it("leaves a value without a per-level amount as entered", () => {
      renderSpell({ gainPerLevel: undefined })
      choose("5th")
      expect(screen.getByTestId("action-card-test-gain-badge")).toHaveTextContent("2d8+3")
      expect(screen.queryByRole("group", { name: /^Gain/ })).not.toBeInTheDocument()
    })

    it("has no accessibility violations while upcast", async () => {
      const { container } = renderSpell()
      choose("5th")
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

  describe("reorderable", () => {
    const reorder = (controls: () => JSX.Element) => ({
      ref: vi.fn(),
      style: () => undefined,
      isDragging: () => false,
      onPointerDown: vi.fn(),
      controls,
    })

    it("shows its reorder controls in place of its own, and hands its element to the sortable list", () => {
      const r = reorder(() => <button type="button">Reorder Test Action</button>)
      render(() => <ActionCard {...makeProps({ maxUses: 3, uses: 0, onUsesChange: vi.fn(), reorder: r })} />)
      expect(screen.getByTestId("action-card-test-reorder")).toContainElement(screen.getByRole("button", { name: "Reorder Test Action" }))
      expect(screen.queryByTestId("action-card-test-uses")).not.toBeInTheDocument()
      expect(r.ref).toHaveBeenCalledWith(screen.getByTestId("action-card-test"))
    })

    it("is dragged by any part of it, and never opens its expanded view", () => {
      const r = reorder(() => null)
      render(() => <ActionCard {...makeProps({ reorder: r })} />)
      const card = screen.getByTestId("action-card-test")

      fireEvent.pointerDown(screen.getByText("Test Action"))
      expect(r.onPointerDown).toHaveBeenCalledOnce()

      // Its name is just its name, not the button that opens it
      expect(screen.queryByRole("button", { name: "Test Action" })).not.toBeInTheDocument()
      fireEvent.click(card)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})

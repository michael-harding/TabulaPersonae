import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"
import { createStore, reconcile } from "solid-js/store"

import { CombatStatsModule } from "@/components/combat-stats-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Equipment } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

import { cleanup, render, screen, fireEvent, waitFor, cleanupPortals, within, expectTapTooltip } from "../test-utils"

function makeCharacter(overrides: Partial<Character> = {}) {
  return {
    ...createDefaultCharacter(),
    hitPoints: { current: 10, maximum: 20, temporary: 0 },
    armorClass: 15,
    initiative: 2,
    speed: 30,
    proficiencyBonus: 3,
    deathSaves: { successes: 0, failures: 0 },
    ...overrides,
  }
}

function makeMagicItem(overrides: Partial<Equipment> = {}) {
  return {
    id: "item-1",
    name: "Test Item",
    description: "",
    quantity: 1,
    weight: 0,
    equipped: true,
    type: "other" as const,
    magic: true,
    requiresAttunement: true,
    attuned: true,
    rarity: "rare" as const,
    ...overrides,
  }
}

function clickEditButton() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

// Each CalculatedValue/CalculatedValueSelect field renders its own focusable tooltip
// trigger. Scoping by the field's (unique) label avoids depending on DOM order/position.
function tooltipTriggerFor(label: string) {
  const fieldContainer = screen.getByText(label).closest('[data-sem="calculated-value"]') as HTMLElement
  return within(fieldContainer).getByRole("group")
}

describe("CombatStatsModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode", () => {
    it("renders HP, AC, initiative, speed, and proficiency bonus", () => {
      // useCalculatedSpeed: false so the manually-entered speed (30, from makeCharacter's
      // defaults) is what's displayed here — the calculated (Species-Trait-derived) path is
      // covered separately in the "Movement modes" describe block.
      render(() => <CombatStatsModule character={makeCharacter({ useCalculatedSpeed: false })} onUpdate={vi.fn()} />)
      // HP: "10" and "/20" appear in the display
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
      // AC: unarmored, DEX 10 -> +0 -> AC 10
      const acContainer = screen.getByText("Armor Class").closest("div")!
      expect(within(acContainer).getByText("10")).toBeInTheDocument()
      // Speed
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
      // Proficiency bonus "+3" and initiative "+2"
      expect(screen.getAllByText(/\+[23]/)).toHaveLength(2)
    })

    it("hides death saves section when HP > 0", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText(/death saves/i)).not.toBeInTheDocument()
    })

    it("shows death saves section when HP is 0", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/death saves/i)).toBeInTheDocument()
      expect(screen.getByText(/successes/i)).toBeInTheDocument()
      expect(screen.getByText(/failures/i)).toBeInTheDocument()
    })

    it("shows stabilized message when successes >= 3", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 3, failures: 0 },
          })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/stabilized/i)).toBeInTheDocument()
    })

    it("shows died message when failures >= 3", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 0, failures: 3 },
          })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/has died/i)).toBeInTheDocument()
    })
  })

  describe("HP adjustment buttons", () => {
    it("increases HP by 1 when + button clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      ))
      // buttons[0]=edit, buttons[1]=minus, buttons[2]=plus
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[2])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hitPoints: expect.objectContaining({ current: 11 }),
        })
      )
    })

    it("decreases HP by 1 when - button clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      ))
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hitPoints: expect.objectContaining({ current: 9 }),
        })
      )
    })

    it("minus button is disabled when HP is 0", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      ))
      // buttons[0]=edit, buttons[1]=minus (disabled), buttons[2]=plus
      const buttons = screen.getAllByRole("button")
      expect(buttons[1]).toBeDisabled()
    })

    it("plus button is disabled when HP equals maxHP", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 20, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      ))
      const buttons = screen.getAllByRole("button")
      expect(buttons[2]).toBeDisabled()
    })
  })

  describe("death save toggling", () => {
    it("increments death save successes when an unfilled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Click to add success")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ successes: 1 }),
        })
      )
    })

    it("decrements death save successes when a filled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 2, failures: 0 },
          })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Success (click to remove)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ successes: 1 }),
        })
      )
    })

    it("increments death save failures when an unfilled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getAllByLabelText("Click to add failure")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ failures: 1 }),
        })
      )
    })

    it("decrements death save failures when a filled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 0, failures: 1 },
          })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getByLabelText("Failure (click to remove)"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ failures: 0 }),
        })
      )
    })
  })

  describe("passive perception", () => {
    it("renders 'Passive Perception' in 2024 mode", () => {
      render(() => <CombatStatsModule character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Perception")).toBeInTheDocument()
    })

    it("renders 'Passive Wisdom (Perception)' in 2014 mode", () => {
      render(() => <CombatStatsModule character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Wisdom (Perception)")).toBeInTheDocument()
    })

    it("calculates passive perception correctly (Wis 14, perception proficient, proficiency bonus 2 → 14)", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("shows formula tooltip for passive perception when focused", async () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      fireEvent.focus(tooltipTriggerFor("Passive Perception"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // Wis 14 → +2, proficient with prof +2 → 10 + 2 + 2 = 14
      expect(screen.getByRole("tooltip")).toHaveTextContent("10 + 2 (Wis) + 2 (Prof)")
    })
  })

  describe("AC tooltip", () => {
    it("shows the unarmored DEX-based AC formula in the tooltip in view mode", async () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.focus(tooltipTriggerFor("Armor Class"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // No armor equipped, DEX 10 -> +0: unarmored AC = 10 + 0 DEX
      expect(screen.getByRole("tooltip")).toHaveTextContent("10 + 0 (Dex)")
    })

    it("does not show always-visible AC breakdown text below the value", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // The breakdown moved to tooltip — should not be visible inline anymore
      expect(screen.queryByText(/DEX/)).not.toBeInTheDocument()
    })
  })

  describe("movement speed tooltip", () => {
    it("shows a fallback message when no species trait grants Speed", async () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.focus(tooltipTriggerFor("Speed"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent(/no species trait grants this/i)
    })

    it("names the granting feature when a species trait grants Speed", async () => {
      const feature = {
        id: "feature-1", name: "Dwarf Speed", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { speed: 25 } }],
      }
      render(() => <CombatStatsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      fireEvent.focus(tooltipTriggerFor("Speed"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("25 ft (Dwarf Speed Species Trait)")
    })
  })

  // Size lives in Character Information (character-basic-info-module.test.tsx)
  it("does not show Size, in either edition", () => {
    for (const edition of ["2014", "2024"] as const) {
      render(() => <CombatStatsModule character={makeCharacter({ edition, size: "Small", useCalculatedSize: false })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Size")).not.toBeInTheDocument()
      expect(screen.queryByTestId("size")).not.toBeInTheDocument()
      cleanup()
    }
  })

  describe("edit mode", () => {
    // In edit mode HP spinbuttons: current, max, temp, temp-max HP = 4 minimum

    it("shows HP number inputs when edit button is clicked", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // At least 4 number inputs visible (current / max / temp / temp-max)
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(4)
    })

    it("calls onUpdate with edited current HP on save", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      // spinbutton[0] = current HP (displays "10")
      const currentInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(currentInput, { target: { value: "7" } })
      fireEvent.blur(currentInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hitPoints: expect.objectContaining({ current: 7 }),
        })
      )
    })

    it("persists edits on Ctrl+S without leaving edit mode", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const currentInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(currentInput, { target: { value: "7" } })
      fireEvent.blur(currentInput)
      fireEvent.keyDown(currentInput, { key: "s", ctrlKey: true })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hitPoints: expect.objectContaining({ current: 7 }),
        })
      )
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(4)
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
    })

    it("reverts to original values on cancel without calling onUpdate", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const currentInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(currentInput, { target: { value: "3" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })

    it("drops the previous character's in-progress edits when the character is switched mid-edit", () => {
      // The sheet swaps characters in place (same mounted module, new id), so edits started on
      // one character must not be saved onto the next.
      const onUpdate = vi.fn()
      const [character, setCharacter] = createStore<Character>(makeCharacter({ id: "char-a" }))
      render(() => <CombatStatsModule character={character} onUpdate={onUpdate} />)
      clickEditButton()
      setCharacter(reconcile<Character, Character>(
        makeCharacter({ id: "char-b", hitPoints: { current: 4, maximum: 20, temporary: 0 } })
      ))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "char-b", hitPoints: expect.objectContaining({ current: 4 }) })
      )
    })
  })

  describe("temporary HP display", () => {
    it("shows temp HP value with + prefix when temporary > 0", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 8 } })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("+8")).toBeInTheDocument()
    })

    it("does not show temp HP when temporary is 0", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      ))
      // Scope to the HP display bold element to avoid false match on "+2" initiative
      const maxSpan = screen.getByText(/\/20/)
      const hpBold = maxSpan.parentElement!
      expect(hpBold.textContent).not.toContain("+")
    })
  })

  describe("HP clamping in edit mode", () => {
    it("clamps current HP to maximum when current exceeds maximum on save", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      ))
      clickEditButton()
      // Set max HP lower than current via max input (index 1)
      const spinbuttons = screen.getAllByRole("spinbutton")
      fireEvent.input(spinbuttons[0], { target: { value: "25" } })
      fireEvent.blur(spinbuttons[0])
      fireEvent.input(spinbuttons[1], { target: { value: "15" } })
      fireEvent.blur(spinbuttons[1])
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      const updated = onUpdate.mock.calls[0][0]
      expect(updated.hitPoints.current).toBeLessThanOrEqual(updated.hitPoints.maximum)
    })
  })

  describe("Conditions", () => {
    it("adds a condition when selected from the dropdown", async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      await user.click(screen.getByLabelText("Add condition"))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Poisoned" })).toBeInTheDocument())
      await user.click(screen.getByRole("menuitem", { name: "Poisoned" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: expect.arrayContaining(["Poisoned"]) })
      )
    })

    it("removes a condition when its badge button is clicked", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Poisoned"] })}
          onUpdate={onUpdate}
        />
      ))
      fireEvent.click(screen.getByTestId("condition-remove-Poisoned"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: [] })
      )
    })

    it("shows existing conditions as badge buttons", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Blinded", "Prone"] })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("Blinded")).toBeInTheDocument()
      expect(screen.getByText("Prone")).toBeInTheDocument()
    })

    it("can remove one of multiple conditions while keeping others", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Blinded", "Prone"] })}
          onUpdate={onUpdate}
        />
      ))
      // Each condition chip removes its own value
      fireEvent.click(screen.getByTestId("condition-remove-Blinded"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: ["Prone"] })
      )
    })
  })

  // Exhaustion has levels, unlike the other conditions: it is listed with them as "Exhaustion N"
  // and its level is set beside the list
  describe("Exhaustion", () => {
    it("starts at level 1 when chosen from the condition menu, stored as a level rather than a condition", async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter({ conditions: ["Prone"] })} onUpdate={onUpdate} />)
      await user.click(screen.getByLabelText("Add condition"))
      await user.click(await screen.findByRole("menuitem", { name: "Exhaustion" }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ conditions: ["Prone"], exhaustionLevel: 1 }))
    })

    it("lists the level with the conditions, and changes it with the stepper", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter({ exhaustionLevel: 2 })} onUpdate={onUpdate} />)
      expect(screen.getByTestId("condition-remove-Exhaustion")).toHaveTextContent("Exhaustion 2")
      expect(screen.getByRole("group", { name: "Exhaustion level" })).toHaveTextContent("2")
      fireEvent.click(screen.getByRole("button", { name: "Increase Exhaustion level" }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ exhaustionLevel: 3 }))
    })

    it("keeps the level between 1 and 6", () => {
      render(() => <CombatStatsModule character={makeCharacter({ exhaustionLevel: 6 })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: "Increase Exhaustion level" })).toBeDisabled()
      cleanup()
      render(() => <CombatStatsModule character={makeCharacter({ exhaustionLevel: 1 })} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: "Decrease Exhaustion level" })).toBeDisabled()
    })

    it("ends when its chip is removed", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter({ conditions: ["Prone"], exhaustionLevel: 3 })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByTestId("condition-remove-Exhaustion"))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ conditions: ["Prone"], exhaustionLevel: 0 }))
    })

    it("says what the level does under the character's edition", () => {
      render(() => <CombatStatsModule character={makeCharacter({ edition: "2024", exhaustionLevel: 2 })} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("exhaustion-effects")).toHaveTextContent("d20 Tests −4")
      expect(screen.getByTestId("exhaustion-effects")).toHaveTextContent("Speed −10 ft")
      cleanup()
      render(() => <CombatStatsModule character={makeCharacter({ edition: "2014", exhaustionLevel: 2 })} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("exhaustion-effects")).toHaveTextContent("Disadvantage on ability checks")
      expect(screen.getByTestId("exhaustion-effects")).toHaveTextContent("Speed halved")
    })

    it("shows nothing about exhaustion without it", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("group", { name: "Exhaustion level" })).not.toBeInTheDocument()
      expect(screen.queryByTestId("exhaustion-effects")).not.toBeInTheDocument()
    })

    it("shows the level and its effects, without the stepper, when read-only", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <CombatStatsModule character={makeCharacter({ edition: "2024", exhaustionLevel: 2 })} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.getByText("Exhaustion 2")).toBeInTheDocument()
      expect(screen.getByTestId("exhaustion-effects")).toHaveTextContent("d20 Tests −4")
      expect(screen.queryByRole("group", { name: "Exhaustion level" })).not.toBeInTheDocument()
    })
  })

  describe("Condition Immunities", () => {
    it("adds a condition immunity when selected from the dropdown", async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      await user.click(screen.getByLabelText("Add condition immunity"))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Poisoned" })).toBeInTheDocument())
      await user.click(screen.getByRole("menuitem", { name: "Poisoned" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditionImmunities: expect.arrayContaining(["Poisoned"]) })
      )
    })

    it("shows an item-granted condition immunity as non-removable", () => {
      const item = makeMagicItem({ modifiers: { conditionImmunities: ["Charmed"] } })
      const { container } = render(() => <CombatStatsModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Charmed")).toBeInTheDocument()
      expect(within(container).queryByTestId("condition-immunity-remove-Charmed")).not.toBeInTheDocument()
    })

    it("shows an own condition immunity as removable", () => {
      const onUpdate = vi.fn()
      const { container } = render(() => <CombatStatsModule character={makeCharacter({ conditionImmunities: ["Poisoned"] })} onUpdate={onUpdate} />)
      fireEvent.click(within(container).getByTestId("condition-immunity-remove-Poisoned"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditionImmunities: [] })
      )
    })

    it("shows a feature-granted condition immunity as non-removable, tooltipped with the granting feature", async () => {
      const feature = {
        id: "feature-1", name: "Fey Ancestry", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { conditionImmunities: ["Charmed"] } }],
      }
      const { container } = render(() => <CombatStatsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      await expectTapTooltip(screen.getByText("Charmed"), "Granted by Fey Ancestry Species Trait — edit in Features")
      expect(within(container).queryByTestId("condition-immunity-remove-Charmed")).not.toBeInTheDocument()
    })
  })

  describe("Movement modes", () => {
    it("shows fly speed only when nonzero", () => {
      const feature = {
        id: "feature-1", name: "Aarakocra Ancestry", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { flySpeed: 30 } }],
      }
      render(() => <CombatStatsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fly 30 ft")).toBeInTheDocument()
      expect(screen.queryByText(/Swim/)).not.toBeInTheDocument()
    })

    it("adds an equipped item's fly speed bonus to the calculated fly speed", () => {
      const item = makeMagicItem({ modifiers: { flySpeed: 30 } })
      render(() => <CombatStatsModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fly 30 ft")).toBeInTheDocument()
    })

    it("adds a feature-granted fly speed to the displayed fly speed", () => {
      const feature = {
        id: "feature-1", name: "Aarakocra Ancestry", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { flySpeed: 30 } }],
      }
      render(() => <CombatStatsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fly 30 ft")).toBeInTheDocument()
    })

    it("shows 0 ft walk speed with no hardcoded '30 ft' default when nothing grants one", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("0 ft")).toBeInTheDocument()
    })

    it("uses the feature-granted walk speed instead of adding to the stale custom value (no double-counting)", () => {
      // Regression test: a species's speed (e.g. Dwarf 25 ft) is an absolute characteristic, not
      // a "+X ft" bonus. character.speed is only ever the custom-override storage field now, so a
      // leftover value there (e.g. 30 from a prior custom entry) can no longer leak into the total.
      const feature = {
        id: "feature-1", name: "Dwarf Speed", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { speed: 25 } }],
      }
      render(() => <CombatStatsModule character={makeCharacter({ speed: 30, speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("25 ft")).toBeInTheDocument()
      expect(screen.queryByText("55 ft")).not.toBeInTheDocument()
    })

    it("shows the calculated value read-only (no editable input) in edit mode by default", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.queryByLabelText("Speed")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Fly")).not.toBeInTheDocument()
    })

    it("switches walk speed to a custom editable value via the toggle, and persists it", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom speed/i }))
      const input = screen.getByLabelText("Speed")
      fireEvent.input(input, { target: { value: "35" } })
      fireEvent.blur(input)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ speed: 35, useCalculatedSpeed: false }))
    })

    // The remaining movement speeds work the same way as Fly above
    it.each([
      { label: "Swim", valueKey: "swimSpeed", toggleKey: "useCalculatedSwimSpeed" },
      { label: "Climb", valueKey: "climbSpeed", toggleKey: "useCalculatedClimbSpeed" },
      { label: "Burrow", valueKey: "burrowSpeed", toggleKey: "useCalculatedBurrowSpeed" },
    ])("switches $label to a custom editable value via the toggle, and persists it", ({ label, valueKey, toggleKey }) => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: `Use custom ${label}` }))
      const input = screen.getByLabelText(label)
      fireEvent.input(input, { target: { value: "30" } })
      fireEvent.blur(input)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ [valueKey]: 30, [toggleKey]: false }))
    })

    it.each([
      { label: "Swim", speed: { swimSpeed: 30, useCalculatedSwimSpeed: false }, text: "Swim 30 ft" },
      { label: "Climb", speed: { climbSpeed: 20, useCalculatedClimbSpeed: false }, text: "Climb 20 ft" },
      { label: "Burrow", speed: { burrowSpeed: 10, useCalculatedBurrowSpeed: false }, text: "Burrow 10 ft" },
    ])("shows a $label speed under the walking speed when the character has one", ({ speed, text }) => {
      render(() => <CombatStatsModule character={makeCharacter(speed)} onUpdate={vi.fn()} />)
      expect(screen.getByText(text)).toBeInTheDocument()
    })

    it("switches Fly to a custom editable value via the toggle, and persists it", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /use custom fly/i }))
      const flyInput = screen.getByLabelText("Fly")
      fireEvent.input(flyInput, { target: { value: "30" } })
      fireEvent.blur(flyInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ flySpeed: 30, useCalculatedFlySpeed: false }))
    })

    it("shows a feature-granted fly speed read-only, with no editable input, until switched to custom", () => {
      const feature = {
        id: "feature-1", name: "Aarakocra Ancestry", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { flySpeed: 50 } }],
      }
      render(() => <CombatStatsModule character={makeCharacter({ speciesTraits: [feature] })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.queryByLabelText("Fly")).not.toBeInTheDocument()
      expect(screen.getByText("50 ft")).toBeInTheDocument()
    })
  })

  describe("temporary maximum HP", () => {
    it("adds temporaryMaximum to the displayed max HP", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0, temporaryMaximum: 5 } })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/\/25/)).toBeInTheDocument()
    })

    it("renders a Temp Max HP input in edit mode", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/temp max hp/i)).toBeInTheDocument()
    })

    it("clamps current HP to effective max (base + tempMax) on save", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 20, maximum: 15, temporary: 0, temporaryMaximum: 3 } })}
          onUpdate={onUpdate}
        />
      ))
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      const updated = onUpdate.mock.calls[0][0]
      expect(updated.hitPoints.current).toBeLessThanOrEqual(updated.hitPoints.maximum + (updated.hitPoints.temporaryMaximum ?? 0))
    })

    it("handles negative temporaryMaximum (curse scenario)", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0, temporaryMaximum: -5 } })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText(/\/15/)).toBeInTheDocument()
    })

    it("increase HP button is disabled when currentHP equals effective max", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 25, maximum: 20, temporary: 0, temporaryMaximum: 5 } })}
          onUpdate={vi.fn()}
        />
      ))
      const increaseBtn = screen.getByRole("button", { name: /increase hp/i })
      expect(increaseBtn).toBeDisabled()
    })
  })

  describe("feature-granted hpBonusPerLevel", () => {
    const hitDieFeature = {
      id: "feature-hd", name: "Fighter", description: "", source: "class-feature" as const,
      levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }],
    }
    const bonusFeature = {
      id: "feature-1", name: "Dwarven Toughness", description: "", source: "species-trait" as const,
      levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
    }

    it("does not apply the bonus (or any calculation) to the displayed max HP when not calculated", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 5, hitPoints: { current: 10, maximum: 20, temporary: 0 }, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      // useCalculatedMaximumHp defaults to false: the manual maximum (20) is used as-is, no bonus applied
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })

    it("adds the level-scaled bonus to the displayed max HP when calculated", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 5, useCalculatedMaximumHp: true, hitPoints: { current: 10, maximum: 20, temporary: 0 }, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      // d8 Hit Die: level 1 = 8, +4 more levels * avg 5 = 20 -> base 28; + 1/level bonus * level 5 = 5 -> 33
      expect(screen.getByText(/\/33/)).toBeInTheDocument()
    })

    it("allows increasing HP up to the feature-boosted effective max when calculated", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 5, useCalculatedMaximumHp: true, hitPoints: { current: 33, maximum: 20, temporary: 0 }, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      // currentHP (33) equals the calculated effective max (33), so the increase button is disabled
      const increaseBtn = screen.getByRole("button", { name: /increase hp/i })
      expect(increaseBtn).toBeDisabled()
    })

    it("clamps current HP to the feature-boosted effective max on save when calculated", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 5, useCalculatedMaximumHp: true, hitPoints: { current: 20, maximum: 30, temporary: 0 }, classFeatures: [hitDieFeature], speciesTraits: [bonusFeature] })}
          onUpdate={onUpdate}
        />
      ))
      clickEditButton()
      const spinbuttons = screen.getAllByRole("spinbutton")
      fireEvent.input(spinbuttons[0], { target: { value: "40" } })
      fireEvent.blur(spinbuttons[0])
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      // calculated effective max = 28 (d8 base) + 5 (1/level bonus * level 5) = 33
      const updated = onUpdate.mock.calls[0][0]
      expect(updated.hitPoints.current).toBe(33)
    })
  })

  describe("calculated maximum HP", () => {
    it("shows a custom-value toggle button for Maximum in edit mode", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /(custom|calculated) maximum/i })).toBeInTheDocument()
    })

    it("shows the bare manual maximum with no bonus applied when not calculated, even with a bonus feature present", () => {
      const bonusFeature = {
        id: "feature-1", name: "Dwarven Toughness", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { hpBonusPerLevel: 1 } }],
      }
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 5, hitPoints: { current: 10, maximum: 20, temporary: 0 }, speciesTraits: [bonusFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      clickEditButton()
      // Not calculated -> custom mode renders an editable input holding the raw manual value, no bonus folded in
      expect(screen.getByDisplayValue("20")).toBeInTheDocument()
    })

    it("shows the Hit-Die-derived value when calculated", () => {
      const hitDieFeature = {
        id: "feature-hd", name: "Fighter", description: "", source: "class-feature" as const,
        levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }],
      }
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 1, useCalculatedMaximumHp: true, hitPoints: { current: 8, maximum: 20, temporary: 0 }, classFeatures: [hitDieFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      clickEditButton()
      // d8 Hit Die + CON mod 0 at level 1 = 8, rendered as read-only text (not an input) since calculated
      const maximumField = screen.getByText("Maximum").closest('[data-sem="calculated-value"]') as HTMLElement
      expect(within(maximumField).getByText("8")).toBeInTheDocument()
    })

    it("shows 0 when calculated with no Hit Die feature granted", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ classFeatures: [], useCalculatedMaximumHp: true, hitPoints: { current: 5, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      ))
      clickEditButton()
      const maximumField = screen.getByText("Maximum").closest('[data-sem="calculated-value"]') as HTMLElement
      expect(within(maximumField).getByText("0")).toBeInTheDocument()
    })

    it("shows the flat Hit Points value when the granting feature uses 'flat' mode", () => {
      const flatFeature = {
        id: "feature-hp", name: "Tough", description: "", source: "class-feature" as const,
        levelEffects: [{ level: 1, effects: { hitPointsMode: "flat" as const, hitPointsFlatValue: 40 } }],
      }
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ level: 1, useCalculatedMaximumHp: true, hitPoints: { current: 10, maximum: 20, temporary: 0 }, classFeatures: [flatFeature] })}
          onUpdate={vi.fn()}
        />
      ))
      clickEditButton()
      const maximumField = screen.getByText("Maximum").closest('[data-sem="calculated-value"]') as HTMLElement
      expect(within(maximumField).getByText("40")).toBeInTheDocument()
    })

    it("saves the calculated maximum, not a stale stored value, when saving without touching Max HP", () => {
      const hitDieFeature = {
        id: "feature-hd", name: "Fighter", description: "", source: "class-feature" as const,
        levelEffects: [{ level: 1, effects: { hitDiceSize: 8 } }],
      }
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          // Stale stored maximum (20) predates the current Hit Die feature/level, whose calculated
          // max is 8 (d8 + CON mod 0 at level 1) — handleSave must re-stamp this on save, not carry
          // the stale 20 forward, even though the user never touched the Max HP field this edit.
          character={makeCharacter({ level: 1, useCalculatedMaximumHp: true, hitPoints: { current: 5, maximum: 20, temporary: 0 }, classFeatures: [hitDieFeature] })}
          onUpdate={onUpdate}
        />
      ))
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ hitPoints: expect.objectContaining({ maximum: 8 }) }))
    })
  })

  describe("temp HP control in view mode", () => {
    it("renders a Temp HP stepper in view mode when not read-only", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("spinbutton", { name: /set temporary hit points/i })).toBeInTheDocument()
    })

    it("calls onUpdate immediately when stepper + button is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      // StepperInput uses aria-label="Increase"; HP button uses aria-label="Increase HP"
      fireEvent.click(screen.getByRole("button", { name: "Increase" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hitPoints: expect.objectContaining({ temporary: 1 }) })
      )
    })

    it("hides Temp HP stepper in read-only mode", () => {
      render(() => (
        <ReadOnlyProvider value={true}>
          <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
      expect(screen.queryByRole("spinbutton", { name: /set temporary hit points/i })).not.toBeInTheDocument()
    })
  })

  describe("calculated initiative", () => {
    it("shows a custom-value toggle button in edit mode", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /(custom|calculated) initiative/i })).toBeInTheDocument()
    })

    it("shows DEX-derived value as read-only when useCalculatedInitiative is true in edit mode", () => {
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 14 },
        useCalculatedInitiative: true,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      clickEditButton()
      // NumericInput for initiative should not be present; DEX 14 → +2 displayed as text
      const spinbuttons = screen.getAllByRole("spinbutton")
      // None of the spinbuttons should be the initiative field
      const labels = spinbuttons.map((s) => s.getAttribute("aria-label") ?? "")
      expect(labels.every((l) => !/initiative/i.test(l))).toBe(true)
    })

    it("saves DEX-derived initiative value on save when flag is enabled", () => {
      const onUpdate = vi.fn()
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 14 },
        useCalculatedInitiative: true,
        initiative: 0,
      })
      render(() => <CombatStatsModule character={char} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ initiative: 2 }) // DEX 14 → mod +2
      )
    })

    it("shows effective (DEX-derived) initiative in view mode when flag is set", () => {
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 18 },
        useCalculatedInitiative: true,
        initiative: 0,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // DEX 18 → +4 (distinct from proficiency bonus +3)
      expect(screen.getByText("+4")).toBeInTheDocument()
    })

    it("adds an active item's initiative bonus to the DEX-derived value", () => {
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 14 },
        useCalculatedInitiative: true,
        equipment: [makeMagicItem({ modifiers: { initiative: 2 } })],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // DEX 14 → +2, item +2 → total +4
      expect(screen.getByText("+4")).toBeInTheDocument()
    })

    it("ignores an inactive item's initiative bonus", () => {
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 14 },
        useCalculatedInitiative: true,
        equipment: [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { initiative: 2 } })],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      expect(screen.getByText("+2")).toBeInTheDocument()
      expect(screen.queryByText("+4")).not.toBeInTheDocument()
    })
  })

  describe("calculated proficiency bonus", () => {
    it("shows a custom-value toggle button in edit mode", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /(custom|calculated) proficiency bonus/i })).toBeInTheDocument()
    })

    it("saves level-derived proficiency bonus on save when flag is enabled", () => {
      const onUpdate = vi.fn()
      const char = makeCharacter({
        level: 5,
        useCalculatedProficiencyBonus: true,
        proficiencyBonus: 2,
      })
      render(() => <CombatStatsModule character={char} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ proficiencyBonus: 3 }) // level 5 → +3
      )
    })

    it("shows effective proficiency bonus in view mode when flag is set", () => {
      const char = makeCharacter({
        level: 9,
        useCalculatedProficiencyBonus: true,
        proficiencyBonus: 2,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // level 9 → +4
      expect(screen.getByText("+4")).toBeInTheDocument()
    })
  })

  describe("calculated armor class", () => {
    it("shows a custom-value toggle button for every calculated field in edit mode (AC, initiative, speed x5, proficiency bonus, passive perception, maximum HP)", () => {
      render(() => <CombatStatsModule character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      clickEditButton()
      const ids = ["armor-class", "initiative", "speed", "fly-speed", "swim-speed", "climb-speed", "burrow-speed", "proficiency-bonus", "passive-perception", "max-hp"]
      for (const id of ids) {
        expect(screen.getByTestId(`${id}-toggle`)).toBeInTheDocument()
      }
    })

    it("shows a tooltip on the AC value in edit mode when not custom", async () => {
      render(() => (
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: true })} onUpdate={vi.fn()} />
      ))
      clickEditButton()
      const trigger = tooltipTriggerFor("Armor Class")
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
    })

    it("hides the tooltip trigger for a field once it is switched to custom in edit mode", () => {
      render(() => (
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: true })} onUpdate={vi.fn()} />
      ))
      clickEditButton()
      const triggersBefore = screen.getAllByRole("group").length
      fireEvent.click(screen.getByRole("button", { name: /use custom armor class/i }))
      const triggersAfter = screen.getAllByRole("group").length
      expect(triggersAfter).toBe(triggersBefore - 1)
    })

    it("shows AC as read-only text by default (useCalculatedArmorClass defaults to true)", () => {
      render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // armorClass: 15 should not appear as a spinbutton value
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).not.toContain("15")
    })

    it("shows AC NumericInput when useCalculatedArmorClass is false", () => {
      render(() => (
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={vi.fn()} />
      ))
      clickEditButton()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).toContain("15")
    })

    it("saves manual armorClass when useCalculatedArmorClass is false", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={onUpdate} />
      ))
      clickEditButton()
      const acInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "15"
      )!
      fireEvent.input(acInput, { target: { value: "18" } })
      fireEvent.blur(acInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ armorClass: 18 }))
    })

    it("shows manual AC in view mode when useCalculatedArmorClass is false", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ armorClass: 13, useCalculatedArmorClass: false })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("13")).toBeInTheDocument()
    })

    it("shows 'Custom' tooltip in view mode when flag is false", async () => {
      render(() => (
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={vi.fn()} />
      ))
      fireEvent.focus(tooltipTriggerFor("Armor Class"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })

    it("adds an active item's AC bonus to the calculated value", () => {
      const char = makeCharacter({
        equipment: [makeMagicItem({ modifiers: { armorClass: 1 } })],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // unarmored: 10 + DEX +0 + item +1 = 11
      expect(screen.getByText("11")).toBeInTheDocument()
    })

    it("ignores an inactive item's AC bonus", () => {
      const char = makeCharacter({
        equipment: [makeMagicItem({ requiresAttunement: true, attuned: false, modifiers: { armorClass: 1 } })],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      const acContainer = screen.getByText("Armor Class").closest("div")!
      expect(within(acContainer).getByText("10")).toBeInTheDocument()
      expect(screen.queryByText("11")).not.toBeInTheDocument()
    })
  })

  describe("calculated passive perception", () => {
    it("shows PP as read-only text in edit mode when flag is true (default)", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      clickEditButton()
      // PP = 14: appears as text but not as a spinbutton value
      expect(screen.getByText("14")).toBeInTheDocument()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).not.toContain("14")
    })

    it("cascades an active WIS-boosting item into passive perception", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
        equipment: [makeMagicItem({ modifiers: { abilityScores: { wisdom: 2 } } })],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // WIS 14 + item +2 = 16 -> mod +3, prof +2 -> PP = 10 + 3 + 2 = 15
      const ppContainer = screen.getByText("Passive Perception").closest("div")!
      expect(within(ppContainer).getByText("15")).toBeInTheDocument()
    })

    it("reflects a Feature-granted Perception proficiency even when the raw skill isn't checked", () => {
      const feature = {
        id: "feature-1", name: "Keen Senses", description: "", source: "species-trait" as const,
        levelEffects: [{ level: 1, effects: { skillProficiencies: [{ skill: "perception" as const }] } }],
      }
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        proficiencyBonus: 2,
        speciesTraits: [feature],
      })
      render(() => <CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // WIS 14 -> mod +2, granted (not raw-checked) proficiency +2 -> PP = 10 + 2 + 2 = 14
      const ppContainer = screen.getByText("Passive Perception").closest("div")!
      expect(within(ppContainer).getByText("14")).toBeInTheDocument()
    })

    it("shows PP NumericInput when useCalculatedPassivePerception is false", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 12 })}
          onUpdate={vi.fn()}
        />
      ))
      clickEditButton()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).toContain("12")
    })

    it("saves manually entered passivePerception when flag is false", () => {
      const onUpdate = vi.fn()
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 12 })}
          onUpdate={onUpdate}
        />
      ))
      clickEditButton()
      const ppInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "12"
      )!
      fireEvent.input(ppInput, { target: { value: "16" } })
      fireEvent.blur(ppInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ passivePerception: 16 }))
    })

    it("shows manual passivePerception in view mode when flag is false", () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 17 })}
          onUpdate={vi.fn()}
        />
      ))
      expect(screen.getByText("17")).toBeInTheDocument()
    })

    it("shows 'Custom' tooltip in view mode when flag is false", async () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.focus(tooltipTriggerFor("Passive Perception"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })

    it("recalculates live using the in-progress proficiency bonus edit, not the saved value, and persists the updated result on save", () => {
      const onUpdate = vi.fn()
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
        useCalculatedProficiencyBonus: false,
        useCalculatedInitiative: true,
        useCalculatedPassivePerception: true,
      })
      render(() => <CombatStatsModule character={char} onUpdate={onUpdate} />)
      clickEditButton()

      // Passive Perception starts at 10 + (Wis +2 + Prof +2) = 14
      expect(screen.getByText("14")).toBeInTheDocument()

      const profBonusInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "2"
      )!
      fireEvent.input(profBonusInput, { target: { value: "5" } })
      fireEvent.blur(profBonusInput)

      // Still in edit mode, before saving: Passive Perception should reflect the new
      // proficiency bonus live (10 + Wis +2 + Prof +5 = 17), not the stale saved value.
      expect(screen.getByText("17")).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ proficiencyBonus: 5, passivePerception: 17 })
      )
    })
  })

  describe("initiative tooltip", () => {
    it("shows Dex modifier formula tooltip when calculated", async () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedInitiative: true })}
          onUpdate={vi.fn()}
        />
      ))
      // Default ability scores → Dex 10 → modifier +0
      fireEvent.focus(tooltipTriggerFor("Initiative"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("+0 (Dex)")
    })

    it("shows 'Custom' tooltip when flag is false", async () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedInitiative: false })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.focus(tooltipTriggerFor("Initiative"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("proficiency bonus tooltip", () => {
    it("shows level formula tooltip when calculated", async () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedProficiencyBonus: true })}
          onUpdate={vi.fn()}
        />
      ))
      // Default level 1 → getProficiencyBonus(1) = +2
      fireEvent.focus(tooltipTriggerFor("Proficiency Bonus"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("+2 (Level 1)")
    })

    it("shows 'Custom' tooltip when flag is false", async () => {
      render(() => (
        <CombatStatsModule
          character={makeCharacter({ useCalculatedProficiencyBonus: false })}
          onUpdate={vi.fn()}
        />
      ))
      fireEvent.focus(tooltipTriggerFor("Proficiency Bonus"))
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(() => (
        <ReadOnlyProvider value={true}>
          <CombatStatsModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      ))
    }

    it("does not render the HP increase button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /increase hp/i })).not.toBeInTheDocument()
    })

    it("does not render the HP decrease button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /decrease hp/i })).not.toBeInTheDocument()
    })

    it("does not render the Add condition button", () => {
      renderReadOnly()
      expect(screen.queryByLabelText("Add condition")).not.toBeInTheDocument()
    })

    it("renders existing conditions as non-interactive spans", () => {
      renderReadOnly({ conditions: ["Poisoned"] })
      expect(screen.getByText("Poisoned")).toBeInTheDocument()
      expect(screen.queryByLabelText("Click to remove")).not.toBeInTheDocument()
    })

    it("still renders HP values", () => {
      renderReadOnly()
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })
  })
})

describe("CombatStatsModule — switching a calculated stat to calculated or custom", () => {
  // Maximum HP, Initiative and Proficiency Bonus start as custom values; Passive Perception starts calculated.
  it.each([
    { label: "Maximum", toggleKey: "useCalculatedMaximumHp" },
    { label: "Initiative", toggleKey: "useCalculatedInitiative" },
    { label: "Proficiency Bonus", toggleKey: "useCalculatedProficiencyBonus" },
  ])("saves $label as calculated when its toggle is switched from custom", ({ label, toggleKey }) => {
    const onUpdate = vi.fn()
    render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
    clickEditButton()

    fireEvent.click(screen.getByRole("button", { name: `Use calculated ${label}` }))
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ [toggleKey]: true }))
  })

  it.each([
    { label: "Initiative", valueKey: "initiative", toggleKey: "useCalculatedInitiative", typed: "5" },
    { label: "Proficiency Bonus", valueKey: "proficiencyBonus", toggleKey: "useCalculatedProficiencyBonus", typed: "4" },
  ])("saves an edited custom $label", ({ label, valueKey, toggleKey, typed }) => {
    const onUpdate = vi.fn()
    render(() => <CombatStatsModule character={makeCharacter({ [toggleKey]: false })} onUpdate={onUpdate} />)
    clickEditButton()

    const input = screen.getByLabelText(label)
    fireEvent.input(input, { target: { value: typed } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ [valueKey]: Number(typed), [toggleKey]: false }))
  })

  it("saves Passive Perception as a custom value when its toggle is switched and the value edited", () => {
    const onUpdate = vi.fn()
    render(() => <CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
    clickEditButton()

    fireEvent.click(screen.getByRole("button", { name: "Use custom Passive Perception" }))
    const input = screen.getByLabelText("Passive Perception")
    fireEvent.input(input, { target: { value: "17" } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ passivePerception: 17, useCalculatedPassivePerception: false }))
  })
})

describe("CombatStatsModule — a character saved before these fields existed", () => {
  // Older saves and hand-edited imports can lack fields the type calls required. `Partial` records
  // that they are deliberately missing; the module still receives a Character.
  function makeLegacyCharacter(): Character {
    const partial: Partial<Character> = createDefaultCharacter()
    const missing: (keyof Character)[] = [
      "hitPoints", "armorClass", "initiative", "speed", "proficiencyBonus", "deathSaves", "size", "passivePerception",
      "useCalculatedArmorClass", "useCalculatedInitiative", "useCalculatedProficiencyBonus", "useCalculatedMaximumHp",
      "useCalculatedPassivePerception", "useCalculatedSpeed", "useCalculatedSize",
    ]
    for (const field of missing) delete partial[field]
    return partial as Character
  }

  it("renders, and shows usable defaults instead of blanks when edited", () => {
    render(() => <CombatStatsModule character={makeLegacyCharacter()} onUpdate={vi.fn()} />)
    clickEditButton()

    // Maximum HP, Initiative and Proficiency Bonus are custom values by default, so they are inputs
    expect(screen.getByLabelText("Maximum")).toHaveValue(1)
    expect(screen.getByLabelText("Initiative")).toHaveValue(0)
    expect(screen.getByLabelText("Proficiency Bonus")).toHaveValue(2)
  })

  it("saves those defaults, treating AC, speed and passive perception as calculated, and leaves size alone", () => {
    const onUpdate = vi.fn()
    render(() => <CombatStatsModule character={makeLegacyCharacter()} onUpdate={onUpdate} />)
    clickEditButton()

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      hitPoints: expect.objectContaining({ current: 0, maximum: 1, temporary: 0 }),
      deathSaves: { successes: 0, failures: 0 },
      proficiencyBonus: 2,
      useCalculatedArmorClass: true,
      useCalculatedSpeed: true,
      useCalculatedPassivePerception: true,
      useCalculatedInitiative: false,
      useCalculatedProficiencyBonus: false,
      useCalculatedMaximumHp: false,
    }))
    // Size is edited in Character Information, so saving Combat Stats does not write it
    const saved = onUpdate.mock.calls[0][0]
    expect(saved).not.toHaveProperty("size")
    expect(saved).not.toHaveProperty("useCalculatedSize")
  })
})

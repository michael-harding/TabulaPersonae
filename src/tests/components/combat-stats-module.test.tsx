import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"
import { render, screen, fireEvent, waitFor, cleanupPortals } from "../test-utils"
import { CombatStatsModule } from "@/components/combat-stats-module"
import { createDefaultCharacter } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

vi.mock("@/lib/character-storage", () => ({
  saveCharacter: vi.fn(),
}))

function makeCharacter(overrides: Record<string, any> = {}) {
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

function clickEditButton() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

describe("CombatStatsModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode", () => {
    it("renders HP, AC, initiative, speed, and proficiency bonus", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // HP: "10" and "/20" appear in the display
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
      // AC
      expect(screen.getByText("15")).toBeInTheDocument()
      // Speed
      expect(screen.getByText(/30 ft/)).toBeInTheDocument()
      // Proficiency bonus "+3" and initiative "+2"
      expect(screen.getAllByText(/\+[23]/)).toHaveLength(2)
    })

    it("hides death saves section when HP > 0", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText(/death saves/i)).not.toBeInTheDocument()
    })

    it("shows death saves section when HP is 0", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/death saves/i)).toBeInTheDocument()
      expect(screen.getByText(/successes/i)).toBeInTheDocument()
      expect(screen.getByText(/failures/i)).toBeInTheDocument()
    })

    it("shows stabilized message when successes >= 3", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 3, failures: 0 },
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/stabilized/i)).toBeInTheDocument()
    })

    it("shows died message when failures >= 3", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 0, failures: 3 },
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/has died/i)).toBeInTheDocument()
    })
  })

  describe("HP adjustment buttons", () => {
    it("increases HP by 1 when + button clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      )
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
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      )
      const buttons = screen.getAllByRole("button")
      fireEvent.click(buttons[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hitPoints: expect.objectContaining({ current: 9 }),
        })
      )
    })

    it("minus button is disabled when HP is 0", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      )
      // buttons[0]=edit, buttons[1]=minus (disabled), buttons[2]=plus
      const buttons = screen.getAllByRole("button")
      expect(buttons[1]).toBeDisabled()
    })

    it("plus button is disabled when HP equals maxHP", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 20, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      )
      const buttons = screen.getAllByRole("button")
      expect(buttons[2]).toBeDisabled()
    })
  })

  describe("death save toggling", () => {
    it("increments death save successes when an unfilled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Click to add success")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ successes: 1 }),
        })
      )
    })

    it("decrements death save successes when a filled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 2, failures: 0 },
          })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Success (click to remove)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ successes: 1 }),
        })
      )
    })

    it("increments death save failures when an unfilled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 0, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Click to add failure")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ failures: 1 }),
        })
      )
    })

    it("decrements death save failures when a filled circle is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({
            hitPoints: { current: 0, maximum: 20, temporary: 0 },
            deathSaves: { successes: 0, failures: 1 },
          })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByTitle("Failure (click to remove)"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deathSaves: expect.objectContaining({ failures: 0 }),
        })
      )
    })
  })

  describe("passive perception", () => {
    it("renders 'Passive Perception' in 2024 mode", () => {
      render(<CombatStatsModule character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Perception")).toBeInTheDocument()
    })

    it("renders 'Passive Wisdom (Perception)' in 2014 mode", () => {
      render(<CombatStatsModule character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Wisdom (Perception)")).toBeInTheDocument()
    })

    it("calculates passive perception correctly (Wis 14, perception proficient, proficiency bonus 2 → 14)", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
      expect(screen.getByText("14")).toBeInTheDocument()
    })

    it("shows formula tooltip for passive perception when focused", async () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // In view mode, focusable triggers are: AC (0), Initiative (1), Proficiency Bonus (2), Passive Perception (3)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[3])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      // Wis 14 → +2, proficient with prof +2 → 10 + 2 + 2 = 14
      expect(screen.getByRole("tooltip")).toHaveTextContent("10 + Wis +2 + Prof +2 = 14")
    })
  })

  describe("AC tooltip", () => {
    it("shows 'Base armor class' tooltip for manually-set AC in view mode", async () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // AC is the first focusable trigger in view mode
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Base armor class")
    })

    it("does not show always-visible AC breakdown text below the value", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // The breakdown moved to tooltip — should not be visible inline anymore
      expect(screen.queryByText(/DEX/)).not.toBeInTheDocument()
    })
  })

  describe("size (2024 only)", () => {
    it("renders size in 2024 view mode", () => {
      render(<CombatStatsModule character={makeCharacter({ edition: "2024", size: "Large" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Large")).toBeInTheDocument()
    })

    it("does not render size in 2014 mode", () => {
      render(<CombatStatsModule character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Size")).not.toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    // In edit mode HP spinbuttons: current, max, temp, temp-max HP = 4 minimum

    it("shows HP number inputs when edit button is clicked", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // At least 4 number inputs visible (current / max / temp / temp-max)
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(4)
    })

    it("calls onUpdate with edited current HP on save", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
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

    it("reverts to original values on cancel without calling onUpdate", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const currentInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(currentInput, { target: { value: "3" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })
  })

  describe("hit dice section", () => {
    it("does not show hit dice section in view mode", () => {
      render(<CombatStatsModule character={makeCharacter({ hitDice: "1d8", level: 4, spentHitDice: 1 })} onUpdate={vi.fn()} />)
      expect(screen.queryByText(/die type/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/spent hit dice/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/available/i)).not.toBeInTheDocument()
    })

    it("shows hit dice section in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter({ hitDice: "1d8", hitDiceSize: 8 })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/die type/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument()
    })
  })

  describe("hit dice section — edit mode", () => {
    it("renders a 'Die Type' label and select trigger button in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter({ hitDice: "1d8", hitDiceSize: 8 })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/die type/i)).toBeInTheDocument()
      // Kobalte Select trigger renders as a button showing the current value
      expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument()
    })

    it("renders 'Spent Hit Dice' label and stepper buttons when level > 5", () => {
      render(<CombatStatsModule character={makeCharacter({ level: 8, spentHitDice: 2, hitDice: "1d10" })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/spent hit dice/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
    })

    it("saves the updated hitDiceSize on save", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter({ hitDice: "1d8", hitDiceSize: 8 })} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hitDiceSize: 8 })
      )
    })
  })

  describe("size combobox (2024)", () => {
    it("saves a custom size value typed into the Size combobox", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter({ edition: "2024" })} onUpdate={onUpdate} />)
      clickEditButton()
      const sizeInput = screen.getAllByRole("combobox").find(
        (el) => (el as HTMLInputElement).value === "Medium"
      )!
      fireEvent.focus(sizeInput)
      fireEvent.input(sizeInput, { target: { value: "Colossal" } })
      fireEvent.blur(sizeInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Colossal" }))
    })

    it("saves a predefined size option selected from the dropdown", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter({ edition: "2024" })} onUpdate={onUpdate} />)
      clickEditButton()
      const sizeInput = screen.getAllByRole("combobox").find(
        (el) => (el as HTMLInputElement).value === "Medium"
      )!
      fireEvent.focus(sizeInput)
      fireEvent.click(screen.getByRole("option", { name: "Huge" }))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ size: "Huge" }))
    })
  })

  describe("temporary HP display", () => {
    it("shows temp HP value with + prefix when temporary > 0", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 8 } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("+8")).toBeInTheDocument()
    })

    it("does not show temp HP when temporary is 0", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={vi.fn()}
        />
      )
      // Scope to the HP display bold element to avoid false match on "+2" initiative
      const maxSpan = screen.getByText(/\/20/)
      const hpBold = maxSpan.parentElement!
      expect(hpBold.textContent).not.toContain("+")
    })
  })

  describe("HP clamping in edit mode", () => {
    it("clamps current HP to maximum when current exceeds maximum on save", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0 } })}
          onUpdate={onUpdate}
        />
      )
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
      render(<CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      await user.click(screen.getByTitle("Add condition"))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Poisoned" })).toBeInTheDocument())
      await user.click(screen.getByRole("menuitem", { name: "Poisoned" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: expect.arrayContaining(["Poisoned"]) })
      )
    })

    it("removes a condition when its badge button is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Poisoned"] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByTitle("Click to remove"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: [] })
      )
    })

    it("shows existing conditions as badge buttons", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Blinded", "Prone"] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Blinded")).toBeInTheDocument()
      expect(screen.getByText("Prone")).toBeInTheDocument()
    })

    it("can remove one of multiple conditions while keeping others", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ conditions: ["Blinded", "Prone"] })}
          onUpdate={onUpdate}
        />
      )
      // Condition badges each have title="Click to remove"; first one is "Blinded"
      fireEvent.click(screen.getAllByTitle("Click to remove")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: ["Prone"] })
      )
    })
  })

  describe("temporary maximum HP", () => {
    it("adds temporaryMaximum to the displayed max HP", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0, temporaryMaximum: 5 } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/\/25/)).toBeInTheDocument()
    })

    it("renders a Temp Max HP input in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/temp max hp/i)).toBeInTheDocument()
    })

    it("clamps current HP to effective max (base + tempMax) on save", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 20, maximum: 15, temporary: 0, temporaryMaximum: 3 } })}
          onUpdate={onUpdate}
        />
      )
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      const updated = onUpdate.mock.calls[0][0]
      expect(updated.hitPoints.current).toBeLessThanOrEqual(updated.hitPoints.maximum + (updated.hitPoints.temporaryMaximum ?? 0))
    })

    it("handles negative temporaryMaximum (curse scenario)", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 0, temporaryMaximum: -5 } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/\/15/)).toBeInTheDocument()
    })

    it("increase HP button is disabled when currentHP equals effective max", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ hitPoints: { current: 25, maximum: 20, temporary: 0, temporaryMaximum: 5 } })}
          onUpdate={vi.fn()}
        />
      )
      const increaseBtn = screen.getByRole("button", { name: /increase hp/i })
      expect(increaseBtn).toBeDisabled()
    })
  })

  describe("temp HP control in view mode", () => {
    it("renders a Temp HP stepper in view mode when not read-only", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("spinbutton", { name: /set temporary hit points/i })).toBeInTheDocument()
    })

    it("calls onUpdate immediately when stepper + button is clicked", () => {
      const onUpdate = vi.fn()
      render(<CombatStatsModule character={makeCharacter()} onUpdate={onUpdate} />)
      // StepperInput uses aria-label="Increase"; HP button uses aria-label="Increase HP"
      fireEvent.click(screen.getByRole("button", { name: "Increase" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hitPoints: expect.objectContaining({ temporary: 1 }) })
      )
    })

    it("hides Temp HP stepper in read-only mode", () => {
      render(
        <ReadOnlyProvider value={true}>
          <CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
      expect(screen.queryByRole("spinbutton", { name: /set temporary hit points/i })).not.toBeInTheDocument()
    })
  })

  describe("calculated initiative", () => {
    it("shows a custom-value toggle button in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByRole("button", { name: /(custom|calculated) initiative/i })).toBeInTheDocument()
    })

    it("shows DEX-derived value as read-only when useCalculatedInitiative is true in edit mode", () => {
      const char = makeCharacter({
        abilityScores: { ...makeCharacter().abilityScores, dexterity: 14 },
        useCalculatedInitiative: true,
      })
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
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
      render(<CombatStatsModule character={char} onUpdate={onUpdate} />)
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
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // DEX 18 → +4 (distinct from proficiency bonus +3)
      expect(screen.getByText("+4")).toBeInTheDocument()
    })
  })

  describe("calculated proficiency bonus", () => {
    it("shows a custom-value toggle button in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
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
      render(<CombatStatsModule character={char} onUpdate={onUpdate} />)
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
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
      // level 9 → +4
      expect(screen.getByText("+4")).toBeInTheDocument()
    })
  })

  describe("calculated armor class", () => {
    it("shows a custom-value toggle button for AC, initiative, proficiency bonus, and passive perception in edit mode", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(document.querySelectorAll('[data-test="calculated-value-toggle"]')).toHaveLength(4)
    })

    it("shows a tooltip on the AC value in edit mode when not custom", async () => {
      render(
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: true })} onUpdate={vi.fn()} />
      )
      clickEditButton()
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers.length).toBeGreaterThan(0)
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
    })

    it("hides the tooltip trigger for a field once it is switched to custom in edit mode", () => {
      render(
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: true })} onUpdate={vi.fn()} />
      )
      clickEditButton()
      const triggersBefore = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]').length
      fireEvent.click(screen.getByRole("button", { name: /use custom armor class/i }))
      const triggersAfter = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]').length
      expect(triggersAfter).toBe(triggersBefore - 1)
    })

    it("shows AC as read-only text by default (useCalculatedArmorClass defaults to true)", () => {
      render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // armorClass: 15 should not appear as a spinbutton value
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).not.toContain("15")
    })

    it("shows AC NumericInput when useCalculatedArmorClass is false", () => {
      render(
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={vi.fn()} />
      )
      clickEditButton()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).toContain("15")
    })

    it("saves manual armorClass when useCalculatedArmorClass is false", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={onUpdate} />
      )
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
      render(
        <CombatStatsModule
          character={makeCharacter({ armorClass: 13, useCalculatedArmorClass: false })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("13")).toBeInTheDocument()
    })

    it("shows 'Custom' tooltip in view mode when flag is false", async () => {
      render(
        <CombatStatsModule character={makeCharacter({ useCalculatedArmorClass: false })} onUpdate={vi.fn()} />
      )
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("calculated passive perception", () => {
    it("shows PP as read-only text in edit mode when flag is true (default)", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(<CombatStatsModule character={char} onUpdate={vi.fn()} />)
      clickEditButton()
      // PP = 14: appears as text but not as a spinbutton value
      expect(screen.getByText("14")).toBeInTheDocument()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).not.toContain("14")
    })

    it("shows PP NumericInput when useCalculatedPassivePerception is false", () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 12 })}
          onUpdate={vi.fn()}
        />
      )
      clickEditButton()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).toContain("12")
    })

    it("saves manually entered passivePerception when flag is false", () => {
      const onUpdate = vi.fn()
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 12 })}
          onUpdate={onUpdate}
        />
      )
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
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 17 })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("17")).toBeInTheDocument()
    })

    it("shows 'Custom' tooltip in view mode when flag is false", async () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedPassivePerception: false })}
          onUpdate={vi.fn()}
        />
      )
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[3])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("initiative tooltip", () => {
    it("shows Dex modifier formula tooltip when calculated", async () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedInitiative: true })}
          onUpdate={vi.fn()}
        />
      )
      // Default ability scores → Dex 10 → modifier +0
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[1])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dex +0")
    })

    it("shows 'Custom' tooltip when flag is false", async () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedInitiative: false })}
          onUpdate={vi.fn()}
        />
      )
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[1])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("proficiency bonus tooltip", () => {
    it("shows level formula tooltip when calculated", async () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedProficiencyBonus: true })}
          onUpdate={vi.fn()}
        />
      )
      // Default level 1 → getProficiencyBonus(1) = +2
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[2])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Level 1 = +2")
    })

    it("shows 'Custom' tooltip when flag is false", async () => {
      render(
        <CombatStatsModule
          character={makeCharacter({ useCalculatedProficiencyBonus: false })}
          onUpdate={vi.fn()}
        />
      )
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[2])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CombatStatsModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(overrides: Record<string, any> = {}) {
      return render(
        <ReadOnlyProvider value={true}>
          <CombatStatsModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
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
      expect(screen.queryByTitle("Add condition")).not.toBeInTheDocument()
    })

    it("renders existing conditions as non-interactive spans", () => {
      renderReadOnly({ conditions: ["Poisoned"] })
      expect(screen.getByText("Poisoned")).toBeInTheDocument()
      expect(screen.queryByTitle("Click to remove")).not.toBeInTheDocument()
    })

    it("still renders HP values", () => {
      renderReadOnly()
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })
  })
})

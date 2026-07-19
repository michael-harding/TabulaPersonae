import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"
import { render, screen, fireEvent, waitFor } from "../test-utils"
import { CombatStats } from "@/components/combat-stats"
import { createDefaultCharacter } from "@/lib/character-types"

vi.mock("@/lib/character-storage", () => ({
  saveCharacter: vi.fn(),
}))

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (
      el.getAttribute("aria-hidden") === "true" ||
      el.querySelector('[role="dialog"]') ||
      el.querySelector('[role="menu"]')
    ) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
  document.body.removeAttribute("aria-hidden")
  Array.from(document.body.children).forEach((child) => {
    (child as HTMLElement).removeAttribute("aria-hidden")
  })
}

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

describe("CombatStats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("view mode", () => {
    it("renders HP, AC, initiative, speed, and proficiency bonus", () => {
      render(<CombatStats character={makeCharacter()} onUpdate={vi.fn()} />)
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
      render(<CombatStats character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText(/death saves/i)).not.toBeInTheDocument()
    })

    it("shows death saves section when HP is 0", () => {
      render(
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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
      render(<CombatStats character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Perception")).toBeInTheDocument()
    })

    it("renders 'Passive Wisdom (Perception)' in 2014 mode", () => {
      render(<CombatStats character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Passive Wisdom (Perception)")).toBeInTheDocument()
    })

    it("calculates passive perception correctly (Wis 14, perception proficient, proficiency bonus 2 → 14)", () => {
      const char = makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14 },
        skills: { ...createDefaultCharacter().skills, perception: { proficient: true, expertise: false } },
        proficiencyBonus: 2,
      })
      render(<CombatStats character={char} onUpdate={vi.fn()} />)
      expect(screen.getByText("14")).toBeInTheDocument()
    })
  })

  describe("hit dice and spent hit dice", () => {
    it("renders die size derived from hitDice string in view mode", () => {
      render(<CombatStats character={makeCharacter({ hitDice: "1d8" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("d8")).toBeInTheDocument()
    })

    it("renders available / total hit dice count in view mode", () => {
      render(<CombatStats character={makeCharacter({ level: 5, spentHitDice: 2, hitDice: "1d8" })} onUpdate={vi.fn()} />)
      expect(screen.getByText(/3\/5 available/i)).toBeInTheDocument()
    })
  })

  describe("size (2024 only)", () => {
    it("renders size in 2024 view mode", () => {
      render(<CombatStats character={makeCharacter({ edition: "2024", size: "Large" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Large")).toBeInTheDocument()
    })

    it("does not render size in 2014 mode", () => {
      render(<CombatStats character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Size")).not.toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    // In edit mode the order is: current HP, max HP, temp HP, AC,
    // initiative, speed, proficiency bonus.

    it("shows HP number inputs when edit button is clicked", () => {
      render(<CombatStats character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      // At least 3 number inputs visible (current / max / temp)
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(3)
    })

    it("calls onUpdate with edited current HP on save", () => {
      const onUpdate = vi.fn()
      render(<CombatStats character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<CombatStats character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      const currentInput = screen.getAllByRole("spinbutton")[0]
      fireEvent.input(currentInput, { target: { value: "3" } })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.getByText(/\/20/)).toBeInTheDocument()
    })
  })

  describe("hit dice section — view mode", () => {
    it("displays the die size label derived from hitDice string", () => {
      render(<CombatStats character={makeCharacter({ hitDice: "1d8" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("d8")).toBeInTheDocument()
    })

    it("displays the explicit hitDiceSize when set", () => {
      render(<CombatStats character={makeCharacter({ hitDiceSize: 10, hitDice: "1d8" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("d10")).toBeInTheDocument()
    })

    it("displays available / total hit dice count", () => {
      render(<CombatStats character={makeCharacter({ level: 4, spentHitDice: 1, hitDice: "1d8" })} onUpdate={vi.fn()} />)
      expect(screen.getByText(/3\/4 available/i)).toBeInTheDocument()
    })

    it("does not render interactive hit dice controls in view mode", () => {
      render(<CombatStats character={makeCharacter({ level: 3, hitDice: "1d8" })} onUpdate={vi.fn()} />)
      // Die type select and spent dice stepper only appear in edit mode
      expect(screen.queryByText(/die type/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/spent hit dice/i)).not.toBeInTheDocument()
    })
  })

  describe("hit dice section — edit mode", () => {
    it("renders a 'Die Type' label and select trigger button in edit mode", () => {
      render(<CombatStats character={makeCharacter({ hitDice: "1d8", hitDiceSize: 8 })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/die type/i)).toBeInTheDocument()
      // Kobalte Select trigger renders as a button showing the current value
      expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument()
    })

    it("renders 'Spent Hit Dice' label and stepper buttons when level > 5", () => {
      render(<CombatStats character={makeCharacter({ level: 8, spentHitDice: 2, hitDice: "1d10" })} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText(/spent hit dice/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
    })

    it("saves the updated hitDiceSize on save", () => {
      const onUpdate = vi.fn()
      render(<CombatStats character={makeCharacter({ hitDice: "1d8", hitDiceSize: 8 })} onUpdate={onUpdate} />)
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
      render(<CombatStats character={makeCharacter({ edition: "2024" })} onUpdate={onUpdate} />)
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
      render(<CombatStats character={makeCharacter({ edition: "2024" })} onUpdate={onUpdate} />)
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
        <CombatStats
          character={makeCharacter({ hitPoints: { current: 10, maximum: 20, temporary: 8 } })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("+8")).toBeInTheDocument()
    })

    it("does not show temp HP when temporary is 0", () => {
      render(
        <CombatStats
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
        <CombatStats
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
      render(<CombatStats character={makeCharacter()} onUpdate={onUpdate} />)
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
        <CombatStats
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
        <CombatStats
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
        <CombatStats
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

  it("has no accessibility violations", async () => {
    const { container } = render(<CombatStats character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

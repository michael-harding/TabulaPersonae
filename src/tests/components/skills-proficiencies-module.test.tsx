import { axe } from "vitest-axe"
import { render, screen, fireEvent, within, waitFor, cleanupPortals } from "../test-utils"
import { SkillsProficienciesModule } from "@/components/skills-proficiencies-module"
import { createDefaultCharacter } from "@/lib/character-types"
import { getSkillModifier, getSavingThrowModifier, formatModifier } from "@/lib/character-utils"

function makeCharacter(overrides: Record<string, any> = {}) {
  const base = createDefaultCharacter()
  return {
    ...base,
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 12,
      intelligence: 10,
      wisdom: 8,
      charisma: 13,
    },
    proficiencyBonus: 3,
    savingThrows: {
      strength: true,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false,
    },
    skills: {
      ...base.skills,
      athletics: { proficient: true, expertise: false },
      stealth: { proficient: true, expertise: true },
      perception: { proficient: false, expertise: false },
    },
    languages: ["Common", "Elvish"],
    otherProficiencies: ["Smith's Tools"],
    ...overrides,
  }
}

function clickEditButton() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }))
}

// Skill order in SKILL_DISPLAY_NAMES (matches component's Object.keys order):
// acrobatics(0), animalHandling(1), arcana(2), athletics(3), deception(4),
// history(5), insight(6), intimidation(7), investigation(8), medicine(9),
// nature(10), perception(11), performance(12), persuasion(13), religion(14),
// sleightOfHand(15), stealth(16), survival(17)

describe("SkillsProficienciesModule", () => {
  describe("view mode", () => {
    it("renders all 6 saving throws", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Str")).toBeInTheDocument()
      expect(screen.getByText("Dex")).toBeInTheDocument()
      expect(screen.getByText("Con")).toBeInTheDocument()
      expect(screen.getByText("Int")).toBeInTheDocument()
      expect(screen.getByText("Wis")).toBeInTheDocument()
      expect(screen.getByText("Cha")).toBeInTheDocument()
    })

    it("renders all 18 skills", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Acrobatics")).toBeInTheDocument()
      expect(screen.getByText("Athletics")).toBeInTheDocument()
      expect(screen.getByText("Stealth")).toBeInTheDocument()
      expect(screen.getByText("Perception")).toBeInTheDocument()
      expect(screen.getByText("Persuasion")).toBeInTheDocument()
    })

    it("shows Prof badge for proficient skills in view mode", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getAllByText("Prof").length).toBeGreaterThan(0)
    })

    it("shows Exp badge for expert skills in view mode", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Exp")).toBeInTheDocument()
    })

    it("shows correct modifier for a proficient saving throw", () => {
      const character = makeCharacter()
      render(<SkillsProficienciesModule character={character} onUpdate={vi.fn()} />)
      // Strength: str=16 → mod +3, proficient so +3 bonus → +6
      const expected = formatModifier(getSavingThrowModifier(16, 3, true))
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })

    it("shows correct modifier for an expert skill", () => {
      const character = makeCharacter()
      render(<SkillsProficienciesModule character={character} onUpdate={vi.fn()} />)
      // Stealth (dex=14 → +2, expertise: +2 + 2×3 = +8)
      const expected = formatModifier(getSkillModifier(14, 3, true, true))
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })

    it("renders languages", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Common")).toBeInTheDocument()
      expect(screen.getByText("Elvish")).toBeInTheDocument()
    })

    it("renders other proficiencies", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Smith's Tools")).toBeInTheDocument()
    })

    it("shows 'No additional proficiencies' when list is empty", () => {
      render(
        <SkillsProficienciesModule
          character={makeCharacter({ otherProficiencies: [] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/no additional proficiencies/i)).toBeInTheDocument()
    })

    it("shows D pip for a skill with disadvantage", () => {
      const character = makeCharacter({
        skills: { ...makeCharacter().skills, stealth: { proficient: true, expertise: true, disadvantage: true } },
      })
      render(<SkillsProficienciesModule character={character} onUpdate={vi.fn()} />)
      expect(screen.getByText("D")).toBeInTheDocument()
    })

    it("does not show D pip when no skills have disadvantage", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.queryByText("D")).not.toBeInTheDocument()
    })
  })

  describe("edit mode — skill proficiency/expertise", () => {
    // In edit mode, checkboxes with title="Proficient" are one per skill (18 total, in skill order).
    // Checkboxes with title="Expertise" are one per skill (18 total, in skill order).
    // Checkboxes with title="Disadvantage" are one per skill (18 total, in skill order).
    // The first 6 checkboxes (no title) are saving throw proficiency boxes.

    it("toggles skill proficiency ON for an unproficient skill", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // perception is index 11 — currently not proficient
      const profCheckboxes = screen.getAllByRole("checkbox", { name: "Proficient" })
      fireEvent.click(profCheckboxes[11]) // perception
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            perception: expect.objectContaining({ proficient: true }),
          }),
        })
      )
    })

    it("toggling proficiency OFF clears expertise (stealth)", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // stealth is index 16 — currently proficient + expert
      const profCheckboxes = screen.getAllByRole("checkbox", { name: "Proficient" })
      expect(profCheckboxes[16]).toBeChecked()

      fireEvent.click(profCheckboxes[16]) // turn off proficiency
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            stealth: expect.objectContaining({ proficient: false, expertise: false }),
          }),
        })
      )
    })

    it("toggling expertise ON sets proficiency to true (perception)", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // perception is index 11 — currently neither proficient nor expert
      const expCheckboxes = screen.getAllByRole("checkbox", { name: "Expertise" })
      fireEvent.click(expCheckboxes[11]) // enable expertise → should also set proficient
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            perception: expect.objectContaining({ proficient: true, expertise: true }),
          }),
        })
      )
    })

    it("toggles skill disadvantage ON (perception)", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // perception is index 11 — D buttons are rendered as <button title="Disadvantage">
      const disadvButtons = screen.getAllByRole("button", { name: "Disadvantage" })
      fireEvent.click(disadvButtons[11])
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            perception: expect.objectContaining({ disadvantage: true }),
          }),
        })
      )
    })

    it("toggles saving throw proficiency", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // First 6 checkboxes (no title): strength(0), dexterity(1), ...
      const allCheckboxes = screen.getAllByRole("checkbox")
      // dexterity saving throw is at index 1 — currently not proficient
      fireEvent.click(allCheckboxes[1])
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          savingThrows: expect.objectContaining({ dexterity: true }),
        })
      )
    })
  })

  describe("edit mode — languages", () => {
    it("adds a language via the add button", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      const langInput = screen.getByPlaceholderText("Add language")
      fireEvent.input(langInput, { target: { value: "Dwarvish" } })
      // The add button is the only button in the same flex row as the input
      fireEvent.click(within(langInput.parentElement!).getByRole("button"))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          languages: expect.arrayContaining(["Common", "Elvish", "Dwarvish"]),
        })
      )
    })

    it("adds a language via the Enter key", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      const langInput = screen.getByPlaceholderText("Add language")
      fireEvent.input(langInput, { target: { value: "Gnomish" } })
      fireEvent.keyDown(langInput, { key: "Enter" })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          languages: expect.arrayContaining(["Gnomish"]),
        })
      )
    })

    it("removes a language when its X button is clicked", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      // Remove language buttons have aria-label="Remove language"; first one removes "Common"
      const removeLangButtons = screen.getAllByRole("button", { name: /remove language/i })
      fireEvent.click(removeLangButtons[0])
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      const updatedLanguages = onUpdate.mock.calls[0][0].languages
      expect(updatedLanguages).not.toContain("Common")
      expect(updatedLanguages).toContain("Elvish")
    })
  })

  describe("edit mode — other proficiencies", () => {
    it("adds a proficiency via the add button", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()

      const profInput = screen.getByPlaceholderText(/add proficiency/i)
      fireEvent.input(profInput, { target: { value: "Thieves' Tools" } })
      fireEvent.click(within(profInput.parentElement!).getByRole("button"))
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          otherProficiencies: expect.arrayContaining(["Smith's Tools", "Thieves' Tools"]),
        })
      )
    })
  })

  describe("cancel and save", () => {
    it("cancel does not call onUpdate", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("cancel restores view mode", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      // Back in view mode: checkboxes are gone
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
      // Languages still visible
      expect(screen.getByText("Common")).toBeInTheDocument()
    })

    it("save calls onUpdate with updated character", () => {
      const onUpdate = vi.fn()
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={onUpdate} />)
      clickEditButton()
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("calculation tooltips", () => {
    // Trigger DOM order: 6 saving throws, 18 skills, 3 passive senses = 27 total
    // Skill order (Object.keys of SKILL_DISPLAY_NAMES):
    //   acrobatics(6), animalHandling(7), arcana(8), athletics(9), deception(10),
    //   history(11), insight(12), intimidation(13), investigation(14), medicine(15),
    //   nature(16), perception(17), performance(18), persuasion(19), religion(20),
    //   sleightOfHand(21), stealth(22), survival(23)
    // Senses: perception(24), insight(25), investigation(26)

    beforeEach(() => cleanupPortals())

    it("renders 27 focusable tooltip triggers in view mode (6 saves + 18 skills + 3 senses)", () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      expect(triggers).toHaveLength(27)
    })

    it("shows ability mod + proficiency bonus for a proficient saving throw", async () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // STR (index 0) is proficient: Str +3 + Prof +3 = +6
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[0])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Str +3 + Prof +3 = +6")
    })

    it("shows only ability modifier for a non-proficient saving throw", async () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // DEX (index 1) is not proficient: just Dex +2
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[1])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dex +2")
      expect(screen.getByRole("tooltip").textContent).not.toContain("Prof")
    })

    it("shows expertise bonus in skill modifier tooltip", async () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // Stealth at index 22 (6 saves + 16 skill): Dex +2 + Prof +3 + Exp +3 = +8
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[22])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dex +2 + Prof +3 + Exp +3 = +8")
    })

    it("shows only ability modifier for a skill with no proficiency", async () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // Acrobatics at index 6: Dex +2 (no proficiency in makeCharacter)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[6])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dex +2")
      expect(screen.getByRole("tooltip").textContent).not.toContain("Prof")
    })

    it("shows passive skill formula in the senses section tooltip", async () => {
      render(<SkillsProficienciesModule character={makeCharacter()} onUpdate={vi.fn()} />)
      // Passive Perception at index 24: Wis 8 → -1, no prof → 10 + (-1) = 9
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[24])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("10 + Perception -1 = 9")
    })
  })

  describe("calculated passive values", () => {
    beforeEach(() => cleanupPortals())

    function makeDistinctPassivesCharacter(overrides: Record<string, any> = {}) {
      return makeCharacter({
        abilityScores: { ...createDefaultCharacter().abilityScores, wisdom: 14, intelligence: 16 },
        skills: {
          ...createDefaultCharacter().skills,
          perception: { proficient: true, expertise: false },
          insight: { proficient: false, expertise: false },
          investigation: { proficient: true, expertise: true },
        },
        proficiencyBonus: 2,
        ...overrides,
      })
    }

    it("shows passive values as read-only text in edit mode when flags are true (default)", () => {
      // Wis 14 (+2), Int 16 (+3), prof +2
      // Perception: proficient → 10 + 2 + 2 = 14
      // Insight: no proficiency → 10 + 2 = 12
      // Investigation: proficient + expertise → 10 + 3 + 2 + 2 = 17
      render(<SkillsProficienciesModule character={makeDistinctPassivesCharacter()} onUpdate={vi.fn()} />)
      clickEditButton()
      expect(screen.getByText("14")).toBeInTheDocument()
      expect(screen.getByText("12")).toBeInTheDocument()
      expect(screen.getByText("17")).toBeInTheDocument()
      const values = screen.queryAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).not.toContain("14")
      expect(values).not.toContain("12")
      expect(values).not.toContain("17")
    })

    it("shows a NumericInput for each passive field when its flag is false", () => {
      render(
        <SkillsProficienciesModule
          character={makeCharacter({
            useCalculatedPassivePerception: false, passivePerception: 11,
            useCalculatedPassiveInsight: false, passiveInsight: 13,
            useCalculatedPassiveInvestigation: false, passiveInvestigation: 15,
          })}
          onUpdate={vi.fn()}
        />
      )
      clickEditButton()
      const values = screen.getAllByRole("spinbutton").map((s) => (s as HTMLInputElement).value)
      expect(values).toContain("11")
      expect(values).toContain("13")
      expect(values).toContain("15")
    })

    it("saves manually entered passivePerception when its flag is false", () => {
      const onUpdate = vi.fn()
      render(
        <SkillsProficienciesModule
          character={makeCharacter({ useCalculatedPassivePerception: false, passivePerception: 11 })}
          onUpdate={onUpdate}
        />
      )
      clickEditButton()
      const ppInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "11"
      )!
      fireEvent.input(ppInput, { target: { value: "18" } })
      fireEvent.blur(ppInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ passivePerception: 18 }))
    })

    it("saves manually entered passiveInsight and passiveInvestigation when their flags are false", () => {
      const onUpdate = vi.fn()
      render(
        <SkillsProficienciesModule
          character={makeCharacter({
            useCalculatedPassiveInsight: false, passiveInsight: 13,
            useCalculatedPassiveInvestigation: false, passiveInvestigation: 15,
          })}
          onUpdate={onUpdate}
        />
      )
      clickEditButton()
      const insightInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "13"
      )!
      const investigationInput = screen.getAllByRole("spinbutton").find(
        (s) => (s as HTMLInputElement).value === "15"
      )!
      fireEvent.input(insightInput, { target: { value: "19" } })
      fireEvent.blur(insightInput)
      fireEvent.input(investigationInput, { target: { value: "20" } })
      fireEvent.blur(investigationInput)
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ passiveInsight: 19, passiveInvestigation: 20 }))
    })

    it("shows manual passive values in view mode when their flags are false", () => {
      render(
        <SkillsProficienciesModule
          character={makeCharacter({
            useCalculatedPassivePerception: false, passivePerception: 11,
            useCalculatedPassiveInsight: false, passiveInsight: 13,
            useCalculatedPassiveInvestigation: false, passiveInvestigation: 15,
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("11")).toBeInTheDocument()
      expect(screen.getByText("13")).toBeInTheDocument()
      expect(screen.getByText("15")).toBeInTheDocument()
    })

    it("shows 'Custom' tooltip in view mode when a passive flag is false", async () => {
      render(
        <SkillsProficienciesModule
          character={makeCharacter({ useCalculatedPassiveInsight: false })}
          onUpdate={vi.fn()}
        />
      )
      // Passive Insight is at trigger index 25 (perception=24, insight=25, investigation=26)
      const triggers = document.querySelectorAll('[data-sem="tooltip-trigger"][tabindex="0"]')
      fireEvent.focus(triggers[25])
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })
})

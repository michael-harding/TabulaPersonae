import { createSignal } from "solid-js"
import { axe } from "vitest-axe"

import { LevelUpModal } from "@/components/level-up-modal"
import { createDefaultCharacter, type Character, type FeatureEffects } from "@/lib/character-types"
import { getEffectiveMaxHp } from "@/lib/character-utils"

import { render, screen, fireEvent, within, cleanupPortals } from "../test-utils"

// createDefaultCharacter: level 1, CON 10, calculated Max HP and proficiency bonus, a Hit Points
// feature giving a d8 (per level) and Ability Score Improvements at 4, 8, 12, 16, 19.
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), id: "char-1", hitPoints: { current: 8, maximum: 8, temporary: 0 }, ...overrides }
}

function withHitPoints(character: Character, effects: FeatureEffects): Character {
  return {
    ...character,
    classFeatures: (character.classFeatures ?? []).map((feature) =>
      feature.featureType === "Hit Points" ? { ...feature, levelEffects: [{ level: 1, effects }] } : feature,
    ),
  }
}

const hitPointsEffects = (character: Character) =>
  character.classFeatures?.find((feature) => feature.featureType === "Hit Points")?.levelEffects?.[0]?.effects

describe("LevelUpModal", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  const openModal = (character: Character, onLevelUp = vi.fn()) => {
    const onOpenChange = vi.fn()
    function Wrapper() {
      const [open, setOpen] = createSignal(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <LevelUpModal character={character} open={open()} onOpenChange={(next) => { onOpenChange(next); setOpen(next) }} onLevelUp={onLevelUp} />
        </>
      )
    }
    render(() => <Wrapper />)
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    return { onLevelUp, onOpenChange }
  }

  const dialog = () => screen.getByRole("dialog")
  const byTest = (id: string) => within(dialog()).getByTestId(id)
  const queryByTest = (id: string) => within(dialog()).queryByTestId(id)
  const enterNumber = (input: HTMLElement, value: number) => {
    fireEvent.input(input, { target: { value: String(value) } })
    fireEvent.blur(input)
  }
  const confirm = () => fireEvent.click(byTest("level-up-confirm-button"))

  it("has no accessibility violations", async () => {
    openModal(makeCharacter({ level: 3 }))
    expect((await axe(document.body)).violations).toHaveLength(0)
  })

  it("has no accessibility violations with rolled HP errors showing", async () => {
    openModal(withHitPoints(makeCharacter(), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10] }))
    confirm()
    expect((await axe(document.body)).violations).toHaveLength(0)
  })

  it("starts at the next level, and won't go below it or above 20", () => {
    openModal(makeCharacter({ level: 3 }))
    const level = within(dialog()).getByLabelText("New Level") as HTMLInputElement
    expect(level.value).toBe("4")
    expect(level.min).toBe("4")
    expect(level.max).toBe("20")
    expect(within(dialog()).getByText("Currently level 3")).toBeInTheDocument()
  })

  it("shows the new HP with no input for a per-level Hit Points feature", () => {
    openModal(makeCharacter())
    expect(queryByTest("level-up-new-hp-input")).not.toBeInTheDocument()
    expect(queryByTest("level-up-rolled-hp-2")).not.toBeInTheDocument()
    expect(byTest("level-up-change-max-hp")).toHaveTextContent(/Max HP\s*8\s*to\s*13/)
  })

  it("levels up on Confirm and closes", () => {
    const { onLevelUp, onOpenChange } = openModal(makeCharacter())
    confirm()
    expect(onLevelUp).toHaveBeenCalledOnce()
    const updated: Character = onLevelUp.mock.calls[0][0]
    expect(updated.level).toBe(2)
    expect(updated.hitPoints.current).toBe(13)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it("levels up as many levels as entered", () => {
    const { onLevelUp } = openModal(makeCharacter({ level: 3 }))
    enterNumber(within(dialog()).getByLabelText("New Level"), 6)
    expect(byTest("level-up-change-hit-dice")).toHaveTextContent("3d8")
    expect(byTest("level-up-change-hit-dice")).toHaveTextContent("6d8")
    confirm()
    expect(onLevelUp.mock.calls[0][0].level).toBe(6)
  })

  it("Cancel closes without levelling up", () => {
    const { onLevelUp, onOpenChange } = openModal(makeCharacter())
    fireEvent.click(byTest("level-up-cancel-button"))
    expect(onLevelUp).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  describe("single value Hit Points", () => {
    const flat = () => withHitPoints(makeCharacter({ hitPoints: { current: 12, maximum: 12, temporary: 0 } }), { hitDiceSize: 8, hitPointsMode: "flat", hitPointsFlatValue: 12 })

    it("asks for the new HP, starting from the current value", () => {
      openModal(flat())
      expect((within(dialog()).getByLabelText("New HP") as HTMLInputElement).value).toBe("12")
    })

    it("previews and saves the new HP", () => {
      const { onLevelUp } = openModal(flat())
      enterNumber(within(dialog()).getByLabelText("New HP"), 19)
      expect(byTest("level-up-change-max-hp")).toHaveTextContent(/12\s*to\s*19/)
      confirm()
      const updated: Character = onLevelUp.mock.calls[0][0]
      expect(hitPointsEffects(updated)?.hitPointsFlatValue).toBe(19)
      expect(getEffectiveMaxHp(updated)).toBe(19)
      expect(updated.hitPoints.current).toBe(19)
    })
  })

  describe("rolled Hit Points", () => {
    const rolled = (level = 1) => withHitPoints(makeCharacter({ level }), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10] })

    it("asks for a roll for each level gained", () => {
      openModal(rolled())
      enterNumber(within(dialog()).getByLabelText("New Level"), 3)
      expect(within(dialog()).getByLabelText("Rolled HP (Level 2)")).toBeRequired()
      expect(within(dialog()).getByLabelText("Rolled HP (Level 3)")).toBeRequired()
      expect(within(dialog()).getByText(/Roll 1d10 for each level/)).toBeInTheDocument()
    })

    it("won't confirm until every roll is entered, and says why", () => {
      const { onLevelUp } = openModal(rolled())
      confirm()
      expect(onLevelUp).not.toHaveBeenCalled()
      expect(byTest("form-error-summary")).toHaveTextContent("Rolled HP for level 2 must be from 1 to 10")
      expect(within(dialog()).getByLabelText("Rolled HP (Level 2)")).toHaveAttribute("aria-invalid", "true")
    })

    it("saves the rolls to the Hit Points feature", () => {
      const { onLevelUp } = openModal(rolled())
      enterNumber(within(dialog()).getByLabelText("Rolled HP (Level 2)"), 7)
      // 10 + 7, Constitution +0
      expect(byTest("level-up-change-max-hp")).toHaveTextContent(/10\s*to\s*17/)
      confirm()
      expect(hitPointsEffects(onLevelUp.mock.calls[0][0])?.hitPointsRolledLevels).toEqual([10, 7])
    })

    it("starts from a roll already recorded for the level", () => {
      openModal(withHitPoints(makeCharacter(), { hitDiceSize: 10, hitPointsMode: "rolled", hitPointsRolledLevels: [10, 4] }))
      expect((within(dialog()).getByLabelText("Rolled HP (Level 2)") as HTMLInputElement).value).toBe("4")
    })
  })

  it("lists the calculated values that change, by group", () => {
    openModal(makeCharacter({ level: 4, skills: { ...createDefaultCharacter().skills, stealth: { proficient: true, expertise: false } } }))
    const changes = byTest("level-up-changes")
    expect(within(changes).getByRole("heading", { name: "Combat" })).toBeInTheDocument()
    expect(within(changes).getByTestId("level-up-change-proficiency-bonus")).toHaveTextContent(/Proficiency Bonus\s*\+2\s*to\s*\+3/)
    expect(within(changes).getByTestId("level-up-change-skill-stealth")).toBeInTheDocument()
  })

  it("says when no other calculated value changes", () => {
    openModal(makeCharacter({ level: 2 }))
    expect(within(dialog()).getByText("No other calculated values change.")).toBeInTheDocument()
  })

  it("lists the features gaining something", () => {
    const character = makeCharacter({
      level: 4,
      classFeatures: [
        ...(createDefaultCharacter().classFeatures ?? []),
        { id: "ea", name: "Extra Attack", description: "", source: "class-feature", featureType: "Action", actionKind: "action", level: 5 },
      ],
    })
    openModal(character)
    const gained = byTest("level-up-gained-ea")
    expect(gained).toHaveTextContent("Extra Attack")
    expect(gained).toHaveTextContent("Class Feature")
    expect(gained).toHaveTextContent("Level 5: Becomes available")
  })

  it("calls out custom values that need updating by hand", () => {
    openModal(makeCharacter({ level: 4, useCalculatedProficiencyBonus: false, proficiencyBonus: 2 }))
    expect(byTest("level-up-manual-proficiency-bonus")).toHaveTextContent(/Proficiency Bonus\s*Custom value: \+2/)
  })

  it("has no Update by Hand section when nothing needs it", () => {
    openModal(makeCharacter({ level: 2 }))
    expect(queryByTest("level-up-manual-values")).not.toBeInTheDocument()
  })

  it("reminds the player to choose an Ability Score Improvement or a feat", () => {
    openModal(makeCharacter({ level: 3 }))
    expect(byTest("level-up-asi-4")).toHaveTextContent("Level 4: choose an Ability Score Improvement or another feat")
  })

  it("has no reminder to choose spells for a character that casts none", () => {
    openModal(makeCharacter())
    expect(queryByTest("level-up-choices")).not.toBeInTheDocument()
  })

  it("reminds a spellcaster to choose new spells and cantrips", () => {
    openModal(makeCharacter({ spells: [{ id: "s1", name: "Light", description: "", level: 0, school: "Evocation", castingTime: "1 action", range: "Touch", components: "V, M", duration: "1 hour", prepared: true, known: true }] }))
    expect(byTest("level-up-spells-reminder")).toHaveTextContent("Choose any new spells and cantrips")
  })
})

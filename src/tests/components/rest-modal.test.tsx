import { createSignal } from "solid-js"
import { axe } from "vitest-axe"
import { render, screen, fireEvent, within, cleanupPortals } from "../test-utils"
import { RestModal } from "@/components/rest-modal"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Attack, BonusAction, Reaction, Feature, Equipment } from "@/lib/character-types"

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...createDefaultCharacter(),
    level: 3,
    hitPoints: { current: 15, maximum: 24, temporary: 0 },
    spentHitDice: 0,
    hitDice: "1d8",
    abilityScores: { ...createDefaultCharacter().abilityScores, constitution: 14 }, // +2 mod
    ...overrides,
  }
}

function makeAttack(overrides: Partial<Attack> = {}): Attack {
  return { id: "a1", name: "Lay on Hands", type: "class-feature", description: "", ...overrides }
}

function makeBonusAction(overrides: Partial<BonusAction> = {}): BonusAction {
  return { id: "b1", name: "Second Wind", type: "class-feature", description: "", ...overrides }
}

function makeReaction(overrides: Partial<Reaction> = {}): Reaction {
  return { id: "r1", name: "Shield", type: "class-feature", description: "", trigger: "Hit", ...overrides }
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return { id: "f1", name: "Lay on Hands", description: "", source: "class-feature", ...overrides }
}

function makeEquipmentItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "e1",
    name: "Wand of Magic Missiles",
    quantity: 1,
    weight: 1,
    description: "",
    equipped: true,
    type: "other",
    magic: true,
    ...overrides,
  }
}

describe("RestModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  // Wrap RestModal with a trigger button so Kobalte's Portal initialises correctly
  const openModal = (character: Character, onRest = vi.fn()) => {
    function Wrapper() {
      const [open, setOpen] = createSignal(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <RestModal character={character} open={open()} onOpenChange={setOpen} onRest={onRest} />
        </>
      )
    }
    render(<Wrapper />)
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
  }

  const getDialog = () => screen.getByRole("dialog")

  describe("short rest (default)", () => {
    it("renders short rest benefits text", () => {
      openModal(makeCharacter())
      const dialog = getDialog()
      expect(within(dialog).getByText(/Spend Hit Dice to regain HP/i)).toBeInTheDocument()
      expect(within(dialog).getByText(/Short-rest features recharge/i)).toBeInTheDocument()
    })

    it("shows available hit dice count", () => {
      openModal(makeCharacter({ level: 3, spentHitDice: 1 }))
      expect(within(getDialog()).getByText(/2 d8 available/i)).toBeInTheDocument()
    })

    it("lists actions with rechargeOn 'short-rest' in the features section", () => {
      const char = makeCharacter({
        attacks: [makeAttack({ rechargeOn: "short-rest", name: "Action Shot" })],
      })
      openModal(char)
      expect(within(getDialog()).getByText("Action Shot")).toBeInTheDocument()
    })

    it("does not list actions with rechargeOn 'long-rest' in short rest features", () => {
      const char = makeCharacter({
        attacks: [makeAttack({ rechargeOn: "long-rest", name: "Arcane Recovery" })],
      })
      openModal(char)
      expect(within(getDialog()).queryByText("Arcane Recovery")).not.toBeInTheDocument()
    })

    it("shows 'No features recharge on this rest' when no matching actions", () => {
      openModal(makeCharacter())
      expect(within(getDialog()).getByText(/No features recharge on this rest/i)).toBeInTheDocument()
    })

    it("calls onRest with uses reset for short-rest actions on confirm with 0 dice", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        attacks: [makeAttack({ rechargeOn: "short-rest", uses: 2, maxUses: 3 })],
      })
      openModal(char, onRest)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      expect(onRest).toHaveBeenCalledOnce()
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.attacks![0].uses).toBe(0)
    })

    it("does not change HP when 0 dice are selected", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ hitPoints: { current: 10, maximum: 24, temporary: 0 } }), onRest)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.current).toBe(10)
    })

    it("disables dice selector when no hit dice available", () => {
      openModal(makeCharacter({ level: 3, spentHitDice: 3 }))
      expect(within(getDialog()).getByText(/No hit dice available/i)).toBeInTheDocument()
    })

    it("calls onRest with increased spentHitDice when dice are spent via stepper", () => {
      const onRest = vi.fn()
      const char = makeCharacter({ level: 10, spentHitDice: 2 })
      openModal(char, onRest)
      // Available = 8, > 5, so stepper renders
      const increaseBtn = within(getDialog()).getByRole("button", { name: /increase/i })
      fireEvent.click(increaseBtn)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.spentHitDice).toBe(3) // was 2, spent 1
    })

    it("calls onRest with HP increased (capped at max) when dice are spent", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        level: 10,
        spentHitDice: 0,
        hitPoints: { current: 20, maximum: 80, temporary: 0 },
        abilityScores: { ...createDefaultCharacter().abilityScores, constitution: 10 }, // +0 mod
      })
      openModal(char, onRest)
      const increaseBtn = within(getDialog()).getByRole("button", { name: /increase/i })
      fireEvent.click(increaseBtn) // spend 1 die
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.current).toBeGreaterThan(20)
      expect(updated.hitPoints.current).toBeLessThanOrEqual(80)
    })

    it("caps healing at maximum + temporaryMaximum, not just maximum", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        level: 10,
        spentHitDice: 0,
        hitPoints: { current: 78, maximum: 80, temporary: 0, temporaryMaximum: 10 },
        abilityScores: { ...createDefaultCharacter().abilityScores, constitution: 20 }, // +5 mod, guarantees healing past 80
      })
      openModal(char, onRest)
      const increaseBtn = within(getDialog()).getByRole("button", { name: /increase/i })
      fireEvent.click(increaseBtn) // spend 1 die
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.current).toBeGreaterThan(80)
      expect(updated.hitPoints.current).toBeLessThanOrEqual(90)
    })
  })

  describe("long rest", () => {
    const switchToLong = () =>
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /long rest/i }))

    it("renders long rest benefits text", () => {
      openModal(makeCharacter())
      switchToLong()
      const dialog = getDialog()
      expect(within(dialog).getByText(/Regain all lost Hit Points/i)).toBeInTheDocument()
      expect(within(dialog).getByText(/All spell slots restored/i)).toBeInTheDocument()
      expect(within(dialog).getByText(/Exhaustion reduced by 1/i)).toBeInTheDocument()
    })

    it("lists both short-rest and long-rest actions in recharging features", () => {
      const char = makeCharacter({
        attacks: [
          makeAttack({ id: "a1", name: "Quick Strike", rechargeOn: "short-rest" }),
          makeAttack({ id: "a2", name: "Arcane Recovery", rechargeOn: "long-rest" }),
        ],
      })
      openModal(char)
      switchToLong()
      const dialog = getDialog()
      expect(within(dialog).getByText("Quick Strike")).toBeInTheDocument()
      expect(within(dialog).getByText("Arcane Recovery")).toBeInTheDocument()
    })

    it("calls onRest with HP restored to maximum", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ hitPoints: { current: 5, maximum: 24, temporary: 3 } }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.current).toBe(24)
    })

    it("calls onRest with HP restored to maximum + temporaryMaximum when set", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ hitPoints: { current: 5, maximum: 24, temporary: 3, temporaryMaximum: 10 } }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.current).toBe(34)
    })

    it("calls onRest with temporary HP cleared", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ hitPoints: { current: 24, maximum: 24, temporary: 5 } }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.hitPoints.temporary).toBe(0)
    })

    it("calls onRest with spentHitDice = 0", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ spentHitDice: 2 }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.spentHitDice).toBe(0)
    })

    it("calls onRest with all spell slot used counts reset to 0", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        spellSlots: {
          ...createDefaultCharacter().spellSlots,
          1: { total: 4, used: 3 },
          2: { total: 3, used: 2 },
        },
      })
      openModal(char, onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.spellSlots[1].used).toBe(0)
      expect(updated.spellSlots[2].used).toBe(0)
    })

    it("calls onRest with Exhaustion removed from conditions", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ conditions: ["Exhaustion", "Poisoned"] }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.conditions).not.toContain("Exhaustion")
    })

    it("does not remove non-Exhaustion conditions", () => {
      const onRest = vi.fn()
      openModal(makeCharacter({ conditions: ["Poisoned", "Blinded"] }), onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.conditions).toContain("Poisoned")
      expect(updated.conditions).toContain("Blinded")
    })

    it("lists class features with rechargeOn 'long-rest' in the long rest features section", () => {
      const char = makeCharacter({
        classFeatures: [makeFeature({ name: "Lay on Hands", rechargeOn: "long-rest" })],
      })
      openModal(char)
      switchToLong()
      expect(within(getDialog()).getByText("Lay on Hands")).toBeInTheDocument()
    })

    it("calls onRest with uses reset for both short-rest and long-rest actions", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        attacks: [
          makeAttack({ id: "a1", name: "Quick Strike", rechargeOn: "short-rest", uses: 1, maxUses: 2 }),
          makeAttack({ id: "a2", name: "Power Word", rechargeOn: "long-rest", uses: 1, maxUses: 1 }),
        ],
        bonusActions: [
          makeBonusAction({ rechargeOn: "short-rest", uses: 2, maxUses: 3 }),
        ],
      })
      openModal(char, onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.attacks![0].uses).toBe(0)
      expect(updated.attacks![1].uses).toBe(0)
      expect(updated.bonusActions![0].uses).toBe(0)
    })

    it("calls onRest with class feature uses reset on long rest", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        classFeatures: [makeFeature({ id: "f1", rechargeOn: "long-rest", uses: 3, maxUses: 5, actionKind: "action" })],
      })
      openModal(char, onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.classFeatures![0].uses).toBe(0)
    })

    it("calls onRest with species trait uses reset on long rest", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        speciesTraits: [makeFeature({ id: "s1", source: "species-trait", rechargeOn: "long-rest", uses: 1, maxUses: 2, actionKind: "action" })],
      })
      openModal(char, onRest)
      switchToLong()
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.speciesTraits![0].uses).toBe(0)
    })

    it("does not reset class feature uses when rechargeOn is long-rest and only short rest is taken", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        classFeatures: [makeFeature({ id: "f1", rechargeOn: "long-rest", uses: 3, maxUses: 5, actionKind: "action" })],
      })
      openModal(char, onRest)
      // stay on short rest (default)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.classFeatures![0].uses).toBe(3)
    })
  })

  describe("short rest feature recharge", () => {
    it("lists class features with rechargeOn 'short-rest' in the recharging section", () => {
      const char = makeCharacter({
        classFeatures: [makeFeature({ name: "Second Wind", rechargeOn: "short-rest", actionKind: "action" })],
      })
      openModal(char)
      expect(within(getDialog()).getByText("Second Wind")).toBeInTheDocument()
    })

    it("calls onRest with class feature uses reset on short rest", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        classFeatures: [makeFeature({ id: "f1", rechargeOn: "short-rest", uses: 2, maxUses: 3, actionKind: "action" })],
      })
      openModal(char, onRest)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.classFeatures![0].uses).toBe(0)
    })
  })

  describe("equipment recharge", () => {
    it("lists an equipment item with rechargeOn 'short-rest' in the short rest recharging features", () => {
      const char = makeCharacter({
        equipment: [makeEquipmentItem({ rechargeOn: "short-rest" })],
      })
      openModal(char)
      expect(within(getDialog()).getByText("Wand of Magic Missiles")).toBeInTheDocument()
    })

    it("does not list a 'long-rest' equipment item in the short rest recharging features", () => {
      const char = makeCharacter({
        equipment: [makeEquipmentItem({ rechargeOn: "long-rest" })],
      })
      openModal(char)
      expect(within(getDialog()).queryByText("Wand of Magic Missiles")).not.toBeInTheDocument()
    })

    it("lists a 'long-rest' equipment item in the long rest recharging features", () => {
      const char = makeCharacter({
        equipment: [makeEquipmentItem({ rechargeOn: "long-rest" })],
      })
      openModal(char)
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /long rest/i }))
      expect(within(getDialog()).getByText("Wand of Magic Missiles")).toBeInTheDocument()
    })

    it("calls onRest with equipment uses reset to 0 for a short-rest item on short rest confirm", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        equipment: [makeEquipmentItem({ rechargeOn: "short-rest", uses: 2, maxUses: 3 })],
      })
      openModal(char, onRest)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.equipment![0].uses).toBe(0)
    })

    it("calls onRest with equipment uses reset to 0 for both short-rest and long-rest items on long rest confirm", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        equipment: [
          makeEquipmentItem({ id: "e1", name: "Wand", rechargeOn: "short-rest", uses: 1, maxUses: 2 }),
          makeEquipmentItem({ id: "e2", name: "Staff", rechargeOn: "long-rest", uses: 1, maxUses: 1 }),
        ],
      })
      openModal(char, onRest)
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /long rest/i }))
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.equipment![0].uses).toBe(0)
      expect(updated.equipment![1].uses).toBe(0)
    })

    it("does not reset a long-rest equipment item's uses when only a short rest is taken", () => {
      const onRest = vi.fn()
      const char = makeCharacter({
        equipment: [makeEquipmentItem({ rechargeOn: "long-rest", uses: 2, maxUses: 3 })],
      })
      openModal(char, onRest)
      fireEvent.click(within(getDialog()).getByRole("button", { name: /confirm rest/i }))
      const updated: Character = onRest.mock.calls[0][0]
      expect(updated.equipment![0].uses).toBe(2)
    })
  })

  it("has no accessibility violations when open", async () => {
    openModal(makeCharacter())
    const results = await axe(document.body)
    expect(results.violations).toHaveLength(0)
  })
})

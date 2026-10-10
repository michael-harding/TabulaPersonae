import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"
import { createStore } from "solid-js/store"

import { EquipmentItemModal, hasOtherModifierFields } from "@/components/equipment-item-modal"
import type { Equipment, ItemModifiers } from "@/lib/character-types"

import { render, screen, fireEvent, within, waitFor, cleanupPortals } from "../test-utils"

function makeItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "item-1",
    name: "Rope",
    quantity: 1,
    weight: 2,
    description: "",
    equipped: false,
    type: "other",
    ...overrides,
  }
}

function setNumericValue(input: HTMLElement, value: string) {
  fireEvent.input(input, { target: { value } })
  fireEvent.blur(input)
}

describe("EquipmentItemModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  // The app keeps the character in a Solid store, so an item handed to the editor is a reactive
  // proxy, and so are its nested objects and arrays. structuredClone can't copy a proxy, so the
  // editor must unwrap before cloning. Plain-object fixtures elsewhere in this file can't catch
  // that, which is how editing any weapon, armour or item with list modifiers shipped broken.
  describe("editing an item held in a Solid store (as the app does)", () => {
    beforeEach(() => cleanupPortals())

    it.each([
      ["a weapon", { type: "weapon" as const, weaponStats: { damage: "1d8", damageType: "piercing", weaponRange: "150/600 ft", attackAbility: "dex" as const, proficient: true } }],
      ["armour", { type: "armor" as const, armorStats: { baseAC: 11, armorType: "light" as const } }],
      ["an item with list modifiers", { magic: true, modifiers: { languages: ["Elvish"], skillAdvantage: ["stealth" as const] } }],
    ])("opens the editor for %s", (_label, overrides) => {
      const [store] = createStore({ equipment: [makeItem({ name: "Proxied", ...overrides } as Partial<Equipment>)] })
      render(<EquipmentItemModal open={true} editingItem={store.equipment[0]} onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.getByTestId("item-name")).toHaveValue("Proxied")
    })
  })

  describe("open/closed rendering", () => {
    it("renders nothing when open is false", () => {
      render(<EquipmentItemModal open={false} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("shows 'Add New Item' and 'Add Item' submit label when adding", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.getByText("Add New Item")).toBeInTheDocument()
      expect(screen.getByTestId("equipment-modal-submit")).toHaveTextContent("Add Item")
    })

    it("shows 'Edit Item' and 'Update Item' submit label when editing", () => {
      render(<EquipmentItemModal open={true} editingItem={makeItem()} onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.getByText("Edit Item")).toBeInTheDocument()
      expect(screen.getByTestId("equipment-modal-submit")).toHaveTextContent("Update Item")
    })
  })

  describe("cancel and validation", () => {
    it("calls onCancel when Cancel is clicked", () => {
      const onCancel = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={onCancel} />)
      fireEvent.click(screen.getByTestId("equipment-modal-cancel"))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("does not call onSave when the name is empty", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).not.toHaveBeenCalled()
    })

    it("does not call onSave when the name is only whitespace", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "   " } })
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe("adding a new item", () => {
    it("saves a new mundane item with trimmed name and no magic/charges/modifier metadata", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "  Rope  " } })
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rope",
          quantity: 1,
          weight: 0,
          description: "",
          equipped: false,
          type: "other",
          actionKind: undefined,
          weaponStats: undefined,
          armorStats: undefined,
          magic: undefined,
          requiresAttunement: undefined,
          attuned: undefined,
          rarity: undefined,
          charges: undefined,
          maxUses: undefined,
          rechargeOn: undefined,
          consumedUses: undefined,
          modifiers: undefined,
        })
      )
    })

    it("assigns a generated id to a newly created item", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Torch" } })
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }))
    })
  })

  describe("editing an existing item", () => {
    it("pre-fills the form with the existing item's data", () => {
      render(
        <EquipmentItemModal
          open={true}
          editingItem={makeItem({ name: "Lantern", quantity: 2, description: "A simple lantern" })}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(screen.getByTestId("item-name")).toHaveValue("Lantern")
      expect(screen.getByTestId("quantity")).toHaveValue(2)
      expect(screen.getByTestId("description")).toHaveValue("A simple lantern")
    })

    it("preserves the original id and merges in the edited fields on save", () => {
      const onSave = vi.fn()
      render(
        <EquipmentItemModal
          open={true}
          editingItem={makeItem({ id: "rope-42", name: "Rope" })}
          onSave={onSave}
          onCancel={vi.fn()}
        />
      )
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Silk Rope" } })
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "rope-42", name: "Silk Rope" }))
    })
  })

  describe("weapon sub-form", () => {
    it("defaults range, attack ability, and proficient when Weapon type is selected", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Weapon" }))
      expect(screen.getByTestId("weapon-range")).toHaveValue("5 ft")
      expect(screen.getByRole("checkbox", { name: /proficient with this weapon/i })).toBeChecked()
    })

    it("saves entered weapon stats", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Longsword" } })
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Weapon" }))
      fireEvent.input(screen.getByTestId("weapon-damage"), { target: { value: "1d8" } })
      fireEvent.focus(screen.getByTestId("weapon-damage-type"))
      fireEvent.click(screen.getByRole("option", { name: "Slashing" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Longsword",
          type: "weapon",
          weaponStats: { damage: "1d8", damageType: "Slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
        })
      )
    })

    it("clears weaponStats when the type is changed away from Weapon before saving", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Torch" } })
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Weapon" }))
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Other" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "other", weaponStats: undefined }))
    })
  })

  describe("armor sub-form", () => {
    it("defaults base AC and armor type when Armor type is selected", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Armor" }))
      expect(screen.getByTestId("armor-base-ac")).toHaveValue(11)
    })

    it("hides the Base AC input and shows the fixed +2 bonus for Shield armor type", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Armor" }))
      fireEvent.click(screen.getByTestId("armor-type"))
      fireEvent.click(screen.getByRole("option", { name: /^shield/i }))
      expect(screen.queryByTestId("armor-base-ac")).not.toBeInTheDocument()
      expect(screen.getByText("+2 (fixed)")).toBeInTheDocument()
    })

    it("saves the selected armor type", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Buckler" } })
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Armor" }))
      fireEvent.click(screen.getByTestId("armor-type"))
      fireEvent.click(screen.getByRole("option", { name: /^shield/i }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Buckler", type: "armor", armorStats: expect.objectContaining({ armorType: "shield" }) })
      )
    })
  })

  describe("magic item fields", () => {
    it("reveals Magic Item Details, defaulted to Common rarity and attunement required but not attuned", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.queryByText("Magic Item Details")).not.toBeInTheDocument()
      fireEvent.click(screen.getByText("This is a Magic Item"))
      expect(screen.getByText("Magic Item Details")).toBeInTheDocument()
      // The shared <Select> trigger renders the raw option value, not its label — rarity's
      // SelectItem value is the lowercase "common" (see RARITY_OPTIONS).
      expect(screen.getByTestId("item-rarity")).toHaveTextContent("common")
      expect(screen.getByRole("checkbox", { name: /requires attunement/i })).toBeChecked()
      expect(screen.getByRole("checkbox", { name: /^attuned$/i })).not.toBeChecked()
    })

    it("hides the Attuned checkbox and omits attuned on save when Requires Attunement is unchecked", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Bag of Holding" } })
      fireEvent.click(screen.getByText("This is a Magic Item"))
      fireEvent.click(screen.getByRole("checkbox", { name: /requires attunement/i }))
      expect(screen.queryByRole("checkbox", { name: /^attuned$/i })).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Bag of Holding", magic: true, requiresAttunement: false, attuned: undefined })
      )
    })

    it("saves the selected rarity", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Vorpal Sword" } })
      fireEvent.click(screen.getByText("This is a Magic Item"))
      fireEvent.click(screen.getByTestId("item-rarity"))
      fireEvent.click(screen.getByRole("option", { name: "Legendary" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Vorpal Sword", rarity: "legendary" }))
    })

    it("saves AC/initiative bonuses entered in the Bonuses group", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Ring of Protection" } })
      fireEvent.click(screen.getByText("This is a Magic Item"))
      fireEvent.click(screen.getByTestId("modifier-group-ac-initiative"))
      setNumericValue(screen.getByTestId("modifier-ac"), "1")
      setNumericValue(screen.getByTestId("modifier-initiative"), "2")
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ring of Protection",
          modifiers: { armorClass: 1, initiative: 2 },
        })
      )
    })
  })

  describe("charges (magic item uses)", () => {
    it("only shows the Charges group's content once Max Charges is set, and includes charges/rechargeOn on save", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Wand of Magic Missiles" } })
      fireEvent.click(screen.getByText("This is a Magic Item"))
      fireEvent.click(screen.getByTestId("modifier-group-charges"))
      expect(screen.queryByTestId("item-recharge-on")).not.toBeInTheDocument()
      setNumericValue(screen.getByTestId("item-max-uses"), "3")
      fireEvent.click(screen.getByTestId("item-recharge-on"))
      fireEvent.click(screen.getByRole("option", { name: "Long Rest" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Wand of Magic Missiles", magic: true, charges: 0, maxUses: 3, rechargeOn: "long-rest" })
      )
    })

    it("omits charges/maxUses/rechargeOn for a non-magic item even if type would otherwise allow uses", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Mundane Wand" } })
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ charges: undefined, maxUses: undefined, rechargeOn: undefined })
      )
    })
  })

  describe("consumable quantity-consumed tracking", () => {
    it("hides Quantity Consumed until the item is both Consumable and Used As an action", () => {
      render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Consumable" }))
      expect(screen.queryByTestId("item-uses-consumed")).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId("item-action-kind"))
      fireEvent.click(screen.getByRole("option", { name: "Action" }))
      expect(screen.getByTestId("item-uses-consumed")).toBeInTheDocument()
    })

    it("saves consumedUses only when greater than zero", () => {
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Potion of Healing" } })
      fireEvent.click(screen.getByTestId("item-type"))
      fireEvent.click(screen.getByRole("option", { name: "Consumable" }))
      fireEvent.click(screen.getByTestId("item-action-kind"))
      fireEvent.click(screen.getByRole("option", { name: "Action" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Potion of Healing", consumedUses: undefined }))

      onSave.mockClear()
      // Quantity Consumed is capped at the item's quantity (default 1), so 1 is the max valid value here.
      setNumericValue(screen.getByTestId("item-uses-consumed"), "1")
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Potion of Healing", consumedUses: 1 }))
    })
  })

  describe("skill advantage/disadvantage (not gated behind magic)", () => {
    it("saves a granted skill advantage on a mundane item", async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<EquipmentItemModal open={true} editingItem={null} onSave={onSave} onCancel={vi.fn()} />)
      fireEvent.input(screen.getByTestId("item-name"), { target: { value: "Cloak of Elvenkind" } })
      fireEvent.click(screen.getByTestId("modifier-group-skill-effects"))
      await user.click(screen.getByTestId("tag-picker-grants-advantage-on"))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Stealth" })).toBeInTheDocument())
      await user.click(screen.getByRole("menuitem", { name: "Stealth" }))
      fireEvent.click(screen.getByTestId("equipment-modal-submit"))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cloak of Elvenkind",
          magic: undefined,
          modifiers: { skillAdvantage: ["stealth"] },
        })
      )
    })
  })

  describe("hasOtherModifierFields", () => {
    it("returns false for undefined modifiers", () => {
      expect(hasOtherModifierFields(undefined)).toBe(false)
    })

    it("returns false for an empty modifiers object", () => {
      expect(hasOtherModifierFields({})).toBe(false)
    })

    it("returns false when only skillAdvantage/skillDisadvantage are set", () => {
      const mods: ItemModifiers = { skillAdvantage: ["stealth"], skillDisadvantage: ["athletics"] }
      expect(hasOtherModifierFields(mods)).toBe(false)
    })

    it("returns true when a magic-gated field is set alongside skill effects", () => {
      const mods: ItemModifiers = { skillAdvantage: ["stealth"], armorClass: 1 }
      expect(hasOtherModifierFields(mods)).toBe(true)
    })

    it("returns true for any other single modifier field", () => {
      expect(hasOtherModifierFields({ speed: 10 })).toBe(true)
    })
  })

  describe("accessibility", () => {
    it("has no accessibility violations when adding a new item", async () => {
      const { container } = render(<EquipmentItemModal open={true} editingItem={null} onSave={vi.fn()} onCancel={vi.fn()} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("has no accessibility violations when editing a fully-populated magic weapon with expanded groups", async () => {
      const item = makeItem({
        name: "Flame Tongue",
        type: "weapon",
        weaponStats: { damage: "1d8", damageType: "slashing", weaponRange: "5 ft", attackAbility: "str", proficient: true },
        magic: true,
        requiresAttunement: true,
        attuned: true,
        rarity: "rare",
        modifiers: { armorClass: 1, savingThrows: { wisdom: 2 }, senses: { darkvision: 60 } },
      })
      const { container } = render(<EquipmentItemModal open={true} editingItem={item} onSave={vi.fn()} onCancel={vi.fn()} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})

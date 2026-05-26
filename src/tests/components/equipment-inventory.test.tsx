import { render, screen, fireEvent, within } from "../test-utils"
import { EquipmentInventory } from "@/components/equipment-inventory"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Equipment } from "@/lib/character-types"

vi.mock("@/lib/character-storage", () => ({ saveCharacter: vi.fn() }))

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

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
}

describe("EquipmentInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("empty inventory", () => {
    it("renders the Equipment & Inventory heading", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Equipment & Inventory")).toBeInTheDocument()
    })

    it("shows 0 lbs total weight badge", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("0 lbs")).toBeInTheDocument()
    })

    it("renders the Add Item button", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument()
    })

    it("shows the empty state message", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No equipment added yet.")).toBeInTheDocument()
    })

    it("renders the search input", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText("Search equipment...")).toBeInTheDocument()
    })
  })

  describe("with items", () => {
    it("renders the item name", () => {
      render(<EquipmentInventory character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Torch")).toBeInTheDocument()
    })

    it("calculates total weight correctly (weight × quantity)", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ weight: 5, quantity: 2 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("10 lbs")).toBeInTheDocument()
    })

    it("shows 'Currently Equipped' section when items are equipped", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ equipped: true })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Currently Equipped")).toBeInTheDocument()
    })

    it("does not show 'Currently Equipped' section when no items are equipped", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ equipped: false })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Currently Equipped")).not.toBeInTheDocument()
    })

    it("shows 'Equipped' badge on equipped items", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ equipped: true })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getAllByText("Equipped").length).toBeGreaterThanOrEqual(1)
    })

    it("shows item description when present", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ description: "50 feet of rope" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("50 feet of rope")).toBeInTheDocument()
    })

    it("shows item quantity", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ quantity: 3 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
    })

    it("shows weight display when weight > 0", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ weight: 5, quantity: 1 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/Weight:/)).toBeInTheDocument()
    })
  })

  describe("search filter", () => {
    it("filters items by name", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({
            equipment: [
              makeItem({ id: "i1", name: "Rope" }),
              makeItem({ id: "i2", name: "Torch" }),
            ],
          })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.input(screen.getByPlaceholderText("Search equipment..."), {
        target: { value: "rope" },
      })
      expect(screen.getByText("Rope")).toBeInTheDocument()
      expect(screen.queryByText("Torch")).not.toBeInTheDocument()
    })

    it("shows 'No items match your search.' when no results", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ name: "Rope" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.input(screen.getByPlaceholderText("Search equipment..."), {
        target: { value: "xyz" },
      })
      expect(screen.getByText("No items match your search.")).toBeInTheDocument()
    })
  })

  describe("quantity adjustment", () => {
    it("calls onUpdate and saveCharacter with quantity + 1 when + is clicked", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ quantity: 2 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: "+" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ quantity: 3 })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("calls onUpdate and saveCharacter with quantity - 1 when - is clicked (qty > 1)", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ quantity: 3 })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: "-" }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ quantity: 2 })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("the - button is disabled when quantity is 1", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ quantity: 1 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByRole("button", { name: "-" })).toBeDisabled()
    })
  })

  describe("toggle equipped", () => {
    it("calls onUpdate and saveCharacter with toggled equipped state", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ equipped: false })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByTitle("Toggle equipped"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ equipped: true })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("Add Item modal", () => {
    it("opens the Add New Item modal when Add Item is clicked", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      expect(screen.getByText("Add New Item")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when name is empty", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate and saveCharacter with the new item on valid submit", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Shield" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Shield" })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("sets type to 'other' for new items added via modal", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Shield" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ type: "other" })]),
        })
      )
    })
  })

  describe("Edit Item modal", () => {
    it("opens the Edit Item modal when the edit icon button is clicked", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit torch/i }))
      expect(screen.getByText("Edit Item")).toBeInTheDocument()
    })

    it("pre-fills the form with existing item data", () => {
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ name: "Torch", quantity: 5 })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit torch/i }))
      expect(screen.getByLabelText(/item name/i)).toHaveValue("Torch")
    })

    it("calls onUpdate with updated item data on save", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit torch/i }))
      const nameInput = screen.getByLabelText(/item name/i)
      fireEvent.input(nameInput, { target: { value: "Lantern" } })
      fireEvent.click(screen.getByRole("button", { name: /update item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Lantern" })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("Delete item", () => {
    it("calls onUpdate and saveCharacter with item removed when delete is clicked", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventory
          character={makeCharacter({ equipment: [makeItem({ name: "Rope" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /delete rope/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ equipment: [] })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("Coins", () => {
    it("renders CP, SP, EP, GP, PP labels", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("CP")).toBeInTheDocument()
      expect(screen.getByText("SP")).toBeInTheDocument()
      expect(screen.getByText("EP")).toBeInTheDocument()
      expect(screen.getByText("GP")).toBeInTheDocument()
      expect(screen.getByText("PP")).toBeInTheDocument()
    })

    it("shows 0 for all coin denominations by default", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      const spinbuttons = screen.getAllByRole("spinbutton")
      // First 5 spinbuttons are coin fields (CP SP EP GP PP)
      spinbuttons.slice(0, 5).forEach((input) => {
        expect(input).toHaveValue(0)
      })
    })

    it("calls onUpdate with updated GP when GP field changes", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      const spinbuttons = screen.getAllByRole("spinbutton")
      // GP is the 4th coin field (index 3)
      fireEvent.input(spinbuttons[3], { target: { value: "50" } })
      fireEvent.blur(spinbuttons[3])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ coins: expect.objectContaining({ gp: 50 }) })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("Magic Items section", () => {
    it("renders the Magic Items section heading for both editions", () => {
      render(<EquipmentInventory character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Magic Items")).toBeInTheDocument()
    })

    it("renders the Magic Items section in 2014 mode too", () => {
      render(<EquipmentInventory character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Magic Items")).toBeInTheDocument()
    })

    it("renders 'Add Magic Item' button", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add magic item/i })).toBeInTheDocument()
    })

    it("renders magic item names", () => {
      render(<EquipmentInventory character={makeCharacter({ magicItems: [{ id: "mi-1", name: "Ring of Protection", description: "", attuned: false }] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Ring of Protection")).toBeInTheDocument()
    })

    it("shows 'Attuned' badge when item is attuned", () => {
      render(<EquipmentInventory character={makeCharacter({ magicItems: [{ id: "mi-1", name: "Staff of Power", description: "", attuned: true }] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Attuned")).toBeInTheDocument()
    })

    it("does not show 'Attuned' badge when item is not attuned", () => {
      render(<EquipmentInventory character={makeCharacter({ magicItems: [{ id: "mi-1", name: "Bag of Holding", description: "", attuned: false }] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Attuned")).not.toBeInTheDocument()
    })

    it("shows attuned count in heading", () => {
      render(<EquipmentInventory character={makeCharacter({ magicItems: [{ id: "mi-1", name: "Staff", description: "", attuned: true }] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("(1/3 attuned)")).toBeInTheDocument()
    })

    it("calls onUpdate and saveCharacter when deleting a magic item", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter({ magicItems: [{ id: "mi-1", name: "Ring", description: "", attuned: false }] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /delete ring/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ magicItems: [] }))
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("opens Add Magic Item modal when button is clicked", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  describe("Equipment form type and weapon/armor stats", () => {
    it("saves type correctly when adding an item", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      fireEvent.input(screen.getByPlaceholderText("Enter item name"), { target: { value: "Torch" } })
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ equipment: expect.arrayContaining([expect.objectContaining({ name: "Torch", type: "other" })]) })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })
})

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

  describe("Add Item dialog", () => {
    it("opens the Add New Item dialog when Add Item is clicked", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      expect(screen.getByText("Add New Item")).toBeInTheDocument()
    })

    it("closes the dialog when Cancel is clicked", () => {
      render(<EquipmentInventory character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const dialog = screen.getByRole("dialog")
      fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when name is empty", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const dialog = screen.getByRole("dialog")
      fireEvent.click(within(dialog).getByRole("button", { name: /add item/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate and saveCharacter with the new item on valid submit", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const dialog = screen.getByRole("dialog")
      fireEvent.input(within(dialog).getByLabelText(/item name/i), { target: { value: "Shield" } })
      fireEvent.click(within(dialog).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Shield" })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("sets type to 'other' for new items added via dialog", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventory character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const dialog = screen.getByRole("dialog")
      fireEvent.input(within(dialog).getByLabelText(/item name/i), { target: { value: "Shield" } })
      fireEvent.click(within(dialog).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ type: "other" })]),
        })
      )
    })
  })

  describe("Edit Item dialog", () => {
    it("opens the Edit Item dialog when the edit icon button is clicked", () => {
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
})

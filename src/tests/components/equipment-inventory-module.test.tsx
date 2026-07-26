import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"
import { render, screen, fireEvent, within, waitFor, cleanupPortals } from "../test-utils"
import { EquipmentInventoryModule } from "@/components/equipment-inventory-module"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character, Equipment } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

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

function makeMagicItem(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "magic-1",
    name: "Ring of Protection",
    quantity: 1,
    weight: 0,
    description: "",
    equipped: false,
    type: "other",
    magic: true,
    requiresAttunement: true,
    attuned: false,
    ...overrides,
  }
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createDefaultCharacter(), ...overrides }
}

describe("EquipmentInventoryModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  describe("empty inventory", () => {
    it("renders the Equipment & Inventory heading", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("Equipment & Inventory")).toBeInTheDocument()
    })

    it("shows 0 lbs total weight badge", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("0 lbs")).toBeInTheDocument()
    })

    it("renders the Add Item button", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument()
    })

    it("shows the empty state message", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("No equipment added yet.")).toBeInTheDocument()
    })

    it("renders the search input", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByPlaceholderText("Search equipment...")).toBeInTheDocument()
    })
  })

  describe("with items", () => {
    it("renders the item name", () => {
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Torch")).toBeInTheDocument()
    })

    it("calculates total weight correctly (weight × quantity)", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ weight: 5, quantity: 2 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("10 lbs")).toBeInTheDocument()
    })

    // Regression: 0.1 + 0.2 === 0.30000000000000004 in floating point — the total weight
    // badge must show a rounded value, not the raw accumulated sum.
    it("rounds total weight to one decimal place despite floating-point drift", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({
            equipment: [makeItem({ id: "a", weight: 0.1, quantity: 1 }), makeItem({ id: "b", weight: 0.2, quantity: 1 })],
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("0.3 lbs")).toBeInTheDocument()
    })

    it("shows 'Currently Equipped' section when items are equipped", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ equipped: true })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("Currently Equipped")).toBeInTheDocument()
    })

    it("does not show 'Currently Equipped' section when no items are equipped", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ equipped: false })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByText("Currently Equipped")).not.toBeInTheDocument()
    })

    it("shows 'Equipped' badge on equipped items", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ equipped: true })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getAllByText("Equipped").length).toBeGreaterThanOrEqual(1)
    })

    it("shows item description when present", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ description: "50 feet of rope" })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText("50 feet of rope")).toBeInTheDocument()
    })

    it("shows item quantity", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ quantity: 3 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(within(screen.getByText("Qty:").parentElement!).getByText("3")).toBeInTheDocument()
    })

    it("shows weight display when weight > 0", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ weight: 5, quantity: 1 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/Weight:/)).toBeInTheDocument()
    })

    // Regression: 0.1 * 3 === 0.30000000000000004 in floating point — displayed weight
    // must be rounded, not the raw product.
    it("rounds a floating-point-prone per-item weight to one decimal place", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ weight: 0.1, quantity: 3 })] })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByText(/Weight: 0\.3 lbs/)).toBeInTheDocument()
    })
  })

  describe("search filter", () => {
    it("filters items by name", () => {
      render(
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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

    // Regression: this checkbox+name pair used to be wrapped in a single native <label>. A real
    // click on the visible (styled) checkbox square triggered both Kobalte's own toggle and the
    // browser's native label→control click forwarding (since the square is a plain <div>, not
    // the labelable element itself), and the two toggles canceled out — the checkbox looked
    // unresponsive to real clicks even though synthetic fireEvent.click on the input worked fine.
    // Fixed by giving the checkbox its own aria-label and a separate onClick on the name text,
    // instead of relying on native <label> wrapping. This test locks in that clicking the name
    // still toggles equipped, now via that explicit handler.
    it("also toggles equipped when the item name is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ name: "Torch", equipped: false })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByText("Torch"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ equipped: true })]),
        })
      )
    })
  })

  describe("Add Item modal", () => {
    it("opens the Add New Item modal when Add Item is clicked", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      expect(screen.getByText("Add New Item")).toBeInTheDocument()
    })

    it("closes the modal when Cancel is clicked", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /cancel/i }))
      expect(screen.getByRole("dialog")).toHaveAttribute("data-closed")
    })

    it("does not call onUpdate when name is empty", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it("calls onUpdate and saveCharacter with the new item on valid submit", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
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
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })}
          onUpdate={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit torch/i }))
      expect(screen.getByText("Edit Item")).toBeInTheDocument()
    })

    it("pre-fills the form with existing item data", () => {
      render(
        <EquipmentInventoryModule
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
        <EquipmentInventoryModule
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

    // Regression: the "This is a Magic Item" checkbox's <label for> was pointed at a
    // non-labelable wrapper element, so clicking the label text (the natural way a user
    // toggles a labelled checkbox) never checked the box — the Magic Item Details section,
    // including all Tier 2 grant fields, could never be reached when editing an existing item.
    it("reveals Magic Item Details and promotes the item when its label is clicked", () => {
      const onUpdate = vi.fn()
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeItem({ name: "Torch" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getByRole("button", { name: /edit torch/i }))
      expect(screen.queryByText("Magic Item Details")).not.toBeInTheDocument()

      fireEvent.click(screen.getByText("This is a Magic Item"))
      expect(screen.getByText("Magic Item Details")).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: /update item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Torch", magic: true })]),
        })
      )
    })
  })

  describe("Delete item", () => {
    it("calls onUpdate and saveCharacter with item removed when delete is clicked", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventoryModule
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
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByText("CP")).toBeInTheDocument()
      expect(screen.getByText("SP")).toBeInTheDocument()
      expect(screen.getByText("EP")).toBeInTheDocument()
      expect(screen.getByText("GP")).toBeInTheDocument()
      expect(screen.getByText("PP")).toBeInTheDocument()
    })

    it("shows 0 for all coin denominations by default", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      const spinbuttons = screen.getAllByRole("spinbutton")
      // First 5 spinbuttons are coin fields (CP SP EP GP PP)
      spinbuttons.slice(0, 5).forEach((input) => {
        expect(input).toHaveValue(0)
      })
    })

    it("calls onUpdate with updated GP when GP field changes", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
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
      render(<EquipmentInventoryModule character={makeCharacter({ edition: "2024" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Magic Items")).toBeInTheDocument()
    })

    it("renders the Magic Items section in 2014 mode too", () => {
      render(<EquipmentInventoryModule character={makeCharacter({ edition: "2014" })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Magic Items")).toBeInTheDocument()
    })

    it("renders 'Add Magic Item' button", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /add magic item/i })).toBeInTheDocument()
    })

    it("renders magic item names", () => {
      const { container } = render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring of Protection" })] })} onUpdate={vi.fn()} />)
      const section = container.querySelector('[data-sem="magic-items-section"]')!
      expect(within(section as HTMLElement).getByText("Ring of Protection")).toBeInTheDocument()
    })

    it("shows 'Attuned' badge when item is attuned", () => {
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Staff of Power", attuned: true })] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Attuned")).toBeInTheDocument()
    })

    it("does not show 'Attuned' badge when item is not attuned", () => {
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Bag of Holding", attuned: false })] })} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Attuned")).not.toBeInTheDocument()
    })

    it("shows attuned count vs the (calculated) attunement limit in the heading", () => {
      const { container } = render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Staff", attuned: true })] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("1/")).toBeInTheDocument()
      expect(screen.getByText("attuned")).toBeInTheDocument()
      const magicItemsSection = container.querySelector('[data-sem="magic-items-section"]')
      expect(magicItemsSection?.querySelector('[data-sem="calculated-value"]')).toHaveTextContent("3")
    })

    it("does not show an over-limit warning when at or below the attunement limit", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({
            equipment: [makeMagicItem({ id: "1", attuned: true }), makeMagicItem({ id: "2", attuned: true }), makeMagicItem({ id: "3", attuned: true })],
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.queryByLabelText(/over attunement limit/i)).not.toBeInTheDocument()
    })

    it("shows an over-limit warning when attuned count exceeds the attunement limit", () => {
      render(
        <EquipmentInventoryModule
          character={makeCharacter({
            equipment: [
              makeMagicItem({ id: "1", attuned: true }),
              makeMagicItem({ id: "2", attuned: true }),
              makeMagicItem({ id: "3", attuned: true }),
              makeMagicItem({ id: "4", attuned: true }),
            ],
          })}
          onUpdate={vi.fn()}
        />
      )
      expect(screen.getByLabelText(/over attunement limit/i)).toBeInTheDocument()
    })

    it("calls onUpdate and saveCharacter when deleting a magic item", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring" })] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /delete ring/i })[0])
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ equipment: [] }))
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("opens Add Magic Item modal when button is clicked", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("prefills the magic checkbox when opened via Add Magic Item", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Wand of Magic Missiles" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Wand of Magic Missiles", magic: true })]),
        })
      )
    })

    it("toggles attunement from the Magic Items list", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring", attuned: false })] })} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByTitle("Toggle attuned"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ attuned: true })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    // Magic items also appear in the general equipment list below, which already has its own
    // "Toggle equipped" checkbox — this covers the same toggle now offered directly in the
    // Magic Items list itself, so items don't need to be found twice to be equipped.
    it("allows equipping a magic item directly from the Magic Items list", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      const { container } = render(
        <EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring", equipped: false })] })} onUpdate={onUpdate} />
      )
      const section = container.querySelector('[data-sem="magic-items-section"]') as HTMLElement
      fireEvent.click(within(section).getByTitle("Toggle equipped"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ equipped: true })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })

    it("also toggles equipped when a magic item's name is clicked in the Magic Items list", () => {
      const onUpdate = vi.fn()
      const { container } = render(
        <EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring", equipped: false })] })} onUpdate={onUpdate} />
      )
      const section = container.querySelector('[data-sem="magic-items-section"]') as HTMLElement
      fireEvent.click(within(section).getByText("Ring"))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ equipped: true })]),
        })
      )
    })

    it("shows an 'Equipped' badge on an equipped magic item in the Magic Items list", () => {
      const { container } = render(
        <EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Cloak", equipped: true })] })} onUpdate={vi.fn()} />
      )
      const section = container.querySelector('[data-sem="magic-items-section"]') as HTMLElement
      expect(within(section).getByText("Equipped")).toBeInTheDocument()
    })

    it("does not render an equip checkbox for magic items in readOnly mode", () => {
      const { container } = render(
        <ReadOnlyProvider value={true}>
          <EquipmentInventoryModule character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring" })] })} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
      const section = container.querySelector('[data-sem="magic-items-section"]') as HTMLElement
      expect(within(section).queryByTitle("Toggle equipped")).not.toBeInTheDocument()
      expect(within(section).getByText("Ring")).toBeInTheDocument()
    })

    // Regression: the "Toggle attuned" checkbox previously relied solely on `title` for its
    // accessible name, which axe flags as a "label-title-only" violation (titles aren't a
    // reliable name source for all assistive tech). The default axe test elsewhere in this
    // file renders no magic items, so it never exercised this checkbox.
    it("has no accessibility violations with an attunement-requiring magic item present", async () => {
      const { container } = render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeMagicItem({ name: "Ring", requiresAttunement: true, attuned: false })] })}
          onUpdate={vi.fn()}
        />
      )
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("shows charge pips and spends a charge when clicked", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(
        <EquipmentInventoryModule
          character={makeCharacter({ equipment: [makeMagicItem({ name: "Wand", uses: 0, maxUses: 3, rechargeOn: "long-rest" })] })}
          onUpdate={onUpdate}
        />
      )
      fireEvent.click(screen.getAllByTitle("Charge available (click to use)")[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ uses: 1 })]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("Item modifier bonuses", () => {
    function setNumericValue(input: HTMLElement, value: string) {
      fireEvent.input(input, { target: { value } })
      fireEvent.blur(input)
    }

    it("shows the Bonuses section when adding a magic item", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      const modal = screen.getByRole("dialog")
      expect(within(modal).getByText(/bonuses \(optional\)/i)).toBeInTheDocument()
    })

    it("submits nonzero AC, saving throw, and ability score bonuses as Equipment.modifiers", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Ring of Protection" } })
      setNumericValue(document.querySelector("#modifier-ac")!, "1")
      fireEvent.click(within(modal).getByText("Saving Throws"))
      setNumericValue(document.querySelector("#modifier-save-wisdom")!, "2")
      fireEvent.click(within(modal).getByText("Ability Scores"))
      setNumericValue(document.querySelector("#modifier-ability-strength")!, "3")
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([
            expect.objectContaining({
              name: "Ring of Protection",
              modifiers: { armorClass: 1, savingThrows: { wisdom: 2 }, abilityScores: { strength: 3 } },
            }),
          ]),
        })
      )
    })

    it("omits modifiers entirely when all bonus fields are left at zero", () => {
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Bag of Holding" } })
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ name: "Bag of Holding", modifiers: undefined })]),
        })
      )
    })

    it("pre-fills bonus inputs when editing an item with existing modifiers", () => {
      const item = makeMagicItem({
        name: "Cloak of Protection",
        modifiers: { armorClass: 1, savingThrows: { wisdom: 2 }, abilityScores: { strength: 3 } },
      })
      render(
        <EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />
      )
      fireEvent.click(screen.getAllByRole("button", { name: /edit cloak of protection/i })[0])
      expect((document.querySelector("#modifier-ac") as HTMLInputElement).value).toBe("1")
      expect((document.querySelector("#modifier-save-wisdom") as HTMLInputElement).value).toBe("2")
      expect((document.querySelector("#modifier-ability-strength") as HTMLInputElement).value).toBe("3")
    })

    it("keeps all modifier groups collapsed by default when adding a new magic item", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      expect(document.querySelector("#modifier-save-wisdom")).not.toBeInTheDocument()
      expect(document.querySelector("#modifier-ability-strength")).not.toBeInTheDocument()
      expect(document.querySelector("#modifier-sense-darkvision")).not.toBeInTheDocument()
    })

    it("only auto-expands modifier groups that already have values when editing", () => {
      const item = makeMagicItem({
        name: "Boots of the Winterlands",
        modifiers: { senses: { darkvision: 60 } },
      })
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /edit boots of the winterlands/i })[0])
      // Senses has a value, so it auto-expands...
      expect((document.querySelector("#modifier-sense-darkvision") as HTMLInputElement).value).toBe("60")
      // ...but unrelated groups with no values stay collapsed.
      expect(document.querySelector("#modifier-save-wisdom")).not.toBeInTheDocument()
      expect(document.querySelector("#modifier-fly-speed")).not.toBeInTheDocument()
    })

    it("shows an active bonus summary in the Magic Items list", () => {
      const item = makeMagicItem({ name: "Ring of Protection", equipped: true, attuned: true, modifiers: { armorClass: 1 } })
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("AC +1")).toBeInTheDocument()
      expect(screen.queryByText("(inactive)")).not.toBeInTheDocument()
    })

    it("marks the bonus summary inactive when the item requires attunement and is not attuned", () => {
      const item = makeMagicItem({ name: "Ring of Protection", equipped: true, requiresAttunement: true, attuned: false, modifiers: { armorClass: 1 } })
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("AC +1")).toBeInTheDocument()
      expect(screen.getByText("(inactive)")).toBeInTheDocument()
    })
  })

  describe("Item modifier bonuses — Tier 2 fields", () => {
    function setNumericValue(input: HTMLElement, value: string) {
      fireEvent.input(input, { target: { value } })
      fireEvent.blur(input)
    }

    it("submits senses, movement, carrying capacity, ability floors, and granted languages/proficiencies", async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add magic item/i }))
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Winged Boots" } })

      fireEvent.click(within(modal).getByText("Senses"))
      setNumericValue(document.querySelector("#modifier-sense-darkvision")!, "60")

      fireEvent.click(within(modal).getByText("Movement & Weight"))
      setNumericValue(document.querySelector("#modifier-fly-speed")!, "30")
      setNumericValue(document.querySelector("#modifier-capacity-bonus")!, "20")

      fireEvent.click(within(modal).getByText("Ability Scores"))
      setNumericValue(document.querySelector("#modifier-floor-strength")!, "19")

      // Damage resistance picker (fixed-vocabulary dropdown)
      fireEvent.click(within(modal).getByText("Resistances & Immunities"))
      await user.click(within(modal).getByTitle("Add Damage Resistances"))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Fire" })).toBeInTheDocument())
      await user.click(screen.getByRole("menuitem", { name: "Fire" }))

      // Languages granted (free-text add)
      fireEvent.click(within(modal).getByText("Languages & Proficiencies"))
      fireEvent.input(within(modal).getByPlaceholderText("Add language"), { target: { value: "Auran" } })
      fireEvent.click(within(modal).getByRole("button", { name: "Languages Granted" }))

      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([
            expect.objectContaining({
              name: "Winged Boots",
              modifiers: expect.objectContaining({
                senses: { darkvision: 60 },
                flySpeed: 30,
                carryingCapacityBonus: 20,
                abilityScoreFloors: { strength: 19 },
                resistances: ["Fire"],
                languages: ["Auran"],
              }),
            }),
          ]),
        })
      )
    })

    it("shows Tier 2 tags in the Magic Items list summary", () => {
      const item = makeMagicItem({
        name: "Winged Boots",
        equipped: true,
        attuned: true,
        modifiers: { flySpeed: 30, resistances: ["Fire"], senses: { darkvision: 60 } },
      })
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      expect(screen.getByText("Fly 30 ft")).toBeInTheDocument()
      expect(screen.getByText("Resist: Fire")).toBeInTheDocument()
      expect(screen.getByText("Darkvision +60 ft")).toBeInTheDocument()
    })

    it("pre-fills Tier 2 bonus inputs when editing an item with existing modifiers", () => {
      const item = makeMagicItem({
        name: "Boots of Striding",
        modifiers: { speed: 10, abilityScoreFloors: { strength: 19 } },
      })
      render(<EquipmentInventoryModule character={makeCharacter({ equipment: [item] })} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /edit boots of striding/i })[0])
      // Movement & Weight and Ability Scores both have values, so both auto-expand without a click.
      expect((document.querySelector("#modifier-speed") as HTMLInputElement).value).toBe("10")
      expect((document.querySelector("#modifier-floor-strength") as HTMLInputElement).value).toBe("19")
    })
  })

  describe("Carrying Capacity", () => {
    it("shows carrying capacity computed from STR score x 15", () => {
      render(<EquipmentInventoryModule character={makeCharacter({ abilityScores: { ...createDefaultCharacter().abilityScores, strength: 16 } })} onUpdate={vi.fn()} />)
      expect(screen.getByText(/carrying capacity/i)).toBeInTheDocument()
      const value = document.querySelector('[data-sem="calculated-value"]')
      expect(value).toHaveTextContent("240")
    })
  })

  describe("Equipment form type and weapon/armor stats", () => {
    it("saves type correctly when adding an item", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      fireEvent.input(screen.getByPlaceholderText("Enter item name"), { target: { value: "Torch" } })
      fireEvent.click(screen.getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ equipment: expect.arrayContaining([expect.objectContaining({ name: "Torch", type: "other" })]) })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("weapon sub-form", () => {
    it("selecting weapon type reveals weapon stats fields", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      // Item Type select trigger shows current value "other"
      fireEvent.click(within(modal).getByRole("button", { name: "other" }))
      fireEvent.click(screen.getByRole("option", { name: "Weapon" }))
      expect(within(modal).getByText("Weapon Stats")).toBeInTheDocument()
      expect(within(modal).getByLabelText(/damage dice/i)).toBeInTheDocument()
      expect(within(modal).getByLabelText(/range/i)).toBeInTheDocument()
      // Kobalte Checkbox renders a <div role="checkbox"> root — use getByText for the label
      expect(within(modal).getByText(/proficient with this weapon/i)).toBeInTheDocument()
    })

    it("saving a weapon item includes weaponStats with type weapon in onUpdate", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Longsword" } })
      fireEvent.click(within(modal).getByRole("button", { name: "other" }))
      fireEvent.click(screen.getByRole("option", { name: "Weapon" }))
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([
            expect.objectContaining({
              name: "Longsword",
              type: "weapon",
              weaponStats: expect.objectContaining({ attackAbility: "str" }),
            }),
          ]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("armor sub-form", () => {
    it("selecting armor type reveals armor stats fields", () => {
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.click(within(modal).getByRole("button", { name: "other" }))
      fireEvent.click(screen.getByRole("option", { name: "Armor" }))
      expect(within(modal).getByText("Armor Stats")).toBeInTheDocument()
      expect(within(modal).getByLabelText(/base ac/i)).toBeInTheDocument()
    })

    it("saving an armor item includes armorStats with type armor in onUpdate", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getAllByRole("button", { name: /add item/i })[0])
      const modal = screen.getByRole("dialog")
      fireEvent.input(within(modal).getByLabelText(/item name/i), { target: { value: "Chain Mail" } })
      fireEvent.click(within(modal).getByRole("button", { name: "other" }))
      fireEvent.click(screen.getByRole("option", { name: "Armor" }))
      fireEvent.click(within(modal).getByRole("button", { name: /add item/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([
            expect.objectContaining({
              name: "Chain Mail",
              type: "armor",
              armorStats: expect.objectContaining({ armorType: "light" }),
            }),
          ]),
        })
      )
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  describe("attunement limit", () => {
    const makeAttuned = (id: string) => makeMagicItem({ id, name: `Item ${id}`, attuned: true })

    it("allows attuning beyond the limit rather than blocking it", () => {
      const onUpdate = vi.fn()
      render(
        <EquipmentInventoryModule
          character={makeCharacter({
            equipment: [makeAttuned("1"), makeAttuned("2"), makeAttuned("3"), makeMagicItem({ id: "4", name: "Item 4", attuned: false })],
          })}
          onUpdate={onUpdate}
        />
      )
      const toggles = screen.getAllByTitle("Toggle attuned")
      fireEvent.click(toggles[toggles.length - 1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining([expect.objectContaining({ id: "4", attuned: true })]),
        })
      )
    })

    it("allows overriding the attunement limit via the calculated-value pencil toggle", async () => {
      const { saveCharacter } = await import("@/lib/character-storage")
      const onUpdate = vi.fn()
      render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /use custom attunement limit/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ useCalculatedAttunementLimit: false }))
      expect(saveCharacter).toHaveBeenCalled()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<EquipmentInventoryModule character={makeCharacter()} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    const item = makeItem({ name: "Rope" })

    function renderReadOnly(overrides: Partial<Character> = {}) {
      return render(
        <ReadOnlyProvider value={true}>
          <EquipmentInventoryModule character={makeCharacter(overrides)} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
    }

    it("does not render the Add Item button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add item/i })).not.toBeInTheDocument()
    })

    it("does not render the Add Magic Item button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /add magic item/i })).not.toBeInTheDocument()
    })

    it("does not render per-item edit buttons", () => {
      renderReadOnly({ equipment: [item] })
      expect(screen.queryByRole("button", { name: /edit rope/i })).not.toBeInTheDocument()
    })

    it("does not render per-item delete buttons", () => {
      renderReadOnly({ equipment: [item] })
      expect(screen.queryByRole("button", { name: /delete rope/i })).not.toBeInTheDocument()
    })

    it("does not render quantity ± buttons", () => {
      renderReadOnly({ equipment: [item] })
      expect(screen.queryByRole("button", { name: "+" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "-" })).not.toBeInTheDocument()
    })

    it("still renders the item name", () => {
      renderReadOnly({ equipment: [item] })
      expect(screen.getByText("Rope")).toBeInTheDocument()
    })

    it("renders coin values as static text rather than inputs", () => {
      renderReadOnly({ coins: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 } })
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0)
    })
  })
})

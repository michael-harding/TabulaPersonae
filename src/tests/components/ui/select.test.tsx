import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../../test-utils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

function renderSelect(props: { disabled?: boolean; onValueChange?: (v: string) => void } = {}) {
  return render(
    <Select value="Bard" onValueChange={props.onValueChange} disabled={props.disabled}>
      <SelectTrigger aria-label="Class">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Bard">Bard</SelectItem>
        <SelectItem value="Cleric">Cleric</SelectItem>
        <SelectItem value="Druid">Druid</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe("Select", () => {
  it("opens the listbox when the trigger is clicked", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("button", { name: "Class" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("calls onValueChange when an option is clicked", () => {
    const onValueChange = vi.fn()
    renderSelect({ onValueChange })
    fireEvent.click(screen.getByRole("button", { name: "Class" }))
    fireEvent.click(screen.getByRole("option", { name: "Cleric" }))
    expect(onValueChange).toHaveBeenCalledWith("Cleric")
  })

  describe("disabled", () => {
    it("renders the trigger as a disabled button", () => {
      renderSelect({ disabled: true })
      expect(screen.getByRole("button", { name: "Class" })).toBeDisabled()
    })

    it("does not open the listbox when clicked", () => {
      renderSelect({ disabled: true })
      fireEvent.click(screen.getByRole("button", { name: "Class" }))
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSelect()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("keyboard navigation", () => {
    it("opens the listbox on ArrowDown and highlights the current value", () => {
      renderSelect()
      const trigger = screen.getByRole("button", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" })
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Bard")
    })

    it("ArrowDown moves the highlight to the next item", () => {
      renderSelect()
      const trigger = screen.getByRole("button", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // moves to Cleric
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Cleric")
    })

    it("ArrowUp moves the highlight to the previous item", () => {
      renderSelect()
      const trigger = screen.getByRole("button", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // Cleric
      fireEvent.keyDown(trigger, { key: "ArrowUp" }) // back to Bard
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Bard")
    })

    it("Enter selects the highlighted item and closes the popup", () => {
      const onValueChange = vi.fn()
      renderSelect({ onValueChange })
      const trigger = screen.getByRole("button", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // Cleric
      fireEvent.keyDown(trigger, { key: "Enter" })
      expect(onValueChange).toHaveBeenCalledWith("Cleric")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("Escape closes the popup without changing the value and does not bubble further", () => {
      const onValueChange = vi.fn()
      renderSelect({ onValueChange })
      const trigger = screen.getByRole("button", { name: "Class" })
      // open via click so the only keydown dispatched in this test is the Escape itself
      fireEvent.click(trigger)
      const documentKeyDown = vi.fn()
      document.addEventListener("keydown", documentKeyDown)
      fireEvent.keyDown(trigger, { key: "Escape" })
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(onValueChange).not.toHaveBeenCalled()
      // A surrounding Modal listens for Escape at the document level to close itself — the Select
      // must stop that Escape from bubbling past the popup it was meant to close.
      expect(documentKeyDown).not.toHaveBeenCalled()
      document.removeEventListener("keydown", documentKeyDown)
    })

    it("Tab closes the popup", () => {
      renderSelect()
      const trigger = screen.getByRole("button", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" })
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      fireEvent.keyDown(trigger, { key: "Tab" })
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })
})

import { axe } from "vitest-axe"

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

import { render, screen, fireEvent } from "../../test-utils"

function renderSelect(props: { disabled?: boolean; onValueChange?: (v: string) => void } = {}) {
  return render(() => (
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
  ))
}

describe("Select", () => {
  it("opens the listbox when the trigger is clicked", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("combobox", { name: "Class" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  // A real click is mousedown then click. Mousedown on the trigger used to count as an outside
  // click, closing the list, and the click then reopened it, so a second click never closed it.
  it("closes on a second click of the trigger, and reopens on a third", () => {
    renderSelect()
    const trigger = screen.getByRole("combobox", { name: "Class" })
    const realClick = () => { fireEvent.mouseDown(trigger); fireEvent.click(trigger) }
    realClick()
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    realClick()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    realClick()
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  // Production builds strip `data-sem` (CONSTITUTION.md §6.9), so the trigger must be recognised
  // as inside the select without it. Removing the attributes here reproduces the production DOM.
  it("closes on a second click of the trigger with data-sem stripped, as in production", () => {
    renderSelect()
    document.querySelectorAll("[data-sem]").forEach((el) => el.removeAttribute("data-sem"))
    const trigger = screen.getByRole("combobox", { name: "Class" })
    const realClick = () => { fireEvent.mouseDown(trigger); fireEvent.click(trigger) }
    realClick()
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    realClick()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("still closes on a mousedown outside the select", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("combobox", { name: "Class" }))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("calls onValueChange when an option is clicked", () => {
    const onValueChange = vi.fn()
    renderSelect({ onValueChange })
    fireEvent.click(screen.getByRole("combobox", { name: "Class" }))
    fireEvent.click(screen.getByRole("option", { name: "Cleric" }))
    expect(onValueChange).toHaveBeenCalledWith("Cleric")
  })

  describe("disabled", () => {
    it("renders the trigger as a disabled button", () => {
      renderSelect({ disabled: true })
      expect(screen.getByRole("combobox", { name: "Class" })).toBeDisabled()
    })

    it("does not open the listbox when clicked", () => {
      renderSelect({ disabled: true })
      fireEvent.click(screen.getByRole("combobox", { name: "Class" }))
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
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" })
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Bard")
    })

    it("ArrowDown moves the highlight to the next item", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // moves to Cleric
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Cleric")
    })

    it("ArrowUp moves the highlight to the previous item", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // Cleric
      fireEvent.keyDown(trigger, { key: "ArrowUp" }) // back to Bard
      expect(trigger).toHaveAttribute("aria-activedescendant", "select-option-Bard")
    })

    it("Enter selects the highlighted item and closes the popup", () => {
      const onValueChange = vi.fn()
      renderSelect({ onValueChange })
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // Cleric
      fireEvent.keyDown(trigger, { key: "Enter" })
      expect(onValueChange).toHaveBeenCalledWith("Cleric")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("Escape closes the popup without changing the value and does not bubble further", () => {
      const onValueChange = vi.fn()
      renderSelect({ onValueChange })
      const trigger = screen.getByRole("combobox", { name: "Class" })
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
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" })
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      fireEvent.keyDown(trigger, { key: "Tab" })
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  // Regression: the trigger was a plain button carrying aria-activedescendant, which that role
  // does not allow, and the list had no accessible name. Only the closed state was checked.
  describe("as a select-only combobox", () => {
    it("has no accessibility violations while open with an option highlighted", async () => {
      const { container } = renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.click(trigger)
      fireEvent.keyDown(trigger, { key: "ArrowDown" })

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("points at its list and its highlighted option only while open", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      expect(trigger).not.toHaveAttribute("aria-controls")
      expect(trigger).not.toHaveAttribute("aria-activedescendant")

      fireEvent.click(trigger)

      expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(trigger).toHaveAttribute("aria-controls", screen.getByRole("listbox").id)
      expect(trigger).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Bard" }).id)
    })

    it("names the list after an aria-label on the trigger", () => {
      renderSelect()
      fireEvent.click(screen.getByRole("combobox", { name: "Class" }))

      expect(screen.getByRole("listbox", { name: "Class" })).toBeInTheDocument()
    })

    it("is named by a <label for>, and names its list through the trigger, when there is no aria-label", async () => {
      const { container } = render(() => (
        <>
          <label for="alignment">Alignment</label>
          <Select value="Neutral">
            <SelectTrigger id="alignment"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Neutral">Neutral</SelectItem>
              <SelectItem value="Chaotic Good">Chaotic Good</SelectItem>
            </SelectContent>
          </Select>
        </>
      ))
      const trigger = screen.getByRole("combobox", { name: "Alignment" })

      fireEvent.click(trigger)

      expect(screen.getByRole("listbox")).toHaveAttribute("aria-labelledby", "alignment")
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("is not named by the value it shows", () => {
      render(() => (
        <Select value="Neutral">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Neutral">Neutral</SelectItem></SelectContent>
        </Select>
      ))

      expect(screen.getByRole("combobox")).toHaveAccessibleName("")
    })
  })
})

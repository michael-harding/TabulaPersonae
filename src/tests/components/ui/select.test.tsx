import { axe } from "vitest-axe"
import Sparkle from "lucide-solid/icons/sparkle"

import { Select, SelectTrigger, SelectValue, SelectContent, type SelectOption } from "@/components/ui/select"

import { render, screen, fireEvent } from "../../test-utils"

const CLASSES: SelectOption[] = [
  { value: "Bard", label: "Bard" },
  { value: "Cleric", label: "Cleric" },
  { value: "Druid", label: "Druid" },
]

function renderSelect(props: { disabled?: boolean; onValueChange?: (v: string) => void } = {}) {
  return render(() => (
    <Select options={CLASSES} value="Bard" onValueChange={props.onValueChange} disabled={props.disabled}>
      <SelectTrigger aria-label="Class">
        <SelectValue />
      </SelectTrigger>
      <SelectContent />
    </Select>
  ))
}

describe("Select", () => {
  // ACCESSIBILITY.md §13: each option is a 44px-tall touch target
  it("makes every option at least 44px tall", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("combobox"))
    for (const option of screen.getAllByRole("option")) expect(option).toHaveClass("min-h-11")
  })

  it("renders one option per entry in options, in order", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("combobox"))
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Bard", "Cleric", "Druid"])
  })

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

  describe("the value shown in the trigger", () => {
    const MODES: SelectOption[] = [
      { value: "", label: "None" },
      { value: "per-level", label: "Fixed value per level" },
      { value: "rolled", label: "Rolled" },
    ]
    const renderWithValue = (value: string | undefined, options = MODES) => render(() => (
      <Select options={options} value={value} placeholder="Pick one">
        <SelectTrigger aria-label="Mode"><SelectValue /></SelectTrigger>
        <SelectContent />
      </Select>
    ))

    // Regression: the trigger printed the raw value ("per-level"), not the option's label
    it("shows the selected option's label, not its value", () => {
      renderWithValue("per-level")
      expect(screen.getByRole("combobox")).toHaveTextContent("Fixed value per level")
      expect(screen.getByRole("combobox")).not.toHaveTextContent("per-level")
    })

    it("shows the label of a \"\" option when the value is \"\"", () => {
      renderWithValue("")
      expect(screen.getByRole("combobox")).toHaveTextContent("None")
    })

    it("shows the placeholder for \"\" when no option has that value", () => {
      renderWithValue("", MODES.slice(1))
      expect(screen.getByRole("combobox")).toHaveTextContent("Pick one")
    })

    it("shows the placeholder when there is no value", () => {
      renderWithValue(undefined)
      expect(screen.getByRole("combobox")).toHaveTextContent("Pick one")
    })

    it("prefers a placeholder given to SelectValue over the root's", () => {
      render(() => (
        <Select options={MODES.slice(1)} placeholder="Root">
          <SelectTrigger aria-label="Mode"><SelectValue placeholder="Own" /></SelectTrigger>
          <SelectContent />
        </Select>
      ))
      expect(screen.getByRole("combobox")).toHaveTextContent("Own")
    })

    // A stored value the options don't list (e.g. imported data) stays visible rather than being
    // hidden behind the placeholder.
    it("shows an unlisted non-empty value as-is", () => {
      renderWithValue("homebrew")
      expect(screen.getByRole("combobox")).toHaveTextContent("homebrew")
    })

    it("follows the value when it changes", () => {
      const onValueChange = vi.fn()
      render(() => (
        <Select options={MODES} defaultValue="per-level" onValueChange={onValueChange}>
          <SelectTrigger aria-label="Mode"><SelectValue /></SelectTrigger>
          <SelectContent />
        </Select>
      ))
      fireEvent.click(screen.getByRole("combobox"))
      fireEvent.click(screen.getByRole("option", { name: "Rolled" }))
      expect(screen.getByRole("combobox")).toHaveTextContent("Rolled")
    })
  })

  describe("option presentation", () => {
    const LEVELS: SelectOption[] = [
      { value: "1", label: "1st", icon: Sparkle },
      { value: "2", label: "2nd", muted: true, srHint: "no slots" },
    ]
    const renderLevels = (value: string) => render(() => (
      <Select options={LEVELS} value={value}>
        <SelectTrigger aria-label="Level"><SelectValue /></SelectTrigger>
        <SelectContent />
      </Select>
    ))

    it("renders an option's icon, hidden from assistive technology, in its list item", () => {
      renderLevels("2")
      fireEvent.click(screen.getByRole("combobox"))
      // "2" is selected, so "1st" has no check mark and its only icon is its own
      const icons = screen.getByRole("option", { name: "1st" }).querySelectorAll("svg")
      expect(icons).toHaveLength(1)
      expect(icons[0]).toHaveAttribute("aria-hidden", "true")
    })

    // ACCESSIBILITY.md §5: decorative icons are hidden
    it("hides the selected option's check mark and the chevron from assistive technology", () => {
      renderLevels("2")
      const trigger = screen.getByRole("combobox")
      fireEvent.click(trigger)
      for (const svg of [...trigger.querySelectorAll("svg"), ...screen.getByRole("option", { name: "2nd no slots" }).querySelectorAll("svg")]) {
        expect(svg).toHaveAttribute("aria-hidden", "true")
      }
    })

    it("mutes a muted option and appends its screen-reader hint", () => {
      renderLevels("1")
      fireEvent.click(screen.getByRole("combobox"))
      const option = screen.getByRole("option", { name: "2nd no slots" })
      expect(option).toHaveClass("text-muted-foreground")
      expect(option.querySelector("svg")).not.toBeInTheDocument()
    })

    it("leaves an unmuted option unmuted", () => {
      renderLevels("1")
      fireEvent.click(screen.getByRole("combobox"))
      expect(screen.getByRole("option", { name: "1st" })).not.toHaveClass("text-muted-foreground")
    })

    it("shows the selected option's icon in the trigger", () => {
      renderLevels("1")
      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveTextContent("1st")
      // One for the option, one for the chevron
      expect(trigger.querySelectorAll("svg")).toHaveLength(2)
    })

    it("mutes the trigger's value and keeps the hint when the selected option is muted", () => {
      renderLevels("2")
      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveTextContent("2nd")
      // The trigger's first child is SelectValue's span
      expect(trigger.firstElementChild).toHaveClass("text-muted-foreground")
      expect(screen.getByText("no slots")).toHaveClass("sr-only")
    })

    it("has no accessibility violations while open with icons and hints", async () => {
      const { container } = renderLevels("2")
      fireEvent.click(screen.getByRole("combobox"))
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  // The list must stay where it can be seen. jsdom has no layout, so the viewport's size and the
  // boxes of the list, the trigger and any scrolling container are stubbed.
  describe("staying where it can be seen", () => {
    const VIEWPORT = { width: 390, height: 800 }
    // The trigger sits at the given height; the list, opened below it, is 200px tall and runs
    // `listRight` px from the viewport's left edge
    let triggerTop = 100
    let listRight = 200
    const LIST_HEIGHT = 200
    beforeEach(() => {
      triggerTop = 100
      listRight = 200
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(VIEWPORT.width)
      vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(VIEWPORT.height)
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        if (this.getAttribute("role") === "combobox") return { top: triggerTop, bottom: triggerTop + 44, right: 100 } as DOMRect
        if (this.getAttribute("role") === "listbox") return { top: triggerTop + 48, bottom: triggerTop + 48 + LIST_HEIGHT, right: listRight } as DOMRect
        if (this.getAttribute("data-scroller") != null) return { top: 0, bottom: 300, right: VIEWPORT.width } as DOMRect
        return { top: 0, bottom: 0, right: 0 } as DOMRect
      })
    })
    afterEach(() => vi.restoreAllMocks())

    const open = () => fireEvent.click(screen.getByRole("combobox"))
    const opensAbove = () => screen.getByRole("listbox").classList.contains("bottom-full")
    const alignsEnd = () => screen.getByRole("listbox").classList.contains("right-0")

    it("opens below the trigger, aligned with its left edge, when it fits there", () => {
      renderSelect()
      open()
      expect(opensAbove()).toBe(false)
      expect(alignsEnd()).toBe(false)
    })

    it("opens above the trigger when it would run past the bottom and there's more room above", () => {
      triggerTop = VIEWPORT.height - 100
      renderSelect()
      open()
      expect(opensAbove()).toBe(true)
    })

    it("stays below when there's even less room above", () => {
      // 44px trigger in a 230px-tall viewport: 90px above it, 96px below
      vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(230)
      triggerTop = 90
      renderSelect()
      open()
      expect(opensAbove()).toBe(false)
    })

    it("aligns with the trigger's right edge when it would run past the viewport's", () => {
      listRight = VIEWPORT.width + 1
      renderSelect()
      open()
      expect(alignsEnd()).toBe(true)
    })

    it("keeps inside a scrolling container it sits in, such as a dialog", () => {
      // The page has room below; the container, ending at 300px, does not
      triggerTop = 200
      render(() => (
        <div data-scroller style={{ "overflow-y": "auto" }}>
          <Select options={CLASSES} value="Bard">
            <SelectTrigger aria-label="Class"><SelectValue /></SelectTrigger>
            <SelectContent />
          </Select>
        </div>
      ))
      open()
      expect(opensAbove()).toBe(true)
    })

    it("places itself afresh on every open", () => {
      triggerTop = VIEWPORT.height - 100
      listRight = VIEWPORT.width + 1
      renderSelect()
      const trigger = screen.getByRole("combobox")
      fireEvent.click(trigger)
      fireEvent.click(trigger)
      triggerTop = 100
      listRight = 200
      fireEvent.click(trigger)
      expect(opensAbove()).toBe(false)
      expect(alignsEnd()).toBe(false)
    })
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
      expect(trigger).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Bard" }).id)
    })

    it("ArrowDown moves the highlight to the next item", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // moves to Cleric
      expect(trigger).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Cleric" }).id)
    })

    it("ArrowDown stops at the last item", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      for (let i = 0; i < 5; i++) fireEvent.keyDown(trigger, { key: "ArrowDown" })
      expect(trigger).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Druid" }).id)
    })

    it("ArrowUp moves the highlight to the previous item", () => {
      renderSelect()
      const trigger = screen.getByRole("combobox", { name: "Class" })
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // opens, highlights Bard
      fireEvent.keyDown(trigger, { key: "ArrowDown" }) // Cleric
      fireEvent.keyDown(trigger, { key: "ArrowUp" }) // back to Bard
      expect(trigger).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Bard" }).id)
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

    // Every card on the Combat tab can hold its own select with the same option values, so option
    // ids must not collide between selects.
    it("gives options ids unique to their select", () => {
      render(() => (
        <>
          <Select options={CLASSES} value="Bard">
            <SelectTrigger aria-label="First"><SelectValue /></SelectTrigger>
            <SelectContent />
          </Select>
          <Select options={CLASSES} value="Bard">
            <SelectTrigger aria-label="Second"><SelectValue /></SelectTrigger>
            <SelectContent />
          </Select>
        </>
      ))
      const first = screen.getByRole("combobox", { name: "First" })
      fireEvent.click(first)
      const firstId = first.getAttribute("aria-activedescendant")
      fireEvent.mouseDown(document.body)
      const second = screen.getByRole("combobox", { name: "Second" })
      fireEvent.click(second)
      expect(second.getAttribute("aria-activedescendant")).not.toBe(firstId)
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
          <Select options={[{ value: "Neutral", label: "Neutral" }, { value: "Chaotic Good", label: "Chaotic Good" }]} value="Neutral">
            <SelectTrigger id="alignment"><SelectValue /></SelectTrigger>
            <SelectContent />
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
        <Select options={[{ value: "Neutral", label: "Neutral" }]} value="Neutral">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent />
        </Select>
      ))

      expect(screen.getByRole("combobox")).toHaveAccessibleName("")
    })
  })
})

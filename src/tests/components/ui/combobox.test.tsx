import { axe } from "vitest-axe"
import { createSignal } from "solid-js"

import { Combobox } from "@/components/ui/combobox"

import { render, screen, fireEvent } from "../../test-utils"

const OPTIONS = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter"]

describe("Combobox", () => {
  it("puts its id on the input so a <label for> names it", () => {
    render(
      <>
        <label for="class">Class</label>
        <Combobox id="class" options={OPTIONS} />
      </>
    )
    expect(screen.getByRole("combobox", { name: "Class" })).toBeInTheDocument()
  })

  describe("second click closes the list", () => {
    // A real click on the input: mousedown, focus (only if not already focused), click.
    const realClick = (el: HTMLElement) => {
      fireEvent.mouseDown(el)
      if (document.activeElement !== el) el.focus()
      fireEvent.click(el)
    }

    it("on the input: opens, closes, reopens", () => {
      render(<Combobox options={OPTIONS} aria-label="Class" />)
      const input = screen.getByRole("combobox")
      realClick(input)
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      realClick(input)
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      realClick(input)
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    it("on the chevron: the first click opens it (it used to open and immediately re-close), the second closes it", () => {
      render(<Combobox options={OPTIONS} aria-label="Class" />)
      const chevron = screen.getByRole("button", { name: "Toggle options" })
      fireEvent.mouseDown(chevron)
      fireEvent.click(chevron)
      expect(screen.getByRole("listbox")).toBeInTheDocument()
      expect(screen.getByRole("combobox")).toHaveFocus()
      fireEvent.mouseDown(chevron)
      fireEvent.click(chevron)
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("renders an input with the current value", () => {
    render(<Combobox value="Bard" options={OPTIONS} />)
    expect(screen.getByRole("combobox")).toHaveValue("Bard")
  })

  it("shows a new value as soon as the value prop changes, without needing focus", () => {
    const [value, setValue] = createSignal("Bard")
    render(<Combobox value={value()} options={OPTIONS} aria-label="Class" />)
    setValue("Cleric")
    expect(screen.getByRole("combobox")).toHaveValue("Cleric")
  })

  it("clears the input when the value prop is cleared", () => {
    const [value, setValue] = createSignal<string | undefined>("Bard")
    render(<Combobox value={value()} options={OPTIONS} aria-label="Class" />)
    setValue(undefined)
    expect(screen.getByRole("combobox")).toHaveValue("")
  })

  it("renders placeholder when no value is set", () => {
    render(<Combobox options={OPTIONS} placeholder="Select class" />)
    expect(screen.getByPlaceholderText("Select class")).toBeInTheDocument()
  })

  it("shows filtered options when input is focused", () => {
    render(<Combobox options={OPTIONS} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(screen.getByText("Barbarian")).toBeInTheDocument()
  })

  it("filters options as user types", () => {
    render(<Combobox options={OPTIONS} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: "bar" } })
    expect(screen.getByText("Barbarian")).toBeInTheDocument()
    expect(screen.queryByText("Cleric")).not.toBeInTheDocument()
  })

  it("calls onValueChange with selected option when clicked", () => {
    const onValueChange = vi.fn()
    render(<Combobox options={OPTIONS} onValueChange={onValueChange} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.click(screen.getByText("Druid"))
    expect(onValueChange).toHaveBeenCalledWith("Druid")
  })

  it("calls onValueChange with custom text on blur", () => {
    const onValueChange = vi.fn()
    render(<Combobox options={OPTIONS} onValueChange={onValueChange} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: "Mystic" } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenCalledWith("Mystic")
  })

  it("does not call onValueChange on blur when value is unchanged", () => {
    const onValueChange = vi.fn()
    render(<Combobox value="Bard" options={OPTIONS} onValueChange={onValueChange} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("closes dropdown after selecting an option", () => {
    render(<Combobox options={OPTIONS} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.click(screen.getByText("Fighter"))
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("shows a checkmark on the currently selected option", () => {
    render(<Combobox value="Cleric" options={OPTIONS} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    const clericOption = screen.getByRole("option", { name: "Cleric" })
    expect(clericOption).toHaveAttribute("aria-selected", "true")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Combobox value="Bard" options={OPTIONS} aria-label="Select class" />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  // Regression: only the closed state was checked, and the open one had two violations — the
  // listbox had no accessible name and the input no aria-controls.
  it("has no accessibility violations with the list open and an option active", async () => {
    const { container } = render(<Combobox value="Bard" options={OPTIONS} aria-label="Select class" />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.mouseEnter(screen.getByRole("option", { name: "Cleric" }))
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("points the input at its list only while the list is shown", () => {
    render(<Combobox options={OPTIONS} aria-label="Class" />)
    const input = screen.getByRole("combobox")
    expect(input).toHaveAttribute("aria-expanded", "false")
    expect(input).not.toHaveAttribute("aria-controls")

    fireEvent.focus(input)
    expect(input).toHaveAttribute("aria-expanded", "true")
    expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox", { name: "Class" }).id)

    // Nothing matches, so there is no list to be expanded or controlled
    fireEvent.input(input, { target: { value: "zzz" } })
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(input).toHaveAttribute("aria-expanded", "false")
    expect(input).not.toHaveAttribute("aria-controls")
  })

  it("closes the list when the pointer goes down outside it, and stays open for one inside", () => {
    render(
      <>
        <Combobox options={OPTIONS} aria-label="Class" />
        <button type="button">Elsewhere</button>
      </>
    )
    fireEvent.focus(screen.getByRole("combobox"))

    fireEvent.mouseDown(screen.getByRole("option", { name: "Bard" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole("button", { name: "Elsewhere" }))
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("does not commit the typed text while focus moves to one of its own options", () => {
    const onValueChange = vi.fn()
    render(<Combobox options={OPTIONS} onValueChange={onValueChange} />)
    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: "Bar" } })

    fireEvent.blur(input, { relatedTarget: screen.getByRole("option", { name: "Barbarian" }) })

    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("disables both the input and the chevron", () => {
    render(<Combobox options={OPTIONS} disabled aria-label="Class" />)
    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Toggle options" })).toBeDisabled()
  })

  describe("keyboard", () => {
    // jsdom does not implement scrollIntoView, which the combobox calls to keep the active option visible
    const scrollIntoView = vi.fn()

    beforeEach(() => {
      scrollIntoView.mockClear()
      Element.prototype.scrollIntoView = scrollIntoView
    })

    afterEach(() => {
      Reflect.deleteProperty(Element.prototype, "scrollIntoView")
    })

    function openCombobox(props: { value?: string; onValueChange?: (value: string) => void } = {}) {
      render(<Combobox options={OPTIONS} aria-label="Class" {...props} />)
      const input = screen.getByRole("combobox")
      fireEvent.focus(input)
      return input
    }

    const press = (input: HTMLElement, key: string, times = 1) => {
      for (let i = 0; i < times; i++) fireEvent.keyDown(input, { key })
    }

    // The option the input currently points at through aria-activedescendant
    const activeOption = (input: HTMLElement) => {
      const id = input.getAttribute("aria-activedescendant")
      return id == null ? null : screen.getAllByRole("option").find((option) => option.id === id)?.textContent
    }

    it("has no active option until an arrow key is pressed", () => {
      const input = openCombobox()
      expect(input).not.toHaveAttribute("aria-activedescendant")
      expect(input).toHaveAttribute("aria-expanded", "true")
    })

    it("ArrowDown moves through the options in order and stops at the last", () => {
      const input = openCombobox()

      press(input, "ArrowDown")
      expect(activeOption(input)).toBe("Barbarian")
      press(input, "ArrowDown")
      expect(activeOption(input)).toBe("Bard")

      press(input, "ArrowDown", OPTIONS.length + 3)
      expect(activeOption(input)).toBe("Fighter")
    })

    it("ArrowUp moves back and stops at the first", () => {
      const input = openCombobox()
      press(input, "ArrowDown", 3)
      expect(activeOption(input)).toBe("Cleric")

      press(input, "ArrowUp")
      expect(activeOption(input)).toBe("Bard")

      press(input, "ArrowUp", OPTIONS.length + 3)
      expect(activeOption(input)).toBe("Barbarian")
    })

    it("scrolls the active option into view", () => {
      const input = openCombobox()
      press(input, "ArrowDown", 2)

      expect(scrollIntoView).toHaveBeenCalledTimes(2)
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(screen.getByRole("option", { name: "Bard" }))
    })

    it.each(["ArrowDown", "ArrowUp"])("%s reopens a closed list on its first option", (key) => {
      const input = openCombobox()
      press(input, "Escape")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()

      press(input, key)

      expect(screen.getByRole("listbox")).toBeInTheDocument()
      expect(activeOption(input)).toBe("Barbarian")
    })

    it("Enter chooses the active option and closes the list", () => {
      const onValueChange = vi.fn()
      const input = openCombobox({ onValueChange })
      press(input, "ArrowDown", 2)

      press(input, "Enter")

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith("Bard")
      expect(input).toHaveValue("Bard")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute("aria-activedescendant")
    })

    it("arrow keys move through the filtered options only", () => {
      const onValueChange = vi.fn()
      const input = openCombobox({ onValueChange })
      fireEvent.input(input, { target: { value: "r" } })
      // Barbarian, Bard, Cleric, Druid, Fighter all contain "r"; "dr" narrows it to Druid
      fireEvent.input(input, { target: { value: "dr" } })

      press(input, "ArrowDown", 3)
      expect(activeOption(input)).toBe("Druid")

      press(input, "Enter")
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith("Druid")
    })

    it("Enter with no active option commits the typed text, trimmed", () => {
      const onValueChange = vi.fn()
      const input = openCombobox({ onValueChange })
      fireEvent.input(input, { target: { value: "  Mystic  " } })

      press(input, "Enter")

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith("Mystic")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("Enter with no active option and unchanged text closes the list without reporting a change", () => {
      const onValueChange = vi.fn()
      const input = openCombobox({ value: "Bard", onValueChange })

      press(input, "Enter")

      expect(onValueChange).not.toHaveBeenCalled()
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it.each(["Escape", "Tab"])("%s closes the list and drops the active option without choosing it", (key) => {
      const onValueChange = vi.fn()
      const input = openCombobox({ onValueChange })
      press(input, "ArrowDown", 2)

      press(input, key)

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute("aria-activedescendant")
      expect(input).toHaveAttribute("aria-expanded", "false")
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it("leaves other keys alone", () => {
      const input = openCombobox()
      press(input, "ArrowDown")

      press(input, "a")

      expect(screen.getByRole("listbox")).toBeInTheDocument()
      expect(activeOption(input)).toBe("Barbarian")
    })
  })
})

import { axe } from "vitest-axe"

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
})

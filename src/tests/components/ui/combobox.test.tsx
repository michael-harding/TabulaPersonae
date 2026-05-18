import { render, screen, fireEvent } from "../../test-utils"
import { Combobox } from "@/components/ui/combobox"

const OPTIONS = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter"]

describe("Combobox", () => {
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
})

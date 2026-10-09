import { axe } from "vitest-axe"

import { FreeTextListEditor } from "@/components/ui/free-text-list-editor"

import { render, screen, fireEvent, confirmClick } from "../../test-utils"

function baseProps(overrides: Partial<Parameters<typeof FreeTextListEditor>[0]> = {}) {
  return {
    label: "Languages",
    ariaLabel: "Add a language",
    placeholder: "e.g. Elvish",
    values: [] as string[],
    onChange: vi.fn(),
    "data-test": "language-input",
    ...overrides,
  }
}

describe("FreeTextListEditor", () => {
  it("renders the label text", () => {
    render(<FreeTextListEditor {...baseProps()} />)
    expect(screen.getByText("Languages")).toBeInTheDocument()
  })

  it("renders the text input with the given aria-label, placeholder, and data-test", () => {
    render(<FreeTextListEditor {...baseProps()} />)
    const input = screen.getByTestId("language-input")
    expect(input).toHaveAttribute("placeholder", "e.g. Elvish")
    expect(screen.getByLabelText("Add a language")).toBe(input)
  })

  it("renders no badges when values is empty", () => {
    render(<FreeTextListEditor {...baseProps({ values: [] })} />)
    expect(screen.queryByRole("button", { name: /Remove/i })).not.toBeInTheDocument()
  })

  it("renders a badge for each existing value", () => {
    render(<FreeTextListEditor {...baseProps({ values: ["Common", "Elvish"] })} />)
    expect(screen.getByText("Common")).toBeInTheDocument()
    expect(screen.getByText("Elvish")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove Common" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove Elvish" })).toBeInTheDocument()
  })

  it("calls onChange with the new value appended when Add is clicked", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: ["Common"], onChange })} />)
    const input = screen.getByTestId("language-input")
    fireEvent.input(input, { target: { value: "Dwarvish" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onChange).toHaveBeenCalledWith(["Common", "Dwarvish"])
  })

  it("trims whitespace from the new value before adding", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: [], onChange })} />)
    const input = screen.getByTestId("language-input")
    fireEvent.input(input, { target: { value: "  Dwarvish  " } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onChange).toHaveBeenCalledWith(["Dwarvish"])
  })

  it("clears the input after adding a value", () => {
    render(<FreeTextListEditor {...baseProps({ values: [] })} />)
    const input = screen.getByTestId("language-input") as HTMLInputElement
    fireEvent.input(input, { target: { value: "Dwarvish" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(input).toHaveValue("")
  })

  it("adds the value when Enter is pressed in the input", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: ["Common"], onChange })} />)
    const input = screen.getByTestId("language-input")
    fireEvent.input(input, { target: { value: "Dwarvish" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(["Common", "Dwarvish"])
  })

  it("does not call onChange when the input is empty", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: [], onChange })} />)
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("does not call onChange when the trimmed input is only whitespace", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: [], onChange })} />)
    const input = screen.getByTestId("language-input")
    fireEvent.input(input, { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("does not add a duplicate value", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: ["Dwarvish"], onChange })} />)
    const input = screen.getByTestId("language-input")
    fireEvent.input(input, { target: { value: "Dwarvish" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("calls onChange with the value removed when its Remove button is clicked", () => {
    const onChange = vi.fn()
    render(<FreeTextListEditor {...baseProps({ values: ["Common", "Elvish"], onChange })} />)
    confirmClick(screen.getByRole("button", { name: "Remove Common" }))
    expect(onChange).toHaveBeenCalledWith(["Elvish"])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<FreeTextListEditor {...baseProps({ values: ["Common", "Elvish"] })} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

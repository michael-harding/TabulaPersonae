import { axe } from "vitest-axe"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { render, screen, fireEvent } from "../../test-utils"

describe("Input", () => {
  it("renders with the given value", () => {
    render(<Input value="Aragorn" aria-label="Character name" onInput={vi.fn()} />)
    expect(screen.getByRole("textbox", { name: "Character name" })).toHaveValue("Aragorn")
  })

  it("forwards data-test, class, and aria-* props to the root element", () => {
    render(<Input data-test="name-input" class="extra-class" aria-label="Name" />)
    const input = screen.getByTestId("name-input")
    expect(input).toHaveClass("extra-class")
    expect(input).toHaveAttribute("aria-label", "Name")
  })

  it("forwards the type attribute", () => {
    render(<Input type="number" aria-label="Score" />)
    expect(screen.getByRole("spinbutton", { name: "Score" })).toBeInTheDocument()
  })

  it("forwards the placeholder attribute", () => {
    render(<Input placeholder="Enter name" aria-label="Name" />)
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument()
  })

  it("fires onInput when the user types", () => {
    const onInput = vi.fn()
    render(<Input aria-label="Name" onInput={onInput} />)
    fireEvent.input(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Gandalf" } })
    expect(onInput).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Gandalf")
  })

  it("is disabled when disabled prop is set", () => {
    render(<Input disabled aria-label="Name" />)
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Label for="a11y-input">Character name</Label>
        <Input id="a11y-input" onInput={vi.fn()} />
      </>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

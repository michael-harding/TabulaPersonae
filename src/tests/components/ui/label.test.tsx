import { axe } from "vitest-axe"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { render, screen, fireEvent } from "../../test-utils"

describe("Label", () => {
  it("renders its children", () => {
    render(<Label>Character name</Label>)
    expect(screen.getByText("Character name")).toBeInTheDocument()
  })

  it("forwards data-test and class props to the root element", () => {
    render(<Label data-test="name-label" class="extra-class">Name</Label>)
    const label = screen.getByTestId("name-label")
    expect(label).toHaveClass("extra-class")
  })

  it("fires onClick when clicked", () => {
    const onClick = vi.fn()
    render(<Label onClick={onClick}>Name</Label>)
    fireEvent.click(screen.getByText("Name"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("associates with a form control via the for attribute", () => {
    render(
      <>
        <Label for="name-field">Name</Label>
        <Input id="name-field" onInput={vi.fn()} />
      </>
    )
    expect(screen.getByLabelText("Name")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Label for="a11y-field">Character name</Label>
        <Input id="a11y-field" onInput={vi.fn()} />
      </>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

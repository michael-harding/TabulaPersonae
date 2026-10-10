import { axe } from "vitest-axe"

import { InlineStepper } from "@/components/ui/inline-stepper"

import { render, screen, fireEvent } from "../../test-utils"

describe("InlineStepper", () => {
  function renderStepper(props: { value?: number; min?: number; max?: number } = {}) {
    const onChange = vi.fn()
    const { container } = render(
      <InlineStepper data-test="qty" label="Rope quantity" value={props.value ?? 2} min={props.min} max={props.max} onChange={onChange} />
    )
    return { onChange, container }
  }

  it("shows the value inside a group named by its label", () => {
    renderStepper()
    expect(screen.getByRole("group", { name: "Rope quantity" })).toHaveTextContent("2")
  })

  it("decreases and increases by one", () => {
    const { onChange } = renderStepper()
    fireEvent.click(screen.getByRole("button", { name: "Decrease Rope quantity" }))
    fireEvent.click(screen.getByRole("button", { name: "Increase Rope quantity" }))
    expect(onChange.mock.calls).toEqual([[1], [3]])
  })

  it("disables − at min and + at max", () => {
    renderStepper({ value: 1, min: 1, max: 1 })
    expect(screen.getByTestId("qty-decrease")).toBeDisabled()
    expect(screen.getByTestId("qty-increase")).toBeDisabled()
  })

  it("keeps the value at least 32px wide so the buttons' 44px hit areas can't overlap", () => {
    renderStepper()
    expect(screen.getByText("2")).toHaveClass("min-w-8")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderStepper()
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

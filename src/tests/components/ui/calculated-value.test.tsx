import { axe } from "vitest-axe"
import { render, screen, fireEvent, waitFor, cleanupPortals } from "../../test-utils"
import { CalculatedValue } from "@/components/ui/calculated-value"

function baseProps(overrides: Partial<Parameters<typeof CalculatedValue>[0]> = {}) {
  return {
    label: "Strength",
    editable: false,
    custom: false,
    onCustomChange: vi.fn(),
    value: 0,
    onValueChange: vi.fn(),
    calculatedValue: 14,
    calculatedTooltip: "(Ability Score)",
    ...overrides,
  }
}

describe("CalculatedValue", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  it("renders the label text", () => {
    render(<CalculatedValue {...baseProps()} />)
    expect(screen.getByText("Strength")).toBeInTheDocument()
  })

  it("renders an icon alongside the label when provided", () => {
    render(<CalculatedValue {...baseProps({ icon: <span data-test="str-icon" /> })} />)
    expect(screen.getByTestId("str-icon")).toBeInTheDocument()
  })

  it("defaults to a top/column layout", () => {
    render(<CalculatedValue {...baseProps()} />)
    const root = screen.getByTestId("calculated-value")
    expect(root).toHaveClass("flex-col")
    expect(root).not.toHaveClass("flex-row")
  })

  it("applies a left/row layout when labelPosition is 'left'", () => {
    render(<CalculatedValue {...baseProps({ labelPosition: "left" })} />)
    const root = screen.getByTestId("calculated-value")
    expect(root).toHaveClass("flex-row")
    expect(root).not.toHaveClass("flex-col")
  })

  it("uses the default label class when labelClass is not provided", () => {
    render(<CalculatedValue {...baseProps()} />)
    const label = screen.getByTestId("calculated-value-label")
    expect(label).toHaveClass("text-sm", "text-muted-foreground")
  })

  it("overrides the label class when labelClass is provided", () => {
    render(<CalculatedValue {...baseProps({ labelClass: "text-lg font-bold" })} />)
    const label = screen.getByTestId("calculated-value-label")
    expect(label).toHaveClass("text-lg", "font-bold")
    expect(label).not.toHaveClass("text-sm", "text-muted-foreground")
  })

  it("shows the calculated value when not custom", () => {
    render(<CalculatedValue {...baseProps()} />)
    expect(screen.getByText("14")).toBeInTheDocument()
  })

  it("formats the displayed value using the format prop", () => {
    render(<CalculatedValue {...baseProps({ calculatedValue: 2, format: (n) => `+${n}` })} />)
    expect(screen.getByText("+2")).toBeInTheDocument()
  })

  it("uses a smaller text size in compact variant", () => {
    render(<CalculatedValue {...baseProps({ variant: "compact" })} />)
    expect(screen.getByTestId("calculated-value-display")).toHaveClass("text-sm")
  })

  it("uses the larger default text size when not compact and not editable", () => {
    render(<CalculatedValue {...baseProps()} />)
    expect(screen.getByTestId("calculated-value-display")).toHaveClass("text-2xl")
  })

  describe("tooltip", () => {
    it("shows the calculated tooltip when not custom", async () => {
      render(<CalculatedValue {...baseProps()} />)
      const trigger = screen.getByTestId("calculated-value-display").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("(Ability Score)")
    })

    it("shows 'Custom' instead of the calculated tooltip when custom", async () => {
      render(<CalculatedValue {...baseProps({ custom: true, value: 16 })} />)
      const trigger = screen.getByTestId("calculated-value-display").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("editable toggle", () => {
    it("shows a 'Use custom' button when not custom, and calls onCustomChange(true) when clicked", () => {
      const onCustomChange = vi.fn()
      render(<CalculatedValue {...baseProps({ editable: true, onCustomChange })} />)
      const toggle = screen.getByRole("button", { name: "Use custom Strength" })
      fireEvent.click(toggle)
      expect(onCustomChange).toHaveBeenCalledWith(true)
    })

    it("shows a 'Use calculated' button when custom, and calls onCustomChange(false) when clicked", () => {
      const onCustomChange = vi.fn()
      render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16, onCustomChange })} />)
      const toggle = screen.getByRole("button", { name: "Use calculated Strength" })
      fireEvent.click(toggle)
      expect(onCustomChange).toHaveBeenCalledWith(false)
    })

    it("does not render the toggle button when not editable", () => {
      render(<CalculatedValue {...baseProps()} />)
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  describe("custom + editable", () => {
    it("shows a numeric input instead of the static value", () => {
      render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16 })} />)
      expect(screen.getByRole("spinbutton")).toHaveValue(16)
      expect(screen.queryByTestId("calculated-value-display")).not.toBeInTheDocument()
    })

    it("calls onValueChange with the parsed value on blur", () => {
      const onValueChange = vi.fn()
      render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16, onValueChange })} />)
      const input = screen.getByRole("spinbutton")
      fireEvent.input(input, { target: { value: "18" } })
      fireEvent.blur(input)
      expect(onValueChange).toHaveBeenCalledWith(18)
    })

    it("clamps the committed value to min/max", () => {
      const onValueChange = vi.fn()
      render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16, min: 1, max: 20, onValueChange })} />)
      const input = screen.getByRole("spinbutton")
      fireEvent.input(input, { target: { value: "99" } })
      fireEvent.blur(input)
      expect(onValueChange).toHaveBeenCalledWith(20)
    })

    it("uses the label as the accessible name for the input", () => {
      render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16 })} />)
      expect(screen.getByRole("spinbutton", { name: "Strength" })).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("has no accessibility violations", async () => {
      const { container } = render(<CalculatedValue {...baseProps({ editable: true })} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("has no accessibility violations in custom + editable mode", async () => {
      const { container } = render(<CalculatedValue {...baseProps({ editable: true, custom: true, value: 16 })} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})

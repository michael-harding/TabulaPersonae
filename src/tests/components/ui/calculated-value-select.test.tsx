import { axe } from "vitest-axe"
import { render, screen, fireEvent, waitFor, cleanupPortals } from "../../test-utils"
import { CalculatedValueSelect } from "@/components/ui/calculated-value-select"

const OPTIONS = ["Small", "Medium", "Large"]

function baseProps(overrides: Partial<Parameters<typeof CalculatedValueSelect>[0]> = {}) {
  return {
    label: "Size",
    editable: false,
    custom: false,
    onCustomChange: vi.fn(),
    value: "",
    onValueChange: vi.fn(),
    calculatedValue: "Medium",
    calculatedTooltip: "(Species Trait)",
    options: OPTIONS,
    ...overrides,
  }
}

describe("CalculatedValueSelect", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  it("renders the label text", () => {
    render(<CalculatedValueSelect {...baseProps()} />)
    expect(screen.getByText("Size")).toBeInTheDocument()
  })

  it("renders an icon alongside the label when provided", () => {
    render(<CalculatedValueSelect {...baseProps({ icon: <span data-test="size-icon" /> })} />)
    expect(screen.getByTestId("size-icon")).toBeInTheDocument()
  })

  it("defaults to a top/column layout", () => {
    render(<CalculatedValueSelect {...baseProps()} />)
    const root = screen.getByTestId("calculated-value-select")
    expect(root).toHaveClass("flex-col")
    expect(root).not.toHaveClass("flex-row")
  })

  it("applies a left/row layout when labelPosition is 'left'", () => {
    render(<CalculatedValueSelect {...baseProps({ labelPosition: "left" })} />)
    const root = screen.getByTestId("calculated-value-select")
    expect(root).toHaveClass("flex-row")
    expect(root).not.toHaveClass("flex-col")
  })

  it("uses the default label class when labelClass is not provided", () => {
    render(<CalculatedValueSelect {...baseProps()} />)
    const label = screen.getByTestId("calculated-value-select-label")
    expect(label).toHaveClass("text-sm", "text-muted-foreground")
  })

  it("overrides the label class when labelClass is provided", () => {
    render(<CalculatedValueSelect {...baseProps({ labelClass: "text-lg font-bold" })} />)
    const label = screen.getByTestId("calculated-value-select-label")
    expect(label).toHaveClass("text-lg", "font-bold")
    expect(label).not.toHaveClass("text-sm", "text-muted-foreground")
  })

  it("shows an em dash placeholder when the calculated value is empty", () => {
    render(<CalculatedValueSelect {...baseProps({ calculatedValue: "" })} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("shows the calculated value when not custom", () => {
    render(<CalculatedValueSelect {...baseProps()} />)
    expect(screen.getByText("Medium")).toBeInTheDocument()
  })

  describe("tooltip", () => {
    it("shows the calculated tooltip when not custom", async () => {
      render(<CalculatedValueSelect {...baseProps()} />)
      const trigger = screen.getByTestId("calculated-value-select-display").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("(Species Trait)")
    })

    it("shows 'Custom' instead of the calculated tooltip when custom", async () => {
      render(<CalculatedValueSelect {...baseProps({ custom: true, value: "Large" })} />)
      const trigger = screen.getByTestId("calculated-value-select-display").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.focus(trigger)
      await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
      expect(screen.getByRole("tooltip")).toHaveTextContent("Custom")
    })
  })

  describe("editable toggle", () => {
    it("shows a 'Use custom' button when not custom, and calls onCustomChange(true) when clicked", () => {
      const onCustomChange = vi.fn()
      render(<CalculatedValueSelect {...baseProps({ editable: true, onCustomChange })} />)
      const toggle = screen.getByRole("button", { name: "Use custom Size" })
      fireEvent.click(toggle)
      expect(onCustomChange).toHaveBeenCalledWith(true)
    })

    it("shows a 'Use calculated' button when custom, and calls onCustomChange(false) when clicked", () => {
      const onCustomChange = vi.fn()
      render(<CalculatedValueSelect {...baseProps({ editable: true, custom: true, value: "Large", onCustomChange })} />)
      const toggle = screen.getByRole("button", { name: "Use calculated Size" })
      fireEvent.click(toggle)
      expect(onCustomChange).toHaveBeenCalledWith(false)
    })

    it("does not render the toggle button when not editable", () => {
      render(<CalculatedValueSelect {...baseProps({ editable: false })} />)
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  describe("custom + editable", () => {
    it("shows a combobox instead of the static value", () => {
      render(<CalculatedValueSelect {...baseProps({ editable: true, custom: true, value: "Large" })} />)
      expect(screen.getByRole("combobox")).toHaveValue("Large")
      expect(screen.queryByText("Medium")).not.toBeInTheDocument()
    })

    it("calls onValueChange when an option is selected", () => {
      const onValueChange = vi.fn()
      render(<CalculatedValueSelect {...baseProps({ editable: true, custom: true, value: "Large", onValueChange })} />)
      const input = screen.getByRole("combobox")
      fireEvent.focus(input)
      fireEvent.click(screen.getByText("Small"))
      expect(onValueChange).toHaveBeenCalledWith("Small")
    })
  })

  describe("accessibility", () => {
    it("has no accessibility violations", async () => {
      const { container } = render(<CalculatedValueSelect {...baseProps({ editable: true })} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})

import { axe } from "vitest-axe"

import { StepperInput } from "@/components/ui/stepper-input"

import { render, screen, fireEvent } from "../../test-utils"

describe("StepperInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a numeric input with − and + buttons", () => {
    render(<StepperInput data-test="stepper" value={3} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
  })

  it("displays the given value", () => {
    render(<StepperInput data-test="stepper" value={7} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toHaveValue(7)
  })

  it("calls onChange with value + 1 when + is clicked", () => {
    const onChange = vi.fn()
    render(<StepperInput data-test="stepper" value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it("calls onChange with value - 1 when − is clicked", () => {
    const onChange = vi.fn()
    render(<StepperInput data-test="stepper" value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("does not exceed max when clicking +", () => {
    const onChange = vi.fn()
    render(<StepperInput data-test="stepper" value={10} max={10} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("does not call onChange when already at min (calls onAtMin path instead)", () => {
    const onChange = vi.fn()
    render(<StepperInput data-test="stepper" value={0} min={0} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("calls onAtMin instead of onChange when clicking − at min", () => {
    const onChange = vi.fn()
    const onAtMin = vi.fn()
    render(<StepperInput data-test="stepper" value={0} min={0} onChange={onChange} onAtMin={onAtMin} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onAtMin).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StepperInput data-test="stepper" value={3} onChange={vi.fn()} aria-label="Test value" />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    it("hides the ± buttons when readOnly=true", () => {
      render(<StepperInput data-test="stepper" value={3} onChange={vi.fn()} readOnly />)
      expect(screen.queryByRole("button", { name: /decrease/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /increase/i })).not.toBeInTheDocument()
    })

    it("disables the numeric input when readOnly=true", () => {
      render(<StepperInput data-test="stepper" value={5} onChange={vi.fn()} readOnly />)
      expect(screen.getByRole("spinbutton")).toBeDisabled()
    })

    it("still displays the value when readOnly=true", () => {
      render(<StepperInput data-test="stepper" value={7} onChange={vi.fn()} readOnly />)
      expect(screen.getByRole("spinbutton")).toHaveValue(7)
    })

    it("applies rounded-md class to the input when readOnly=true", () => {
      render(<StepperInput data-test="stepper" value={3} onChange={vi.fn()} readOnly />)
      expect(screen.getByRole("spinbutton")).toHaveClass("rounded-md")
      expect(screen.getByRole("spinbutton")).not.toHaveClass("rounded-none")
    })

    it("applies rounded-none class to the input when not readOnly", () => {
      render(<StepperInput data-test="stepper" value={3} onChange={vi.fn()} />)
      expect(screen.getByRole("spinbutton")).toHaveClass("rounded-none")
      expect(screen.getByRole("spinbutton")).not.toHaveClass("rounded-md")
    })
  })
})

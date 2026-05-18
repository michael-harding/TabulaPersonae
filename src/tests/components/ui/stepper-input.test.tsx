import { render, screen, fireEvent } from "../../test-utils"
import { StepperInput } from "@/components/ui/stepper-input"

describe("StepperInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a numeric input with − and + buttons", () => {
    render(<StepperInput value={3} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
  })

  it("displays the given value", () => {
    render(<StepperInput value={7} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toHaveValue(7)
  })

  it("calls onChange with value + 1 when + is clicked", () => {
    const onChange = vi.fn()
    render(<StepperInput value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it("calls onChange with value - 1 when − is clicked", () => {
    const onChange = vi.fn()
    render(<StepperInput value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("does not exceed max when clicking +", () => {
    const onChange = vi.fn()
    render(<StepperInput value={10} max={10} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("does not call onChange when already at min (calls onAtMin path instead)", () => {
    const onChange = vi.fn()
    render(<StepperInput value={0} min={0} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("calls onAtMin instead of onChange when clicking − at min", () => {
    const onChange = vi.fn()
    const onAtMin = vi.fn()
    render(<StepperInput value={0} min={0} onChange={onChange} onAtMin={onAtMin} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onAtMin).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})

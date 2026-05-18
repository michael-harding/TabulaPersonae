import { render, screen, fireEvent } from "../../test-utils"
import { NumericInput } from "@/components/ui/numeric-input"

describe("NumericInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders an input with the given value", () => {
    render(<NumericInput value={5} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toHaveValue(5)
  })

  it("does not call onChange while typing — only on blur", () => {
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)
    fireEvent.input(screen.getByRole("spinbutton"), { target: { value: "9" } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it("calls onChange with the parsed integer on blur", () => {
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "9" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(9)
  })

  it("clamps the value to min on blur when below min", () => {
    const onChange = vi.fn()
    render(<NumericInput value={5} min={0} max={10} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "-3" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it("clamps the value to max on blur when above max", () => {
    const onChange = vi.fn()
    render(<NumericInput value={5} min={0} max={10} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "99" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("does not call onChange when blurred with NaN input", () => {
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "abc" } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("resets the displayed value to the prop value when blurred with NaN", () => {
    render(<NumericInput value={5} onChange={vi.fn()} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "abc" } })
    fireEvent.blur(input)
    expect(input).toHaveValue(5)
  })

  it("uses a custom parser function when provided", () => {
    const onChange = vi.fn()
    render(<NumericInput value={1} parser={parseFloat} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "2.7" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(2.7)
  })

  it("passes extra HTML attributes to the underlying input", () => {
    render(<NumericInput value={0} onChange={vi.fn()} placeholder="Enter number" />)
    expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument()
  })
})

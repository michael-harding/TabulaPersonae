import { axe } from "vitest-axe"
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

  it("does not call onChange or clamp on a bare blur with no preceding input (e.g. legacy data outside a since-lowered max)", () => {
    const onChange = vi.fn()
    render(<NumericInput value={24} max={20} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue(24)
  })

  it("does not call onChange or clamp on a bare Enter with no preceding input", () => {
    const onChange = vi.fn()
    render(<NumericInput value={24} max={20} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue(24)
  })

  it("commits on blur when the typed value equals the currently displayed value", () => {
    // A field showing a synthetic default (e.g. `value ?? 0`) needs typing that same number to
    // still count as a real, explicit edit — not be swallowed as if nothing was touched.
    const onChange = vi.fn()
    render(<NumericInput value={0} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "0" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(0)
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

  it("has no accessibility violations", async () => {
    const { container } = render(<NumericInput value={5} onChange={vi.fn()} aria-label="Test value" />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

import { axe } from "vitest-axe"

import { CurrencyInput } from "@/components/ui/currency-input"

import { render, screen, fireEvent } from "../../test-utils"

describe("CurrencyInput", () => {
  it("forwards value to the underlying stepper input", () => {
    render(<CurrencyInput value={25} onChange={vi.fn()} />)
    expect(screen.getByRole("spinbutton")).toHaveValue(25)
  })

  it("forwards aria-label to the underlying input", () => {
    render(<CurrencyInput value={0} onChange={vi.fn()} aria-label="Gold pieces" />)
    expect(screen.getByRole("spinbutton", { name: "Gold pieces" })).toBeInTheDocument()
  })

  it("renders increase and decrease buttons like the underlying stepper input", () => {
    render(<CurrencyInput value={10} onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument()
  })

  it("forwards onChange, incrementing by 1 when the increase button is clicked", () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={10} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(11)
  })

  it("forwards onChange, decrementing by 1 when the decrease button is clicked", () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={10} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onChange).toHaveBeenCalledWith(9)
  })

  it("forwards max, clamping the increased value at the boundary", () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={10} max={10} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("forwards min, calling onAtMin instead of onChange when decreasing at the boundary", () => {
    const onChange = vi.fn()
    const onAtMin = vi.fn()
    render(<CurrencyInput value={0} min={0} onChange={onChange} onAtMin={onAtMin} />)
    fireEvent.click(screen.getByRole("button", { name: /decrease/i }))
    expect(onAtMin).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("commits a typed value via the underlying numeric input on blur", () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={10} onChange={onChange} />)
    const input = screen.getByRole("spinbutton")
    fireEvent.input(input, { target: { value: "42" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(42)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CurrencyInput value={10} onChange={vi.fn()} aria-label="Gold pieces" />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

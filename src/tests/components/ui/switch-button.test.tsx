import { render, screen, fireEvent } from "../../test-utils"
import { SwitchButton } from "@/components/ui/switch-button"

describe("SwitchButton", () => {
  it("renders both option labels", () => {
    render(<SwitchButton optionA="2014" optionB="2024" value="2024" onChange={vi.fn()} />)
    expect(screen.getByText("2014")).toBeInTheDocument()
    expect(screen.getByText("2024")).toBeInTheDocument()
  })

  it("checkbox is unchecked when value matches optionA", () => {
    render(<SwitchButton optionA="2014" optionB="2024" value="2014" onChange={vi.fn()} id="test-switch" />)
    expect(screen.getByRole("checkbox", { name: /2014 2024/i })).not.toBeChecked()
  })

  it("checkbox is checked when value matches optionB", () => {
    render(<SwitchButton optionA="2014" optionB="2024" value="2024" onChange={vi.fn()} id="test-switch" />)
    expect(screen.getByRole("checkbox", { name: /2014 2024/i })).toBeChecked()
  })

  it("calls onChange with optionA when toggled from optionB", () => {
    const onChange = vi.fn()
    render(<SwitchButton optionA="2014" optionB="2024" value="2024" onChange={onChange} id="test-switch" />)
    fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
    expect(onChange).toHaveBeenCalledWith("2014")
  })

  it("calls onChange with optionB when toggled from optionA", () => {
    const onChange = vi.fn()
    render(<SwitchButton optionA="2014" optionB="2024" value="2014" onChange={onChange} id="test-switch" />)
    fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
    expect(onChange).toHaveBeenCalledWith("2024")
  })
})

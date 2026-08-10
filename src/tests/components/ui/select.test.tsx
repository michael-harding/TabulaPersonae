import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../../test-utils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

function renderSelect(props: { disabled?: boolean; onValueChange?: (v: string) => void } = {}) {
  return render(
    <Select value="Bard" onValueChange={props.onValueChange} disabled={props.disabled}>
      <SelectTrigger aria-label="Class">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Bard">Bard</SelectItem>
        <SelectItem value="Cleric">Cleric</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe("Select", () => {
  it("opens the listbox when the trigger is clicked", () => {
    renderSelect()
    fireEvent.click(screen.getByRole("button", { name: "Class" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("calls onValueChange when an option is clicked", () => {
    const onValueChange = vi.fn()
    renderSelect({ onValueChange })
    fireEvent.click(screen.getByRole("button", { name: "Class" }))
    fireEvent.click(screen.getByRole("option", { name: "Cleric" }))
    expect(onValueChange).toHaveBeenCalledWith("Cleric")
  })

  describe("disabled", () => {
    it("renders the trigger as a disabled button", () => {
      renderSelect({ disabled: true })
      expect(screen.getByRole("button", { name: "Class" })).toBeDisabled()
    })

    it("does not open the listbox when clicked", () => {
      renderSelect({ disabled: true })
      fireEvent.click(screen.getByRole("button", { name: "Class" }))
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSelect()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

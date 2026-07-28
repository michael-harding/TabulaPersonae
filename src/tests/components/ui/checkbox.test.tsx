import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../../test-utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

describe("Checkbox", () => {
  it("toggles when clicked", () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} aria-label="Toggle" />)
    fireEvent.click(screen.getByRole("checkbox"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("renders an internal label and toggles when it is clicked", () => {
    const onChange = vi.fn()
    render(<Checkbox id="labeled" label="Inline label" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByText("Inline label"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("uses aria-label as the accessible name when provided", () => {
    render(<Checkbox aria-label="Toggle attuned" checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole("checkbox", { name: "Toggle attuned" })).toBeInTheDocument()
  })

  // The tests above click the label TEXT or the hidden native input directly (via
  // fireEvent.click(getByRole("checkbox"))) — neither is where a real mouse click lands.
  // The visible square is a separate, styled <div> (Kobalte hides the actual input for custom
  // styling), so these click that control div instead, matching what a real user's mouse hits.
  describe("clicking the visible control square (not the hidden input)", () => {
    it("toggles exactly once via the built-in label prop", () => {
      const onChange = vi.fn()
      const { container } = render(<Checkbox id="safe" label="Some Item" checked={false} onChange={onChange} />)
      const control = container.querySelector('[id$="-control"]') as HTMLElement
      fireEvent.click(control)
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it("toggles exactly once with no label at all", () => {
      const onChange = vi.fn()
      const { container } = render(<Checkbox aria-label="Toggle" checked={false} onChange={onChange} />)
      const control = container.querySelector('[id$="-control"]') as HTMLElement
      fireEvent.click(control)
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    // Documents the anti-pattern warned about in checkbox.tsx's doc comment: wrapping
    // <Checkbox> in your own <label> (instead of using the `label` prop) makes a real click on
    // the visible control fire twice — once from Kobalte's own handling, once from the
    // browser's native label→control forwarding — and the two cancel out. This bit this
    // codebase twice (equipment-inventory-module.tsx's equip-item checkboxes) before the root
    // cause was understood. If this test ever starts failing because Checkbox's internals
    // changed, that's good news — the warning comment in checkbox.tsx should be revisited too.
    it("DOES double-fire when hand-wrapped in a native <label> — do not use this pattern", () => {
      const onChange = vi.fn()
      const { container } = render(
        <label>
          <Checkbox checked={false} onChange={onChange} />
          <span>Some Item</span>
        </label>
      )
      const control = container.querySelector('[id$="-control"]') as HTMLElement
      fireEvent.click(control)
      expect(onChange).toHaveBeenCalledTimes(2)
    })
  })

  // Regression: `id` used to land on Kobalte's outer group <div>, so an external
  // <label for="id"> (the pattern used throughout equipment-inventory-module.tsx,
  // e.g. "This is a Magic Item") pointed at a non-labelable element and never
  // associated with the real input — clicking the label silently did nothing.
  describe("external <label for> association (regression)", () => {
    it("is resolvable via getByLabelText when id is set", () => {
      render(
        <>
          <Label for="promote-checkbox">Promote me</Label>
          <Checkbox id="promote-checkbox" checked={false} onChange={vi.fn()} />
        </>
      )
      expect(screen.getByLabelText("Promote me")).toBeInTheDocument()
    })

    it("toggles when the external label is clicked, not just the control itself", () => {
      const onChange = vi.fn()
      render(
        <>
          <Label for="promote-checkbox">Promote me</Label>
          <Checkbox id="promote-checkbox" checked={false} onChange={onChange} />
        </>
      )
      fireEvent.click(screen.getByText("Promote me"))
      expect(onChange).toHaveBeenCalledWith(true)
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Label for="a11y-checkbox">Accessible checkbox</Label>
        <Checkbox id="a11y-checkbox" checked={false} onChange={vi.fn()} />
      </>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

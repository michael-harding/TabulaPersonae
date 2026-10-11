import { axe } from "vitest-axe"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { render, screen, fireEvent } from "../../test-utils"

describe("Checkbox", () => {
  it("toggles when clicked", () => {
    const onChange = vi.fn()
    render(<Checkbox data-test="cb" checked={false} onChange={onChange} aria-label="Toggle" />)
    fireEvent.click(screen.getByRole("checkbox"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("renders an internal label and toggles when it is clicked", () => {
    const onChange = vi.fn()
    render(<Checkbox data-test="cb" id="labeled" label="Inline label" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByText("Inline label"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("wraps the label in a heading when labelHeading is set, and the label still toggles once", () => {
    const onChange = vi.fn()
    render(<Checkbox data-test="cb" label="Longbow" labelHeading="h3" labelTestId="item-name" aria-label="Equipped: Longbow" checked={false} onChange={onChange} />)
    const label = screen.getByTestId("item-name")
    expect(label.tagName).toBe("LABEL")
    expect(screen.getByRole("heading", { level: 3, name: "Longbow" })).toContainElement(label)
    fireEvent.click(label)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("gives the label a 44px-tall target", () => {
    render(<Checkbox data-test="cb" label="Inline label" checked={false} onChange={vi.fn()} />)
    expect(screen.getByText("Inline label")).toHaveClass("min-h-11")
  })

  it("uses aria-label as the accessible name when provided", () => {
    render(<Checkbox data-test="cb" aria-label="Toggle attuned" checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole("checkbox", { name: "Toggle attuned" })).toBeInTheDocument()
  })

  // CONSTITUTION.md §6.8: a `data-test` value must be unique within the page, so the control's
  // selector is derived from the caller's rather than being one constant shared by every checkbox.
  it("derives the control's data-test from its own, so two checkboxes never share one", () => {
    render(
      <>
        <Checkbox data-test="spell-known" aria-label="Known" checked={false} onChange={vi.fn()} />
        <Checkbox data-test="spell-prepared" aria-label="Prepared" checked={false} onChange={vi.fn()} />
      </>
    )
    expect(screen.getAllByTestId("spell-known-control")).toHaveLength(1)
    expect(screen.getAllByTestId("spell-prepared-control")).toHaveLength(1)
    expect(screen.queryByTestId("checkbox-control")).not.toBeInTheDocument()
  })

  // The tests above click the label TEXT or the hidden native input directly (via
  // fireEvent.click(getByRole("checkbox"))) — neither is where a real mouse click lands.
  // The visible square is a separate, styled <div> (Kobalte hides the actual input for custom
  // styling), so these click that control div instead, matching what a real user's mouse hits.
  describe("clicking the visible control square (not the hidden input)", () => {
    it("toggles exactly once via the built-in label prop", () => {
      const onChange = vi.fn()
      render(<Checkbox data-test="cb" id="safe" label="Some Item" checked={false} onChange={onChange} />)
      const control = screen.getByTestId("cb-control")
      fireEvent.click(control)
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it("toggles exactly once with no label at all", () => {
      const onChange = vi.fn()
      render(<Checkbox data-test="cb" aria-label="Toggle" checked={false} onChange={onChange} />)
      const control = screen.getByTestId("cb-control")
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
      render(
        <label>
          <Checkbox data-test="cb" checked={false} onChange={onChange} />
          <span>Some Item</span>
        </label>
      )
      const control = screen.getByTestId("cb-control")
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
          <Checkbox data-test="cb" id="promote-checkbox" checked={false} onChange={vi.fn()} />
        </>
      )
      expect(screen.getByLabelText("Promote me")).toBeInTheDocument()
    })

    it("toggles when the external label is clicked, not just the control itself", () => {
      const onChange = vi.fn()
      render(
        <>
          <Label for="promote-checkbox">Promote me</Label>
          <Checkbox data-test="cb" id="promote-checkbox" checked={false} onChange={onChange} />
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
        <Checkbox data-test="cb" id="a11y-checkbox" checked={false} onChange={vi.fn()} />
      </>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

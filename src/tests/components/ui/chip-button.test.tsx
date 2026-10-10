import { axe } from "vitest-axe"

import { ChipButton, CheckableChip } from "@/components/ui/chip-button"

import { render, screen, fireEvent } from "../../test-utils"

describe("ChipButton", () => {
  it("acts on a single click — chip actions are cheap to undo, so there is no confirm step", () => {
    const onClick = vi.fn()
    render(<ChipButton data-test="lang-remove-common" action="remove" aria-label="Remove Common" onClick={onClick}>Common</ChipButton>)
    fireEvent.click(screen.getByRole("button", { name: "Remove Common" }), { detail: 1 })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("makes the whole chip the button, with the label inside it", () => {
    render(<ChipButton data-test="add-module-spells" action="add" appearance="square" onClick={vi.fn()}>Spells</ChipButton>)
    const button = screen.getByTestId("add-module-spells")
    expect(button.tagName).toBe("BUTTON")
    expect(button).toHaveAccessibleName("Spells")
  })

  it("is a ≥44×44 box (ACCESSIBILITY.md touch targets)", () => {
    render(<ChipButton data-test="chip" action="add" onClick={vi.fn()}>x</ChipButton>)
    expect(screen.getByTestId("chip")).toHaveClass("min-h-11", "min-w-11")
  })

  it("shows a trailing × for remove and a leading + for add, hidden from assistive tech", () => {
    render(
      <>
        <ChipButton data-test="remove-chip" action="remove" onClick={vi.fn()}>A</ChipButton>
        <ChipButton data-test="add-chip" action="add" onClick={vi.fn()}>B</ChipButton>
      </>
    )
    const removeIcon = screen.getByTestId("remove-chip").querySelector("svg")!
    const addIcon = screen.getByTestId("add-chip").querySelector("svg")!
    expect(removeIcon).toHaveAttribute("aria-hidden", "true")
    expect(removeIcon.previousSibling?.textContent).toBe("A")
    expect(addIcon.nextSibling?.textContent).toBe("B")
  })

  it("renders an icon-only dashed trigger named by its aria-label", () => {
    render(<ChipButton data-test="add-condition" action="add" appearance="dashed" aria-label="Add condition" onClick={vi.fn()} />)
    const button = screen.getByRole("button", { name: "Add condition" })
    expect(button).toHaveClass("min-h-11", "min-w-11")
    expect(button.textContent).toBe("")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ChipButton data-test="chip" action="remove" aria-label="Remove Common" onClick={vi.fn()}>Common</ChipButton>)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

describe("CheckableChip", () => {
  function renderChip(overrides: { checked?: boolean } = {}) {
    const onRemove = vi.fn()
    const onCheckedChange = vi.fn()
    const { container } = render(
      <CheckableChip
        data-test="skill-athletics"
        removeLabel="Remove Athletics"
        onRemove={onRemove}
        checkLabel="Exp"
        checkAriaLabel="Expertise for Athletics"
        checked={overrides.checked ?? false}
        onCheckedChange={onCheckedChange}
      >
        Athletics
      </CheckableChip>
    )
    return { onRemove, onCheckedChange, container }
  }

  it("removes on a single click of the left half, without touching the option", () => {
    const { onRemove, onCheckedChange } = renderChip()
    fireEvent.click(screen.getByRole("button", { name: "Remove Athletics" }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("toggles the option from the right half's checkbox, without removing", () => {
    const { onRemove, onCheckedChange } = renderChip()
    fireEvent.click(screen.getByRole("checkbox", { name: "Expertise for Athletics" }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(onRemove).not.toHaveBeenCalled()
  })

  it("toggles when the right half's visible label is clicked", () => {
    const { onCheckedChange } = renderChip({ checked: true })
    fireEvent.click(screen.getByText("Exp"))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it("reflects the checked state", () => {
    renderChip({ checked: true })
    expect(screen.getByRole("checkbox", { name: "Expertise for Athletics" })).toBeChecked()
  })

  it("derives page-unique ids for both halves", () => {
    renderChip()
    expect(screen.getByTestId("skill-athletics-remove")).toHaveAccessibleName("Remove Athletics")
    expect(screen.getByTestId("skill-athletics-check")).toHaveAttribute("type", "checkbox")
  })

  it("gives each half its own ≥44px-tall box", () => {
    renderChip()
    expect(screen.getByTestId("skill-athletics-remove")).toHaveClass("min-h-11", "min-w-11")
    expect(screen.getByTestId("skill-athletics-check").closest("label")).toHaveClass("min-h-11", "min-w-11")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderChip()
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

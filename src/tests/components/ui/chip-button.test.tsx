import { axe } from "vitest-axe"

import { ChipButton } from "@/components/ui/chip-button"

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

  it("has no accessibility violations", async () => {
    const { container } = render(<ChipButton data-test="chip" action="remove" aria-label="Remove Common" onClick={vi.fn()}>Common</ChipButton>)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

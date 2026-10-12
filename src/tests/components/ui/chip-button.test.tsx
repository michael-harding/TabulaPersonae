import { axe } from "vitest-axe"

import { ChipButton, CheckableChip, ToggleChip } from "@/components/ui/chip-button"

import { render, screen, fireEvent } from "../../test-utils"

describe("ChipButton", () => {
  it("acts on a single click — chip actions are cheap to undo, so there is no confirm step", () => {
    const onClick = vi.fn()
    render(() => <ChipButton data-test="lang-remove-common" action="remove" aria-label="Remove Common" onClick={onClick}>Common</ChipButton>)
    fireEvent.click(screen.getByRole("button", { name: "Remove Common" }), { detail: 1 })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("makes the whole chip the button, with the label inside it", () => {
    render(() => <ChipButton data-test="add-module-spells" action="add" variant="outline" onClick={vi.fn()}>Spells</ChipButton>)
    const button = screen.getByTestId("add-module-spells")
    expect(button.tagName).toBe("BUTTON")
    expect(button).toHaveAccessibleName("Spells")
  })

  it("is a ≥44×44 box (ACCESSIBILITY.md touch targets)", () => {
    render(() => <ChipButton data-test="chip" action="add" onClick={vi.fn()}>x</ChipButton>)
    expect(screen.getByTestId("chip")).toHaveClass("min-h-11", "min-w-11")
  })

  it("shows a trailing × for remove and a leading + for add, hidden from assistive tech", () => {
    render(() => (
      <>
        <ChipButton data-test="remove-chip" action="remove" onClick={vi.fn()}>A</ChipButton>
        <ChipButton data-test="add-chip" action="add" onClick={vi.fn()}>B</ChipButton>
      </>
    ))
    const removeIcon = screen.getByTestId("remove-chip").querySelector("svg")!
    const addIcon = screen.getByTestId("add-chip").querySelector("svg")!
    expect(removeIcon).toHaveAttribute("aria-hidden", "true")
    expect(removeIcon.previousSibling?.textContent).toBe("A")
    expect(addIcon.nextSibling?.textContent).toBe("B")
  })

  it("draws its pill with the display Chip's variant classes, defaulting to secondary", () => {
    render(() => (
      <>
        <ChipButton data-test="plain" action="add" onClick={vi.fn()}>A</ChipButton>
        <ChipButton data-test="outlined" action="add" variant="outline" onClick={vi.fn()}>B</ChipButton>
      </>
    ))
    expect(screen.getByTestId("plain").querySelector("span")).toHaveClass("rounded-full", "bg-secondary", "text-secondary-foreground")
    const outlined = screen.getByTestId("outlined").querySelector("span")!
    expect(outlined).toHaveClass("rounded-full", "text-foreground")
    expect(outlined).not.toHaveClass("bg-secondary")
  })

  it("changes the pill's background and border when anywhere in the 44px box is hovered", () => {
    render(() => <ChipButton data-test="chip" action="add" onClick={vi.fn()}>A</ChipButton>)
    const button = screen.getByTestId("chip")
    expect(button).toHaveClass("group")
    expect(button.querySelector("span")).toHaveClass("group-hover:bg-secondary/80", "group-hover:border-secondary-foreground")
  })

  it("takes its hover style from its variant — only the removable variants get a destructive border", () => {
    render(() => (
      <>
        <ChipButton data-test="secondary" action="remove" variant="secondary" onClick={vi.fn()}>A</ChipButton>
        <ChipButton data-test="outline" action="add" variant="outline" onClick={vi.fn()}>B</ChipButton>
        <ChipButton data-test="removable" action="remove" variant="removable" onClick={vi.fn()}>C</ChipButton>
        <ChipButton data-test="removable-secondary" action="remove" variant="removableSecondary" onClick={vi.fn()}>D</ChipButton>
        <ChipButton data-test="removable-outline" action="remove" variant="removableOutline" onClick={vi.fn()}>E</ChipButton>
      </>
    ))
    const pill = (id: string) => screen.getByTestId(id).querySelector("span")!
    expect(pill("secondary")).toHaveClass("group-hover:bg-secondary/80", "group-hover:border-secondary-foreground")
    expect(pill("secondary")).not.toHaveClass("group-hover:border-destructive")
    expect(pill("outline")).toHaveClass("group-hover:bg-accent", "group-hover:border-accent-foreground")
    expect(pill("removable")).toHaveClass("bg-primary", "group-hover:bg-primary/80", "group-hover:border-destructive")
    expect(pill("removable-secondary")).toHaveClass("bg-secondary", "group-hover:bg-secondary/80", "group-hover:border-destructive")
    expect(pill("removable-outline")).toHaveClass("text-foreground", "group-hover:bg-accent", "group-hover:border-destructive")
    expect(pill("removable-outline")).not.toHaveClass("bg-secondary")
  })

  it("defaults a remove chip to removableSecondary and an add chip to secondary", () => {
    render(() => (
      <>
        <ChipButton data-test="remove-chip" action="remove" onClick={vi.fn()}>A</ChipButton>
        <ChipButton data-test="add-chip" action="add" onClick={vi.fn()}>B</ChipButton>
      </>
    ))
    expect(screen.getByTestId("remove-chip").querySelector("span")).toHaveClass("bg-secondary", "group-hover:border-destructive")
    expect(screen.getByTestId("add-chip").querySelector("span")).toHaveClass("bg-secondary", "group-hover:border-secondary-foreground")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <ChipButton data-test="chip" action="remove" aria-label="Remove Common" onClick={vi.fn()}>Common</ChipButton>)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

describe("ToggleChip", () => {
  it("is a button that reports its on/off state and acts on a single click", () => {
    const onClick = vi.fn()
    render(() => <ToggleChip data-test="prof" aria-label="Stealth proficient" pressed={false} onClick={onClick}>Prof</ToggleChip>)
    const chip = screen.getByRole("button", { name: "Stealth proficient" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    expect(chip).toHaveTextContent("Prof")
    fireEvent.click(chip)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("is drawn in its variant's colours when on and outlined when off", () => {
    render(() => (
      <>
        <ToggleChip data-test="on" pressed variant="default" onClick={vi.fn()}>Exp</ToggleChip>
        <ToggleChip data-test="off" pressed={false} variant="default" onClick={vi.fn()}>Exp</ToggleChip>
        <ToggleChip data-test="on-default-variant" pressed onClick={vi.fn()}>Prof</ToggleChip>
      </>
    ))
    const pill = (id: string) => screen.getByTestId(id).querySelector("span")!
    expect(screen.getByTestId("on")).toHaveAttribute("aria-pressed", "true")
    expect(pill("on")).toHaveClass("rounded-full", "bg-primary", "text-primary-foreground")
    expect(pill("off")).toHaveClass("rounded-full", "text-foreground")
    expect(pill("off")).not.toHaveClass("bg-primary")
    expect(pill("on-default-variant")).toHaveClass("bg-secondary", "text-secondary-foreground")
  })

  it("outlines the pill when off, so it reads as a control and not plain text", () => {
    render(() => (
      <>
        <ToggleChip data-test="on" pressed onClick={vi.fn()}>Prof</ToggleChip>
        <ToggleChip data-test="off" pressed={false} onClick={vi.fn()}>Prof</ToggleChip>
      </>
    ))
    expect(screen.getByTestId("off").querySelector("span")).toHaveClass("border", "border-muted-foreground")
    expect(screen.getByTestId("on").querySelector("span")).not.toHaveClass("border-muted-foreground")
  })

  it("shows a leading check when on and an empty circle in its place when off, hidden from assistive tech", () => {
    render(() => (
      <>
        <ToggleChip data-test="on" pressed onClick={vi.fn()}>Prof</ToggleChip>
        <ToggleChip data-test="off" pressed={false} onClick={vi.fn()}>Prof</ToggleChip>
      </>
    ))
    const check = screen.getByTestId("on").querySelector("svg")!
    const circle = screen.getByTestId("off").querySelector("svg")!
    expect(check).toHaveAttribute("aria-hidden", "true")
    expect(check.nextSibling?.textContent).toBe("Prof")
    expect(check.querySelector("circle")).toBeNull()
    expect(circle).toHaveAttribute("aria-hidden", "true")
    expect(circle.nextSibling?.textContent).toBe("Prof")
    expect(circle.querySelector("circle")).not.toBeNull()
    // Same size, so toggling does not change the chip's width.
    expect(check).toHaveClass("h-3", "w-3")
    expect(circle).toHaveClass("h-3", "w-3")
  })

  it("applies pillClass to the pill, not the 44px box", () => {
    render(() => <ToggleChip data-test="chip" pressed pillClass="px-1" onClick={vi.fn()}>Prof</ToggleChip>)
    expect(screen.getByTestId("chip")).toHaveClass("min-h-11", "min-w-11")
    expect(screen.getByTestId("chip")).not.toHaveClass("px-1")
    expect(screen.getByTestId("chip").querySelector("span")).toHaveClass("px-1")
  })

  it("ignores clicks when locked but stays focusable", () => {
    const onClick = vi.fn()
    render(() => <ToggleChip data-test="chip" pressed locked onClick={onClick}>Prof</ToggleChip>)
    const chip = screen.getByTestId("chip")
    expect(chip).toHaveAttribute("aria-disabled", "true")
    expect(chip).not.toBeDisabled()
    fireEvent.click(chip)
    expect(onClick).not.toHaveBeenCalled()
    expect(chip.querySelector("span")).not.toHaveClass("group-hover:bg-secondary/80")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => (
      <>
        <ToggleChip data-test="on" aria-label="Stealth proficient" pressed onClick={vi.fn()}>Prof</ToggleChip>
        <ToggleChip data-test="off" aria-label="Stealth expertise" pressed={false} locked onClick={vi.fn()}>Exp</ToggleChip>
      </>
    ))
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

describe("CheckableChip", () => {
  function renderChip(overrides: { checked?: boolean } = {}) {
    const onRemove = vi.fn()
    const onCheckedChange = vi.fn()
    const { container } = render(() => (
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
    ))
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

  it("draws both halves from the shared chip variants, with a destructive hover border on the remove half", () => {
    renderChip()
    expect(screen.getByTestId("skill-athletics-remove").querySelector("span")).toHaveClass("bg-secondary", "group-hover:bg-secondary/80", "group-hover:border-destructive")
    expect(screen.getByTestId("skill-athletics-check").closest("span")).toHaveClass("group-hover:bg-accent", "group-hover:border-accent-foreground")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderChip()
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

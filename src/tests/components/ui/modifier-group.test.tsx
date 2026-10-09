import { axe } from "vitest-axe"
import { render, screen, fireEvent, cleanup, cleanupPortals } from "../../test-utils"
import { ModifierGroup } from "@/components/ui/modifier-group"

function baseProps(overrides: Partial<Parameters<typeof ModifierGroup>[0]> = {}) {
  return {
    label: "Ability Scores",
    open: true,
    onOpenChange: vi.fn(),
    "data-test": "modifier-group-ability-scores",
    ...overrides,
  }
}

describe("ModifierGroup", () => {
  beforeEach(() => {
    cleanup()
    cleanupPortals()
  })

  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  it("renders the label text", () => {
    render(<ModifierGroup {...baseProps()}>content</ModifierGroup>)
    expect(screen.getByText("Ability Scores")).toBeInTheDocument()
  })

  it("renders the trigger with the given data-test attribute", () => {
    render(<ModifierGroup {...baseProps()}>content</ModifierGroup>)
    expect(screen.getByTestId("modifier-group-ability-scores")).toBeInTheDocument()
  })

  it("renders children content when open", () => {
    render(
      <ModifierGroup {...baseProps({ open: true })}>
        <div data-test="modifier-group-child">Strength +2</div>
      </ModifierGroup>
    )
    expect(screen.getByTestId("modifier-group-child")).toBeInTheDocument()
    expect(screen.getByText("Strength +2")).toBeInTheDocument()
  })

  it("reflects the open prop via aria-expanded=true", () => {
    render(<ModifierGroup {...baseProps({ open: true })}>content</ModifierGroup>)
    expect(screen.getByTestId("modifier-group-ability-scores")).toHaveAttribute("aria-expanded", "true")
  })

  it("reflects the open prop via aria-expanded=false", () => {
    render(<ModifierGroup {...baseProps({ open: false })}>content</ModifierGroup>)
    expect(screen.getByTestId("modifier-group-ability-scores")).toHaveAttribute("aria-expanded", "false")
  })

  it("calls onOpenChange(false) when the trigger is clicked while open", () => {
    const onOpenChange = vi.fn()
    render(
      <ModifierGroup {...baseProps({ open: true, onOpenChange })}>content</ModifierGroup>
    )
    fireEvent.click(screen.getByTestId("modifier-group-ability-scores"))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onOpenChange(true) when the trigger is clicked while closed", () => {
    const onOpenChange = vi.fn()
    render(
      <ModifierGroup {...baseProps({ open: false, onOpenChange })}>content</ModifierGroup>
    )
    fireEvent.click(screen.getByTestId("modifier-group-ability-scores"))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ModifierGroup {...baseProps({ open: true })}>
        <div>Strength +2</div>
      </ModifierGroup>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

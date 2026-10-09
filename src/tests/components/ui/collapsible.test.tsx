// collapsible.tsx is a pure re-export of Kobalte's Collapsible primitive with no
// JSX/logic of its own (`export const Collapsible = CollapsiblePrimitive` style). There is no
// app-specific behavior to unit test in isolation, so this is a minimal smoke test confirming
// the re-export wires up a real Trigger/Content composition correctly and accessibly — see
// src/components/ui/modifier-group.tsx for a real consumer of this exact composition.
import { createSignal } from "solid-js"
import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../../test-utils"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

describe("Collapsible", () => {
  it("does not render the content when closed by default", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByRole("button", { name: "Toggle details" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hidden details")).not.toBeInTheDocument()
  })

  it("renders the content when defaultOpen is true", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByRole("button", { name: "Toggle details" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hidden details")).toBeInTheDocument()
  })

  it("shows the content and flips aria-expanded when the trigger is clicked", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    )
    const trigger = screen.getByRole("button", { name: "Toggle details" })

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hidden details")).toBeInTheDocument()

    // Re-closing flips the trigger's aria-expanded back immediately. Kobalte's presence
    // tracking otherwise waits for a CSS animation/transition-end event on the content node
    // before unmounting it, which jsdom never fires (no real animations run here), so the
    // actual unmount is not asserted in this environment — see the fresh-render case below,
    // which exercises the closed state without relying on that transition.
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("supports controlled open state via open/onOpenChange", () => {
    const onOpenChange = vi.fn()
    function Controlled() {
      const [open, setOpen] = createSignal(false)
      return (
        <Collapsible
          open={open()}
          onOpenChange={(next: boolean) => {
            setOpen(next)
            onOpenChange(next)
          }}
        >
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Hidden details</CollapsibleContent>
        </Collapsible>
      )
    }
    render(<Controlled />)
    fireEvent.click(screen.getByRole("button", { name: "Toggle details" }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByText("Hidden details")).toBeInTheDocument()
  })

  it("has no accessibility violations when expanded", async () => {
    const { container } = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

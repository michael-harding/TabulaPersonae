// collapsible.tsx re-exports Kobalte's Collapsible primitive and adds CollapsibleChevron, the
// shared expander chevron. The re-export tests are a smoke test that a real Trigger/Content
// composition is wired up correctly and accessibly — see src/components/ui/modifier-group.tsx
// for a real consumer of this exact composition.
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createSignal } from "solid-js"
import { axe } from "vitest-axe"

import { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleChevron } from "@/components/ui/collapsible"

import { render, screen, fireEvent } from "../../test-utils"

describe("Collapsible", () => {
  it("does not render the content when closed by default", () => {
    render(() => (
      <Collapsible>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
    expect(screen.getByRole("button", { name: "Toggle details" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hidden details")).not.toBeInTheDocument()
  })

  it("renders the content when defaultOpen is true", () => {
    render(() => (
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
    expect(screen.getByRole("button", { name: "Toggle details" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hidden details")).toBeInTheDocument()
  })

  it("shows the content and flips aria-expanded when the trigger is clicked", () => {
    render(() => (
      <Collapsible>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
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
    render(() => <Controlled />)
    fireEvent.click(screen.getByRole("button", { name: "Toggle details" }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByText("Hidden details")).toBeInTheDocument()
  })

  it("has no accessibility violations when expanded", async () => {
    const { container } = render(() => (
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe("CollapsibleChevron", () => {
  const chevron = (container: HTMLElement) => container.querySelector('[data-sem="collapsible-chevron"]')

  function renderChevron(defaultOpen = false) {
    return render(() => (
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger>Toggle details<CollapsibleChevron /></CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
  }

  it("points down while closed", () => {
    const { container } = renderChevron()
    expect(chevron(container)).not.toHaveClass("rotate-180")
  })

  it("points up while open", () => {
    const { container } = renderChevron(true)
    expect(chevron(container)).toHaveClass("rotate-180")
  })

  it("rotates each time the trigger toggles the section", () => {
    const { container } = renderChevron()
    const trigger = screen.getByRole("button", { name: "Toggle details" })
    fireEvent.click(trigger)
    expect(chevron(container)).toHaveClass("rotate-180")
    fireEvent.click(trigger)
    expect(chevron(container)).not.toHaveClass("rotate-180")
  })

  it("follows a controlled open state changed from outside", () => {
    const [open, setOpen] = createSignal(false)
    const { container } = render(() => (
      <Collapsible open={open()}>
        <CollapsibleTrigger>Toggle details<CollapsibleChevron /></CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    ))
    setOpen(true)
    expect(chevron(container)).toHaveClass("rotate-180")
  })

  // A flex header row crowded by a long title, a count chip and an add button would otherwise
  // squeeze the icon smaller on a narrow screen.
  it("does not shrink in a crowded row", () => {
    const { container } = renderChevron()
    expect(chevron(container)).toHaveClass("shrink-0", "h-4", "w-4")
  })

  it("is hidden from assistive technology, as aria-expanded already conveys the state", () => {
    const { container } = renderChevron()
    expect(chevron(container)).toHaveAttribute("aria-hidden", "true")
  })

  it("keeps a class passed in, such as ml-auto to push it to the row's end", () => {
    const { container } = render(() => (
      <Collapsible>
        <CollapsibleTrigger>Toggle details<CollapsibleChevron class="ml-auto" /></CollapsibleTrigger>
      </Collapsible>
    ))
    expect(chevron(container)).toHaveClass("ml-auto", "shrink-0")
  })

  // Kobalte's ui-expanded: and similar variants come from a Tailwind plugin this project does
  // not use, so they emit no CSS: every expander chevron once carried ui-expanded:rotate-180
  // and never turned. Expanders use CollapsibleChevron instead.
  it("is not bypassed by Kobalte ui-* variants, which produce no CSS here", () => {
    const src = resolve(__dirname, "../../..")
    const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((file) => /\.(tsx?|css)$/.test(file) && !file.startsWith("tests"))
    const found = sources.flatMap((file) => [...readFileSync(resolve(src, file), "utf8").matchAll(/\bui-[a-z-]+:[\w[]/g)].map(([match]) => `${file}: ${match}`))
    expect(found).toEqual([])
  })
})

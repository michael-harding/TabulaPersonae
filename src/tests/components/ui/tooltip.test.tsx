import { axe } from "vitest-axe"

import { Tooltip } from "@/components/ui/tooltip"

import { render, screen, fireEvent, waitFor, cleanupPortals } from "../../test-utils"

describe("Tooltip", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  it("renders the trigger children", () => {
    render(
      <Tooltip content="More info" triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    expect(screen.getByText("Hover me")).toBeInTheDocument()
  })

  it("does not show the tooltip content until triggered", () => {
    render(
      <Tooltip content="More info" triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("shows the content on focus and hides it on blur", async () => {
    render(
      <Tooltip content="More info" triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!

    fireEvent.focus(trigger)
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
    expect(screen.getByRole("tooltip")).toHaveTextContent("More info")
    expect(trigger).toHaveAttribute("aria-describedby")

    // Kobalte keeps the tooltip's content element mounted (marked `data-closed`) until a CSS
    // animation/transition-end event fires on it; jsdom never fires those, so `role="tooltip"`
    // can linger in the DOM in this environment even once closed. `aria-describedby` instead
    // reflects the tooltip's logical open state directly and updates immediately, so it's the
    // reliable signal here that blur actually closed the tooltip.
    fireEvent.blur(trigger)
    await waitFor(() => expect(trigger).not.toHaveAttribute("aria-describedby"))
  })

  it("renders JSX content, not just plain text", async () => {
    render(
      <Tooltip content={<strong data-test="tooltip-strong">Important</strong>} triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!
    fireEvent.focus(trigger)
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
    expect(screen.getByTestId("tooltip-strong")).toBeInTheDocument()
  })

  it("makes the trigger focusable with role='group' when triggerFocusable is true", () => {
    render(
      <Tooltip content="More info" triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!
    expect(trigger).toHaveAttribute("tabindex", "0")
    expect(trigger).toHaveAttribute("role", "group")
  })

  it("leaves the trigger non-focusable with no role when triggerFocusable is not set", () => {
    render(
      <Tooltip content="More info">
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!
    expect(trigger).not.toHaveAttribute("tabindex")
    expect(trigger).not.toHaveAttribute("role")
  })

  it("applies triggerClass to the trigger and class to the content", async () => {
    render(
      <Tooltip content="More info" triggerFocusable triggerClass="custom-trigger" class="custom-content">
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!
    expect(trigger).toHaveClass("custom-trigger")

    fireEvent.focus(trigger)
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())
    expect(screen.getByRole("tooltip")).toHaveClass("custom-content")
  })

  describe("pinning on click or tap", () => {
    const renderPinnable = () => {
      render(
        <>
          <Tooltip content="More info" triggerFocusable>
            <span>Tap me</span>
          </Tooltip>
          <button type="button" data-test="elsewhere">Elsewhere</button>
        </>
      )
      return screen.getByText("Tap me").closest('[data-sem="tooltip-trigger"]')!
    }
    // See the blur test above for why `aria-describedby`, not `role="tooltip"`, signals "closed".
    const expectOpen = (trigger: Element) => waitFor(() => expect(trigger).toHaveAttribute("aria-describedby"))
    const expectClosed = (trigger: Element) => waitFor(() => expect(trigger).not.toHaveAttribute("aria-describedby"))

    it("shows the content on click and hides it on a second click", async () => {
      const trigger = renderPinnable()

      fireEvent.click(trigger)
      await expectOpen(trigger)
      expect(screen.getByRole("tooltip")).toHaveTextContent("More info")

      fireEvent.click(trigger)
      await expectClosed(trigger)
    })

    it("stays open when the pointer leaves or the trigger loses focus to nothing", async () => {
      const trigger = renderPinnable()
      fireEvent.click(trigger)
      await expectOpen(trigger)

      fireEvent.pointerLeave(trigger, { pointerType: "mouse" })
      fireEvent.blur(trigger)
      expect(trigger).toHaveAttribute("aria-describedby")
    })

    it("stays open when the tooltip itself is pressed, so its text can be selected", async () => {
      const trigger = renderPinnable()
      fireEvent.click(trigger)
      await expectOpen(trigger)

      const tooltip = screen.getByRole("tooltip")
      fireEvent.pointerDown(tooltip)
      fireEvent.click(tooltip)
      expect(trigger).toHaveAttribute("aria-describedby")
    })

    it("closes on a press outside the trigger and the tooltip", async () => {
      const trigger = renderPinnable()
      fireEvent.click(trigger)
      await expectOpen(trigger)

      fireEvent.pointerDown(screen.getByTestId("elsewhere"))
      await expectClosed(trigger)
    })

    it("closes on Escape", async () => {
      const trigger = renderPinnable()
      fireEvent.click(trigger)
      await expectOpen(trigger)

      fireEvent.keyDown(document.body, { key: "Escape" })
      await expectClosed(trigger)
    })

    it("closes when focus moves to another element", async () => {
      const trigger = renderPinnable()
      fireEvent.click(trigger)
      await expectOpen(trigger)

      fireEvent.blur(trigger, { relatedTarget: screen.getByTestId("elsewhere") })
      await expectClosed(trigger)
    })

    it("does not pin when the child has its own click action", () => {
      render(
        <Tooltip content="Edit">
          <button type="button">Edit</button>
        </Tooltip>
      )
      const trigger = screen.getByText("Edit").closest('[data-sem="tooltip-trigger"]')!
      fireEvent.click(screen.getByText("Edit"))
      expect(trigger).not.toHaveAttribute("aria-describedby")
    })

    it("pins without taking a tab stop when only toggleOnClick is set", async () => {
      render(
        <Tooltip content="Granted by Rage" toggleOnClick>
          <button type="button" aria-disabled="true">Prof</button>
        </Tooltip>
      )
      const trigger = screen.getByText("Prof").closest('[data-sem="tooltip-trigger"]')!
      expect(trigger).not.toHaveAttribute("tabindex")

      fireEvent.click(screen.getByText("Prof"))
      await expectOpen(trigger)
    })
  })

  it("has no WCAG 2.1 A/AA accessibility violations when the portaled tooltip content is open", async () => {
    render(
      <Tooltip content="More info" triggerFocusable>
        <span>Hover me</span>
      </Tooltip>
    )
    const trigger = screen.getByText("Hover me").closest('[data-sem="tooltip-trigger"]')!
    fireEvent.focus(trigger)
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument())

    // The tooltip content is portaled to document.body, outside the render container, so the
    // scan targets document.body directly. Kobalte's TooltipPrimitive.Portal mounts tooltip
    // content outside any landmark element, which trips axe-core's "region" rule — but that
    // rule carries no WCAG tag (axe-core exempts dialog/alertdialog/svg from it, but not
    // role=tooltip) and ACCESSIBILITY.md's target is WCAG 2.1 AA specifically, not axe's full
    // best-practice ruleset. Scoped to WCAG tags here for the same reason as the Playwright
    // visual-regression axe checks (see tests/visual/*.spec.ts).
    const results = await axe(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
    expect(results.violations).toHaveLength(0)
  })
})

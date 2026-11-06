import { axe } from "vitest-axe"

import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

import { render, screen, fireEvent, within } from "../../test-utils"

// useToast's toasts list is a module-level signal (shared across the whole process, not scoped
// to a component instance), so leftover toasts from one test would otherwise leak into the
// next. Clear it out before every test.
function clearAllToasts() {
  const { toasts, dismiss } = useToast()
  toasts().forEach((t) => dismiss(t.id))
}

describe("Toaster", () => {
  beforeEach(() => {
    clearAllToasts()
  })

  afterEach(() => {
    clearAllToasts()
    vi.useRealTimers()
  })

  it("renders nothing visible when there are no toasts", () => {
    render(() => <Toaster />)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it("renders a toast's title and description after calling toast()", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved", description: "Your changes were saved." })
    expect(screen.getByText("Saved")).toBeInTheDocument()
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument()
  })

  it("renders only the fields that were provided", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    expect(screen.getByText("Saved")).toBeInTheDocument()
  })

  it("renders multiple toasts, most recent first, capped at 3", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "First" })
    toast({ title: "Second" })
    toast({ title: "Third" })
    toast({ title: "Fourth" })

    expect(screen.queryByText("First")).not.toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("Third")).toBeInTheDocument()
    expect(screen.getByText("Fourth")).toBeInTheDocument()
  })

  it("applies the destructive variant class when variant='destructive'", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Something went wrong", variant: "destructive" })
    const title = screen.getByText("Something went wrong")
    const toastEl = title.closest('[data-sem="toast"]')
    expect(toastEl).toHaveClass("destructive", "border-destructive")
  })

  it("removes a toast when its close button is clicked", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Dismiss me" })
    expect(screen.getByText("Dismiss me")).toBeInTheDocument()

    const toastEl = screen.getByText("Dismiss me").closest('[data-sem="toast"]')!
    fireEvent.click(within(toastEl as HTMLElement).getByRole("button"))
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument()
  })

  it("auto-dismisses a toast after the timeout elapses", () => {
    vi.useFakeTimers()
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Auto dismiss" })
    expect(screen.getByText("Auto dismiss")).toBeInTheDocument()

    // TOAST_REMOVE_DELAY (5000ms) marks it closed, then a further 300ms removes it from the list.
    vi.advanceTimersByTime(5300)
    expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument()
  })

  // WCAG 4.1.3 Status Messages: a toast appears without taking focus, so assistive tech only
  // learns of it from a live region, which must be in the page before the toast is added to it
  // (ACCESSIBILITY.md §12). The landmark also keeps toasts, which render after <main>, inside a
  // region that landmark navigation can reach.
  it("is a Notifications landmark holding a polite and an assertive live region before any toast appears", () => {
    render(() => <Toaster />)
    const region = screen.getByRole("region", { name: "Notifications" })
    expect(region.querySelector('[aria-live="polite"]')).toBeInTheDocument()
    expect(region.querySelector('[aria-live="assertive"]')).toBeInTheDocument()
  })

  // The region is fixed over the page even when empty (a band across the top of a phone screen),
  // so it must let taps through to what is underneath; only the toasts themselves take them.
  it("lets taps through to the page, except on a toast", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveClass("pointer-events-none")
    expect(screen.getByText("Saved").closest('[data-sem="toast"]')).toHaveClass("pointer-events-auto")
  })

  it("announces a toast politely", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved", description: "Your changes were saved." })
    expect(screen.getByText("Saved").closest("[aria-live]")).toHaveAttribute("aria-live", "polite")
  })

  it("announces a destructive toast at once", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Something went wrong", variant: "destructive" })
    expect(screen.getByText("Something went wrong").closest("[aria-live]")).toHaveAttribute("aria-live", "assertive")
  })

  // Regression: the region was a live region and each toast had a live role of its own as well, so
  // a toast could be announced twice, and an alert's urgency was blurred by the polite parent
  it("announces each toast through one live region only", () => {
    render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    toast({ title: "Something went wrong", variant: "destructive" })
    const region = screen.getByRole("region", { name: "Notifications" })
    expect(region).not.toHaveAttribute("aria-live")
    for (const title of ["Saved", "Something went wrong"]) {
      const toastEl = screen.getByText(title).closest('[data-sem="toast"]')!
      expect(toastEl).not.toHaveAttribute("role")
      expect(toastEl.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull()
      expect(toastEl.parentElement!.closest("[aria-live]")!.parentElement!.closest("[aria-live]")).toBeNull()
    }
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("has no accessibility violations for a real toast composition", async () => {
    const { container } = render(() => <Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

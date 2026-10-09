import { axe } from "vitest-axe"
import { render, screen, fireEvent, within } from "../../test-utils"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

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
    render(<Toaster />)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it("renders a toast's title and description after calling toast()", () => {
    render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved", description: "Your changes were saved." })
    expect(screen.getByText("Saved")).toBeInTheDocument()
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument()
  })

  it("renders only the fields that were provided", () => {
    render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    expect(screen.getByText("Saved")).toBeInTheDocument()
  })

  it("renders multiple toasts, most recent first, capped at 3", () => {
    render(<Toaster />)
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
    render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Something went wrong", variant: "destructive" })
    const title = screen.getByText("Something went wrong")
    const toastEl = title.closest('[data-sem="toast"]')
    expect(toastEl).toHaveClass("destructive", "border-destructive")
  })

  it("removes a toast when its close button is clicked", () => {
    render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Dismiss me" })
    expect(screen.getByText("Dismiss me")).toBeInTheDocument()

    const toastEl = screen.getByText("Dismiss me").closest('[data-sem="toast"]')!
    fireEvent.click(within(toastEl as HTMLElement).getByRole("button"))
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument()
  })

  it("auto-dismisses a toast after the timeout elapses", () => {
    vi.useFakeTimers()
    render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Auto dismiss" })
    expect(screen.getByText("Auto dismiss")).toBeInTheDocument()

    // TOAST_REMOVE_DELAY (5000ms) marks it closed, then a further 300ms removes it from the list.
    vi.advanceTimersByTime(5300)
    expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument()
  })

  it("has no accessibility violations for a real toast composition", async () => {
    const { container } = render(<Toaster />)
    const { toast } = useToast()
    toast({ title: "Saved" })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

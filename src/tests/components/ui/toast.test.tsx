import { axe } from "vitest-axe"

import { Toast, ToastTitle, ToastDescription, ToastClose } from "@/components/ui/toast"

import { render, screen, fireEvent } from "../../test-utils"

describe("Toast", () => {
  it("renders title and description text", () => {
    render(
      <Toast>
        <ToastTitle>Saved</ToastTitle>
        <ToastDescription>Your changes were saved.</ToastDescription>
      </Toast>
    )
    expect(screen.getByText("Saved")).toBeInTheDocument()
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument()
  })

  it("applies the default variant classes when no variant is given", () => {
    render(<Toast data-test="toast-root">Default toast</Toast>)
    expect(screen.getByTestId("toast-root")).toHaveClass("border", "bg-background", "text-foreground")
  })

  it("applies the destructive variant classes when variant='destructive'", () => {
    render(
      <Toast data-test="toast-root" variant="destructive">
        Destructive toast
      </Toast>
    )
    expect(screen.getByTestId("toast-root")).toHaveClass("destructive", "border-destructive", "bg-destructive")
  })

  it("merges a custom class with the variant classes", () => {
    render(
      <Toast data-test="toast-root" class="mb-2">
        Toast
      </Toast>
    )
    expect(screen.getByTestId("toast-root")).toHaveClass("mb-2", "border")
  })

  it("calls onDismiss when the close button is clicked", () => {
    const onDismiss = vi.fn()
    render(
      <Toast>
        <ToastClose onDismiss={onDismiss} />
      </Toast>
    )
    fireEvent.click(screen.getByRole("button"))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("has no accessibility violations for the message content", async () => {
    const { container } = render(
      <Toast>
        <div>
          <ToastTitle>Saved</ToastTitle>
          <ToastDescription>Your changes were saved.</ToastDescription>
        </div>
      </Toast>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("ToastClose has an accessible name", async () => {
    const { container } = render(
      <Toast>
        <ToastClose onDismiss={() => {}} />
      </Toast>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

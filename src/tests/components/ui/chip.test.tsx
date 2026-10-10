import { axe } from "vitest-axe"

import { Chip } from "@/components/ui/chip"

import { render, screen } from "../../test-utils"

describe("Chip", () => {
  it("renders its children", () => {
    render(<Chip data-test="badge">New</Chip>)
    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("applies the default variant classes when no variant is given", () => {
    render(<Chip data-test="badge">Default</Chip>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground")
  })

  it("applies secondary variant classes", () => {
    render(<Chip data-test="badge" variant="secondary">Secondary</Chip>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground")
    expect(badge).not.toHaveClass("bg-primary")
  })

  it("applies destructive variant classes", () => {
    render(<Chip data-test="badge" variant="destructive">Destructive</Chip>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground")
    expect(badge).not.toHaveClass("bg-primary")
  })

  it("applies outline variant classes", () => {
    render(<Chip data-test="badge" variant="outline">Outline</Chip>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("text-foreground")
    expect(badge).not.toHaveClass("bg-primary")
    expect(badge).not.toHaveClass("bg-secondary")
  })

  it("forwards a custom class alongside variant classes", () => {
    render(<Chip data-test="badge" class="my-custom-class">Custom</Chip>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("my-custom-class")
    expect(badge).toHaveClass("bg-primary")
  })

  it("forwards arbitrary DOM attributes to the root element", () => {
    render(
      <Chip data-test="badge" aria-label="status badge" id="badge-1">
        Status
      </Chip>
    )
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveAttribute("aria-label", "status badge")
    expect(badge).toHaveAttribute("id", "badge-1")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Chip data-test="badge">Accessible</Chip>)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("is a span, so it is valid inside inline content", () => {
    render(<Chip data-test="badge">New</Chip>)
    expect(screen.getByTestId("badge").tagName).toBe("SPAN")
  })

  it("has no hover state — it is display-only", () => {
    render(<Chip data-test="badge" variant="secondary">New</Chip>)
    expect(screen.getByTestId("badge").className).not.toMatch(/hover:/)
  })

  it("sets no data-test of its own, so repeated instances never share a selector", () => {
    const { container } = render(<Chip>New</Chip>)
    expect(container.querySelector("[data-test]")).toBeNull()
  })
})

import { axe } from "vitest-axe"

import { Badge } from "@/components/ui/badge"

import { render, screen } from "../../test-utils"

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("applies the default variant classes when no variant is given", () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground")
  })

  it("applies secondary variant classes", () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground")
    expect(badge).not.toHaveClass("bg-primary")
  })

  it("applies destructive variant classes", () => {
    render(<Badge variant="destructive">Destructive</Badge>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground")
    expect(badge).not.toHaveClass("bg-primary")
  })

  it("applies outline variant classes", () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("text-foreground")
    expect(badge).not.toHaveClass("bg-primary")
    expect(badge).not.toHaveClass("bg-secondary")
  })

  it("forwards a custom class alongside variant classes", () => {
    render(<Badge class="my-custom-class">Custom</Badge>)
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("my-custom-class")
    expect(badge).toHaveClass("bg-primary")
  })

  it("forwards arbitrary DOM attributes to the root element", () => {
    render(
      <Badge aria-label="status badge" id="badge-1">
        Status
      </Badge>
    )
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveAttribute("aria-label", "status badge")
    expect(badge).toHaveAttribute("id", "badge-1")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Badge>Accessible</Badge>)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

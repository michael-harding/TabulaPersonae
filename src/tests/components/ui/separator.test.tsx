import { axe } from "vitest-axe"
import { render, screen } from "../../test-utils"
import { Separator } from "@/components/ui/separator"

describe("Separator", () => {
  it("renders with the default horizontal orientation classes", () => {
    render(<Separator />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveClass("h-[1px]", "w-full")
  })

  it("renders with vertical orientation classes when orientation is 'vertical'", () => {
    render(<Separator orientation="vertical" />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveClass("h-full", "w-[1px]")
    expect(separator).not.toHaveClass("h-[1px]", "w-full")
  })

  it("is decorative (role='none') by default", () => {
    render(<Separator />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveAttribute("role", "none")
    expect(separator).not.toHaveAttribute("aria-orientation")
  })

  it("exposes role='separator' and aria-orientation when decorative is false", () => {
    render(<Separator decorative={false} orientation="vertical" />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveAttribute("role", "separator")
    expect(separator).toHaveAttribute("aria-orientation", "vertical")
  })

  it("forwards a custom class alongside orientation classes", () => {
    render(<Separator class="my-separator" />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveClass("my-separator")
    expect(separator).toHaveClass("bg-border")
  })

  it("forwards arbitrary DOM attributes to the root element", () => {
    render(<Separator id="sep-1" data-foo="bar" />)
    const separator = screen.getByTestId("separator")
    expect(separator).toHaveAttribute("id", "sep-1")
    expect(separator).toHaveAttribute("data-foo", "bar")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Separator />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

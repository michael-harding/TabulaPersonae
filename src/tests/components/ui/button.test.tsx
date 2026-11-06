import { axe } from "vitest-axe"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { render, screen, fireEvent } from "../../test-utils"

describe("Button", () => {
  it("renders its children", () => {
    render(() => <Button>Save</Button>)
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })

  it("forwards data-test, class, and aria-* props to the root element", () => {
    render(() => (
      <Button data-test="save-button" class="extra-class" aria-label="Save character">
        Save
      </Button>
    ))
    const button = screen.getByTestId("save-button")
    expect(button).toHaveClass("extra-class")
    expect(button).toHaveAttribute("aria-label", "Save character")
  })

  it("fires onClick when clicked", () => {
    const onClick = vi.fn()
    render(() => <Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Click me" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn()
    render(() => (
      <Button onClick={onClick} disabled>
        Click me
      </Button>
    ))
    fireEvent.click(screen.getByRole("button", { name: "Click me" }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("defaults to the default variant and size classes", () => {
    render(() => <Button data-test="default-button">Default</Button>)
    const button = screen.getByTestId("default-button")
    expect(button.className).toBe(cn(buttonVariants({ variant: "default", size: "default" })))
  })

  it.each(["default", "secondary", "outline", "ghost", "ghostDestructive", "link", "destructive"] as const)(
    "applies classes for the %s variant",
    (variant) => {
      render(() => (
        <Button data-test={`variant-${variant}`} variant={variant}>
          {variant}
        </Button>
      ))
      const button = screen.getByTestId(`variant-${variant}`)
      expect(button.className).toBe(cn(buttonVariants({ variant, size: "default" })))
    }
  )

  it.each(["default", "sm", "lg", "icon", "bareIcon"] as const)("applies classes for the %s size", (size) => {
    render(() => (
      <Button data-test={`size-${size}`} size={size}>
        {size}
      </Button>
    ))
    const button = screen.getByTestId(`size-${size}`)
    expect(button.className).toBe(cn(buttonVariants({ variant: "default", size })))
  })

  // The look of an icon-only delete button: just the icon, in a box that is itself the 44px
  // touch target, turning red on hover with no background behind it.
  it("renders a bare icon as a 44px box with no padding, fixed size or hover background", () => {
    render(() => <Button data-test="bare" variant="ghostDestructive" size="bareIcon" aria-label="Delete" />)
    const button = screen.getByTestId("bare")
    expect(button).toHaveClass("min-h-11", "min-w-11", "shrink-0", "p-0", "text-muted-foreground", "hover:text-destructive-text")
    expect(button.className).not.toMatch(/(^| )(h-\d+|w-\d+|px-\d+|py-\d+|hover:bg-\S+)( |$)/)
  })

  it("renders the given type attribute", () => {
    render(() => <Button type="submit">Submit</Button>)
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <Button aria-label="Accessible button">Go</Button>)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

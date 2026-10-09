import { axe } from "vitest-axe"
import { render, screen } from "../../test-utils"
import { Progress } from "@/components/ui/progress"

describe("Progress", () => {
  it("renders a progressbar at the root data-test node", () => {
    render(<Progress value={40} aria-label="Hit points" />)
    expect(screen.getByTestId("progress")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("reports the given value via aria-valuenow", () => {
    render(<Progress value={40} aria-label="Hit points" />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40")
  })

  it("defaults to a value of 0 when none is provided", () => {
    render(<Progress aria-label="Hit points" />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })

  it("translates the fill to reflect the value", () => {
    render(<Progress value={25} aria-label="Hit points" />)
    const fill = screen.getByTestId("progress-fill")
    expect(fill).toHaveStyle({ transform: "translateX(-75%)" })
  })

  it("fully reveals the fill when value is 100", () => {
    render(<Progress value={100} aria-label="Hit points" />)
    const fill = screen.getByTestId("progress-fill")
    expect(fill).toHaveStyle({ transform: "translateX(-0%)" })
  })

  it("forwards a custom class to the root element", () => {
    render(<Progress value={50} aria-label="Hit points" class="my-progress" />)
    const progress = screen.getByTestId("progress")
    expect(progress).toHaveClass("my-progress", "bg-secondary")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Progress value={50} aria-label="Hit points" />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

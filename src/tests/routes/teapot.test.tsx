import { axe } from "vitest-axe"
import { cleanup, render, screen } from "../test-utils"
import Teapot from "@/routes/Teapot"

afterEach(() => {
  cleanup()
})

describe("Teapot page", () => {
  it("renders the 418 heading and message", () => {
    render(<Teapot />)
    expect(screen.getByRole("heading", { name: "418" })).toBeInTheDocument()
    expect(screen.getByText(/i'm a teapot/i)).toBeInTheDocument()
  })
})

describe("Teapot page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<Teapot />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

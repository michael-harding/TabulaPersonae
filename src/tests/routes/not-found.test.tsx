import { axe } from "vitest-axe"

import NotFound from "@/routes/NotFound"

import { cleanup, render, screen } from "../test-utils"

afterEach(() => {
  cleanup()
})

describe("NotFound page", () => {
  it("renders the 404 heading and message", () => {
    render(<NotFound />)
    expect(screen.getByRole("heading", { name: /404 - not found/i })).toBeInTheDocument()
    expect(screen.getByText(/vanished into the ethereal plane/i)).toBeInTheDocument()
  })

  it("renders a link back to the character list", () => {
    render(<NotFound />)
    const link = screen.getByRole("link", { name: /back to character list/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/")
  })
})

describe("NotFound page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<NotFound />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

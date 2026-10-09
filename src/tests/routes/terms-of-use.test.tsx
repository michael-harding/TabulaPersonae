import { axe } from "vitest-axe"
import { cleanup, render, screen } from "../test-utils"
import TermsOfUse from "@/routes/TermsOfUse"

afterEach(() => {
  cleanup()
})

describe("TermsOfUse page", () => {
  it("renders the page heading", () => {
    render(<TermsOfUse />)
    expect(screen.getByRole("heading", { name: /terms of use/i, level: 1 })).toBeInTheDocument()
  })

  it("renders a link back to auth", () => {
    render(<TermsOfUse />)
    const link = screen.getByRole("link", { name: /back/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/auth")
  })

  it("renders the substantive body content", () => {
    render(<TermsOfUse />)
    expect(screen.getByRole("heading", { name: /use of the app/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /prohibited conduct/i })).toBeInTheDocument()
    expect(screen.getByText(/you retain ownership of any character data you create/i)).toBeInTheDocument()
  })
})

describe("TermsOfUse page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<TermsOfUse />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

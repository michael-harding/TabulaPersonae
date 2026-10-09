import { axe } from "vitest-axe"
import { cleanup, render, screen } from "../test-utils"
import PrivacyPolicy from "@/routes/PrivacyPolicy"

afterEach(() => {
  cleanup()
})

describe("PrivacyPolicy page", () => {
  it("renders the page heading", () => {
    render(<PrivacyPolicy />)
    expect(screen.getByRole("heading", { name: /privacy policy/i, level: 1 })).toBeInTheDocument()
  })

  it("renders a link back to auth", () => {
    render(<PrivacyPolicy />)
    const link = screen.getByRole("link", { name: /back/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/auth")
  })

  it("renders the substantive body content", () => {
    render(<PrivacyPolicy />)
    expect(screen.getByRole("heading", { name: /using without an account/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /information collected for account holders/i })).toBeInTheDocument()
    expect(screen.getByText(/all character data is stored exclusively in your browser's local storage/i)).toBeInTheDocument()
  })
})

describe("PrivacyPolicy page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<PrivacyPolicy />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

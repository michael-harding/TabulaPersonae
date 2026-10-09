import { axe } from "vitest-axe"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

import { render, screen } from "../../test-utils"

function renderFullCard() {
  return render(
    <Card data-test="card">
      <CardHeader data-test="card-header">
        <CardTitle data-test="card-title">Title</CardTitle>
        <CardDescription data-test="card-description">Description</CardDescription>
      </CardHeader>
      <CardContent data-test="card-content">Body content</CardContent>
      <CardFooter data-test="card-footer">Footer content</CardFooter>
    </Card>
  )
}

describe("Card", () => {
  it("renders composed card content", () => {
    renderFullCard()
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("Body content")).toBeInTheDocument()
    expect(screen.getByText("Footer content")).toBeInTheDocument()
  })

  it("forwards a caller-supplied data-test to each part", () => {
    renderFullCard()
    expect(screen.getByTestId("card")).toBeInTheDocument()
    expect(screen.getByTestId("card-header")).toBeInTheDocument()
    expect(screen.getByTestId("card-title")).toHaveTextContent("Title")
    expect(screen.getByTestId("card-description")).toHaveTextContent("Description")
    expect(screen.getByTestId("card-content")).toHaveTextContent("Body content")
    expect(screen.getByTestId("card-footer")).toHaveTextContent("Footer content")
  })

  it("forwards a custom class to the root and nested parts", () => {
    render(
      <Card data-test="card" class="card-class">
        <CardHeader data-test="card-header" class="header-class">Header</CardHeader>
      </Card>
    )
    expect(screen.getByTestId("card")).toHaveClass("card-class", "rounded-lg")
    expect(screen.getByTestId("card-header")).toHaveClass("header-class", "flex")
  })

  it("forwards arbitrary DOM attributes to the root element", () => {
    render(
      <Card data-test="card" aria-label="character summary" id="card-1">
        Content
      </Card>
    )
    const card = screen.getByTestId("card")
    expect(card).toHaveAttribute("aria-label", "character summary")
    expect(card).toHaveAttribute("id", "card-1")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFullCard()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it("sets no data-test of its own, so repeated cards never share a selector", () => {
    const { container } = render(
      <Card>
        <CardHeader><CardTitle>T</CardTitle><CardDescription>D</CardDescription></CardHeader>
        <CardContent>C</CardContent>
        <CardFooter>F</CardFooter>
      </Card>
    )
    expect(container.querySelector("[data-test]")).toBeNull()
  })
})

import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../../test-utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

describe("Textarea", () => {
  it("renders with the given value", () => {
    render(<Textarea value="A brief backstory." aria-label="Backstory" onInput={vi.fn()} />)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toHaveValue("A brief backstory.")
  })

  it("forwards data-test, class, and aria-* props to the root element", () => {
    render(<Textarea data-test="backstory-textarea" class="extra-class" aria-label="Backstory" />)
    const textarea = screen.getByTestId("backstory-textarea")
    expect(textarea).toHaveClass("extra-class")
    expect(textarea).toHaveAttribute("aria-label", "Backstory")
  })

  it("forwards the placeholder attribute", () => {
    render(<Textarea placeholder="Tell us your story" aria-label="Backstory" />)
    expect(screen.getByPlaceholderText("Tell us your story")).toBeInTheDocument()
  })

  it("fires onInput when the user types", () => {
    const onInput = vi.fn()
    render(<Textarea aria-label="Backstory" onInput={onInput} />)
    fireEvent.input(screen.getByRole("textbox", { name: "Backstory" }), {
      target: { value: "Born in the Shire." },
    })
    expect(onInput).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toHaveValue("Born in the Shire.")
  })

  it("is disabled when disabled prop is set", () => {
    render(<Textarea disabled aria-label="Backstory" />)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Label for="a11y-textarea">Backstory</Label>
        <Textarea id="a11y-textarea" onInput={vi.fn()} />
      </>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

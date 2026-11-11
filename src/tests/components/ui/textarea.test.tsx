import { createSignal } from "solid-js"
import { axe } from "vitest-axe"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { render, screen, fireEvent } from "../../test-utils"

describe("Textarea", () => {
  it("renders with the given value", () => {
    render(() => <Textarea value="A brief backstory." aria-label="Backstory" onInput={vi.fn()} />)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toHaveValue("A brief backstory.")
  })

  it("forwards data-test, class, and aria-* props to the root element", () => {
    render(() => <Textarea data-test="backstory-textarea" class="extra-class" aria-label="Backstory" />)
    const textarea = screen.getByTestId("backstory-textarea")
    expect(textarea).toHaveClass("extra-class")
    expect(textarea).toHaveAttribute("aria-label", "Backstory")
  })

  it("forwards the placeholder attribute", () => {
    render(() => <Textarea placeholder="Tell us your story" aria-label="Backstory" />)
    expect(screen.getByPlaceholderText("Tell us your story")).toBeInTheDocument()
  })

  it("fires onInput when the user types", () => {
    const onInput = vi.fn()
    render(() => <Textarea aria-label="Backstory" onInput={onInput} />)
    fireEvent.input(screen.getByRole("textbox", { name: "Backstory" }), {
      target: { value: "Born in the Shire." },
    })
    expect(onInput).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toHaveValue("Born in the Shire.")
  })

  it("is disabled when disabled prop is set", () => {
    render(() => <Textarea disabled aria-label="Backstory" />)
    expect(screen.getByRole("textbox", { name: "Backstory" })).toBeDisabled()
  })

  it("passes its element to a ref", () => {
    let ref: HTMLTextAreaElement | undefined
    render(() => <Textarea ref={ref} aria-label="Backstory" />)
    expect(ref).toBe(screen.getByRole("textbox", { name: "Backstory" }))
  })

  describe("fits its height to its text", () => {
    // jsdom does no layout, so a textarea's content height is stood in for: 20px a line plus 16px
    // of padding. Its border is 0 here, so the height it is given is exactly that.
    const contentHeight = (lines: number) => `${lines * 20 + 16}px`

    beforeEach(() => {
      vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(function (
        this: HTMLTextAreaElement
      ) {
        return this.value.split("\n").length * 20 + 16
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("when it first appears, as when a modal opens on a saved description", () => {
      render(() => <Textarea value={"one\ntwo\nthree"} aria-label="Description" onInput={vi.fn()} />)
      expect(screen.getByRole("textbox", { name: "Description" }).style.height).toBe(contentHeight(3))
    })

    it("as the user types or pastes, growing and shrinking with the text", () => {
      render(() => <Textarea aria-label="Description" />)
      const textarea = screen.getByRole("textbox", { name: "Description" })

      fireEvent.input(textarea, { target: { value: "one\ntwo\nthree\nfour\nfive" } })
      expect(textarea.style.height).toBe(contentHeight(5))

      fireEvent.input(textarea, { target: { value: "one\ntwo" } })
      expect(textarea.style.height).toBe(contentHeight(2))
    })

    it("when its value is changed from outside, as when a form is reset", () => {
      const [value, setValue] = createSignal("one")
      render(() => <Textarea value={value()} aria-label="Description" onInput={vi.fn()} />)
      const textarea = screen.getByRole("textbox", { name: "Description" })
      expect(textarea.style.height).toBe(contentHeight(1))

      setValue("one\ntwo\nthree\nfour")
      expect(textarea.style.height).toBe(contentHeight(4))
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => (
      <>
        <Label for="a11y-textarea">Backstory</Label>
        <Textarea id="a11y-textarea" onInput={vi.fn()} />
      </>
    ))
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

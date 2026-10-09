import { axe } from "vitest-axe"

import { MarkdownContent } from "@/components/ui/markdown-content"

import { render, screen } from "../../test-utils"

describe("MarkdownContent", () => {
  it("renders plain text", () => {
    render(<MarkdownContent text="Hello world" />)
    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("renders **bold** markdown as a <strong> element", () => {
    render(<MarkdownContent text="This is **bold** text" />)
    expect(screen.getByText("bold").tagName).toBe("STRONG")
  })

  it("renders _italic_ markdown as an <em> element", () => {
    render(<MarkdownContent text="This is _italic_ text" />)
    expect(screen.getByText("italic").tagName).toBe("EM")
  })

  it("renders a markdown heading as a heading element", () => {
    render(<MarkdownContent text="# Section Title" />)
    expect(screen.getByRole("heading", { level: 1, name: "Section Title" })).toBeInTheDocument()
  })

  it("renders a markdown list as list items", () => {
    render(<MarkdownContent text={"- One\n- Two"} />)
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("applies the given class alongside the default markdown-content class", () => {
    render(<MarkdownContent text="Hello" class="custom-class" />)
    const root = screen.getByTestId("markdown-content")
    expect(root).toHaveClass("markdown-content", "custom-class")
  })

  describe("sanitization of untrusted input", () => {
    it("strips an onerror handler from an injected <img> tag", () => {
      render(<MarkdownContent text='Click here <img src="x" onerror="alert(1)">' />)
      const root = screen.getByTestId("markdown-content")
      expect(root.innerHTML).not.toContain("onerror")
      expect(root.innerHTML).not.toContain("alert(1)")
    })

    it("strips a raw <script> tag entirely and never executes its contents", () => {
      ;(window as unknown as { wasXSSed?: boolean }).wasXSSed = undefined
      render(<MarkdownContent text={"Hello<script>window.wasXSSed = true</script>"} />)
      const root = screen.getByTestId("markdown-content")
      expect(root.innerHTML).not.toContain("<script")
      expect(root.innerHTML).not.toContain("wasXSSed")
      expect((window as unknown as { wasXSSed?: boolean }).wasXSSed).toBeUndefined()
    })

    it("strips a javascript: href from an injected link", () => {
      render(<MarkdownContent text='[click me](javascript:alert(1))' />)
      const root = screen.getByTestId("markdown-content")
      expect(root.innerHTML).not.toContain("javascript:")
    })

    it("still renders legitimate markdown alongside sanitized malicious input", () => {
      render(<MarkdownContent text={"**Safe bold** <img src=x onerror=\"alert(1)\">"} />)
      expect(screen.getByText("Safe bold").tagName).toBe("STRONG")
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<MarkdownContent text={"# Title\n\nSome **bold** paragraph text."} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

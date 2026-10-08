import { type Component } from "solid-js"
import DOMPurify from "dompurify"
import { marked } from "marked"

marked.setOptions({ breaks: true, gfm: true })

interface MarkdownContentProps {
  text: string
  class?: string
}

export const MarkdownContent: Component<MarkdownContentProps> = (props) => {
  // Security review (CONSTITUTION.md §10.3): `innerHTML` is required here to render
  // parsed Markdown as HTML. The output is passed through DOMPurify.sanitize() before
  // being set, which strips script tags, event handler attributes, and other XSS
  // vectors, so untrusted `props.text` cannot execute script in the rendered output.
  const html = () => DOMPurify.sanitize(marked.parse(props.text) as string)
  return (
    <div
      class={`markdown-content text-sm${props.class ? ` ${props.class}` : ""}`}
      // eslint-disable-next-line solid/no-innerhtml -- sanitized via DOMPurify.sanitize() above; approved exception per CONSTITUTION.md §10.3
      innerHTML={html()}
    />
  )
}

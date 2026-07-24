import { type Component } from "solid-js"
import DOMPurify from "dompurify"
import { marked } from "marked"

marked.setOptions({ breaks: true, gfm: true })

interface MarkdownContentProps {
  text: string
  class?: string
}

export const MarkdownContent: Component<MarkdownContentProps> = (props) => {
  const html = () => DOMPurify.sanitize(marked.parse(props.text) as string)
  return (
    <div
      class={`markdown-content text-sm${props.class ? ` ${props.class}` : ""}`}
      innerHTML={html()}
    />
  )
}

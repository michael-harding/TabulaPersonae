import { ComponentProps, createEffect, on, onCleanup, onMount, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

/**
 * A multi-line text field whose height follows its text, so none of it is hidden behind a
 * scrollbar of the field's own: a long text makes the modal or page around it scroll instead.
 * Its `rows` and minimum height are the smallest it gets. It fits itself when it first appears,
 * on every edit (typing, pasting, cutting), when its value is changed from outside (a form reset),
 * and when its width changes, since the text then wraps onto a different number of lines.
 * A typed key in a controlled field reaches it twice (the input event, then the value coming back
 * through props); measuring forces layout, so a value it has already fitted is not fitted again.
 * A drag handle would be undone by the next edit, so there is none.
 */
export function Textarea(props: ComponentProps<"textarea">) {
  const [local, others] = splitProps(props, ["class", "ref"])
  let el!: HTMLTextAreaElement
  // The value the height was last measured for
  let fittedValue: string | undefined

  const fit = () => {
    fittedValue = el.value
    // Collapsing the field to measure it can briefly shorten a scrolled container (the modal, the
    // page) below its scroll position, which the browser then clamps. Each is put back afterwards,
    // or typing near the bottom of a long modal would throw it upwards on every key.
    const scrolled: [Element, number][] = []
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (node.scrollTop > 0) scrolled.push([node, node.scrollTop])
    }
    el.style.height = "auto"
    const border = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + border}px`
    for (const [node, top] of scrolled) node.scrollTop = top
  }
  const fitIfChanged = () => {
    if (el.value !== fittedValue) fit()
  }

  onMount(() => {
    fit()
    el.addEventListener("input", fitIfChanged)
    onCleanup(() => el.removeEventListener("input", fitIfChanged))

    // Width only: the observer also sees the height changes fit() itself makes. A field mounted
    // hidden has no width, and is fitted once it is shown. The value is unchanged here, so this fit
    // is unconditional.
    if (typeof ResizeObserver !== "undefined") {
      let width = el.clientWidth
      const observer = new ResizeObserver(() => {
        if (el.clientWidth === width) return
        width = el.clientWidth
        fit()
      })
      observer.observe(el)
      onCleanup(() => observer.disconnect())
    }
  })

  createEffect(on(() => props.value, fitIfChanged, { defer: true }))

  return (
    <textarea
      data-sem="textarea"
      ref={(node) => {
        el = node
        const forward = local.ref
        if (typeof forward === "function") forward(node)
      }}
      class={cn(
        "flex min-h-[80px] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive md:text-sm",
        local.class
      )}
      {...others}
    />
  )
}

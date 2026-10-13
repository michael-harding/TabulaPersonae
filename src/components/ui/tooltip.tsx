import { Tooltip as TooltipPrimitive } from "@kobalte/core/tooltip"
import { ComponentProps, JSX, createEffect, createSignal, onCleanup, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

type TooltipProps = {
  content: JSX.Element
  children: JSX.Element
  class?: string
  triggerClass?: string
  /** The child has no focus of its own (plain text, an icon), so the trigger takes the tab stop. */
  triggerFocusable?: boolean
  /**
   * A click or tap on the trigger pins the tooltip open, so touch users (who cannot hover) can
   * read it and anyone can select its text. A second click, a click outside both the trigger and
   * the tooltip, or Escape closes it. Only for children with no click action of their own.
   * Defaults to `triggerFocusable`.
   */
  toggleOnClick?: boolean
} & Omit<ComponentProps<typeof TooltipPrimitive>, "children" | "open" | "defaultOpen" | "onOpenChange">

export function Tooltip(props: TooltipProps) {
  const [local, rest] = splitProps(props, ["content", "children", "class", "triggerClass", "triggerFocusable", "toggleOnClick"])
  const toggleOnClick = () => local.toggleOnClick ?? local.triggerFocusable ?? false
  // Kobalte's own hover/focus state, kept apart from the pin so its many implicit closes
  // (pointer leave, blur, click, scroll) cannot close a tooltip the user pinned.
  const [hoverOpen, setHoverOpen] = createSignal(false)
  const [pinned, setPinned] = createSignal(false)
  const isPinned = () => toggleOnClick() && pinned()
  // undefined until mounted: the trigger always renders, the content only while open.
  let triggerElement: HTMLElement | undefined
  let contentElement: HTMLElement | undefined

  const isOnTooltip = (target: EventTarget | null) =>
    target instanceof Node && ((triggerElement?.contains(target) ?? false) || (contentElement?.contains(target) ?? false))

  createEffect(() => {
    if (!isPinned()) return
    const unpinOnOutsidePointerDown = (event: PointerEvent) => {
      if (!isOnTooltip(event.target)) setPinned(false)
    }
    const unpinOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false)
    }
    document.addEventListener("pointerdown", unpinOnOutsidePointerDown, true)
    document.addEventListener("keydown", unpinOnEscape)
    onCleanup(() => {
      document.removeEventListener("pointerdown", unpinOnOutsidePointerDown, true)
      document.removeEventListener("keydown", unpinOnEscape)
    })
  })

  return (
    <TooltipPrimitive gutter={6} {...rest} open={hoverOpen() || isPinned()} onOpenChange={setHoverOpen}>
      <TooltipPrimitive.Trigger
        as="div"
        ref={(element) => (triggerElement = element)}
        data-sem="tooltip-trigger"
        class={cn("inline-flex", local.triggerClass)}
        tabIndex={local.triggerFocusable ? 0 : undefined}
        role={local.triggerFocusable ? "group" : undefined}
        // Bound on the element itself (not delegated): iOS Safari only fires click on a
        // non-interactive element that has its own listener, and the trigger must not take a
        // pointer cursor to get one — clicking reveals context, it does not act on the value.
        on:click={() => {
          if (toggleOnClick()) setPinned((wasPinned) => !wasPinned)
        }}
        onBlur={(event) => {
          // A null relatedTarget is a click on the (unfocusable) tooltip text, which must not close it.
          if (event.relatedTarget != null && !isOnTooltip(event.relatedTarget)) setPinned(false)
        }}
      >
        {local.children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={(element) => (contentElement = element)}
          // Otherwise pressing the trigger dismisses a hover-opened tooltip just before the click pins it.
          onPointerDownOutside={(event) => {
            if (toggleOnClick() && event.target instanceof Node && (triggerElement?.contains(event.target) ?? false)) event.preventDefault()
          }}
          class={cn(
            "z-50 select-text rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            local.class
          )}
        >
          <TooltipPrimitive.Arrow />
          {local.content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive>
  )
}

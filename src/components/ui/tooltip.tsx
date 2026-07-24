import { Tooltip as TooltipPrimitive } from "@kobalte/core/tooltip"
import { ComponentProps, JSX, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

type TooltipProps = {
  content: JSX.Element
  children: JSX.Element
  class?: string
  triggerClass?: string
  triggerFocusable?: boolean
} & Omit<ComponentProps<typeof TooltipPrimitive>, "children">

export function Tooltip(props: TooltipProps) {
  const [local, rest] = splitProps(props, ["content", "children", "class", "triggerClass", "triggerFocusable"])
  return (
    <TooltipPrimitive gutter={6} {...rest}>
      <TooltipPrimitive.Trigger
        as="div"
        data-sem="tooltip-trigger"
        class={cn("inline-flex", local.triggerClass)}
        tabIndex={local.triggerFocusable ? 0 : undefined}
        role={local.triggerFocusable ? "group" : undefined}
      >
        {local.children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          class={cn(
            "z-50 rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
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

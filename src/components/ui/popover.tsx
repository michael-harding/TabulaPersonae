import { Popover as PopoverPrimitive } from "@kobalte/core/popover"
import { ComponentProps, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export const Popover = PopoverPrimitive
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverArrow = PopoverPrimitive.Arrow
export const PopoverTitle = PopoverPrimitive.Title

const MOTION = {
  // Grows from its own center: for a popover beside its trigger
  zoom: "animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
  // Fades in place: for a popover pinned over its anchor, whose edges must not drift as it opens
  fade: "animate-in fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0",
}

export function PopoverContent(props: ComponentProps<typeof PopoverPrimitive.Content> & { motion?: keyof typeof MOTION }) {
  const [local, others] = splitProps(props, ["class", "motion"])
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-sem="popover-content"
        class={cn(
          "z-50 w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          MOTION[local.motion ?? "zoom"],
          local.class
        )}
        {...others}
      />
    </PopoverPrimitive.Portal>
  )
}

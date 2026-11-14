import { Collapsible as CollapsiblePrimitive, useCollapsibleContext } from "@kobalte/core/collapsible"
import ChevronDown from "lucide-solid/icons/chevron-down"

import { cn } from "@/lib/utils"

export const Collapsible = CollapsiblePrimitive
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger
export const CollapsibleContent = CollapsiblePrimitive.Content

/**
 * The expander chevron for a CollapsibleTrigger. It reads the open state from the enclosing
 * Collapsible, so it always points down when closed and up when open, with no per-site wiring.
 * shrink-0 stops a crowded header row on a narrow screen from squeezing the icon smaller.
 * The rotation is the static indicator ACCESSIBILITY.md §10 requires: under reduced motion
 * the global rule in globals.css makes it instant rather than removing it.
 */
export function CollapsibleChevron(props: { class?: string }) {
  const context = useCollapsibleContext()
  return (
    <ChevronDown
      data-sem="collapsible-chevron"
      class={cn("h-4 w-4 shrink-0 transition-transform duration-200", context.isOpen() && "rotate-180", props.class)}
      aria-hidden="true"
    />
  )
}

import type { ParentProps } from "solid-js"
import ChevronDown from "lucide-solid/icons/chevron-down"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function ModifierGroup(props: ParentProps<{ label: string; open: boolean; onOpenChange: (open: boolean) => void; "data-test"?: string }>) {
  return (
    <Collapsible data-sem="modifier-group" open={props.open} onOpenChange={props.onOpenChange}>
      {/* A full 44px-tall row (ACCESSIBILITY.md touch targets) at the same text size as the
          modal's other field labels. */}
      <CollapsibleTrigger data-test={props["data-test"]} class="flex min-h-11 w-full items-center justify-between border-t text-sm font-medium text-muted-foreground hover:text-foreground">
        <span>{props.label}</span>
        <ChevronDown class="h-4 w-4" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent class="space-y-3 pt-2 pb-1">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}

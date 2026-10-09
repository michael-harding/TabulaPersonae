import type { ParentProps } from "solid-js"
import ChevronDown from "lucide-solid/icons/chevron-down"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function ModifierGroup(props: ParentProps<{ label: string; open: boolean; onOpenChange: (open: boolean) => void; "data-test"?: string }>) {
  return (
    <Collapsible data-sem="modifier-group" open={props.open} onOpenChange={props.onOpenChange}>
      <CollapsibleTrigger data-test={props["data-test"]} class="flex w-full items-center justify-between text-xs font-medium text-muted-foreground border-t pt-2">
        <span>{props.label}</span>
        <ChevronDown class="h-3.5 w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent class="space-y-3 pt-2 pb-1">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}

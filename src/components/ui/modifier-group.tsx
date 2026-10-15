import type { ParentProps } from "solid-js"
import ChevronDown from "lucide-solid/icons/chevron-down"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function ModifierGroup(props: ParentProps<{ label: string; open: boolean; onOpenChange: (open: boolean) => void; "data-test"?: string }>) {
  return (
    <Collapsible data-sem="modifier-group" open={props.open} onOpenChange={props.onOpenChange}>
      {/* A full 44px-tall row (ACCESSIBILITY.md touch targets) at the same text size as the
          modal's other field labels. text-left: a <button> centres its text, which shows once a
          long label wraps onto a second line. */}
      <CollapsibleTrigger data-test={props["data-test"]} class="flex min-h-11 w-full items-center justify-between gap-2 border-t text-left text-sm font-medium text-muted-foreground hover:text-foreground">
        <span>{props.label}</span>
        <ChevronDown class="h-4 w-4 shrink-0" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent class="space-y-3 pt-2 pb-1">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}

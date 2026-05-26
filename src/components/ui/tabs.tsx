import { Tabs as TabsPrimitive } from "@kobalte/core/tabs"
import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

export const TabsRoot = TabsPrimitive

export function TabsList(props: ComponentProps<typeof TabsPrimitive.List>) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <TabsPrimitive.List
      class={cn("flex border-b border-border", local.class)}
      {...rest}
    />
  )
}

export function TabsTrigger(props: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <TabsPrimitive.Trigger
      class={cn(
        "px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        "data-[selected]:text-foreground data-[selected]:border-b-2 data-[selected]:border-primary",
        local.class
      )}
      {...rest}
    />
  )
}

export function TabsContent(props: ComponentProps<typeof TabsPrimitive.Content>) {
  const [local, rest] = splitProps(props, ["class"])
  return <TabsPrimitive.Content class={cn("mt-4", local.class)} {...rest} />
}

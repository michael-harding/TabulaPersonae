import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

export function Label(props: ComponentProps<"label">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <label
      class={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", local.class)}
      {...others}
    />
  )
}

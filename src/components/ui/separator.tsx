import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

type SeparatorProps = ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

export function Separator(props: SeparatorProps) {
  const [local, others] = splitProps(props, ["class", "orientation", "decorative"])
  const orientation = () => local.orientation ?? "horizontal"
  return (
    <div
      role={local.decorative ?? true ? "none" : "separator"}
      aria-orientation={orientation()}
      class={cn(
        "shrink-0 bg-border",
        orientation() === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        local.class
      )}
      {...others}
    />
  )
}

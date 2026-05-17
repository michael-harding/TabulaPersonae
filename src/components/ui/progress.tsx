import { Progress as ProgressPrimitive } from "@kobalte/core/progress"
import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

type ProgressProps = ComponentProps<typeof ProgressPrimitive> & { class?: string }

export function Progress(props: ProgressProps) {
  const [local, others] = splitProps(props, ["class", "value"])
  return (
    <ProgressPrimitive
      value={local.value as number}
      class={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", local.class)}
      {...others}
    >
      <ProgressPrimitive.Track class="h-full w-full">
        <ProgressPrimitive.Fill
          class="h-full flex-1 transition-all bg-red-700"
          style={{ transform: `translateX(-${100 - (Number(local.value) || 0)}%)` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive>
  )
}

import { Checkbox as CheckboxPrimitive } from "@kobalte/core/checkbox"
import { ComponentProps, splitProps } from "solid-js"
import Check from "lucide-solid/icons/check"
import { cn } from "@/lib/utils"

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & { class?: string }

export function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["class"])
  const [inputAttrs, others] = splitProps(rest, ["title", "aria-label"])
  return (
    <CheckboxPrimitive {...others}>
      <CheckboxPrimitive.Input {...inputAttrs} />
      <CheckboxPrimitive.Control
        class={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground",
          local.class
        )}
      >
        <CheckboxPrimitive.Indicator class="flex items-center justify-center text-current">
          <Check class="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive>
  )
}

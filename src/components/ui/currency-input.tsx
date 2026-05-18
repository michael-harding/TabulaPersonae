import { splitProps } from "solid-js"
import type { ComponentProps } from "solid-js"
import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import Minus from "lucide-solid/icons/minus"
import Plus from "lucide-solid/icons/plus"

type CurrencyInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "min" | "max"> & {
  value: number
  onChange: (value: number) => void
  onAtMin?: () => void
  min?: number
  max?: number
}

export function CurrencyInput(props: CurrencyInputProps) {
  const [local, rest] = splitProps(props, ["value", "onChange", "onAtMin", "min", "max"])

  const clamp = (n: number) => {
    let v = n
    if (local.min !== undefined) v = Math.max(local.min, v)
    if (local.max !== undefined) v = Math.min(local.max, v)
    return v
  }

  return (
    <div class="flex items-stretch">
      <Button
        variant="outline"
        size="icon"
        class="h-11 w-11 shrink-0 rounded-r-none border-r-0"
        onClick={() => {
          if (local.min !== undefined && local.value <= local.min) {
            local.onAtMin?.()
          } else {
            local.onChange(clamp(local.value - 1))
          }
        }}
        aria-label="Decrease"
      >
        <Minus class="h-3 w-3" />
      </Button>
      <NumericInput
        {...rest}
        value={local.value}
        onChange={local.onChange}
        min={local.min}
        max={local.max}
        class="text-center h-11 px-0 py-0 w-[5ch] min-w-[3ch] max-w-[5ch] rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        variant="outline"
        size="icon"
        class="h-11 w-11 shrink-0 rounded-l-none border-l-0"
        onClick={() => local.onChange(clamp(local.value + 1))}
        aria-label="Increase"
      >
        <Plus class="h-3 w-3" />
      </Button>
    </div>
  )
}

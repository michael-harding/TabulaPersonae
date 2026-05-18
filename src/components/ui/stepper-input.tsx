import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import Minus from "lucide-solid/icons/minus"
import Plus from "lucide-solid/icons/plus"

interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  onAtMin?: () => void
}

export function StepperInput(props: StepperInputProps) {
  const clamp = (n: number) => {
    let v = n
    if (props.min !== undefined) v = Math.max(props.min, v)
    if (props.max !== undefined) v = Math.min(props.max, v)
    return v
  }

  return (
    <div class="flex items-stretch">
      <Button
        variant="outline"
        size="icon"
        class="h-11 w-11 shrink-0 rounded-r-none border-r-0"
        onClick={() => {
          if (props.min !== undefined && props.value <= props.min) {
            props.onAtMin?.()
          } else {
            props.onChange(clamp(props.value - 1))
          }
        }}
        aria-label="Decrease"
      >
        <Minus class="h-3 w-3" />
      </Button>
      <NumericInput
        value={props.value}
        onChange={props.onChange}
        min={props.min}
        max={props.max}
        class="text-center h-11 px-0 py-0 w-[5ch] min-w-[3ch] max-w-[5ch] rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        variant="outline"
        size="icon"
        class="h-11 w-11 shrink-0 rounded-l-none border-l-0"
        onClick={() => props.onChange(clamp(props.value + 1))}
        aria-label="Increase"
      >
        <Plus class="h-3 w-3" />
      </Button>
    </div>
  )
}

import { Show } from "solid-js"
import Minus from "lucide-solid/icons/minus"
import Plus from "lucide-solid/icons/plus"

import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"

interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  onAtMin?: () => void
  "aria-label"?: string
  readOnly?: boolean
  /** Page-unique; prefixes the decrease/increase button ids. */
  "data-test": string
}

export function StepperInput(props: StepperInputProps) {
  const clamp = (n: number) => {
    let v = n
    if (props.min != null) v = Math.max(props.min, v)
    if (props.max != null) v = Math.min(props.max, v)
    return v
  }

  // The −/+ buttons are already a full 44×44, so Button's centred ::after hit-area extension is
  // switched off: with one side's border removed it would sit off-centre and overlap the input.
  return (
    <div data-sem="stepper-input" data-test={props["data-test"]} class="flex items-stretch">
      <Show when={!props.readOnly}>
        <Button
          data-test={`${props["data-test"]}-decrease`}
          variant="outline"
          size="icon"
          class="h-11 w-11 shrink-0 rounded-r-none border-r-0 after:hidden"
          onClick={() => {
            if (props.min != null && props.value <= props.min) {
              props.onAtMin?.()
            } else {
              props.onChange(clamp(props.value - 1))
            }
          }}
          aria-label="Decrease"
        >
          <Minus class="h-3 w-3" />
        </Button>
      </Show>
      <NumericInput
        value={props.value}
        onChange={props.onChange}
        min={props.min}
        max={props.max}
        aria-label={props["aria-label"]}
        disabled={props.readOnly}
        class={`text-center h-11 px-0 py-0 w-[5ch] min-w-[3ch] max-w-[5ch] ${props.readOnly ? "rounded-md" : "rounded-none"} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <Show when={!props.readOnly}>
        <Button
          data-test={`${props["data-test"]}-increase`}
          variant="outline"
          size="icon"
          class="h-11 w-11 shrink-0 rounded-l-none border-l-0 after:hidden"
          onClick={() => props.onChange(clamp(props.value + 1))}
          aria-label="Increase"
        >
          <Plus class="h-3 w-3" />
        </Button>
      </Show>
    </div>
  )
}

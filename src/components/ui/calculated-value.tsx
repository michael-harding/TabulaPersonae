import { Show } from "solid-js"
import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import Pen from "lucide-solid/icons/pen"
import PenOff from "lucide-solid/icons/pen-off"

interface CalculatedValueProps {
  label: string
  editable: boolean
  custom: boolean
  onCustomChange: (custom: boolean) => void
  value: number
  onValueChange: (value: number) => void
  calculatedValue: number
  calculatedTooltip: string
  format?: (n: number) => string
  min?: number
  max?: number
  class?: string
}

export function CalculatedValue(props: CalculatedValueProps) {
  const format = (n: number) => (props.format ? props.format(n) : String(n))
  const displayValue = () => (props.custom ? props.value : props.calculatedValue)
  const tooltipContent = () => (props.custom ? "Custom" : props.calculatedTooltip)
  const showInput = () => props.editable && props.custom

  return (
    <div data-sem="calculated-value" class={`flex items-center justify-center gap-1 ${props.class ?? ""}`}>
      <Show
        when={showInput()}
        fallback={
          <Tooltip content={tooltipContent()} triggerFocusable>
            <div class={props.editable ? "text-xl font-bold text-primary" : "text-2xl font-bold text-primary"}>
              {format(displayValue())}
            </div>
          </Tooltip>
        }
      >
        <NumericInput
          value={props.value}
          onChange={props.onValueChange}
          min={props.min}
          max={props.max}
          aria-label={props.label}
          class="text-center h-10 px-0 py-0 w-[5ch] min-w-[3ch] max-w-[5ch] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </Show>
      <Show when={props.editable}>
        <Button
          type="button"
          data-test="calculated-value-toggle"
          variant="ghost"
          size="icon"
          class="shrink-0"
          aria-label={props.custom ? `Use calculated ${props.label}` : `Use custom ${props.label}`}
          onClick={() => props.onCustomChange(!props.custom)}
        >
          <Show when={props.custom} fallback={<Pen class="h-4 w-4" />}>
            <PenOff class="h-4 w-4" />
          </Show>
        </Button>
      </Show>
    </div>
  )
}

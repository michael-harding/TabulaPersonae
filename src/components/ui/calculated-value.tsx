import { Show, type JSX } from "solid-js"
import Pen from "lucide-solid/icons/pen"
import PenOff from "lucide-solid/icons/pen-off"

import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"

interface CalculatedValueProps {
  label: string
  labelPosition?: "top" | "left"
  labelClass?: string
  icon?: JSX.Element
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
  /** Page-unique; also prefixes the label/display/toggle ids. */
  "data-test": string
  /** Affects only the read-only display text size; edit-mode input/toggle are always the same. */
  variant?: "default" | "compact"
}

export function CalculatedValue(props: CalculatedValueProps) {
  const format = (n: number) => (props.format ? props.format(n) : String(n))
  const displayValue = () => (props.custom ? props.value : props.calculatedValue)
  const tooltipContent = () => (props.custom ? "Custom" : props.calculatedTooltip)
  const showInput = () => props.editable && props.custom
  const compact = () => (props.variant ?? "default") === "compact"
  const left = () => (props.labelPosition ?? "top") === "left"

  return (
    <div
      data-sem="calculated-value"
      data-test={props["data-test"]}
      class={`flex ${left() ? "flex-row items-center" : "flex-col items-center"} gap-1 ${props.class ?? ""}`}
    >
      <span data-test={`${props["data-test"]}-label`} class={`inline-flex items-center gap-1 ${props.labelClass ?? "text-sm text-muted-foreground"}`}>
        <Show when={props.icon}>{props.icon}</Show>
        {props.label}
      </span>
      <div class="flex items-center justify-center gap-1">
        <Show
          when={showInput()}
          fallback={
            <Tooltip content={tooltipContent()} triggerFocusable>
              <div
                data-test={`${props["data-test"]}-display`}
                class={
                  compact()
                    ? "text-sm font-semibold text-primary"
                    : props.editable
                      ? "text-xl font-bold text-primary"
                      : "text-2xl font-bold text-primary"
                }
              >
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
            data-test={`${props["data-test"]}-toggle`}
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
    </div>
  )
}

import { Show, type JSX } from "solid-js"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import Pen from "lucide-solid/icons/pen"
import PenOff from "lucide-solid/icons/pen-off"

interface CalculatedValueSelectProps {
  label: string
  labelPosition?: "top" | "left"
  labelClass?: string
  icon?: JSX.Element
  editable: boolean
  custom: boolean
  onCustomChange: (custom: boolean) => void
  value: string
  onValueChange: (value: string) => void
  calculatedValue: string
  calculatedTooltip: string
  options: string[]
  class?: string
}

export function CalculatedValueSelect(props: CalculatedValueSelectProps) {
  const displayValue = () => (props.custom ? props.value : props.calculatedValue)
  const tooltipContent = () => (props.custom ? "Custom" : props.calculatedTooltip)
  const showInput = () => props.editable && props.custom
  const left = () => (props.labelPosition ?? "top") === "left"

  return (
    <div
      data-sem="calculated-value"
      class={`flex ${left() ? "flex-row items-center" : "flex-col items-center"} gap-1 ${props.class ?? ""}`}
    >
      <span class={`inline-flex items-center gap-1 ${props.labelClass ?? "text-sm text-muted-foreground"}`}>
        <Show when={props.icon}>{props.icon}</Show>
        {props.label}
      </span>
      <div class="flex items-center justify-center gap-1">
        <Show
          when={showInput()}
          fallback={
            <Tooltip content={tooltipContent()} triggerFocusable>
              <div class={props.editable ? "text-xl font-bold text-primary" : "text-2xl font-bold text-primary"}>
                {displayValue() || "—"}
              </div>
            </Tooltip>
          }
        >
          <Combobox value={props.value} onValueChange={props.onValueChange} options={props.options} aria-label={props.label} />
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
    </div>
  )
}

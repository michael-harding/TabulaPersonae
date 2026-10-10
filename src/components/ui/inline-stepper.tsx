import { Button } from "@/components/ui/button"

interface InlineStepperProps {
  /** Page-unique; also prefixes the `-decrease` / `-increase` button ids. */
  "data-test": string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** What the number is, e.g. "quantity" — names the group and both buttons. */
  label: string
}

/**
 * A compact −/value/+ control that sits inline with text (e.g. "Qty: − 2 +  Weight: 2 lbs").
 *
 * The buttons stay visually 24px, and each gets Button's invisible 44×44 hit area centred on it
 * (ACCESSIBILITY.md touch targets). Overlap is prevented by layout rather than by size: the value
 * is at least 32px wide, which puts the two button centres 12 + 4 + 32 + 4 + 12 = 64px apart.
 * Each hit area reaches 22px from its centre, so the two meet over the number's outer edges with
 * an inert gap in the middle. Do not shrink the value's minimum width or the gaps below a 44px
 * centre-to-centre distance. The hit areas also extend 10px above and below and over adjacent
 * text, so keep other interactive controls out of that margin.
 */
export function InlineStepper(props: InlineStepperProps) {
  const atMin = () => props.min != null && props.value <= props.min
  const atMax = () => props.max != null && props.value >= props.max
  return (
    <div role="group" aria-label={props.label} data-test={props["data-test"]} class="inline-flex items-center gap-1">
      <Button
        data-test={`${props["data-test"]}-decrease`}
        variant="outline"
        size="sm"
        aria-label={`Decrease ${props.label}`}
        onClick={() => props.onChange(props.value - 1)}
        disabled={atMin()}
        class="h-6 w-6 p-0"
      >
        <span aria-hidden="true">−</span>
      </Button>
      <span class="min-w-8 text-center tabular-nums" aria-live="polite">{props.value}</span>
      <Button
        data-test={`${props["data-test"]}-increase`}
        variant="outline"
        size="sm"
        aria-label={`Increase ${props.label}`}
        onClick={() => props.onChange(props.value + 1)}
        disabled={atMax()}
        class="h-6 w-6 p-0"
      >
        <span aria-hidden="true">+</span>
      </Button>
    </div>
  )
}

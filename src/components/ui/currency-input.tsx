import { StepperInput } from "@/components/ui/stepper-input"

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  onAtMin?: () => void
  min?: number
  max?: number
}

export function CurrencyInput(props: CurrencyInputProps) {
  return (
    <StepperInput
      value={props.value}
      onChange={props.onChange}
      onAtMin={props.onAtMin}
      min={props.min}
      max={props.max}
    />
  )
}

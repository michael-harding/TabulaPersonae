import { createMemo, type Accessor } from "solid-js"

export interface CalculatedValueBinding<T = number> {
  custom: boolean
  onCustomChange: (custom: boolean) => void
  value: T
  onValueChange: (value: T) => void
  calculatedValue: T
  calculatedTooltip: string
}

export interface UseCalculatedValueArgs<T = number> {
  useCalculated: Accessor<boolean>
  setUseCalculated: (useCalculated: boolean) => void
  manualValue: Accessor<T>
  setManualValue: (value: T) => void
  calculatedValue: Accessor<T>
  calculatedTooltip: Accessor<string>
}

export function useCalculatedValue<T = number>(args: UseCalculatedValueArgs<T>) {
  const resolvedValue = createMemo(() => (args.useCalculated() ? args.calculatedValue() : args.manualValue()))

  const binding = createMemo<CalculatedValueBinding<T>>(() => ({
    custom: !args.useCalculated(),
    onCustomChange: (custom) => args.setUseCalculated(!custom),
    value: args.manualValue(),
    onValueChange: args.setManualValue,
    calculatedValue: args.calculatedValue(),
    calculatedTooltip: args.calculatedTooltip(),
  }))

  return { binding, resolvedValue }
}

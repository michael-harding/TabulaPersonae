import { createMemo, type Accessor } from "solid-js"

export interface CalculatedValueBinding {
  custom: boolean
  onCustomChange: (custom: boolean) => void
  value: number
  onValueChange: (value: number) => void
  calculatedValue: number
  calculatedTooltip: string
}

export interface UseCalculatedValueArgs {
  useCalculated: Accessor<boolean>
  setUseCalculated: (useCalculated: boolean) => void
  manualValue: Accessor<number>
  setManualValue: (value: number) => void
  calculatedValue: Accessor<number>
  calculatedTooltip: Accessor<string>
}

export function useCalculatedValue(args: UseCalculatedValueArgs) {
  const resolvedValue = createMemo(() => (args.useCalculated() ? args.calculatedValue() : args.manualValue()))

  const binding = createMemo<CalculatedValueBinding>(() => ({
    custom: !args.useCalculated(),
    onCustomChange: (custom) => args.setUseCalculated(!custom),
    value: args.manualValue(),
    onValueChange: args.setManualValue,
    calculatedValue: args.calculatedValue(),
    calculatedTooltip: args.calculatedTooltip(),
  }))

  return { binding, resolvedValue }
}

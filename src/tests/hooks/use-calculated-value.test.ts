import { createRoot, createSignal } from "solid-js"
import { useCalculatedValue } from "@/hooks/use-calculated-value"

describe("useCalculatedValue", () => {
  it("seeds the manual value from the current calculated value when switching to custom", () => {
    createRoot((dispose) => {
      const [useCalculated, setUseCalculated] = createSignal(true)
      const [manualValue, setManualValue] = createSignal(1)
      const { binding } = useCalculatedValue({
        useCalculated,
        setUseCalculated,
        manualValue,
        setManualValue,
        calculatedValue: () => 8,
        calculatedTooltip: () => "",
      })
      binding().onCustomChange(true)
      expect(manualValue()).toBe(8)
      expect(useCalculated()).toBe(false)
      dispose()
    })
  })

  it("does not touch the manual value when switching back to calculated", () => {
    createRoot((dispose) => {
      const [useCalculated, setUseCalculated] = createSignal(false)
      const [manualValue, setManualValue] = createSignal(5)
      const { binding } = useCalculatedValue({
        useCalculated,
        setUseCalculated,
        manualValue,
        setManualValue,
        calculatedValue: () => 8,
        calculatedTooltip: () => "",
      })
      binding().onCustomChange(false)
      expect(manualValue()).toBe(5)
      expect(useCalculated()).toBe(true)
      dispose()
    })
  })

  it("resolvedValue reflects the calculated value in calculated mode and the manual value in custom mode", () => {
    createRoot((dispose) => {
      const [useCalculated, setUseCalculated] = createSignal(true)
      const [manualValue, setManualValue] = createSignal(3)
      const { resolvedValue } = useCalculatedValue({
        useCalculated,
        setUseCalculated,
        manualValue,
        setManualValue,
        calculatedValue: () => 8,
        calculatedTooltip: () => "",
      })
      expect(resolvedValue()).toBe(8)
      setUseCalculated(false)
      expect(resolvedValue()).toBe(3)
      dispose()
    })
  })
})

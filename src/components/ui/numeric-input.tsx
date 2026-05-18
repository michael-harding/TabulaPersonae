import { createSignal, createEffect, splitProps } from "solid-js"
import type { ComponentProps } from "solid-js"
import { Input } from "@/components/ui/input"

type NumericInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "onInput" | "onBlur" | "min" | "max"> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  parser?: (s: string) => number
}

export function NumericInput(props: NumericInputProps) {
  const [local, rest] = splitProps(props, ["value", "onChange", "min", "max", "parser"])

  const parse = (s: string) => (local.parser ?? parseInt)(s)
  const clamp = (n: number) => {
    let v = n
    if (local.min !== undefined) v = Math.max(local.min, v)
    if (local.max !== undefined) v = Math.min(local.max, v)
    return v
  }

  const [raw, setRaw] = createSignal(String(local.value))
  createEffect(() => setRaw(String(local.value)))

  return (
    <Input
      {...rest}
      type="number"
      min={local.min}
      max={local.max}
      value={raw()}
      onInput={(e) => setRaw(e.currentTarget.value)}
      onBlur={(e) => {
        const n = parse(e.currentTarget.value)
        if (!isNaN(n)) {
          const v = clamp(n)
          local.onChange(v)
          setRaw(String(v))
        } else {
          setRaw(String(local.value))
        }
      }}
    />
  )
}

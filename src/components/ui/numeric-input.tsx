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
  // Tracks whether the user has actually typed since the field was last synced from props — not
  // just whether the parsed value happens to equal local.value, since a field showing a synthetic
  // default (e.g. `value ?? 0` for "not yet set") needs typing that same number to still count as a
  // real, explicit edit. Only gates whether blur/Enter commit at all; a no-op blur on legacy data
  // that predates a since-lowered max is then left untouched instead of being silently clamped.
  let dirty = false
  createEffect(() => { setRaw(String(local.value)); dirty = false })

  const commit = (text: string) => {
    if (!dirty) return
    dirty = false
    const n = parse(text)
    if (!isNaN(n)) {
      const v = clamp(n)
      local.onChange(v)
      setRaw(String(v))
    } else {
      setRaw(String(local.value))
    }
  }

  return (
    <Input
      {...rest}
      type="number"
      min={local.min}
      max={local.max}
      value={raw()}
      onInput={(e) => { dirty = true; setRaw(e.currentTarget.value) }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          commit(e.currentTarget.value)
        }
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
    />
  )
}

import { Checkbox as CheckboxPrimitive } from "@kobalte/core/checkbox"
import { ComponentProps, JSX, Show, splitProps } from "solid-js"
import Check from "lucide-solid/icons/check"

import { cn, TOUCH_TARGET, TOUCH_TARGET_BOX } from "@/lib/utils"

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & {
  class?: string
  label?: JSX.Element
  labelClass?: string
  containerClass?: string
}

/**
 * If you need clickable text next to the checkbox (an item name, "Requires Attunement", etc.),
 * pass it via `label` (optionally styled with `labelClass`) rather than wrapping `<Checkbox>` in
 * your own `<label>`. Kobalte renders the checkbox control and the label as siblings tied
 * together by `for`/`id`, which is what makes this safe.
 *
 * Wrapping `<Checkbox>` in a hand-rolled `<label>...<Checkbox/>text</label>` looks equivalent but
 * isn't: a real click on the visible control square fires Kobalte's own toggle *and* the
 * browser's native label→control forwarding (the square is a styled `<div>`, not the control
 * itself, so the browser treats the click as landing on a non-form-control descendant of the
 * label and forwards it again). The two toggles cancel out — the checkbox looks unresponsive to
 * real clicks even though a synthetic `fireEvent.click` on the input in a test passes fine. This
 * has bitten this codebase twice; use `label`/`labelClass` instead.
 */
export function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["class", "label", "labelClass", "containerClass"])
  const [inputAttrs, others] = splitProps(rest, ["id", "title", "aria-label"])
  return (
    <CheckboxPrimitive
      data-sem="checkbox"
      class={cn("inline-flex items-center", local.containerClass)}
      {...others}
    >
      <CheckboxPrimitive.Input {...inputAttrs} />
      {/* The visible square stays 16px; it sits centred in a 44×44 box and its ::after hit area
          fills that box (ACCESSIBILITY.md touch targets), so neighbouring checkboxes can't overlap. */}
      <span class={TOUCH_TARGET_BOX}>
      <CheckboxPrimitive.Control
        data-test={inputAttrs.id ? `checkbox-control-${inputAttrs.id}` : "checkbox-control"}
        class={cn(
          TOUCH_TARGET,
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground",
          local.class
        )}
      >
        <CheckboxPrimitive.Indicator class="flex items-center justify-center text-current">
          <Check class="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      </span>
      <Show when={local.label}>
        <CheckboxPrimitive.Label class={local.labelClass ?? "text-xs text-muted-foreground cursor-pointer select-none"}>
          {local.label}
        </CheckboxPrimitive.Label>
      </Show>
    </CheckboxPrimitive>
  )
}

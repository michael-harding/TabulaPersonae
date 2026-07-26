import { Checkbox as CheckboxPrimitive } from "@kobalte/core/checkbox"
import { ComponentProps, JSX, Show, splitProps } from "solid-js"
import Check from "lucide-solid/icons/check"
import { cn } from "@/lib/utils"

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & { class?: string; label?: JSX.Element; labelClass?: string }

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
  const [local, rest] = splitProps(props, ["class", "label", "labelClass"])
  const [inputAttrs, others] = splitProps(rest, ["id", "title", "aria-label"])
  return (
    <CheckboxPrimitive data-sem="checkbox" class={local.label ? "inline-flex items-center gap-1.5" : undefined} {...others}>
      <CheckboxPrimitive.Input {...inputAttrs} />
      <CheckboxPrimitive.Control
        class={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground",
          local.class
        )}
      >
        <CheckboxPrimitive.Indicator class="flex items-center justify-center text-current">
          <Check class="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      <Show when={local.label}>
        <CheckboxPrimitive.Label class={local.labelClass ?? "text-xs text-muted-foreground cursor-pointer select-none"}>
          {local.label}
        </CheckboxPrimitive.Label>
      </Show>
    </CheckboxPrimitive>
  )
}

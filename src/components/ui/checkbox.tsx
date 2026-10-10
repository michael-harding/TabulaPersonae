import { Checkbox as CheckboxPrimitive } from "@kobalte/core/checkbox"
import { ComponentProps, JSX, Show, splitProps } from "solid-js"
import { Dynamic } from "solid-js/web"
import Check from "lucide-solid/icons/check"

import { cn, TOUCH_TARGET, TOUCH_TARGET_BOX } from "@/lib/utils"

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & {
  class?: string
  label?: JSX.Element
  labelClass?: string
  /** Page-unique `data-test` for the label (e.g. when the label is also the item's title). */
  labelTestId?: string
  /**
   * Wraps the label in a heading, for when the label doubles as the title of a card (a spell or
   * item name). It stays a real <label>, so clicking it toggles the checkbox and assistive tech
   * doesn't see a second control, and the heading keeps it reachable by heading navigation.
   */
  labelHeading?: "h2" | "h3" | "h4"
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
  const [local, rest] = splitProps(props, ["class", "label", "labelClass", "labelTestId", "labelHeading", "containerClass"])
  const [inputAttrs, others] = splitProps(rest, ["id", "title", "aria-label"])
  const label = () => (
    <CheckboxPrimitive.Label
      data-test={local.labelTestId}
      class={cn("inline-flex min-h-11 items-center", local.labelClass ?? "text-xs text-muted-foreground cursor-pointer select-none")}
    >
      {local.label}
    </CheckboxPrimitive.Label>
  )
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
        {/* The label is a 44px-tall target too. It is pulled 8px into the checkbox's 44px box so
            the text sits about 6px from the square. The overlap is harmless because both toggle
            the same checkbox. */}
        <Show when={local.labelHeading} fallback={<span class="-ml-2 inline-flex">{label()}</span>}>
          <Dynamic component={local.labelHeading} class="-ml-2 inline-flex">{label()}</Dynamic>
        </Show>
      </Show>
    </CheckboxPrimitive>
  )
}

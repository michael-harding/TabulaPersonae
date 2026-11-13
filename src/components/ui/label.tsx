import { ComponentProps, Show, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface LabelProps extends ComponentProps<"label"> {
  /**
   * Marks the field as required with an asterisk after the label (explained by RequiredLegend).
   * The control must carry the `required` attribute as well: that is what screen readers announce,
   * so the asterisk is hidden from them, and it sits outside the label to keep it out of the name.
   */
  required?: boolean
}

export function Label(props: LabelProps) {
  const [local, others] = splitProps(props, ["class", "required"])
  return (
    <>
      <label
        data-sem="label"
        class={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", local.class)}
        {...others}
      />
      <Show when={local.required}>
        <span data-test={`required-mark-${others.for ?? ""}`} aria-hidden="true" class="ml-0.5 text-sm font-medium leading-none text-destructive-text">*</span>
      </Show>
    </>
  )
}

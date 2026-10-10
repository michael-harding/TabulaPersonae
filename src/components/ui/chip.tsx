import { cva, type VariantProps } from "class-variance-authority"
import { ComponentProps, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

// The one pill style for both the display Chip and the interactive ChipButton/CheckableChip
// (chip-button.tsx), so a value looks the same whether it is being shown or edited.
//
// `variant` picks the colours, including the hover style: with `interactive` set, the pill's
// background and border both change while its control is hovered. That is keyed off `group-hover`
// because the control is the ≥44px box around the pill (see ChipButton), not the pill itself; a
// display Chip leaves `interactive` unset and so has no hover state.
//
// `removable` and `removableSecondary` look like `default` and `secondary` at rest, but hover with
// a destructive border — use them for a chip whose click removes its value.
const chipVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        removable: "border-transparent bg-primary text-primary-foreground",
        removableSecondary: "border-transparent bg-secondary text-secondary-foreground",
      },
      interactive: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "default", interactive: true, class: "group-hover:border-primary group-hover:bg-primary/80" },
      { variant: "secondary", interactive: true, class: "group-hover:border-secondary-foreground group-hover:bg-secondary/80" },
      { variant: "destructive", interactive: true, class: "group-hover:border-destructive group-hover:bg-destructive/80" },
      { variant: "removable", interactive: true, class: "group-hover:border-destructive group-hover:bg-primary/80" },
      { variant: "removableSecondary", interactive: true, class: "group-hover:border-destructive group-hover:bg-secondary/80" },
      { variant: "outline", interactive: true, class: "group-hover:border-accent-foreground group-hover:bg-accent group-hover:text-accent-foreground" },
    ],
    defaultVariants: {
      variant: "default",
    },
  }
)

export type ChipVariant = NonNullable<VariantProps<typeof chipVariants>["variant"]>

export type ChipProps = ComponentProps<"span"> & Pick<VariantProps<typeof chipVariants>, "variant">

/** A read-only pill. Its editable counterpart is ChipButton, which shares these variants. */
export function Chip(props: ChipProps) {
  const [local, others] = splitProps(props, ["class", "variant"])
  return (
    <span data-sem="chip" class={cn(chipVariants({ variant: local.variant }), local.class)} {...others} />
  )
}

export { chipVariants }

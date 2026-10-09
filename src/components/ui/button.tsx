import { cva, type VariantProps } from "class-variance-authority"
import { ComponentProps, splitProps } from "solid-js"

import { cn, TOUCH_TARGET } from "@/lib/utils"

// TOUCH_TARGET extends the hit area to 44×44 without changing visual size — the `sm`/`default`/
// `icon` sizes below are visually smaller than 44px. Harmless on `lg`, which is already 44px tall.
const buttonVariants = cva(
  `${TOUCH_TARGET} inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ["class", "variant", "size"])
  return (
    <button
      type="button"
      data-sem="button"
      class={cn(buttonVariants({ variant: local.variant, size: local.size, className: local.class }))}
      {...others}
    />
  )
}

export { buttonVariants }

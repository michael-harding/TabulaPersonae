import { splitProps, type ComponentProps, type JSX } from "solid-js"
import Plus from "lucide-solid/icons/plus"
import X from "lucide-solid/icons/x"

import { badgeVariants } from "@/components/ui/badge"
import { cn, TOUCH_TARGET_BOX } from "@/lib/utils"

type ChipButtonProps = Omit<ComponentProps<"button">, "children"> & {
  /** Page-unique. */
  "data-test": string
  /** "add" shows a leading +, "remove" a trailing ×. The icon only signals what a click does. */
  action: "add" | "remove"
  /** Pill style: a rounded badge (tags) or a squared outline (add buttons). */
  appearance?: "secondary" | "outline" | "square"
  children: JSX.Element
}

/**
 * A small pill that is itself the control — e.g. a tag chip that removes its value, or an
 * "+ Module" chip that adds one. The whole chip is clickable; the +/× icon is just a hint.
 *
 * Chip actions are cheap to undo (re-add the tag), so unlike delete/remove buttons they act on a
 * single click — no ConfirmButton. The button is an invisible ≥44×44 box (ACCESSIBILITY.md touch
 * targets) with the pill drawn inside it, so the pill keeps its compact look while neighbouring
 * chips' targets can't overlap. Lay chips out with horizontal gap only (e.g. `gap-x-2`): each row
 * is already 44px tall.
 */
export function ChipButton(props: ChipButtonProps) {
  const [local, others] = splitProps(props, ["action", "appearance", "children", "class"])
  const appearance = () => local.appearance ?? "secondary"
  const pill = () => {
    const a = appearance()
    return a === "square"
      ? "gap-1 rounded border px-2.5 py-1 group-hover:bg-accent group-hover:text-accent-foreground"
      : cn(badgeVariants({ variant: a }), "gap-1.5 pr-1.5")
  }
  return (
    <button
      type="button"
      class={cn(TOUCH_TARGET_BOX, "group focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", local.class)}
      {...others}
    >
      <span
        class={cn(
          "inline-flex items-center text-xs transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
          pill(),
          local.action === "remove" && "group-hover:border-destructive",
        )}
      >
        {local.action === "add" && <Plus class="h-3 w-3" aria-hidden="true" />}
        {local.children}
        {local.action === "remove" && <X class="h-3 w-3" aria-hidden="true" />}
      </span>
    </button>
  )
}

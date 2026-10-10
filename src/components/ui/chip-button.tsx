import { splitProps, type ComponentProps, type JSX } from "solid-js"
import Plus from "lucide-solid/icons/plus"
import X from "lucide-solid/icons/x"

import { chipVariants, type ChipVariant } from "@/components/ui/chip"
import { cn, TOUCH_TARGET_BOX } from "@/lib/utils"

// The pill is drawn inside the control, so the control's focus ring is forwarded onto it.
const PILL_FOCUS_RING = "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"

type ChipButtonProps = Omit<ComponentProps<"button">, "children"> & {
  /** Page-unique. */
  "data-test": string
  /** "add" shows a leading +, "remove" a trailing ×. The icon only signals what a click does. */
  action: "add" | "remove"
  /**
   * Colours, hover style included — the same variants as the display Chip. Defaults to
   * "removableSecondary" for a remove chip and "secondary" for an add chip.
   */
  variant?: ChipVariant
  children?: JSX.Element
}

/**
 * A Chip that is itself the control — e.g. a tag chip that removes its value, or an
 * "+ Module" chip that adds one. The whole chip is clickable; the +/× icon is just a hint.
 *
 * Chip actions are cheap to undo (re-add the tag), so unlike delete/remove buttons they act on a
 * single click — no ConfirmButton. The button is an invisible ≥44×44 box (ACCESSIBILITY.md touch
 * targets) with the pill drawn inside it, so the pill keeps its compact look while neighbouring
 * chips' targets can't overlap. Hovering anywhere in that box restyles the pill. Lay chips out
 * with horizontal gap only (e.g. `gap-x-2`): each row is already 44px tall.
 */
export function ChipButton(props: ChipButtonProps) {
  const [local, others] = splitProps(props, ["action", "variant", "children", "class"])
  return (
    <button
      type="button"
      data-sem="chip-button"
      class={cn(TOUCH_TARGET_BOX, "group focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", local.class)}
      {...others}
    >
      <span
        class={cn(
          chipVariants({ variant: local.variant ?? (local.action === "remove" ? "removableSecondary" : "secondary"), interactive: true }),
          PILL_FOCUS_RING,
          "gap-1.5",
          local.action === "remove" ? "pr-1.5" : "pl-1.5",
        )}
      >
        {local.action === "add" && <Plus class="h-3 w-3" aria-hidden="true" />}
        {local.children}
        {local.action === "remove" && <X class="h-3 w-3" aria-hidden="true" />}
      </span>
    </button>
  )
}

type CheckableChipProps = {
  /** Page-unique; the halves get `${id}-remove` and `${id}-check`. */
  "data-test": string
  /** The chip's value, shown on the remove half. */
  children: JSX.Element
  /** Accessible name for the remove half, e.g. "Remove Athletics". */
  removeLabel: string
  onRemove: () => void
  /** Short visible label for the checkable half, e.g. "Exp". */
  checkLabel: string
  /** Accessible name for the checkbox, e.g. "Athletics expertise". */
  checkAriaLabel: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * A divided pill for a chip value that also carries an on/off option (e.g. a granted skill with
 * an Expertise flag). The left half behaves exactly like a remove ChipButton; the right half is a
 * checkbox + label that toggles the option. Each half is its own ≥44px-tall control, and the two
 * boxes are pushed together at the seam so the halves read as one pill.
 */
export function CheckableChip(props: CheckableChipProps) {
  return (
    <span class="inline-flex items-center" data-sem="checkable-chip">
      <button
        type="button"
        data-test={`${props["data-test"]}-remove`}
        aria-label={props.removeLabel}
        class={cn(TOUCH_TARGET_BOX, "group justify-end focus-visible:outline-none")}
        onClick={() => props.onRemove()}
      >
        <span class={cn(chipVariants({ variant: "removableSecondary", interactive: true }), PILL_FOCUS_RING, "gap-1.5 rounded-r-none pr-1.5")}>
          {props.children}
          <X class="h-3 w-3" aria-hidden="true" />
        </span>
      </button>
      <label class={cn(TOUCH_TARGET_BOX, "group justify-start cursor-pointer")}>
        <span class={cn(chipVariants({ variant: "outline", interactive: true }), "gap-1.5 rounded-l-none border-secondary pl-1.5 font-normal has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2")}>
          <input
            type="checkbox"
            data-test={`${props["data-test"]}-check`}
            aria-label={props.checkAriaLabel}
            checked={props.checked}
            onChange={(e) => props.onCheckedChange(e.currentTarget.checked)}
            class="h-3 w-3 cursor-pointer accent-primary focus-visible:outline-none"
          />
          {props.checkLabel}
        </span>
      </label>
    </span>
  )
}

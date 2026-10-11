import { splitProps, type ComponentProps, type JSX } from "solid-js"
import Check from "lucide-solid/icons/check"
import Circle from "lucide-solid/icons/circle"
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

type ToggleChipProps = Omit<ComponentProps<"button">, "children" | "aria-pressed" | "disabled"> & {
  /** Page-unique. */
  "data-test": string
  pressed: boolean
  /** Colours while on — use the variant the matching display Chip has. Off is always "outline". */
  variant?: ChipVariant
  /**
   * The value is fixed from elsewhere (e.g. granted by a feature). A locked chip ignores clicks
   * but stays focusable, so wrap it in a Tooltip that says why.
   */
  locked?: boolean
  /** Extra classes for the pill, e.g. the compact padding of the display Chip it mirrors. */
  pillClass?: string
  children?: JSX.Element
}

/**
 * A Chip that switches an option on and off (e.g. a skill's "Prof" flag). On, it is drawn exactly
 * like the display Chip that shows the option in view mode, plus a leading check so the state is
 * not carried by colour alone; off, it is the same pill with a visible outline and an empty
 * circle in the check's place, so it still reads as a control rather than plain text and does not
 * change width when toggled. Same invisible ≥44×44 box as ChipButton.
 */
export function ToggleChip(props: ToggleChipProps) {
  const [local, others] = splitProps(props, ["pressed", "variant", "locked", "pillClass", "children", "class", "onClick"])
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (local.locked) return
    const onClick = local.onClick
    if (typeof onClick === "function") onClick(event)
  }
  return (
    <button
      type="button"
      data-sem="toggle-chip"
      aria-pressed={local.pressed}
      aria-disabled={local.locked ? "true" : undefined}
      class={cn(TOUCH_TARGET_BOX, "group focus-visible:outline-none", local.locked ? "cursor-not-allowed" : "cursor-pointer", local.class)}
      onClick={handleClick}
      {...others}
    >
      <span
        class={cn(
          chipVariants({ variant: local.pressed ? local.variant ?? "secondary" : "outline", interactive: !local.locked }),
          PILL_FOCUS_RING,
          "gap-0.5",
          !local.pressed && "border-muted-foreground",
          local.locked && "opacity-50",
          local.pillClass,
        )}
      >
        {local.pressed ? <Check class="h-3 w-3" aria-hidden="true" /> : <Circle class="h-3 w-3" aria-hidden="true" />}
        {local.children}
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

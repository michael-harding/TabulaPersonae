import { cva, type VariantProps } from "class-variance-authority"
import { Show, type JSX } from "solid-js"

import { Tooltip } from "@/components/ui/tooltip"
import { cn, TEMP_HP_COLOR } from "@/lib/utils"

// The one badge style for a stat value: a bordered box with a small label line and a bold value
// line, such as an action card's Attack +5 or 2d6 Fire. `tone` picks the colours; `valueFirst`
// puts the value on top, for badges whose value says more than their label (damage, gain).
const statBadgeVariants = cva(
  "flex min-w-[3.5rem] flex-1 flex-col items-center justify-center rounded border-2 px-1.5 py-3 text-center leading-tight",
  {
    variants: {
      tone: {
        neutral: "border-border",
        damage: "border-red-500 text-red-700 dark:text-red-400",
        gain: "border-green-500 text-green-700 dark:text-green-400",
        // Matches the health bar's temp HP segment
        tempHp: `${TEMP_HP_COLOR.border} text-blue-700 dark:text-blue-300`,
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

export type StatBadgeTone = NonNullable<VariantProps<typeof statBadgeVariants>["tone"]>

export interface StatBadgeProps {
  "data-test": string
  tone?: StatBadgeTone
  label: JSX.Element
  value: JSX.Element
  /** Puts the value above the label. */
  valueFirst?: boolean
  /** Breakdown of a calculated value. The whole badge becomes the tooltip's focusable trigger. */
  tooltip?: string
  /** The trigger's accessible name, required with `tooltip`: the badge's text, e.g. "Attack +5". */
  tooltipLabel?: string
}

export function StatBadge(props: StatBadgeProps) {
  const badge = () => (
    <div data-sem="stat-badge" class={statBadgeVariants({ tone: props.tone })} data-test={props["data-test"]}>
      <span class={props.valueFirst ? "text-sm font-semibold" : "text-xs"}>{props.valueFirst ? props.value : props.label}</span>
      <span class={props.valueFirst ? "text-xs" : "text-sm font-semibold"}>{props.valueFirst ? props.label : props.value}</span>
    </div>
  )
  return (
    <Show when={props.tooltip} fallback={badge()}>
      {(tooltip) => <Tooltip content={tooltip()} triggerFocusable triggerLabel={props.tooltipLabel} triggerClass="flex flex-1">{badge()}</Tooltip>}
    </Show>
  )
}

/** A row of StatBadges, wrapping when they don't fit. */
export function StatBadgeGroup(props: { children: JSX.Element; class?: string }) {
  return <div class={cn("flex flex-wrap gap-1.5", props.class)}>{props.children}</div>
}

import { createSignal, onCleanup, Show, splitProps, type JSX } from "solid-js"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Clicks arriving sooner than this after arming are treated as the tail of an accidental double
// click rather than a deliberate confirmation. Elapsed time is the only test: the click event's
// own count (`detail`) follows the system's double-click interval, which some users set to
// several seconds, and would then swallow every deliberate second click. A held key is not
// covered by this — its repeats can start after the window — so auto-repeated keydowns are
// swallowed in onKeyDown instead.
export const CONFIRM_GUARD_MS = 500
// An armed button reverts on its own so a forgotten "Confirm" can't be hit much later by accident.
export const CONFIRM_TIMEOUT_MS = 4000

type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "aria-label" | "children"> & {
  /** Page-unique. */
  "data-test": string
  /** The action's verb as it should read on the button, e.g. "Delete" or "Remove". */
  verb: string
  /** What the action applies to, used in the accessible name, e.g. a feature's name. */
  subject?: string
  /** Runs only on the second, deliberate click. */
  onConfirm: () => void
  /** Runs on every click before the confirm logic (e.g. to stop propagation). */
  onClick?: (e: MouseEvent) => void
  /** Idle content — typically an icon. Replaced by "Confirm <verb>" while armed. */
  children: JSX.Element
}

/**
 * Two-click guard for every destructive action (delete, remove, …). The first click arms the
 * button: it turns red, expands, and reads "Confirm <verb>". A second click confirms. It disarms
 * on Escape, on focus or pointer interaction elsewhere, or after CONFIRM_TIMEOUT_MS.
 */
export function ConfirmButton(props: ConfirmButtonProps) {
  const [local, others] = splitProps(props, ["verb", "subject", "onConfirm", "onClick", "children", "class", "variant", "disabled"])
  const [armed, setArmed] = createSignal(false)
  let ref: HTMLButtonElement | undefined
  let armedAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const onOutsidePointer = (e: PointerEvent) => {
    if (ref && !ref.contains(e.target as Node)) disarm()
  }

  const disarm = () => {
    setArmed(false)
    clearTimeout(timer)
    document.removeEventListener("pointerdown", onOutsidePointer, true)
  }

  const arm = () => {
    setArmed(true)
    armedAt = performance.now()
    timer = setTimeout(disarm, CONFIRM_TIMEOUT_MS)
    document.addEventListener("pointerdown", onOutsidePointer, true)
  }

  onCleanup(disarm)

  const handleClick = (e: MouseEvent) => {
    local.onClick?.(e)
    if (!armed()) {
      arm()
      return
    }
    if (performance.now() - armedAt < CONFIRM_GUARD_MS) return
    disarm()
    local.onConfirm()
  }

  const name = (verb: string) => (local.subject ? `${verb} ${local.subject}` : verb)
  const confirmText = () => `Confirm ${local.verb}`

  return (
    <Button
      ref={ref}
      type="button"
      {...others}
      variant={armed() ? "destructive" : local.variant}
      disabled={local.disabled}
      aria-label={armed() ? name(confirmText()) : name(local.verb)}
      data-armed={armed() ? "" : undefined}
      class={cn(local.class, armed() && "w-auto px-2 text-xs whitespace-nowrap bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground")}
      onClick={handleClick}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Escape" && armed()) {
          e.preventDefault()
          // Only this button should react, not a surrounding Modal. The Modal's Escape handling is
          // its own document-level listener, which stopPropagation from Solid's delegated
          // (also document-level) handler can't block — see SelectTrigger for the same case.
          e.stopImmediatePropagation()
          disarm()
        } else if (e.repeat && (e.key === "Enter" || e.key === " ")) {
          // A held key must not click again: one press arms, a separate press confirms.
          e.preventDefault()
        }
      }}
      onFocusOut={() => disarm()}
    >
      <Show when={armed()} fallback={local.children}>
        {confirmText()}
      </Show>
    </Button>
  )
}

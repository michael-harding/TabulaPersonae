import { Dialog as DialogPrimitive } from "@kobalte/core/dialog"
import { ComponentProps, JSX, splitProps } from "solid-js"
import X from "lucide-solid/icons/x"

import { cn } from "@/lib/utils"

export const Modal = DialogPrimitive
export const ModalTrigger = DialogPrimitive.Trigger
export const ModalClose = DialogPrimitive.CloseButton

function ModalOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Overlay
      class={cn(
        "fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 duration-200",
        local.class
      )}
      {...others}
    />
  )
}

export function ModalContent(props: ComponentProps<typeof DialogPrimitive.Content> & { children?: JSX.Element }) {
  const [local, others] = splitProps(props, ["class", "children"])
  return (
    <DialogPrimitive.Portal>
      <ModalOverlay />
      <DialogPrimitive.Content
        data-sem="modal-content"
        class={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-1/2 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-1/2 duration-200 sm:rounded-lg max-h-[100dvh] overflow-y-auto scroll-pb-24 has-[.modal-footer]:pb-0",
          local.class
        )}
        {...others}
      >
        {/* scroll-pb-24 keeps a field that takes focus clear of the sticky ModalFooter (about 80px
            tall) when the browser scrolls it into view (WCAG 2.4.11 Focus Not Obscured). With a
            footer, the footer's own pb-6 stands in for the bottom padding: see ModalFooter. The
            hook is a class because production builds strip data-sem and data-test. */}
        {local.children}
        {/* A 44×44 hit area (ACCESSIBILITY.md touch targets) centred where the 16px × always sat:
            24px in from the top and right edges. */}
        <DialogPrimitive.CloseButton data-test="modal-close" class="absolute right-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </DialogPrimitive.CloseButton>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function ModalHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div class={cn("flex flex-col space-y-1.5 text-center sm:text-left", local.class)} {...others} />
  )
}

/**
 * The modal's action bar (Save, Add, Cancel…). It sticks to the bottom of ModalContent's scroll
 * container, so the actions stay in view while a long form scrolls beneath it.
 *
 * Place it last, inside ModalContent with no padded wrapper in between (it may sit at the end of a
 * form element). The negative side margins stretch it across ModalContent's px-6 padding to the
 * modal's edges. ModalContent drops its bottom padding when it holds a footer, and the footer's pb-6
 * takes its place: browsers measure a sticky offset from inside the scroll container's padding, so
 * with that padding in place the stuck bar would float 24px above the modal's bottom edge, with the
 * form showing beneath it, and the form's end would scroll 24px past the bar.
 *
 * It takes no z-index, so a select or combobox list that opens over it (z-50) still shows above it.
 */
export function ModalFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div
      data-sem="modal-footer"
      data-test="modal-footer"
      class={cn(
        "modal-footer sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 pb-6 pt-4",
        local.class
      )}
      {...others}
    />
  )
}

export function ModalTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Title
      class={cn("text-lg font-semibold leading-none tracking-tight", local.class)}
      {...others}
    />
  )
}

export function ModalDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Description
      class={cn("text-sm text-muted-foreground", local.class)}
      {...others}
    />
  )
}

import { Dialog as DialogPrimitive } from "@kobalte/core/dialog"
import { ComponentProps, JSX, splitProps } from "solid-js"
import X from "lucide-solid/icons/x"

import { cn } from "@/lib/utils"

/**
 * A panel that slides in from the left edge, above the page: the app's sidebar menu.
 *
 * Built on Kobalte's Dialog, so it is a modal dialog. Focus is intentionally trapped inside the
 * panel while it is open (ACCESSIBILITY.md §4), and Escape, a click on the overlay, or the visible
 * close button closes it and returns focus to whatever opened it.
 *
 * Named "drawer" rather than "sheet": a sheet here is a character sheet.
 */
export const Drawer = DialogPrimitive
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.CloseButton

function DrawerOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Overlay
      data-test="drawer-overlay"
      class={cn(
        "fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 duration-200",
        local.class
      )}
      {...others}
    />
  )
}

/**
 * The panel. Its children scroll inside it when they are taller than the viewport, so put the
 * DrawerHeader first and everything else after it.
 */
export function DrawerContent(props: ComponentProps<typeof DialogPrimitive.Content> & { children?: JSX.Element }) {
  const [local, others] = splitProps(props, ["class", "children"])
  return (
    <DialogPrimitive.Portal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        data-sem="drawer-content"
        class={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-r bg-background shadow-lg data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:slide-out-to-left data-[expanded]:slide-in-from-left duration-200",
          local.class
        )}
        {...others}
      >
        {local.children}
        {/* A 44×44 hit area (ACCESSIBILITY.md touch targets), as ModalContent's */}
        <DialogPrimitive.CloseButton data-test="drawer-close" class="absolute right-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Close</span>
        </DialogPrimitive.CloseButton>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DrawerHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  // Right padding keeps the title clear of the close button
  return <div class={cn("flex flex-col gap-1 py-4 pl-4 pr-12", local.class)} {...others} />
}

export function DrawerTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Title
      class={cn("text-lg font-semibold leading-none tracking-tight", local.class)}
      {...others}
    />
  )
}

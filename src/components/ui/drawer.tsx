import { Dialog as DialogPrimitive } from "@kobalte/core/dialog"
import { ComponentProps, JSX, splitProps } from "solid-js"
import PanelLeftClose from "lucide-solid/icons/panel-left-close"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A panel that slides in from the left edge, above the page: the app's sidebar menu.
 *
 * Built on Kobalte's Dialog, so it is a modal dialog. Focus is intentionally trapped inside the
 * panel while it is open (ACCESSIBILITY.md §4), and Escape, a click on the overlay, or the visible
 * close button closes it and returns focus to whatever opened it.
 *
 * The close button is at the panel's top left, exactly where every page puts the menu button that
 * opens it (MENU_BUTTON_FLOATING in stats-bar.tsx), and looks like it: a second click without
 * moving the pointer closes the drawer.
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
        {/* First, so it is first in the tab order as it is on screen. 32px, like the menu button,
            with buttonVariants' 44px hit area; merged with cn so absolute replaces its relative. */}
        <DialogPrimitive.CloseButton
          data-test="drawer-close"
          aria-label="Close"
          class={cn(buttonVariants({ variant: "outline", size: "icon" }), "absolute left-4 top-3 h-8 w-8 bg-background")}
        >
          <PanelLeftClose class="h-4 w-4" aria-hidden="true" />
        </DialogPrimitive.CloseButton>
        {local.children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/**
 * The row beside the close button: its content starts to the button's right and is centred on it.
 */
export function DrawerHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex min-h-14 items-center gap-2 py-3 pl-16 pr-4", local.class)} {...others} />
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

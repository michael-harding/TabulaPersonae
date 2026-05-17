import { Dialog as DialogPrimitive } from "@kobalte/core/dialog"
import { ComponentProps, JSX, splitProps } from "solid-js"
import X from "lucide-solid/icons/x"
import { cn } from "@/lib/utils"

export const Dialog = DialogPrimitive
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.CloseButton

function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Overlay
      class={cn(
        "fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
        local.class
      )}
      {...others}
    />
  )
}

export function DialogContent(props: ComponentProps<typeof DialogPrimitive.Content> & { children?: JSX.Element }) {
  const [local, others] = splitProps(props, ["class", "children"])
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        class={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 sm:rounded-lg",
          local.class
        )}
        {...others}
      >
        {local.children}
        <DialogPrimitive.CloseButton class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </DialogPrimitive.CloseButton>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div class={cn("flex flex-col space-y-1.5 text-center sm:text-left", local.class)} {...others} />
  )
}

export function DialogFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", local.class)} {...others} />
  )
}

export function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Title
      class={cn("text-lg font-semibold leading-none tracking-tight", local.class)}
      {...others}
    />
  )
}

export function DialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Description
      class={cn("text-sm text-muted-foreground", local.class)}
      {...others}
    />
  )
}

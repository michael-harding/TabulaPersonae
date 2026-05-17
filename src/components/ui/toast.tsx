import { ComponentProps, splitProps } from "solid-js"
import X from "lucide-solid/icons/x"
import { cn } from "@/lib/utils"
import { toastVariants, type ToastVariant } from "@/hooks/use-toast"

export type ToastProps = ComponentProps<"div"> & { variant?: ToastVariant }

export function Toast(props: ToastProps) {
  const [local, others] = splitProps(props, ["class", "variant"])
  return (
    <div
      class={cn(toastVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  )
}

export function ToastTitle(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("text-sm font-semibold", local.class)} {...others} />
}

export function ToastDescription(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("text-sm opacity-90", local.class)} {...others} />
}

export function ToastClose(props: ComponentProps<"button"> & { onDismiss?: () => void }) {
  const [local, others] = splitProps(props, ["class", "onDismiss"])
  return (
    <button
      type="button"
      onClick={local.onDismiss}
      class={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
        local.class
      )}
      {...others}
    >
      <X class="h-4 w-4" />
    </button>
  )
}

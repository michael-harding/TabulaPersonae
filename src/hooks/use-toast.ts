import { createSignal } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export type ToastVariant = VariantProps<typeof toastVariants>["variant"]

export interface ToasterToast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open: boolean
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// Module-level signal — works natively in SolidJS outside components
const [toasts, setToasts] = createSignal<ToasterToast[]>([])

const TOAST_REMOVE_DELAY = 5000

function addToast(props: Omit<ToasterToast, "id" | "open">) {
  const id = genId()
  setToasts((prev) => [{ ...props, id, open: true }, ...prev].slice(0, 3))

  setTimeout(() => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, TOAST_REMOVE_DELAY)

  return id
}

export function toast(props: { title?: string; description?: string; variant?: ToastVariant }) {
  return addToast(props)
}

export function useToast() {
  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    },
  }
}

export { toastVariants }

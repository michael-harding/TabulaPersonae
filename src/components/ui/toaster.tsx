import { For } from "solid-js"
import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div class="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      <For each={toasts()}>
        {(t) => (
          <Toast variant={t.variant} class="mb-2">
            <div class="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose onDismiss={() => dismiss(t.id)} />
          </Toast>
        )}
      </For>
    </div>
  )
}

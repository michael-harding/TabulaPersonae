import { For } from "solid-js"

import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // WCAG 4.1.3: toasts appear without taking focus, so they are announced through a live region,
  // which has to be in the page before a toast is added to it. Named, the section is also a
  // landmark, so toasts (rendered after <main>) stay reachable by landmark navigation.
  return (
    <section
      data-sem="toaster"
      aria-label="Notifications"
      aria-live="polite"
      class="pointer-events-none fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    >
      <For each={toasts()}>
        {(t) => (
          // A failure is announced at once; anything else waits for the reader to finish.
          <Toast variant={t.variant} role={t.variant === "destructive" ? "alert" : "status"} class="mb-2">
            <div class="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose onDismiss={() => dismiss(t.id)} />
          </Toast>
        )}
      </For>
    </section>
  )
}

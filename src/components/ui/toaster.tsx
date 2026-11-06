import { For } from "solid-js"

import { useToast, type ToasterToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast"

// Newest at the anchored edge: the bottom of the stack at the top of a phone screen, the top of
// the stack in the bottom corner on wider screens
const STACK = "flex flex-col-reverse sm:flex-col"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const failures = () => toasts().filter((t) => t.variant === "destructive")
  const others = () => toasts().filter((t) => t.variant !== "destructive")

  const renderToast = (t: ToasterToast) => (
    <Toast variant={t.variant} class="mb-2">
      <div class="grid gap-1">
        {t.title && <ToastTitle>{t.title}</ToastTitle>}
        {t.description && <ToastDescription>{t.description}</ToastDescription>}
      </div>
      <ToastClose onDismiss={() => dismiss(t.id)} />
    </Toast>
  )

  // WCAG 4.1.3: toasts appear without taking focus, so they are announced through live regions,
  // which have to be in the page before a toast is added to them (ACCESSIBILITY.md §12). A failure
  // is announced at once; anything else waits for the reader to finish. Each toast is in exactly
  // one region and has no live role of its own, so it is announced once. Named, the section is
  // also a landmark, so toasts (rendered after <main>) stay reachable by landmark navigation.
  return (
    <section
      data-sem="toaster"
      aria-label="Notifications"
      class={`pointer-events-none fixed top-0 z-[100] ${STACK} max-h-screen w-full p-4 sm:bottom-0 sm:right-0 sm:top-auto md:max-w-[420px]`}
    >
      <div data-sem="toaster-failures" aria-live="assertive" class={STACK}>
        <For each={failures()}>{renderToast}</For>
      </div>
      <div data-sem="toaster-messages" aria-live="polite" class={STACK}>
        <For each={others()}>{renderToast}</For>
      </div>
    </section>
  )
}

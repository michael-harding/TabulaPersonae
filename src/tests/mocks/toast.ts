import { vi } from "vitest"

// Stable toast mock. A test file that asserts on what the user was told installs it with
// `vi.mock("@/hooks/use-toast", ...)` as both the module-level `toast` and `useToast().toast`,
// then imports it from here.
export const mockToast = vi.fn()

/** The `@/hooks/use-toast` module with every way of raising a toast routed to `mockToast`. */
export const toastModuleMock = {
  toast: mockToast,
  useToast: () => ({ toasts: () => [], toast: mockToast, dismiss: vi.fn() }),
}

import "@testing-library/jest-dom"
import { configure } from "@testing-library/dom"
import { vi } from "vitest"
import { splitProps, type JSX, type ParentProps } from "solid-js"

// TESTING.md §6: tests select elements via the `data-test` attribute, not the
// Testing Library default of `data-testid`. This repoints getByTestId/findByTestId
// at the attribute this codebase actually uses.
configure({ testIdAttribute: "data-test" })

// Mock Firebase to prevent initialization errors. vi.fn so a test can make an accessor throw, the
// way the real ones do when Firebase failed to initialize.
vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: vi.fn(() => ({})),
  getDb: vi.fn(() => ({})),
  clearFirestoreCache: vi.fn(() => Promise.resolve()),
}))

// Mock auth-context with signal-compatible values
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ uid: "test-user" }),
    loading: () => false,
    skipAuth: () => false,
    signIn: () => Promise.resolve(),
    signUp: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    resetPassword: () => Promise.resolve(),
  }),
  AuthProvider: (props: ParentProps) => <>{props.children}</>,
  AuthContext: {},
}))

// Stable storage-manager mock shared across tests (see mocks/storage-manager.ts)
vi.mock("@/lib/storage-manager", async () => {
  const { mockStorageManager } = await import("./mocks/storage-manager")
  return { useStorageManager: () => () => mockStorageManager }
})

// Mock tab-config-context so components that call useTabConfig() don't need a real provider.
// useTabConfig is a vi.fn() so individual tests can call .mockReturnValue() to supply a
// custom config without touching any other test files.
vi.mock("@/lib/tab-config-context", async () => {
  const { DEFAULT_TAB_CONFIG } = await import("@/lib/tab-config-types")
  return {
    useTabConfig: vi.fn(() => ({
      tabConfig: () => DEFAULT_TAB_CONFIG,
      saveTabConfig: vi.fn().mockResolvedValue(undefined),
    })),
    TabConfigProvider: (props: ParentProps) => <>{props.children}</>,
  }
})

// Mock @solidjs/router for tests. useNavigate returns a stable mock (see mocks/router.ts)
vi.mock("@solidjs/router", async () => {
  const { mockNavigate } = await import("./mocks/router")
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "test-id" }),
    useSearchParams: () => [{}, vi.fn()],
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: null, key: "" }),
    // An <a> with the link's own attributes (class, data-test, target, ...), so tests can check
    // them; only the router's own props are left off.
    A: (props: Record<string, unknown>) => {
      const [, attributes] = splitProps(props, ["end", "activeClass", "inactiveClass", "noScroll", "replace", "state"])
      return <a {...(attributes as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)} />
    },
    Router: (props: ParentProps) => <>{props.children}</>,
    Route: () => null,
  }
})

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 9)) },
  configurable: true,
})

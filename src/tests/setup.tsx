import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock Firebase to prevent initialization errors
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }))

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
  AuthProvider: ({ children }: any) => children,
  AuthContext: {},
}))

// Stable storage-manager mock shared across tests
const mockStorageManager = {
  getCharacters: vi.fn().mockResolvedValue([]),
  saveCharacter: vi.fn().mockResolvedValue(true),
  getCharacter: vi.fn().mockResolvedValue(null),
  deleteCharacter: vi.fn().mockResolvedValue(true),
  syncToFirebase: vi.fn().mockResolvedValue(true),
  isAuthenticated: true,
  storageType: "firebase",
}
;(globalThis as any).mockStorageManager = mockStorageManager

vi.mock("@/lib/storage-manager", () => ({
  useStorageManager: () => () => (globalThis as any).mockStorageManager,
}))

// Mock @solidjs/router for tests
vi.mock("@solidjs/router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "test-id" }),
  A: ({ href, children }: any) => <a href={href}>{children}</a>,
  Router: ({ children }: any) => children,
  Route: () => null,
}))

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 9)) },
  configurable: true,
})

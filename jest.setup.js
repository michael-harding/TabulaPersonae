"use client"

// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import { jest } from "@jest/globals"
import "@testing-library/jest-dom"

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock local Firebase and auth modules to prevent initialization errors in tests
jest.mock("./lib/firebase", () => ({ auth: {}, db: {} }))

jest.mock("./lib/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    loading: false,
    skipAuth: false,
    signIn: () => Promise.resolve(),
    signUp: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    resetPassword: () => Promise.resolve(),
  }),
  AuthProvider: ({ children }) => children,
  AuthContext: {},
}))

// Stable storage-manager mock — shared object so tests can assert on individual calls
global.mockStorageManager = {
  getCharacters: jest.fn().mockResolvedValue([]),
  saveCharacter: jest.fn().mockResolvedValue(true),
  getCharacter: jest.fn().mockResolvedValue(null),
  deleteCharacter: jest.fn().mockResolvedValue(true),
  syncToFirebase: jest.fn().mockResolvedValue(true),
  isAuthenticated: true,
  storageType: "firebase",
}

jest.mock("./lib/storage-manager", () => ({
  useStorageManager: () => global.mockStorageManager,
}))

// Stable router mock — reused across renders so tests can assert on push/replace
global.mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
}

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return global.mockRouter
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ""
  },
}))

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}))

// Mock crypto.randomUUID globally
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
  },
})

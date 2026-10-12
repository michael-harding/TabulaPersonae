import { vi } from "vitest"
import type { User } from "firebase/auth"

import type { AuthContextType } from "@/lib/auth-context"

/**
 * A complete Firebase `User` for tests; override only the fields a test cares about. The `null`
 * fields are Firebase's own representation of "not set" in its `User` type.
 */
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    uid: "test-user",
    email: null,
    displayName: null,
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
    emailVerified: false,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: vi.fn().mockResolvedValue(undefined),
    getIdToken: vi.fn().mockResolvedValue("test-token"),
    getIdTokenResult: vi.fn().mockResolvedValue({
      authTime: "",
      expirationTime: "",
      issuedAtTime: "",
      signInProvider: null,
      signInSecondFactor: null,
      token: "test-token",
      claims: {},
    }),
    reload: vi.fn().mockResolvedValue(undefined),
    toJSON: () => ({}),
    ...overrides,
  }
}

/** A complete `useAuth()` return value for tests; defaults to a signed-out, finished-loading state. */
export function createMockAuth(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: () => null, // signed out
    loading: () => false,
    skipAuth: () => false,
    setSkipAuth: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  }
}

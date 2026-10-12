import { vi } from "vitest"

// Stable storage-manager mock shared across tests. `setup.tsx` installs it as the return value of
// `useStorageManager`; tests import it from here to stub or assert on individual methods.
export const mockStorageManager = {
  getCharacters: vi.fn().mockResolvedValue([]),
  saveCharacter: vi.fn().mockResolvedValue(true),
  getCharacter: vi.fn().mockResolvedValue(null),
  deleteCharacter: vi.fn().mockResolvedValue(true),
  syncToFirebase: vi.fn().mockResolvedValue(true),
  isAuthenticated: true,
  storageType: "firebase",
}

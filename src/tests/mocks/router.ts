import { vi } from "vitest"

// Stable navigate mock shared across tests. `setup.tsx` installs it as the return value of
// `useNavigate`; tests import it from here to assert on where a component navigated.
export const mockNavigate = vi.fn()

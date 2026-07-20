vi.unmock("@/lib/tab-config-context")

// Controllable user — set per test in beforeEach
let mockUser: { uid: string } | null = null

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: () => mockUser,
    loading: () => false,
    skipAuth: () => false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
  AuthContext: {},
}))

vi.mock("@/lib/firebase-storage", () => ({
  getTabConfigFromFirebase: vi.fn(),
  saveTabConfigToFirebase: vi.fn(),
  subscribeToCharacter: vi.fn(() => vi.fn()),
}))

import { render, waitFor } from "@solidjs/testing-library"
import { getTabConfigFromFirebase, saveTabConfigToFirebase } from "@/lib/firebase-storage"
import { TabConfigProvider, useTabConfig } from "@/lib/tab-config-context"
import { DEFAULT_TAB_CONFIG } from "@/lib/tab-config-types"
import type { UserTabConfig } from "@/lib/tab-config-types"

const mockGetTabConfig = vi.mocked(getTabConfigFromFirebase)
const mockSaveTabConfig = vi.mocked(saveTabConfigToFirebase)

const TAB_CONFIG_KEY = "dnd-tab-config"

const customConfig: UserTabConfig = {
  tabs: [{ id: "custom-1", label: "Custom", modules: ["spells"] }],
}

function Consumer(props: { onCapture: (ctx: ReturnType<typeof useTabConfig>) => void }) {
  props.onCapture(useTabConfig())
  return null
}

function renderProvider(onCapture: (ctx: ReturnType<typeof useTabConfig>) => void) {
  return render(() => (
    <TabConfigProvider>
      <Consumer onCapture={onCapture} />
    </TabConfigProvider>
  ))
}

beforeEach(() => {
  mockUser = null
  mockGetTabConfig.mockResolvedValue(null)
  mockSaveTabConfig.mockResolvedValue(true)
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

// Also mock use-toast so toast() calls don't throw in jsdom
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toasts: () => [], toast: vi.fn(), dismiss: vi.fn() }),
}))

import { toast } from "@/hooks/use-toast"
const mockToast = vi.mocked(toast)

describe("TabConfigProvider — anonymous user", () => {
  it("uses DEFAULT_TAB_CONFIG when no localStorage entry exists", async () => {
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(DEFAULT_TAB_CONFIG.tabs.length)
      expect(ctx.tabConfig().tabs[0].label).toBe(DEFAULT_TAB_CONFIG.tabs[0].label)
    })
  })

  it("loads config from localStorage when present", async () => {
    localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify(customConfig))
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(1)
      expect(ctx.tabConfig().tabs[0].label).toBe("Custom")
    })
  })

  it("writes to localStorage on saveTabConfig", async () => {
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => expect(ctx).toBeTruthy())

    await ctx.saveTabConfig(customConfig)

    expect(JSON.parse(localStorage.getItem(TAB_CONFIG_KEY)!)).toEqual(customConfig)
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })
})

describe("TabConfigProvider — authenticated user", () => {
  beforeEach(() => {
    mockUser = { uid: "user-123" }
  })

  it("uses DEFAULT_TAB_CONFIG when Firebase returns null", async () => {
    mockGetTabConfig.mockResolvedValue(null)
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(DEFAULT_TAB_CONFIG.tabs.length)
    })
  })

  it("loads config from Firebase when present", async () => {
    mockGetTabConfig.mockResolvedValue(customConfig)
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(1)
      expect(ctx.tabConfig().tabs[0].label).toBe("Custom")
    })
  })

  it("calls saveTabConfigToFirebase on saveTabConfig", async () => {
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => expect(ctx).toBeTruthy())

    await ctx.saveTabConfig(customConfig)

    expect(mockSaveTabConfig).toHaveBeenCalledWith(customConfig, "user-123")
    expect(localStorage.getItem(TAB_CONFIG_KEY)).toBeNull()
  })

  it("migrates localStorage config to Firebase and clears localStorage on login", async () => {
    localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify(customConfig))
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })

    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(customConfig, "user-123")
    })
    expect(localStorage.getItem(TAB_CONFIG_KEY)).toBeNull()
    expect(ctx.tabConfig().tabs[0].label).toBe("Custom")
  })

  it("preserves localStorage and shows toast when migration Firebase write fails", async () => {
    mockSaveTabConfig.mockResolvedValue(false)
    localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify(customConfig))
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })

    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(customConfig, "user-123")
    })
    // localStorage must NOT be cleared when the write failed
    expect(localStorage.getItem(TAB_CONFIG_KEY)).not.toBeNull()
    // Toast should have been shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }))
    // Local state is still updated from the local config
    expect(ctx.tabConfig().tabs[0].label).toBe("Custom")
  })

  it("shows a toast when saveTabConfig Firebase write fails", async () => {
    mockSaveTabConfig.mockResolvedValue(false)
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => expect(ctx).toBeTruthy())

    await ctx.saveTabConfig(customConfig)

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }))
    // Optimistic update is kept even after failure
    expect(ctx.tabConfig().tabs[0].label).toBe("Custom")
  })

  it("uses DEFAULT_TAB_CONFIG when Firebase returns a malformed object", async () => {
    mockGetTabConfig.mockResolvedValue({ notATabs: true } as any)
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(DEFAULT_TAB_CONFIG.tabs.length)
    })
  })
})

describe("TabConfigProvider — invalid localStorage data", () => {
  it("falls back to DEFAULT_TAB_CONFIG when localStorage contains malformed JSON", async () => {
    localStorage.setItem(TAB_CONFIG_KEY, "{{not valid json{{")
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(DEFAULT_TAB_CONFIG.tabs.length)
    })
  })

  it("falls back to DEFAULT_TAB_CONFIG when localStorage contains valid JSON with wrong shape", async () => {
    localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify({ notTabs: [] }))
    let ctx!: ReturnType<typeof useTabConfig>
    renderProvider((c) => { ctx = c })
    await waitFor(() => {
      expect(ctx.tabConfig().tabs).toHaveLength(DEFAULT_TAB_CONFIG.tabs.length)
    })
  })
})

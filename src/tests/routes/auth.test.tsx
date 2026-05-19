vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
  AuthContext: {},
}))

import { cleanup, render, screen, fireEvent, waitFor } from "../test-utils"
import { useAuth } from "@/lib/auth-context"
import Auth from "@/routes/Auth"

const mockUseAuth = vi.mocked(useAuth)

// window.location.reload is non-configurable in jsdom by default — redefine once.
const mockReload = vi.fn()
Object.defineProperty(window, "location", {
  value: { ...window.location, reload: mockReload },
  configurable: true,
  writable: true,
})

function setupAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockUseAuth.mockReturnValue({
    user: () => null,
    loading: () => false,
    skipAuth: () => false,
    setSkipAuth: vi.fn(),
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
  document.body.removeAttribute("data-scroll-locked")
  document.documentElement.removeAttribute("style")
}

// Kobalte keeps the dialog element in the DOM with data-closed when closed;
// it is only "open" when data-expanded is present.
function dialogIsOpen() {
  const dialog = screen.queryByRole("dialog")
  return dialog !== null && dialog.hasAttribute("data-expanded")
}

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  cleanupPortals()
  localStorage.clear()
  mockReload.mockReset()
  setupAuth()
})

afterEach(() => {
  cleanup()
  cleanupPortals()
})

// ─── TermsOfUse page ────────────────────────────────────────────────────────

describe("TermsOfUse page", () => {
  it("renders the page heading", async () => {
    const { default: TermsOfUse } = await import("@/routes/TermsOfUse")
    render(<TermsOfUse />)
    expect(screen.getByRole("heading", { name: /terms of use/i })).toBeInTheDocument()
  })

  it("shows an effective date", async () => {
    const { default: TermsOfUse } = await import("@/routes/TermsOfUse")
    render(<TermsOfUse />)
    expect(screen.getByText(/effective date: may/i)).toBeInTheDocument()
  })

  it("renders a back link pointing to /auth", async () => {
    const { default: TermsOfUse } = await import("@/routes/TermsOfUse")
    render(<TermsOfUse />)
    const back = screen.getByRole("link", { name: /back/i })
    expect(back).toHaveAttribute("href", "/auth")
  })

  it("renders key section headings", async () => {
    const { default: TermsOfUse } = await import("@/routes/TermsOfUse")
    render(<TermsOfUse />)
    expect(screen.getByRole("heading", { name: /use of the app/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /^2\. accounts/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /prohibited conduct/i })).toBeInTheDocument()
  })
})

// ─── PrivacyPolicy page ──────────────────────────────────────────────────────

describe("PrivacyPolicy page", () => {
  it("renders the page heading", async () => {
    const { default: PrivacyPolicy } = await import("@/routes/PrivacyPolicy")
    render(<PrivacyPolicy />)
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument()
  })

  it("shows an effective date", async () => {
    const { default: PrivacyPolicy } = await import("@/routes/PrivacyPolicy")
    render(<PrivacyPolicy />)
    expect(screen.getByText(/effective date: may/i)).toBeInTheDocument()
  })

  it("renders a back link pointing to /auth", async () => {
    const { default: PrivacyPolicy } = await import("@/routes/PrivacyPolicy")
    render(<PrivacyPolicy />)
    const back = screen.getByRole("link", { name: /back/i })
    expect(back).toHaveAttribute("href", "/auth")
  })

  it("renders key section headings", async () => {
    const { default: PrivacyPolicy } = await import("@/routes/PrivacyPolicy")
    render(<PrivacyPolicy />)
    expect(screen.getByRole("heading", { name: /without an account/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /information collected/i })).toBeInTheDocument()
  })
})

// ─── Auth page — sign-up legal notice ────────────────────────────────────────

describe("Auth page — sign-up legal notice", () => {
  it("shows Terms of Use and Privacy Policy links once sign-up tab is selected", async () => {
    render(<Auth />)
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

    const termsLink = await screen.findByRole("link", { name: /terms of use/i })
    const privacyLink = await screen.findByRole("link", { name: /privacy policy/i })
    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(privacyLink).toHaveAttribute("href", "/privacy")
  })

  it("hides the legal notice when sign-in tab is selected", () => {
    render(<Auth />)
    expect(screen.queryByText(/by creating an account/i)).not.toBeInTheDocument()
  })
})

// ─── Auth page — ConsentModal (sign-up flow) ─────────────────────────────────

describe("Auth page — ConsentModal shown during sign-up", () => {
  function fillAndSubmitSignUp() {
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }))
    fireEvent.input(screen.getByLabelText(/^email$/i), { target: { value: "user@test.com" } })
    fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: "password123" } })
    fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } })
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form")!)
  }

  it("opens the consent modal when sign-up form is submitted", async () => {
    render(<Auth />)
    fillAndSubmitSignUp()
    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    expect(screen.getByText(/terms of use.*privacy policy/i)).toBeInTheDocument()
  })

  it("modal contains Terms of Use and Privacy Policy links", async () => {
    render(<Auth />)
    fillAndSubmitSignUp()
    await waitFor(() => expect(dialogIsOpen()).toBe(true))

    const links = screen.getAllByRole("link")
    const hrefs = links.map((l) => l.getAttribute("href"))
    expect(hrefs).toContain("/terms")
    expect(hrefs).toContain("/privacy")
  })

  it("closes modal and calls signUp when user clicks I Agree", async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    setupAuth({ signUp })
    render(<Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(signUp).toHaveBeenCalledWith("user@test.com", "password123")
  })

  it("saves terms acceptance to localStorage when user agrees", async () => {
    render(<Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(localStorage.getItem("dnd-terms-accepted")).toBe("true"))
  })

  it("closes modal without calling signUp when user clicks Decline", async () => {
    const signUp = vi.fn()
    setupAuth({ signUp })
    render(<Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /decline/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(signUp).not.toHaveBeenCalled()
  })

  it("does not save terms acceptance when user declines", async () => {
    render(<Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /decline/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(localStorage.getItem("dnd-terms-accepted")).toBeNull()
  })
})

// ─── Auth page — ConsentModal (continue without account flow) ────────────────

describe("Auth page — ConsentModal shown for Continue without account", () => {
  it("opens consent modal when terms have not been accepted", async () => {
    render(<Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))
    await waitFor(() => expect(dialogIsOpen()).toBe(true))
  })

  it("skips consent modal when terms were previously accepted", () => {
    localStorage.setItem("dnd-terms-accepted", "true")
    render(<Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))
    expect(dialogIsOpen()).toBe(false)
    expect(localStorage.getItem("dnd-skip-auth")).toBe("true")
    expect(mockReload).toHaveBeenCalled()
  })

  it("saves terms acceptance and sets skip-auth flag when user agrees", async () => {
    render(<Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(localStorage.getItem("dnd-terms-accepted")).toBe("true"))
    expect(localStorage.getItem("dnd-skip-auth")).toBe("true")
    expect(mockReload).toHaveBeenCalled()
  })

  it("does not set skip-auth when user declines", async () => {
    render(<Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /decline/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(localStorage.getItem("dnd-skip-auth")).toBeNull()
  })
})

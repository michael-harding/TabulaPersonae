vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  AuthProvider: (props: ParentProps) => <>{props.children}</>,
  AuthContext: {},
}))

import { axe } from "vitest-axe"
import type { ParentProps } from "solid-js"

import { useAuth } from "@/lib/auth-context"
import Auth from "@/routes/Auth"

import { cleanup, render, screen, fireEvent, waitFor, cleanupPortals } from "../test-utils"
import { createTestUser } from "../mocks/auth"
import { mockNavigate } from "../mocks/router"

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
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

// Kobalte keeps the dialog element in the DOM with data-closed when closed;
// it is only "open" when data-expanded is present.
function dialogIsOpen() {
  const dialog = screen.queryByRole("dialog")
  return dialog != null && dialog.hasAttribute("data-expanded")
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

// TermsOfUse and PrivacyPolicy pages have their own dedicated test files
// (src/tests/routes/terms-of-use.test.tsx, privacy-policy.test.tsx) — see those
// for heading/content/back-link/accessibility coverage.

// ─── Auth page — sign-up legal notice ────────────────────────────────────────

describe("Auth page — sign-up legal notice", () => {
  it("shows Terms of Use and Privacy Policy links once sign-up tab is selected", async () => {
    render(() => <Auth />)
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

    const termsLink = await screen.findByRole("link", { name: /terms of use/i })
    const privacyLink = await screen.findByRole("link", { name: /privacy policy/i })
    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(privacyLink).toHaveAttribute("href", "/privacy")
  })

  it("hides the legal notice when sign-in tab is selected", () => {
    render(() => <Auth />)
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
    render(() => <Auth />)
    fillAndSubmitSignUp()
    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    expect(screen.getByText(/terms of use.*privacy policy/i)).toBeInTheDocument()
  })

  it("modal contains Terms of Use and Privacy Policy links", async () => {
    render(() => <Auth />)
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
    render(() => <Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(signUp).toHaveBeenCalledWith("user@test.com", "password123")
  })

  it("saves terms acceptance to localStorage when user agrees", async () => {
    render(() => <Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(localStorage.getItem("dnd-terms-accepted")).toBe("true"))
  })

  it("closes modal without calling signUp when user clicks Decline", async () => {
    const signUp = vi.fn()
    setupAuth({ signUp })
    render(() => <Auth />)
    fillAndSubmitSignUp()

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /decline/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(signUp).not.toHaveBeenCalled()
  })

  it("does not save terms acceptance when user declines", async () => {
    render(() => <Auth />)
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
    render(() => <Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))
    await waitFor(() => expect(dialogIsOpen()).toBe(true))
  })

  it("skips consent modal when terms were previously accepted", () => {
    localStorage.setItem("dnd-terms-accepted", "true")
    render(() => <Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))
    expect(dialogIsOpen()).toBe(false)
    expect(localStorage.getItem("dnd-skip-auth")).toBe("true")
    expect(mockReload).toHaveBeenCalled()
  })

  it("saves terms acceptance and sets skip-auth flag when user agrees", async () => {
    render(() => <Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))

    await waitFor(() => expect(localStorage.getItem("dnd-terms-accepted")).toBe("true"))
    expect(localStorage.getItem("dnd-skip-auth")).toBe("true")
    expect(mockReload).toHaveBeenCalled()
  })

  it("does not set skip-auth when user declines", async () => {
    render(() => <Auth />)
    fireEvent.click(screen.getByRole("button", { name: /continue without account/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /decline/i }))

    await waitFor(() => expect(dialogIsOpen()).toBe(false))
    expect(localStorage.getItem("dnd-skip-auth")).toBeNull()
  })
})

// ─── Auth page — signing in ──────────────────────────────────────────────────

// A Firebase Auth failure as the SDK throws it: an Error carrying a `code`.
function makeAuthError(code: string) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code })
}

function fillCredentials(email: string, password: string) {
  fireEvent.input(screen.getByTestId("auth-email-input"), { target: { value: email } })
  fireEvent.input(screen.getByTestId("auth-password-input"), { target: { value: password } })
}

function submitForm() {
  fireEvent.submit(screen.getByTestId("auth-submit-button").closest("form")!)
}

describe("Auth page — signing in", () => {
  it("signs in with the entered email and password, without asking for consent", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    setupAuth({ signIn })
    render(() => <Auth />)

    fillCredentials("user@test.com", "password123")
    submitForm()

    await waitFor(() => expect(signIn).toHaveBeenCalledWith("user@test.com", "password123"))
    expect(dialogIsOpen()).toBe(false)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each([
    ["auth/user-not-found", "No user found with this email address."],
    ["auth/wrong-password", "Incorrect password."],
    ["auth/email-already-in-use", "An account with this email already exists."],
    ["auth/weak-password", "Password should be at least 6 characters."],
    ["auth/invalid-email", "Invalid email address."],
    ["auth/too-many-requests", "Too many failed attempts. Please try again later."],
    ["auth/some-new-code", "An error occurred. Please try again."],
  ])("explains a %s failure as \"%s\"", async (code, message) => {
    setupAuth({ signIn: vi.fn().mockRejectedValue(makeAuthError(code)) })
    render(() => <Auth />)

    fillCredentials("user@test.com", "password123")
    submitForm()

    expect(await screen.findByRole("alert")).toHaveTextContent(message)
  })

  it("shows the generic message for a failure that carries no code", async () => {
    setupAuth({ signIn: vi.fn().mockRejectedValue(new Error("network down")) })
    render(() => <Auth />)

    fillCredentials("user@test.com", "password123")
    submitForm()

    expect(await screen.findByRole("alert")).toHaveTextContent("An error occurred. Please try again.")
  })

  it("clears the previous error when the form is submitted again", async () => {
    const signIn = vi.fn().mockRejectedValueOnce(makeAuthError("auth/wrong-password")).mockResolvedValue(undefined)
    setupAuth({ signIn })
    render(() => <Auth />)
    fillCredentials("user@test.com", "password123")
    submitForm()
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    submitForm()

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })

  it("disables the form's buttons and shows progress until sign-in finishes", async () => {
    let finishSignIn: () => void = () => {}
    setupAuth({ signIn: vi.fn(() => new Promise<void>((resolve) => { finishSignIn = resolve })) })
    render(() => <Auth />)
    fillCredentials("user@test.com", "password123")

    submitForm()

    const submit = screen.getByTestId("auth-submit-button")
    await waitFor(() => expect(submit).toBeDisabled())
    expect(submit).toHaveTextContent("Please wait...")
    expect(screen.getByTestId("auth-reset-password-button")).toBeDisabled()

    finishSignIn()
    await waitFor(() => expect(submit).toBeEnabled())
    expect(submit).toHaveTextContent("Sign In")
  })
})

// ─── Auth page — sign-up validation ──────────────────────────────────────────

describe("Auth page — sign-up validation", () => {
  async function signUpWith(password: string, confirmPassword: string) {
    fireEvent.click(screen.getByTestId("auth-signup-tab"))
    fillCredentials("user@test.com", password)
    fireEvent.input(screen.getByTestId("auth-confirm-password-input"), { target: { value: confirmPassword } })
    submitForm()
    await waitFor(() => expect(dialogIsOpen()).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }))
    await waitFor(() => expect(dialogIsOpen()).toBe(false))
  }

  it.each([
    { label: "passwords that do not match", password: "password123", confirm: "password124", message: "Passwords do not match" },
    { label: "a password shorter than 6 characters", password: "12345", confirm: "12345", message: "Password should be at least 6 characters" },
  ])("rejects $label without creating an account", async ({ password, confirm, message }) => {
    const signUp = vi.fn()
    setupAuth({ signUp })
    render(() => <Auth />)

    await signUpWith(password, confirm)

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
    expect(screen.getByTestId("auth-submit-button")).toBeEnabled()
  })

  it("accepts a password of exactly 6 characters", async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    setupAuth({ signUp })
    render(() => <Auth />)

    await signUpWith("123456", "123456")

    await waitFor(() => expect(signUp).toHaveBeenCalledWith("user@test.com", "123456"))
  })

  it("explains why the account could not be created", async () => {
    setupAuth({ signUp: vi.fn().mockRejectedValue(makeAuthError("auth/email-already-in-use")) })
    render(() => <Auth />)

    await signUpWith("password123", "password123")

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument()
  })

  it("offers password reset only on the sign-in tab", () => {
    render(() => <Auth />)
    expect(screen.getByTestId("auth-reset-password-button")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("auth-signup-tab"))
    expect(screen.queryByTestId("auth-reset-password-button")).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId("auth-signin-tab"))
    expect(screen.getByTestId("auth-reset-password-button")).toBeInTheDocument()
  })
})

// ─── Auth page — password reset ──────────────────────────────────────────────

describe("Auth page — password reset", () => {
  it("asks for an email address before sending anything", () => {
    const resetPassword = vi.fn()
    setupAuth({ resetPassword })
    render(() => <Auth />)

    fireEvent.click(screen.getByTestId("auth-reset-password-button"))

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your email address")
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it("sends the reset email to the entered address and confirms it", async () => {
    const resetPassword = vi.fn().mockResolvedValue(undefined)
    setupAuth({ resetPassword })
    render(() => <Auth />)
    fireEvent.input(screen.getByTestId("auth-email-input"), { target: { value: "user@test.com" } })

    fireEvent.click(screen.getByTestId("auth-reset-password-button"))

    expect(await screen.findByRole("status")).toHaveTextContent("Password reset email sent! Check your inbox.")
    expect(resetPassword).toHaveBeenCalledWith("user@test.com")
  })

  it("explains why the reset email could not be sent, and does not claim it was", async () => {
    setupAuth({ resetPassword: vi.fn().mockRejectedValue(makeAuthError("auth/invalid-email")) })
    render(() => <Auth />)
    fireEvent.input(screen.getByTestId("auth-email-input"), { target: { value: "not-an-email" } })

    fireEvent.click(screen.getByTestId("auth-reset-password-button"))

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email address.")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByTestId("auth-reset-password-button")).toBeEnabled()
  })
})

// ─── Auth page — who sees it ─────────────────────────────────────────────────

describe("Auth page — redirect", () => {
  it.each([
    { label: "is already signed in", auth: { user: () => createTestUser() } },
    { label: "chose to continue without an account", auth: { skipAuth: () => true } },
  ])("sends a visitor who $label to the home page", ({ auth }) => {
    setupAuth(auth)
    render(() => <Auth />)

    expect(mockNavigate).toHaveBeenCalledWith("/")
  })

  it("stays on the page for a signed-out visitor", () => {
    render(() => <Auth />)

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByTestId("auth-submit-button")).toBeInTheDocument()
  })

  it("renders nothing and does not redirect while the sign-in state is still unknown", () => {
    setupAuth({ loading: () => true, user: () => createTestUser() })
    render(() => <Auth />)

    expect(screen.queryByTestId("auth-submit-button")).not.toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

// ─── Auth page — ConsentModal cannot be dismissed ────────────────────────────

describe("Auth page — ConsentModal requires an explicit choice", () => {
  it("stays open when Escape is pressed", async () => {
    render(() => <Auth />)
    fireEvent.click(screen.getByTestId("auth-skip-button"))
    await waitFor(() => expect(dialogIsOpen()).toBe(true))

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })

    expect(dialogIsOpen()).toBe(true)
    expect(localStorage.getItem("dnd-skip-auth")).toBeNull()
  })
})

describe("Auth page — accessibility", () => {
  it("has no accessibility violations", async () => {
    setupAuth()
    const { container } = render(() => <Auth />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

import { createSignal, createEffect, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import Scroll from "lucide-solid/icons/scroll"

function AuthForm() {
  const [email, setEmail] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [confirmPassword, setConfirmPassword] = createSignal("")
  const [isSignUp, setIsSignUp] = createSignal(false)
  const [error, setError] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [resetEmailSent, setResetEmailSent] = createSignal(false)

  const { signIn, signUp, resetPassword } = useAuth()

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found": return "No user found with this email address."
      case "auth/wrong-password": return "Incorrect password."
      case "auth/email-already-in-use": return "An account with this email already exists."
      case "auth/weak-password": return "Password should be at least 6 characters."
      case "auth/invalid-email": return "Invalid email address."
      case "auth/too-many-requests": return "Too many failed attempts. Please try again later."
      default: return "An error occurred. Please try again."
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (isSignUp()) {
        if (password() !== confirmPassword()) { setError("Passwords do not match"); setLoading(false); return }
        if (password().length < 6) { setError("Password should be at least 6 characters"); setLoading(false); return }
        await signUp(email(), password())
      } else {
        await signIn(email(), password())
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email()) { setError("Please enter your email address"); return }
    setLoading(true)
    try {
      await resetPassword(email())
      setResetEmailSent(true)
    } catch (err: any) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setIsSignUp(false)}
          class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isSignUp() ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(true)}
          class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isSignUp() ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} class="space-y-4">
        <div class="space-y-2">
          <label for="auth-email" class="text-sm font-medium">Email</label>
          <input
            id="auth-email"
            type="email"
            placeholder="Enter your email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          />
        </div>
        <div class="space-y-2">
          <label for="auth-password" class="text-sm font-medium">Password</label>
          <input
            id="auth-password"
            type="password"
            placeholder={isSignUp() ? "Create a password" : "Enter your password"}
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          />
        </div>
        <Show when={isSignUp()}>
          <div class="space-y-2">
            <label for="confirm-password" class="text-sm font-medium">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              required
            />
          </div>
        </Show>
        <Show when={error()}>
          <div class="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">{error()}</div>
        </Show>
        <button
          type="submit"
          disabled={loading()}
          class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading() ? "Please wait..." : (isSignUp() ? "Create Account" : "Sign In")}
        </button>
        <Show when={!isSignUp()}>
          <button type="button" onClick={handlePasswordReset} disabled={loading()} class="text-sm text-muted-foreground hover:text-foreground">
            Forgot password?
          </button>
        </Show>
        <Show when={resetEmailSent()}>
          <div class="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            Password reset email sent! Check your inbox.
          </div>
        </Show>
      </form>
    </div>
  )
}

export default function Auth() {
  const { user, skipAuth, loading } = useAuth()
  const navigate = useNavigate()

  createEffect(() => {
    if (!loading() && (user() || skipAuth())) {
      navigate("/")
    }
  })

  return (
    <Show when={!loading()}>
      <div class="flex flex-1 items-center justify-center bg-background p-4">
        <div class="max-w-md mx-auto text-center w-full">
          <Scroll class="h-16 w-16 mx-auto mb-6 text-primary" />
          <h1 class="text-4xl font-bold mb-4 text-foreground">TabulaPersonae</h1>
          <div class="space-y-4">
            <Button
              onClick={() => {
                localStorage.setItem("dnd-skip-auth", "true")
                window.location.reload()
              }}
              variant="outline"
              class="w-full"
            >
              Continue without account
            </Button>
            <p class="text-sm text-right text-muted-foreground">
              *Your characters will be saved locally to this device only. Use Import/Export to backup characters and
              synchronize between devices manually.
            </p>
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-lg">
                <span class="bg-background px-2 text-muted-foreground">Or Sign In</span>
              </div>
            </div>
            <div class="bg-card rounded-lg p-6 border text-left">
              <AuthForm />
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}

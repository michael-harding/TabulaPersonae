"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Scroll } from "lucide-react"

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password should be at least 6 characters');
          return;
        }
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found': return 'No user found with this email address.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
      default: return 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button type="button" onClick={() => setIsSignUp(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isSignUp ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Sign In
        </button>
        <button type="button" onClick={() => setIsSignUp(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isSignUp ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="auth-email" className="text-sm font-medium">Email</label>
          <input id="auth-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="auth-password" className="text-sm font-medium">Password</label>
          <input id="auth-password" type="password" placeholder={isSignUp ? "Create a password" : "Enter your password"} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm" required />
        </div>
        {isSignUp && (
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</label>
            <input id="confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm" required />
          </div>
        )}
        {error && <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>}
        <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
        {!isSignUp && <button type="button" onClick={handlePasswordReset} disabled={loading} className="text-sm text-muted-foreground hover:text-foreground">Forgot password?</button>}
        {resetEmailSent && <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">Password reset email sent! Check your inbox.</div>}
      </form>
    </div>
  );
}

export default function AuthPage() {
  const { user, skipAuth, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (user || skipAuth)) {
      router.push('/')
    }
  }, [user, skipAuth, loading, router])

  if (loading) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center w-full">
        <Scroll className="h-16 w-16 mx-auto mb-6 text-primary" />
        <h1 className="text-4xl font-bold mb-4 text-foreground">D&D Character Sheet</h1>
        <div className="space-y-4">
          <Button
            onClick={() => {
              localStorage.setItem('dnd-skip-auth', 'true')
              window.location.reload()
            }}
            variant="outline"
            className="w-full"
          >
            Continue without account
          </Button>
          <p className="text-sm text-right text-muted-foreground">
            *Your characters will be saved locally to this device only. Use Import/Export to backup characters and
            synchronize between devices manually.
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-lg">
              <span className="bg-background px-2 text-muted-foreground">Or Sign In</span>
            </div>
          </div>
          <div className="bg-card rounded-lg p-6 border text-left">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}
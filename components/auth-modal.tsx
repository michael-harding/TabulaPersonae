'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  // Debug modal opening
  useEffect(() => {
    console.log('Auth modal isOpen prop changed:', isOpen);
    console.log('Auth modal isOpen type:', typeof isOpen);
    console.log('Auth modal isOpen value:', isOpen);

    if (isOpen) {
      console.log('Auth modal should be visible now - adding debug overlay');
      // Force a style recalculation
      document.body.style.overflow = 'hidden';

      // Add a visible indicator
      const debugIndicator = document.createElement('div');
      debugIndicator.id = 'debug-modal-indicator';
      debugIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: red;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        z-index: 99999;
        font-family: monospace;
        font-size: 12px;
      `;
      debugIndicator.textContent = 'MODAL SHOULD BE OPEN';
      document.body.appendChild(debugIndicator);
    } else {
      console.log('Auth modal should be hidden now');
      document.body.style.overflow = 'unset';

      // Remove debug indicator
      const existingIndicator = document.getElementById('debug-modal-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
    }
  }, [isOpen]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign in form submitted');
    setError('');
    setLoading(true);

    try {
      console.log('Calling signIn with:', email);
      await signIn(email, password);
      console.log('Sign in successful');
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('Google sign in button clicked');
    setError('');
    setLoading(true);

    try {
      console.log('Calling signInWithGoogle');
      await signInWithGoogle();
      console.log('Google sign in successful');
      onClose();
    } catch (err: any) {
      console.error('Google sign in failed:', err);
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setResetEmailSent(false);
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Debug: Add a simple div to test if the modal container is rendering
  console.log('AuthModal render called with isOpen:', isOpen);
  if (isOpen) {
    console.log('Rendering modal with isOpen:', isOpen);
  }

  return (
    <div>
      {/* Debug overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={onClose}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '425px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Welcome to D&D Character Sheet</h2>
              <p style={{ margin: '0 0 20px 0', color: '#666' }}>
                Sign in to your account or create a new one to manage your characters.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => console.log('Test button clicked')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Test Button
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original Dialog as fallback */}
      <Dialog open={false} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to D&D Character Sheet</DialogTitle>
            <DialogDescription>
              Sign in to your account or create a new one to manage your characters.
            </DialogDescription>
          </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      console.log('Email input changed:', e.target.value);
                      setEmail(e.target.value);
                    }}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col space-y-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  onClick={() => console.log('Sign in button clicked in form')}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full"
                >
                  Sign in with Google
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="text-sm"
                >
                  Forgot password?
                </Button>
              </div>

              {resetEmailSent && (
                <Alert>
                  <AlertDescription>
                    Password reset email sent! Check your inbox.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
       </DialogContent>
     </Dialog>
   </div>
  );
}
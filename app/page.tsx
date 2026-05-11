"use client"

import { useState, useEffect } from "react"
import { type Character, createDefaultCharacter } from "@/lib/character-types"
import { useStorageManager } from "@/lib/storage-manager"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Scroll, Sword, Trash2, LogIn } from "lucide-react"
import { Sunrise } from "lucide-react"
import { CharacterBasicInfo } from "@/components/character-basic-info"
import { AbilityScores } from "@/components/ability-scores"
import { CombatStats } from "@/components/combat-stats"
import { SkillsProficiencies } from "@/components/skills-proficiencies"
import { ActionsSection } from "@/components/actions-section"
import { SpellsSection } from "@/components/spells-section"
import { EquipmentInventory } from "@/components/equipment-inventory"
import { CharacterNotes } from "@/components/character-notes"
import { ModeToggle } from "@/components/mode-toggle"
import { ImportExport } from "@/components/import-export"
import { HeaderMenu } from "@/components/header-menu"
import { HpProgressBar } from "@/components/hp-progress-bar"

// Inline authentication form component
function AuthFormInline() {
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
    console.log('Auth form submitted');
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
        console.log('Calling signUp with:', email);
        await signUp(email, password);
      } else {
        console.log('Calling signIn with:', email);
        await signIn(email, password);
      }
      console.log('Authentication successful');
    } catch (err: any) {
      console.error('Authentication failed:', err);
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

  return (
    <div className="space-y-4">
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setIsSignUp(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !isSignUp
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isSignUp
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="auth-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="auth-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            placeholder={isSignUp ? "Create a password" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          />
        </div>

        {isSignUp && (
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              required
            />
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            'Please wait...'
          ) : (
            isSignUp ? 'Create Account' : 'Sign In'
          )}
        </button>

        {!isSignUp && (
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </button>
        )}

        {resetEmailSent && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            Password reset email sent! Check your inbox.
          </div>
        )}
      </form>
    </div>
  );
}

export default function CharacterSheetApp() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeCharacter, setActiveCharacterState] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Debug modal state changes
  useEffect(() => {
    console.log('Auth modal open state changed:', authModalOpen);
  }, [authModalOpen]);

  const { user, skipAuth, loading: authLoading } = useAuth()
  const storageManager = useStorageManager()

  useEffect(() => {
    console.log('Main useEffect triggered:', { authLoading, user: !!user, storageManager });
    const initializeApp = async () => {
      console.log('Initializing app...');
      if (authLoading) {
        console.log('Auth still loading, skipping initialization');
        return;
      }

      try {
        console.log('Loading characters...');
        // Load characters using the storage manager
        const loadedCharacters = await storageManager.getCharacters()
        console.log('Loaded characters:', loadedCharacters.length);
        setCharacters(loadedCharacters)

        // For now, don't restore active character across sessions for Firebase users
        // This could be enhanced later with Firebase-based active character tracking
        if (!user) {
          const activeId = localStorage.getItem("dnd-active-character")
          if (activeId) {
            const found = loadedCharacters.find((c) => c.id === activeId)
            setActiveCharacterState(found || null)
          }
        }
      } catch (error) {
        console.error('Failed to load characters:', error)
      } finally {
        console.log('App initialization complete');
        setIsLoading(false)
        setAuthChecked(true)
      }
    }

    initializeApp()
  }, [authLoading, user])

  // Listen for auth modal trigger events
  useEffect(() => {
    const handleShowAuthModal = () => {
      console.log('Auth modal trigger event received');
      console.log('Setting authModalOpen to true via event');
      setAuthModalOpen(true);
    }
    console.log('Setting up auth modal event listener');
    window.addEventListener('show-auth-modal', handleShowAuthModal)
    return () => {
      console.log('Cleaning up auth modal event listener');
      window.removeEventListener('show-auth-modal', handleShowAuthModal)
    }
  }, [])

  const createNewCharacter = async () => {
    const newCharacter = createDefaultCharacter()
    const updatedCharacters = [...characters, newCharacter]

    setCharacters(updatedCharacters)
    setActiveCharacterState(newCharacter)

    try {
      const saved = await storageManager.saveCharacter(newCharacter)
      if (!user) {
        localStorage.setItem("dnd-active-character", newCharacter.id)
      }

      if (!saved) {
        alert("Failed to save character. Please check your connection and try again.")
      }
    } catch (error) {
      console.error('Failed to save character:', error)
      alert("Failed to save character. Please check your connection and try again.")
    }
  }

  const selectCharacter = (character: Character) => {
    setActiveCharacterState(character)
    if (!user) {
      localStorage.setItem("dnd-active-character", character.id)
    }
  }

  const updateCharacter = async (updatedCharacter: Character) => {
    let nextCharacter = updatedCharacter
    // If character reaches 1 hit point, reset death saves
    if (nextCharacter.hitPoints.current === 1) {
      nextCharacter = {
        ...nextCharacter,
        deathSaves: { successes: 0, failures: 0 },
      }
    }
    setActiveCharacterState(nextCharacter)

    try {
      const saved = await storageManager.saveCharacter(nextCharacter)

      if (!saved) {
        // Show error message to user
        alert("Failed to save character. Please check your connection and try again.")
        return
      }

      // Update characters list
      setCharacters((prev) => prev.map((c) => (c.id === nextCharacter.id ? nextCharacter : c)))
    } catch (error) {
      console.error('Failed to save character:', error)
      alert("Failed to save character. Please check your connection and try again.")
    }
  }

  const handleImportCharacter = async (character: Character) => {
    // Generate new ID to avoid conflicts
    const importedCharacter = { ...character, id: crypto.randomUUID() }
    const updatedCharacters = [...characters, importedCharacter]

    setCharacters(updatedCharacters)
    setActiveCharacterState(importedCharacter)

    try {
      if (!user) {
        localStorage.setItem("dnd-active-character", importedCharacter.id)
      }
      await storageManager.saveCharacter(importedCharacter)
    } catch (error) {
      console.error('Failed to save imported character:', error)
      alert("Failed to save imported character. Please check your connection and try again.")
    }
  }

  const handleImportMultiple = async (importedCharacters: Character[]) => {
    // Generate new IDs to avoid conflicts
    const charactersWithNewIds = importedCharacters.map((char) => ({
      ...char,
      id: crypto.randomUUID(),
    }))

    const updatedCharacters = [...characters, ...charactersWithNewIds]
    setCharacters(updatedCharacters)

    try {
      // Save all imported characters
      await Promise.all(charactersWithNewIds.map((char) => storageManager.saveCharacter(char)))

      // Set the first imported character as active
      if (charactersWithNewIds.length > 0) {
        setActiveCharacterState(charactersWithNewIds[0])
        if (!user) {
          localStorage.setItem("dnd-active-character", charactersWithNewIds[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to save imported characters:', error)
      alert("Failed to save some imported characters. Please check your connection and try again.")
    }
  }

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${characterName || "Unnamed Character"}"? This action cannot be undone.`,
    )

    if (confirmDelete) {
      try {
        // Delete from storage
        await storageManager.deleteCharacter(characterId)

        // Update local state
        const updatedCharacters = characters.filter((c) => c.id !== characterId)
        setCharacters(updatedCharacters)

        // If the deleted character was active, clear active character
        if (activeCharacter?.id === characterId) {
          setActiveCharacterState(null)
          if (!user) {
            localStorage.removeItem("dnd-active-character")
          }
        }
      } catch (error) {
        console.error('Failed to delete character:', error)
        alert("Failed to delete character. Please check your connection and try again.")
      }
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your characters...</p>
        </div>
      </div>
    )
  }

  // Show authentication prompt for unauthenticated users (unless they chose to skip auth)
  if (!user && !skipAuth && authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
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

            <div className="bg-card rounded-lg p-6 border">
              <AuthFormInline />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!activeCharacter) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <ImportExport
              characters={characters}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
            />
            <HeaderMenu
              characters={characters}
              onImportCharacter={handleImportCharacter}
              onImportMultiple={handleImportMultiple}
              onAllCharacters={() => setActiveCharacterState(null)}
              onNewCharacter={createNewCharacter}
            />
          </div>

          <div className="text-center py-12">
            <Scroll className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl font-bold mb-4 text-foreground">D&D Character Sheet</h1>
            <p className="text-xl text-muted-foreground mb-8">Create and manage your Dungeons & Dragons characters</p>

            {characters.length === 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You don't have any characters yet. Create your first character to get started!
                </p>
                <Button onClick={createNewCharacter} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your First Character
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {characters.map((character) => (
                    <Card
                      key={character.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCharacter(character.id, character.name)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div onClick={() => selectCharacter(character)}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 pr-8">
                            <Sword className="h-5 w-5 text-primary" />
                            {character.name || "Unnamed Character"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              Level {character.level} {character.race} {character.class}
                            </p>
                            <p>
                              HP: {character.hitPoints?.current ?? 0}/{character.hitPoints?.maximum ?? 0}
                            </p>
                            <p>AC: {character.armorClass}</p>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button onClick={createNewCharacter} variant="outline" className="gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Create New Character
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {activeCharacter && <HpProgressBar character={activeCharacter} />}

        <header className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Scroll className="h-8 w-8 text-primary" />
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{activeCharacter.name || "Unnamed Character"}</h1>
                    <p className="text-sm text-muted-foreground">
                      Level {activeCharacter.level} {activeCharacter.race} {activeCharacter.class}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle Heroic Inspiration"
                    onClick={() => updateCharacter({ ...activeCharacter, heroicInspiration: !activeCharacter.heroicInspiration })}
                    className={`ml-2 transition-colors ${activeCharacter.heroicInspiration ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <Sunrise className={`h-11 w-11 ${activeCharacter.heroicInspiration ? "fill-yellow-400" : "fill-none"}`} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <HeaderMenu
                characters={characters}
                onImportCharacter={handleImportCharacter}
                onImportMultiple={handleImportMultiple}
                onAllCharacters={() => setActiveCharacterState(null)}
                onNewCharacter={createNewCharacter}
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4">
          <div className="space-y-6">
            {/* Actions & Attacks */}
            <ActionsSection character={activeCharacter} onUpdate={updateCharacter} />

            {/* Stats Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AbilityScores character={activeCharacter} onUpdate={updateCharacter} />
              <CombatStats character={activeCharacter} onUpdate={updateCharacter} />
            </div>

            {/* Skills and Proficiencies */}
            <SkillsProficiencies character={activeCharacter} onUpdate={updateCharacter} />

            {/* Spells */}
            <SpellsSection character={activeCharacter} onUpdate={updateCharacter} />

            {/* Equipment */}
            <EquipmentInventory character={activeCharacter} onUpdate={updateCharacter} />

{/* Character Basic Info */}
<CharacterBasicInfo character={activeCharacter} onUpdate={updateCharacter} />

            {/* Character Notes and Background */}
            <CharacterNotes character={activeCharacter} onUpdate={updateCharacter} />
          </div>
        </main>
      </div>

    </>
  )
}

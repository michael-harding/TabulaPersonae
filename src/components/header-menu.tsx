import { createSignal, Match, Switch } from "solid-js"
import { Dynamic } from "solid-js/web"
import Menu from "lucide-solid/icons/menu"
import Users from "lucide-solid/icons/users"
import Upload from "lucide-solid/icons/upload"
import Download from "lucide-solid/icons/download"
import Moon from "lucide-solid/icons/moon"
import Sun from "lucide-solid/icons/sun"
import Monitor from "lucide-solid/icons/monitor"
import User from "lucide-solid/icons/user"
import LogOut from "lucide-solid/icons/log-out"
import LogIn from "lucide-solid/icons/log-in"
import FileText from "lucide-solid/icons/file-text"

import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { theme, setTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth-context"
import { hasUnsyncedChanges } from "@/lib/firebase-storage"
import { hasLocalDataAwaitingUpload } from "@/lib/local-user-data"
import { useToast } from "@/hooks/use-toast"
import { parsePdfCharacterSheet, mergeWithDefault } from "@/lib/pdf-parser"
import { reconcileImportedCharacter, reconcileImportedCharacters, freshenCalculatedFields } from "@/lib/character-import-reconciliation"
import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import type { Character } from "@/lib/character-types"

interface HeaderMenuProps {
  characters: Character[]
  /**
   * Saves the imported characters and opens the first. Resolves whether every one was saved, and
   * tells the user itself when one was not (see saveImportedCharacters).
   */
  onImport: (characters: Character[]) => Promise<boolean>
  onAllCharacters: () => void
  currentCharacter?: Character
}

export function HeaderMenu(props: HeaderMenuProps) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = createSignal(false)
  const [isImportOpen, setIsImportOpen] = createSignal(false)
  const [isPdfParsing, setIsPdfParsing] = createSignal(false)
  // "unsynced": asking whether to discard changes the account has not received.
  // "failed": the device's data could not be removed, so the user is still signed in.
  // Kept apart from whether the dialog is open, so its text stays put while it animates closed.
  const [signOutDialog, setSignOutDialog] = createSignal<"unsynced" | "failed">("unsynced")
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = createSignal(false)
  const showSignOutDialog = (kind: "unsynced" | "failed") => {
    setSignOutDialog(kind)
    setIsSignOutDialogOpen(true)
  }
  // By the time sign-out has failed Firestore is already shut down (see logout in
  // auth-context.tsx), so nothing can be read or saved until the page reloads. Closing that dialog
  // any other way than its Reload button therefore reloads as well.
  const handleSignOutDialogOpenChange = (open: boolean) => {
    if (!open && signOutDialog() === "failed") window.location.reload()
    else setIsSignOutDialogOpen(open)
  }
  let fileInputRef!: HTMLInputElement
  let pdfInputRef!: HTMLInputElement

  const dateStr = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  const makeDownload = (content: string, filename: string) => {
    const dataBlob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    try {
      if (props.currentCharacter) {
        const char = freshenCalculatedFields(props.currentCharacter)
        makeDownload(JSON.stringify(char, null, 2), `${char.name || "character"}-${dateStr()}.json`)
        toast({ title: "Export Successful", description: `Exported ${char.name || "character"} successfully!` })
      } else {
        const chars = props.characters.map(freshenCalculatedFields)
        makeDownload(JSON.stringify(chars, null, 2), `all-characters-${dateStr()}.json`)
        toast({ title: "Export Successful", description: `Exported ${chars.length} characters successfully!` })
      }
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export", variant: "destructive" })
      console.error("Export error:", error)
    }
  }

  // Confirms an import only once its save has succeeded, so "Import Successful" is never followed
  // by "Import not saved". The dialog does not wait for it: offline, a signed-in user's save stays
  // pending until the server answers (see notifyIfFailed).
  const confirmWhenSaved = (saved: Promise<boolean>, confirmation: { title: string; description: string }) => {
    saved.then((succeeded) => {
      if (succeeded) toast(confirmation)
    })
  }

  const handleFileImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data)) {
          const valid = data.filter((c) => c && typeof c === "object" && c.id && c.name != null)
          if (valid.length === 0) {
            toast({ title: "Import Failed", description: "No valid characters found in file", variant: "destructive" })
            return
          }
          const reconciled = reconcileImportedCharacters(migrateCharacters(valid))
          confirmWhenSaved(props.onImport(reconciled), {
            title: "Import Successful",
            description: `Imported ${reconciled.length} characters successfully!`,
          })
        } else if (data && typeof data === "object" && data.id) {
          const reconciled = reconcileImportedCharacter(migrateCharacter(data))
          confirmWhenSaved(props.onImport([reconciled]), {
            title: "Import Successful",
            description: `Imported ${reconciled.name || "character"} successfully!`,
          })
        } else {
          toast({ title: "Import Failed", description: "Invalid character file format", variant: "destructive" })
        }
        setIsImportOpen(false)
      } catch {
        toast({ title: "Import Failed", description: "Failed to parse character file", variant: "destructive" })
      }
    }
    reader.readAsText(file)
    if (fileInputRef) fileInputRef.value = ""
  }

  const handlePdfImport = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    setIsPdfParsing(true)
    try {
      const parsed = await parsePdfCharacterSheet(file)
      const merged = mergeWithDefault(parsed)
      const character = reconcileImportedCharacter(migrateCharacter(merged))
      confirmWhenSaved(props.onImport([character]), {
        title: "PDF Import Successful",
        description: `Imported ${character.name || "character"} from PDF!`,
      })
      setIsImportOpen(false)
    } catch (error) {
      toast({ title: "PDF Import Failed", description: "Could not parse the PDF. Make sure it's a D&D Beyond character sheet.", variant: "destructive" })
      console.error("PDF import error:", error)
    } finally {
      setIsPdfParsing(false)
      if (pdfInputRef) pdfInputRef.value = ""
    }
  }

  const themeIcon = () => {
    switch (theme()) {
      case "dark": return Moon
      case "light": return Sun
      default: return Monitor
    }
  }

  const signOutNow = async () => {
    try {
      await logout()
      window.location.reload()
    } catch {
      // logout has already logged the error
      showSignOutDialog("failed")
    }
  }

  // Signing out removes all of the user's data from this device, which would silently discard
  // anything the account has not received yet, so that case asks first.
  const handleSignOut = async () => {
    setIsOpen(false)
    if (hasLocalDataAwaitingUpload() || await hasUnsyncedChanges()) {
      showSignOutDialog("unsynced")
    } else {
      await signOutNow()
    }
  }

  const handleBackToLogin = async () => {
    localStorage.removeItem("dnd-skip-auth")
    setIsOpen(false)
    try {
      await logout()
    } catch {
      // logout has already logged the error. Leaving guest mode goes ahead regardless: signing
      // out removes nothing of a guest's, so there is nothing half-done to stay and report.
    }
    window.location.reload()
  }

  const exportLabel = () =>
    props.currentCharacter
      ? `Export ${props.currentCharacter.name || "Character"}`
      : "Export All Characters"

  return (
    <div data-sem="header-menu" class="flex items-center gap-2">
      {user() && (
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <User class="h-4 w-4" aria-hidden="true" />
          <span class="hidden sm:inline">{user()!.email}</span>
        </div>
      )}

      <DropdownMenu open={isOpen()} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger data-test="header-menu-trigger" aria-label="Open menu" class={buttonVariants({ variant: "outline", size: "sm" })}>
          <Menu class="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem onSelect={props.onAllCharacters}>
            <Users class="h-4 w-4 mr-2" aria-hidden="true" />
            All Characters
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setIsOpen(false); setIsImportOpen(true) }}>
            <Upload class="h-4 w-4 mr-2" aria-hidden="true" />
            Import Character
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport}>
            <Download class="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
            <span class="truncate">{exportLabel()}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTheme(theme() === "dark" ? "light" : "dark")}>
            <Dynamic component={themeIcon()} class="h-4 w-4" aria-hidden="true" data-test={`theme-icon-${theme()}`} />
            <span class="ml-2">Toggle Theme</span>
          </DropdownMenuItem>
          {user() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut}>
                <LogOut class="h-4 w-4 mr-2" aria-hidden="true" />
                Sign Out
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleBackToLogin}>
                <LogIn class="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Login
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal open={isImportOpen()} onOpenChange={setIsImportOpen}>
        <ModalContent data-test="import-dialog">
          <ModalHeader>
            <ModalTitle>Import Characters</ModalTitle>
          </ModalHeader>
          <div class="space-y-4">
            <p class="text-sm text-muted-foreground">
              Select a JSON file containing character data to import. You can import single characters or multiple characters at once.
            </p>
            <div class="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                class="hidden"
                id="header-character-import"
              />
              <label for="header-character-import" class={buttonVariants({ class: "w-full gap-2 cursor-pointer" })}>
                <FileText class="h-4 w-4" aria-hidden="true" />
                Choose JSON File
              </label>
              <div class="relative my-1">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t" />
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-background px-2 text-muted-foreground">Or import from PDF</span>
                </div>
              </div>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfImport}
                class="hidden"
                id="header-character-pdf-import"
              />
              <label
                for="header-character-pdf-import"
                class={buttonVariants({ variant: "outline", class: `w-full gap-2 cursor-pointer ${isPdfParsing() ? "opacity-50 pointer-events-none" : ""}` })}
              >
                <FileText class="h-4 w-4" aria-hidden="true" />
                {isPdfParsing() ? "Parsing PDF…" : "Choose PDF File (D&D Beyond)"}
              </label>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Modal open={isSignOutDialogOpen()} onOpenChange={handleSignOutDialogOpenChange}>
        <ModalContent data-test="sign-out-dialog">
          <Switch>
            <Match when={signOutDialog() === "unsynced"}>
              <ModalHeader>
                <ModalTitle>Sign out and lose unsynced changes?</ModalTitle>
                <ModalDescription>
                  Some changes on this device have not reached your account yet. Signing out removes all of your data
                  from this device, so those changes will be lost.
                </ModalDescription>
              </ModalHeader>
              <ModalFooter class="gap-2 sm:gap-0">
                <Button data-test="sign-out-cancel" variant="outline" onClick={() => setIsSignOutDialogOpen(false)}>Cancel</Button>
                <Button data-test="sign-out-discard" variant="destructive" onClick={signOutNow}>Sign out and discard changes</Button>
              </ModalFooter>
            </Match>
            <Match when={signOutDialog() === "failed"}>
              <ModalHeader>
                <ModalTitle>Sign-out did not finish</ModalTitle>
                <ModalDescription>
                  Your offline data could not be removed from this device, so you are still signed in. Close any
                  other TabulaPersonae tabs, reload this page, and sign out again.
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <Button data-test="sign-out-reload" onClick={() => window.location.reload()}>Reload</Button>
              </ModalFooter>
            </Match>
          </Switch>
        </ModalContent>
      </Modal>
    </div>
  )
}

import { createSignal, Match, Show, Switch } from "solid-js"
import { Dynamic } from "solid-js/web"
import { A } from "@solidjs/router"
import Menu from "lucide-solid/icons/menu"
import Settings from "lucide-solid/icons/settings"
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button, buttonVariants } from "@/components/ui/button"
import { SharingSection, SheetSettingsSection } from "@/components/sheet-settings"
import { theme, setTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth-context"
import { hasUnsyncedChanges } from "@/lib/firebase-storage"
import { hasLocalDataAwaitingUpload } from "@/lib/local-user-data"
import { useToast } from "@/hooks/use-toast"
import { parsePdfCharacterSheet, mergeWithDefault } from "@/lib/pdf-parser"
import { reconcileImportedCharacter, reconcileImportedCharacters, freshenCalculatedFields } from "@/lib/character-import-reconciliation"
import { migrateCharacter, migrateCharacters } from "@/lib/character-migrations"
import { distinguishImportedNames } from "@/lib/character-names"
import type { Character } from "@/lib/character-types"
import { cn } from "@/lib/utils"

// One row of the menu: a link or a button, full width, 44px tall
const ROW =
  "flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
const GROUP = "flex flex-col gap-0.5 border-t p-2"

interface SidebarMenuProps {
  characters: Character[]
  /**
   * Saves the imported characters and opens the first. Resolves whether every one was saved, and
   * tells the user itself when one was not (see saveImportedCharacters).
   */
  onImport: (characters: Character[]) => Promise<boolean>
  /** The open character. With onUpdateCharacter, the menu also shows its settings and sharing. */
  currentCharacter?: Character
  onUpdateCharacter?: (character: Character) => void
  /** Classes for the menu button: MENU_BUTTON_FLOATING on pages without a stats bar */
  class?: string
}

/**
 * The app menu: a button that opens a sidebar from the left with navigation, import and export, the
 * theme, the open character's settings, and signing out. The button is in the same place on every
 * page: at the left of the stats bar on a character sheet, and floating there (MENU_BUTTON_FLOATING)
 * on pages without one.
 */
export function SidebarMenu(props: SidebarMenuProps) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = createSignal(false)
  // A modal opened from the sidebar waits until the sidebar has finished closing and handed focus
  // back to the menu button (see onCloseAutoFocus). Opened sooner, that hand-back would pull focus
  // out of the modal; opened after it, the modal returns focus to the menu button when it closes.
  let afterClose: (() => void) | undefined
  const closeThen = (next: () => void) => {
    afterClose = next
    setIsOpen(false)
  }
  const handleDrawerCloseAutoFocus = () => {
    const next = afterClose
    afterClose = undefined
    // After the drawer's own focus hand-back, which follows this handler
    if (next) queueMicrotask(next)
  }
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
  let triggerRef: HTMLButtonElement | undefined
  // The Import and Sign-out dialogs have no trigger of their own: they open from the sidebar, which
  // has closed by then, so they hand focus back to the menu button.
  const returnFocusToMenuButton = (e: Event) => {
    e.preventDefault()
    triggerRef?.focus({ preventScroll: true })
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

  // The characters an import's names must not repeat. The open character is the one being edited,
  // so its name may have changed since the list was loaded.
  const existingCharacters = () => {
    const current = props.currentCharacter
    if (!current) return props.characters
    return [...props.characters.filter((c) => c.id !== current.id), current]
  }

  // Ready to save: a name already in use gets an ordinal ("Frodo the Second")
  const prepareImport = (characters: Character[]) => distinguishImportedNames(characters, existingCharacters())

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
          const reconciled = prepareImport(reconcileImportedCharacters(migrateCharacters(valid)))
          confirmWhenSaved(props.onImport(reconciled), {
            title: "Import Successful",
            description: `Imported ${reconciled.length} characters successfully!`,
          })
        } else if (data && typeof data === "object" && data.id) {
          const [reconciled] = prepareImport([reconcileImportedCharacter(migrateCharacter(data))])
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
      const [character] = prepareImport([reconcileImportedCharacter(migrateCharacter(merged))])
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
  const handleSignOut = () => closeThen(async () => {
    if (hasLocalDataAwaitingUpload() || await hasUnsyncedChanges()) {
      showSignOutDialog("unsynced")
    } else {
      await signOutNow()
    }
  })

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
    <>
      <Drawer open={isOpen()} onOpenChange={setIsOpen}>
        <DrawerTrigger
          ref={triggerRef}
          data-sem="sidebar-menu-trigger"
          data-test="sidebar-menu-trigger"
          aria-label="Open menu"
          // 32px to keep the bar slim; buttonVariants' TOUCH_TARGET makes its hit area 44px, which
          // the bar's padding has room for
          // Merged with cn, not passed to buttonVariants, so a position given here (MENU_BUTTON_FLOATING's
          // fixed) replaces the relative that buttonVariants' TOUCH_TARGET sets, instead of losing to it
          class={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 bg-background", props.class)}
        >
          <Menu class="h-4 w-4" aria-hidden="true" />
        </DrawerTrigger>
        <DrawerContent data-test="sidebar-menu" onCloseAutoFocus={handleDrawerCloseAutoFocus}>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
            {/* Who the characters belong to: information, not an action. Without an account they
                are kept only on this device. */}
            <p
              data-test="sidebar-menu-account"
              title={user()?.email ?? undefined}
              class="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
            >
              <User class="h-4 w-4 shrink-0" aria-hidden="true" />
              <span class="truncate">{user() ? (user()!.email ?? "Signed In") : "Not Logged In"}</span>
            </p>
          </DrawerHeader>

          <nav aria-label="Main" class={GROUP}>
            <A href="/" data-test="sidebar-all-characters-link" class={ROW} onClick={() => setIsOpen(false)}>
              <Users aria-hidden="true" />
              All Characters
            </A>
            <A href="/settings/tabs" data-test="sidebar-tab-settings-link" class={ROW} onClick={() => setIsOpen(false)}>
              <Settings aria-hidden="true" />
              Tab Settings
            </A>
          </nav>

          <div class={GROUP}>
            <button type="button" class={ROW} onClick={() => closeThen(() => setIsImportOpen(true))}>
              <Upload aria-hidden="true" />
              Import Character
            </button>
            <button type="button" class={ROW} onClick={() => { setIsOpen(false); handleExport() }}>
              <Download aria-hidden="true" />
              <span class="truncate">{exportLabel()}</span>
            </button>
            <button type="button" class={ROW} onClick={() => setTheme(theme() === "dark" ? "light" : "dark")}>
              <Dynamic component={themeIcon()} aria-hidden="true" data-test={`theme-icon-${theme()}`} />
              Toggle Theme
            </button>
          </div>

          <Show when={props.currentCharacter && props.onUpdateCharacter}>
            <SheetSettingsSection character={props.currentCharacter!} onUpdate={(c) => props.onUpdateCharacter!(c)} />
            <SharingSection character={props.currentCharacter!} onUpdate={(c) => props.onUpdateCharacter!(c)} />
          </Show>

          {/* At the foot of the sidebar, apart from everything else */}
          <div class={cn(GROUP, "mt-auto")}>
            {user() ? (
              <button type="button" class={ROW} onClick={handleSignOut}>
                <LogOut aria-hidden="true" />
                Sign Out
              </button>
            ) : (
              <button type="button" class={ROW} onClick={handleBackToLogin}>
                <LogIn aria-hidden="true" />
                Back to Login
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Modal open={isImportOpen()} onOpenChange={setIsImportOpen}>
        <ModalContent data-test="import-dialog" onCloseAutoFocus={returnFocusToMenuButton}>
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
                data-test="import-json-input"
              />
              <label for="header-character-import" class={buttonVariants({ class: "w-full gap-2 cursor-pointer" })}>
                <FileText class="h-4 w-4" aria-hidden="true" />
                Choose JSON File
              </label>
              <div class="flex items-center gap-2 my-1">
                <span class="flex-1 border-t" />
                <span class="text-xs uppercase text-muted-foreground">Or import from PDF</span>
                <span class="flex-1 border-t" />
              </div>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfImport}
                class="hidden"
                id="header-character-pdf-import"
                data-test="import-pdf-input"
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
        <ModalContent data-test="sign-out-dialog" onCloseAutoFocus={returnFocusToMenuButton}>
          <Switch>
            <Match when={signOutDialog() === "unsynced"}>
              <ModalHeader>
                <ModalTitle>Sign out and lose unsynced changes?</ModalTitle>
                <ModalDescription>
                  Some changes on this device have not reached your account yet. Signing out removes all of your data
                  from this device, so those changes will be lost.
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
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
    </>
  )
}

import { createSignal } from "solid-js"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
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
import { theme, setTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { parsePdfCharacterSheet, mergeWithDefault } from "@/lib/pdf-parser"
import type { Character } from "@/lib/character-types"

interface HeaderMenuProps {
  characters: Character[]
  onImportCharacter: (character: Character) => void
  onImportMultiple: (characters: Character[]) => void
  onAllCharacters: () => void
  currentCharacter?: Character
}

export function HeaderMenu(props: HeaderMenuProps) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = createSignal(false)
  const [isImportOpen, setIsImportOpen] = createSignal(false)
  const [isPdfParsing, setIsPdfParsing] = createSignal(false)
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
        const char = props.currentCharacter
        makeDownload(JSON.stringify(char, null, 2), `${char.name || "character"}-${dateStr()}.json`)
        toast({ title: "Export Successful", description: `Exported ${char.name || "character"} successfully!` })
      } else {
        makeDownload(JSON.stringify(props.characters, null, 2), `all-characters-${dateStr()}.json`)
        toast({ title: "Export Successful", description: `Exported ${props.characters.length} characters successfully!` })
      }
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export", variant: "destructive" })
      console.error("Export error:", error)
    }
  }

  const handleFileImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data)) {
          const valid = data.filter((c) => c && typeof c === "object" && c.id && c.name !== undefined)
          if (valid.length === 0) {
            toast({ title: "Import Failed", description: "No valid characters found in file", variant: "destructive" })
            return
          }
          props.onImportMultiple(valid)
          toast({ title: "Import Successful", description: `Imported ${valid.length} characters successfully!` })
        } else if (data && typeof data === "object" && data.id) {
          props.onImportCharacter(data)
          toast({ title: "Import Successful", description: `Imported ${data.name || "character"} successfully!` })
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
      const character = mergeWithDefault(parsed)
      await props.onImportCharacter(character)
      toast({ title: "PDF Import Successful", description: `Imported ${character.name || "character"} from PDF!` })
      setIsImportOpen(false)
    } catch (error) {
      toast({ title: "PDF Import Failed", description: "Could not parse the PDF. Make sure it's a D&D Beyond character sheet.", variant: "destructive" })
      console.error("PDF import error:", error)
    } finally {
      setIsPdfParsing(false)
      if (pdfInputRef) pdfInputRef.value = ""
    }
  }

  const ThemeIcon = () => {
    switch (theme()) {
      case "dark": return <Moon class="h-4 w-4" />
      case "light": return <Sun class="h-4 w-4" />
      default: return <Monitor class="h-4 w-4" />
    }
  }

  const handleBackToLogin = async () => {
    localStorage.removeItem("dnd-skip-auth")
    setIsOpen(false)
    await logout()
    window.location.reload()
  }

  const exportLabel = () =>
    props.currentCharacter
      ? `Export ${props.currentCharacter.name || "Character"}`
      : "Export All Characters"

  return (
    <div class="flex items-center gap-2">
      {user() && (
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <User class="h-4 w-4" />
          <span class="hidden sm:inline">{user()!.email}</span>
        </div>
      )}

      <DropdownMenu open={isOpen()} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger class={buttonVariants({ variant: "outline", size: "sm" })}>
          <Menu class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem onSelect={props.onAllCharacters}>
            <Users class="h-4 w-4 mr-2" />
            All Characters
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setIsOpen(false); setIsImportOpen(true) }}>
            <Upload class="h-4 w-4 mr-2" />
            Import Character
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport}>
            <Download class="h-4 w-4 mr-2 shrink-0" />
            <span class="truncate">{exportLabel()}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTheme(theme() === "dark" ? "light" : "dark")}>
            <ThemeIcon />
            <span class="ml-2">Toggle Theme</span>
          </DropdownMenuItem>
          {user() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>
                <LogOut class="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleBackToLogin}>
                <LogIn class="h-4 w-4 mr-2" />
                Back to Login
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal open={isImportOpen()} onOpenChange={setIsImportOpen}>
        <ModalContent>
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
                <FileText class="h-4 w-4" />
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
                <FileText class="h-4 w-4" />
                {isPdfParsing() ? "Parsing PDF…" : "Choose PDF File (D&D Beyond)"}
              </label>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}

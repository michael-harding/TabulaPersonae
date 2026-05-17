import { createSignal } from "solid-js"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Menu from "lucide-solid/icons/menu"
import Plus from "lucide-solid/icons/plus"
import Users from "lucide-solid/icons/users"
import Upload from "lucide-solid/icons/upload"
import Download from "lucide-solid/icons/download"
import Moon from "lucide-solid/icons/moon"
import Sun from "lucide-solid/icons/sun"
import Monitor from "lucide-solid/icons/monitor"
import User from "lucide-solid/icons/user"
import LogOut from "lucide-solid/icons/log-out"
import LogIn from "lucide-solid/icons/log-in"
import { theme, setTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth-context"
import type { Character } from "@/lib/character-types"

interface HeaderMenuProps {
  characters: Character[]
  onImportCharacter: (character: Character) => void
  onImportMultiple: (characters: Character[]) => void
  onAllCharacters: () => void
  onNewCharacter: () => void
}

export function HeaderMenu(props: HeaderMenuProps) {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = createSignal(false)

  const handleExportAll = () => {
    const dataStr = JSON.stringify(props.characters, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "all-characters.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target?.result as string)
            if (Array.isArray(data)) {
              props.onImportMultiple(data)
            } else {
              props.onImportCharacter(data)
            }
          } catch {
            alert("Invalid JSON file")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
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
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuItem onSelect={props.onNewCharacter}>
            <Plus class="h-4 w-4 mr-2" />
            New Character
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onAllCharacters}>
            <Users class="h-4 w-4 mr-2" />
            All Characters
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleImport}>
            <Upload class="h-4 w-4 mr-2" />
            Import Character
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExportAll}>
            <Download class="h-4 w-4 mr-2" />
            Export All
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
    </div>
  )
}

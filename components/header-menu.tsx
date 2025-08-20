"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Plus, Users, Upload, Download, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import type { Character } from "@/lib/character-types"

interface HeaderMenuProps {
  characters: Character[]
  onImportCharacter: (character: Character) => void
  onImportMultiple: (characters: Character[]) => void
  onAllCharacters: () => void
  onNewCharacter: () => void
}

export function HeaderMenu({
  characters,
  onImportCharacter,
  onImportMultiple,
  onAllCharacters,
  onNewCharacter,
}: HeaderMenuProps) {
  const { setTheme, theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleExportCharacter = (character: Character) => {
    const dataStr = JSON.stringify(character, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${character.name || "character"}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => {
    const dataStr = JSON.stringify(characters, null, 2)
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
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            if (Array.isArray(data)) {
              onImportMultiple(data)
            } else {
              onImportCharacter(data)
            }
          } catch (error) {
            alert("Invalid JSON file")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="h-4 w-4" />
      case "light":
        return <Sun className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onNewCharacter}>
          <Plus className="h-4 w-4 mr-2" />
          New Character
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAllCharacters}>
          <Users className="h-4 w-4 mr-2" />
          All Characters
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import Character
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportAll()}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {getThemeIcon()}
          <span className="ml-2">Toggle Theme</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

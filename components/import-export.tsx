"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, Upload, FileText } from "lucide-react"
import type { Character } from "@/lib/character-types"
import { useToast } from "@/hooks/use-toast"

interface ImportExportProps {
  characters: Character[]
  onImportCharacter: (character: Character) => void
  onImportMultiple: (characters: Character[]) => void
}

export function ImportExport({ characters, onImportCharacter, onImportMultiple }: ImportExportProps) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const exportCharacter = (character: Character) => {
    try {
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

      toast({
        title: "Export Successful",
        description: `Exported ${character.name || "character"} successfully!`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export character",
        variant: "destructive",
      })
      console.error("Export error:", error)
    }
  }

  const exportAllCharacters = () => {
    try {
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

      toast({
        title: "Export Successful",
        description: `Exported ${characters.length} characters successfully!`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export characters",
        variant: "destructive",
      })
      console.error("Export error:", error)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        // Check if it's a single character or array of characters
        if (Array.isArray(data)) {
          // Multiple characters
          const validCharacters = data.filter(
            (char) => char && typeof char === "object" && char.id && char.name !== undefined,
          )

          if (validCharacters.length === 0) {
            toast({
              title: "Import Failed",
              description: "No valid characters found in file",
              variant: "destructive",
            })
            return
          }

          onImportMultiple(validCharacters)
          toast({
            title: "Import Successful",
            description: `Imported ${validCharacters.length} characters successfully!`,
          })
        } else if (data && typeof data === "object" && data.id) {
          // Single character
          onImportCharacter(data)
          toast({
            title: "Import Successful",
            description: `Imported ${data.name || "character"} successfully!`,
          })
        } else {
          toast({
            title: "Import Failed",
            description: "Invalid character file format",
            variant: "destructive",
          })
        }

        setIsImportOpen(false)
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to parse character file",
          variant: "destructive",
        })
        console.error("Import error:", error)
      }
    }

    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Characters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a JSON file containing character data to import. You can import single characters or multiple
              characters at once.
            </p>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                id="character-import"
              />
              <label htmlFor="character-import">
                <Button asChild className="w-full gap-2 cursor-pointer">
                  <span>
                    <FileText className="h-4 w-4" />
                    Choose File
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Characters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your characters as JSON files to save locally or share with others.
            </p>

            {characters.length > 1 && (
              <div className="space-y-2">
                <Button onClick={exportAllCharacters} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Export All Characters ({characters.length})
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or export individual</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {characters.map((character) => (
                <Button
                  key={character.id}
                  variant="outline"
                  onClick={() => exportCharacter(character)}
                  className="w-full justify-start gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {character.name || "Unnamed Character"}
                  <span className="ml-auto text-xs text-muted-foreground">
                    Lv.{character.level} {character.race} {character.class}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { createSignal } from "solid-js"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Download from "lucide-solid/icons/download"
import Upload from "lucide-solid/icons/upload"
import FileText from "lucide-solid/icons/file-text"
import type { Character } from "@/lib/character-types"
import { useToast } from "@/hooks/use-toast"

interface ImportExportProps {
  characters: Character[]
  onImportCharacter: (character: Character) => void
  onImportMultiple: (characters: Character[]) => void
}

export function ImportExport(props: ImportExportProps) {
  const [isImportOpen, setIsImportOpen] = createSignal(false)
  const [isExportOpen, setIsExportOpen] = createSignal(false)
  let fileInputRef!: HTMLInputElement
  const { toast } = useToast()

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

  const dateStr = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  const exportCharacter = (character: Character) => {
    try {
      makeDownload(JSON.stringify(character, null, 2), `${character.name || "character"}-${dateStr()}.json`)
      toast({ title: "Export Successful", description: `Exported ${character.name || "character"} successfully!` })
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export character", variant: "destructive" })
      console.error("Export error:", error)
    }
  }

  const exportAllCharacters = () => {
    try {
      makeDownload(JSON.stringify(props.characters, null, 2), `all-characters-${dateStr()}.json`)
      toast({ title: "Export Successful", description: `Exported ${props.characters.length} characters successfully!` })
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export characters", variant: "destructive" })
      console.error("Export error:", error)
    }
  }

  const handleFileImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (Array.isArray(data)) {
          const validCharacters = data.filter(
            (char) => char && typeof char === "object" && char.id && char.name !== undefined,
          )
          if (validCharacters.length === 0) {
            toast({ title: "Import Failed", description: "No valid characters found in file", variant: "destructive" })
            return
          }
          props.onImportMultiple(validCharacters)
          toast({ title: "Import Successful", description: `Imported ${validCharacters.length} characters successfully!` })
        } else if (data && typeof data === "object" && data.id) {
          props.onImportCharacter(data)
          toast({ title: "Import Successful", description: `Imported ${data.name || "character"} successfully!` })
        } else {
          toast({ title: "Import Failed", description: "Invalid character file format", variant: "destructive" })
        }

        setIsImportOpen(false)
      } catch (error) {
        toast({ title: "Import Failed", description: "Failed to parse character file", variant: "destructive" })
        console.error("Import error:", error)
      }
    }

    reader.readAsText(file)
    if (fileInputRef) fileInputRef.value = ""
  }

  return (
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" class="gap-2 bg-transparent" onClick={() => setIsImportOpen(true)}>
        <Upload class="h-4 w-4" />
        Import
      </Button>
      <Button variant="outline" size="sm" class="gap-2 bg-transparent" onClick={() => setIsExportOpen(true)}>
        <Download class="h-4 w-4" />
        Export
      </Button>

      <Dialog open={isImportOpen()} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Characters</DialogTitle>
          </DialogHeader>
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
                id="character-import"
              />
              <label for="character-import" class={buttonVariants({ class: "w-full gap-2 cursor-pointer" })}>
                <FileText class="h-4 w-4" />
                Choose File
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportOpen()} onOpenChange={setIsExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Characters</DialogTitle>
          </DialogHeader>
          <div class="space-y-4">
            <p class="text-sm text-muted-foreground">
              Export your characters as JSON files to save locally or share with others.
            </p>
            {props.characters.length > 1 && (
              <div class="space-y-2">
                <Button onClick={exportAllCharacters} class="w-full gap-2">
                  <Download class="h-4 w-4" />
                  Export All Characters ({props.characters.length})
                </Button>
                <div class="relative">
                  <div class="absolute inset-0 flex items-center">
                    <span class="w-full border-t" />
                  </div>
                  <div class="relative flex justify-center text-xs uppercase">
                    <span class="bg-background px-2 text-muted-foreground">Or export individual</span>
                  </div>
                </div>
              </div>
            )}
            <div class="space-y-2 max-h-60 overflow-y-auto">
              {props.characters.map((character) => (
                <Button
                  key={character.id}
                  variant="outline"
                  onClick={() => exportCharacter(character)}
                  class="w-full justify-start gap-2"
                >
                  <FileText class="h-4 w-4" />
                  {character.name || "Unnamed Character"}
                  <span class="ml-auto text-xs text-muted-foreground">
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

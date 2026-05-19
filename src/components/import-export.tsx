import { createSignal } from "solid-js"
import { Button, buttonVariants } from "@/components/ui/button"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import Download from "lucide-solid/icons/download"
import Upload from "lucide-solid/icons/upload"
import FileText from "lucide-solid/icons/file-text"
import type { Character } from "@/lib/character-types"
import { useToast } from "@/hooks/use-toast"
import { parsePdfCharacterSheet, mergeWithDefault } from "@/lib/pdf-parser"

interface ImportExportProps {
  characters: Character[]
  onImportCharacter: (character: Character) => Promise<void> | void
  onImportMultiple: (characters: Character[]) => Promise<void> | void
}

export function ImportExport(props: ImportExportProps) {
  const [isImportOpen, setIsImportOpen] = createSignal(false)
  const [isExportOpen, setIsExportOpen] = createSignal(false)
  const [isPdfParsing, setIsPdfParsing] = createSignal(false)
  let fileInputRef!: HTMLInputElement
  let pdfInputRef!: HTMLInputElement
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
                id="character-import"
              />
              <label for="character-import" class={buttonVariants({ class: "w-full gap-2 cursor-pointer" })}>
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
                id="character-pdf-import"
              />
              <label
                for="character-pdf-import"
                class={buttonVariants({ variant: "outline", class: `w-full gap-2 cursor-pointer ${isPdfParsing() ? "opacity-50 pointer-events-none" : ""}` })}
              >
                <FileText class="h-4 w-4" />
                {isPdfParsing() ? "Parsing PDF…" : "Choose PDF File (D&D Beyond)"}
              </label>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Modal open={isExportOpen()} onOpenChange={setIsExportOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Export Characters</ModalTitle>
          </ModalHeader>
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
        </ModalContent>
      </Modal>
    </div>
  )
}

import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../test-utils"
import { SheetSettingsModule } from "@/components/sheet-settings-module"
import { createDefaultCharacter } from "@/lib/character-types"
import { ReadOnlyProvider } from "@/lib/read-only-context"

const baseCharacter = createDefaultCharacter()
const char2014 = { ...baseCharacter, edition: "2014" as const }
const charWithColor = { ...baseCharacter, sheetColor: "#ef4444" }
const charWithCustomColor = { ...baseCharacter, sheetColor: "#123456" }
const charPublic = { ...baseCharacter, id: "char-abc", isPublic: true }
const charPrivate = { ...baseCharacter, id: "char-abc", isPublic: false }

describe("SheetSettingsModule", () => {
  describe("edition switch", () => {
    it("renders both edition labels", () => {
      render(<SheetSettingsModule character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("2014")).toBeInTheDocument()
      expect(screen.getByText("2024")).toBeInTheDocument()
    })

    it("calls onUpdate with edition '2014' when toggled from 2024", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2014" }))
    })

    it("calls onUpdate with edition '2024' when toggled from 2014", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={char2014} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2024" }))
    })
  })

  describe("preset color swatches", () => {
    it("renders all 6 preset color buttons", () => {
      render(<SheetSettingsModule character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /green theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /purple theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /red theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /blue theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /orange theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /gold theme color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor when a preset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /purple theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#8b5cf6" }))
    })

    it("calls onUpdate with red hex when red preset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /red theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#ef4444" }))
    })
  })

  describe("custom color picker", () => {
    it("calls onUpdate with the new color when the color input changes", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={baseCharacter} onUpdate={onUpdate} />)
      const colorInput = screen.getByLabelText(/custom theme color/i)
      fireEvent.input(colorInput, { target: { value: "#abc123" } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#abc123" }))
    })
  })

  describe("reset button", () => {
    it("is not shown when no sheetColor is set", () => {
      render(<SheetSettingsModule character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /reset sheet color/i })).not.toBeInTheDocument()
    })

    it("is shown when a preset sheetColor is set", () => {
      render(<SheetSettingsModule character={charWithColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("is shown when a custom sheetColor is set", () => {
      render(<SheetSettingsModule character={charWithCustomColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor undefined when reset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={charWithColor} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /reset sheet color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: undefined }))
    })
  })

  describe("share toggle", () => {
    it("renders a 'Share publicly' label and Off/On switch", () => {
      render(<SheetSettingsModule character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.getByText("Share publicly")).toBeInTheDocument()
      expect(screen.getByText("Off")).toBeInTheDocument()
      expect(screen.getByText("On")).toBeInTheDocument()
    })

    it("calls onUpdate with isPublic: true when Off→On toggle is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={charPrivate} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /off on/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }))
    })

    it("calls onUpdate with isPublic: false when On→Off toggle is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettingsModule character={charPublic} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /off on/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false }))
    })

    it("shows the share URL input when isPublic is true", () => {
      render(<SheetSettingsModule character={charPublic} onUpdate={vi.fn()} />)
      const urlInput = screen.getByLabelText("Share URL")
      expect(urlInput).toBeInTheDocument()
      expect((urlInput as HTMLInputElement).value).toContain("/share/char-abc")
    })

    it("does not show the share URL when isPublic is false", () => {
      render(<SheetSettingsModule character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.queryByLabelText("Share URL")).not.toBeInTheDocument()
    })

    it("shows a Copy link button when isPublic is true", () => {
      render(<SheetSettingsModule character={charPublic} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument()
    })

    it("does not show the Copy link button when isPublic is false", () => {
      render(<SheetSettingsModule character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /copy share link/i })).not.toBeInTheDocument()
    })
  })

  describe("read-only mode", () => {
    it("renders nothing when wrapped in ReadOnlyProvider", () => {
      const { container } = render(
        <ReadOnlyProvider value={true}>
          <SheetSettingsModule character={baseCharacter} onUpdate={vi.fn()} />
        </ReadOnlyProvider>
      )
      expect(container.firstChild).toBeNull()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<SheetSettingsModule character={baseCharacter} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

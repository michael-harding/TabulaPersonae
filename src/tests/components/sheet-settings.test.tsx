import { render, screen, fireEvent } from "../test-utils"
import { SheetSettings } from "@/components/sheet-settings"
import { createDefaultCharacter } from "@/lib/character-types"

const baseCharacter = createDefaultCharacter()
const char2014 = { ...baseCharacter, edition: "2014" as const }
const charWithColor = { ...baseCharacter, sheetColor: "#ef4444" }
const charWithCustomColor = { ...baseCharacter, sheetColor: "#123456" }

describe("SheetSettings", () => {
  describe("edition switch", () => {
    it("renders both edition labels", () => {
      render(<SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("2014")).toBeInTheDocument()
      expect(screen.getByText("2024")).toBeInTheDocument()
    })

    it("calls onUpdate with edition '2014' when toggled from 2024", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2014" }))
    })

    it("calls onUpdate with edition '2024' when toggled from 2014", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={char2014} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2024" }))
    })
  })

  describe("preset color swatches", () => {
    it("renders all 6 preset color buttons", () => {
      render(<SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /green theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /purple theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /red theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /blue theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /orange theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /gold theme color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor when a preset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /purple theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#8b5cf6" }))
    })

    it("calls onUpdate with red hex when red preset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /red theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#ef4444" }))
    })
  })

  describe("custom color picker", () => {
    it("calls onUpdate with the new color when the color input changes", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      const colorInput = screen.getByLabelText(/custom theme color/i)
      fireEvent.input(colorInput, { target: { value: "#abc123" } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#abc123" }))
    })
  })

  describe("reset button", () => {
    it("is not shown when no sheetColor is set", () => {
      render(<SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /reset sheet color/i })).not.toBeInTheDocument()
    })

    it("is shown when a preset sheetColor is set", () => {
      render(<SheetSettings character={charWithColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("is shown when a custom sheetColor is set", () => {
      render(<SheetSettings character={charWithCustomColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor undefined when reset is clicked", () => {
      const onUpdate = vi.fn()
      render(<SheetSettings character={charWithColor} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /reset sheet color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: undefined }))
    })
  })
})

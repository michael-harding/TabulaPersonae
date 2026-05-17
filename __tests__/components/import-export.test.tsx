import { render, screen, fireEvent, waitFor } from "../test-utils"
import { ImportExport } from "../../components/import-export"
import { createDefaultCharacter } from "../../lib/character-types"
import { jest } from "@jest/globals"

// Mock sonner toast
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }), { virtual: true })

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
Object.defineProperty(global.URL, "createObjectURL", {
  value: mockCreateObjectURL,
})
Object.defineProperty(global.URL, "revokeObjectURL", {
  value: mockRevokeObjectURL,
})

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any

describe("ImportExport", () => {
  const mockOnImportCharacter = jest.fn()
  const mockOnImportMultiple = jest.fn()

  const testCharacter1 = {
    ...createDefaultCharacter(),
    name: "Test Character 1",
    race: "Human",
    class: "Fighter",
    level: 5,
  }

  const testCharacter2 = {
    ...createDefaultCharacter(),
    name: "Test Character 2",
    race: "Elf",
    class: "Wizard",
    level: 3,
  }

  const characters = [testCharacter1, testCharacter2]

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateObjectURL.mockReturnValue("mock-url")
  })

  afterEach(() => {
    // Clean up any created DOM elements
    document.querySelectorAll("a").forEach((link) => {
      if (link.download) {
        document.body.removeChild(link)
      }
    })
  })

  it("renders import and export buttons", () => {
    render(
      <ImportExport
        characters={characters}
        onImportCharacter={mockOnImportCharacter}
        onImportMultiple={mockOnImportMultiple}
      />,
    )

    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
  })

  describe("Export functionality", () => {
    it("opens export dialog when export button is clicked", () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /export/i }))

      expect(screen.getByText("Export Characters")).toBeInTheDocument()
      expect(screen.getByText("Export All Characters (2)")).toBeInTheDocument()
    })

    it("exports all characters when export all button is clicked", () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      // Open the export dialog first, then set up spies (so dialog DOM is already created)
      fireEvent.click(screen.getByRole("button", { name: /export/i }))
      expect(screen.getByText("Export All Characters (2)")).toBeInTheDocument()

      // Spy only intercepts createElement("a") — delegates all other tags to the real impl
      const mockLink = { href: "", download: "", click: jest.fn() }
      const realCreate = document.createElement.bind(document)
      const mockCreateElement = jest
        .spyOn(document, "createElement")
        .mockImplementation((tag: string, ...args: any[]) =>
          tag === "a" ? (mockLink as any) : realCreate(tag, ...args),
        )
      const mockAppendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as any)
      const mockRemoveChild = jest.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as any)

      try {
        fireEvent.click(screen.getByText("Export All Characters (2)"))

        expect(mockCreateElement).toHaveBeenCalledWith("a")
        expect(mockLink.download).toMatch(/^all-characters/)
        expect(mockLink.click).toHaveBeenCalled()
        expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
        expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
        expect(mockRevokeObjectURL).toHaveBeenCalledWith("mock-url")
      } finally {
        mockCreateElement.mockRestore()
        mockAppendChild.mockRestore()
        mockRemoveChild.mockRestore()
      }
    })

    it("exports individual character when character button is clicked", () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      // Open the export dialog first
      fireEvent.click(screen.getByRole("button", { name: /export/i }))
      expect(screen.getByText("Test Character 1")).toBeInTheDocument()

      const mockLink = { href: "", download: "", click: jest.fn() }
      const realCreate = document.createElement.bind(document)
      const mockCreateElement = jest
        .spyOn(document, "createElement")
        .mockImplementation((tag: string, ...args: any[]) =>
          tag === "a" ? (mockLink as any) : realCreate(tag, ...args),
        )
      const mockAppendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as any)
      const mockRemoveChild = jest.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as any)

      try {
        fireEvent.click(screen.getByText("Test Character 1"))

        expect(mockLink.download).toMatch(/^Test Character 1/)
        expect(mockLink.click).toHaveBeenCalled()
      } finally {
        mockCreateElement.mockRestore()
        mockAppendChild.mockRestore()
        mockRemoveChild.mockRestore()
      }
    })

    it("handles export errors gracefully", () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      // Open the export dialog first so dialog DOM exists before the spy
      fireEvent.click(screen.getByRole("button", { name: /export/i }))
      expect(screen.getByText("Export All Characters (2)")).toBeInTheDocument()

      const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {})
      const realCreate = document.createElement.bind(document)
      const mockCreateElement = jest.spyOn(document, "createElement").mockImplementation((tag: string, ...args: any[]) => {
        if (tag === "a") throw new Error("Export failed")
        return realCreate(tag, ...args)
      })

      try {
        fireEvent.click(screen.getByText("Export All Characters (2)"))

        expect(mockConsoleError).toHaveBeenCalledWith("Export error:", expect.any(Error))
      } finally {
        mockCreateElement.mockRestore()
        mockConsoleError.mockRestore()
      }
    })
  })

  describe("Import functionality", () => {
    it("opens import dialog when import button is clicked", () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      expect(screen.getByText("Import Characters")).toBeInTheDocument()
      expect(screen.getByText("Choose File")).toBeInTheDocument()
    })

    it("imports single character from valid JSON file", async () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      const fileInput = screen.getByLabelText("Choose File") as HTMLInputElement
      const file = new File([JSON.stringify(testCharacter1)], "character.json", { type: "application/json" })

      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: JSON.stringify(testCharacter1),
      }
      jest.spyOn(global, "FileReader").mockImplementation(() => mockFileReader as any)

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: JSON.stringify(testCharacter1) } } as any)

      await waitFor(() => {
        expect(mockOnImportCharacter).toHaveBeenCalledWith(testCharacter1)
      })
    })

    it("imports multiple characters from valid JSON array", async () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      const fileInput = screen.getByLabelText("Choose File") as HTMLInputElement
      const file = new File([JSON.stringify([testCharacter1, testCharacter2])], "characters.json", {
        type: "application/json",
      })

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: JSON.stringify([testCharacter1, testCharacter2]),
      }
      jest.spyOn(global, "FileReader").mockImplementation(() => mockFileReader as any)

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: JSON.stringify([testCharacter1, testCharacter2]) } } as any)

      await waitFor(() => {
        expect(mockOnImportMultiple).toHaveBeenCalledWith([testCharacter1, testCharacter2])
      })
    })

    it("handles invalid JSON file", async () => {
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {})

      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      const fileInput = screen.getByLabelText("Choose File") as HTMLInputElement
      const file = new File(["invalid json"], "invalid.json", { type: "application/json" })

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "invalid json",
      }
      jest.spyOn(global, "FileReader").mockImplementation(() => mockFileReader as any)

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: "invalid json" } } as any)

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith("Import error:", expect.any(Error))
        expect(mockOnImportCharacter).not.toHaveBeenCalled()
        expect(mockOnImportMultiple).not.toHaveBeenCalled()
      })

      mockConsoleError.mockRestore()
    })

    it("handles invalid character format", async () => {
      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      const fileInput = screen.getByLabelText("Choose File") as HTMLInputElement
      const invalidData = { invalid: "data" }
      const file = new File([JSON.stringify(invalidData)], "invalid.json", { type: "application/json" })

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: JSON.stringify(invalidData),
      }
      jest.spyOn(global, "FileReader").mockImplementation(() => mockFileReader as any)

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: JSON.stringify(invalidData) } } as any)

      await waitFor(() => {
        expect(mockOnImportCharacter).not.toHaveBeenCalled()
        expect(mockOnImportMultiple).not.toHaveBeenCalled()
      })
    })

    it("filters out invalid characters from array", async () => {
      const mixedData = [testCharacter1, { invalid: "data" }, testCharacter2, null]

      render(
        <ImportExport
          characters={characters}
          onImportCharacter={mockOnImportCharacter}
          onImportMultiple={mockOnImportMultiple}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /import/i }))

      const fileInput = screen.getByLabelText("Choose File") as HTMLInputElement
      const file = new File([JSON.stringify(mixedData)], "mixed.json", { type: "application/json" })

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: JSON.stringify(mixedData),
      }
      jest.spyOn(global, "FileReader").mockImplementation(() => mockFileReader as any)

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: JSON.stringify(mixedData) } } as any)

      await waitFor(() => {
        expect(mockOnImportMultiple).toHaveBeenCalledWith([testCharacter1, testCharacter2])
      })
    })
  })

  it("shows individual export buttons for each character", () => {
    render(
      <ImportExport
        characters={characters}
        onImportCharacter={mockOnImportCharacter}
        onImportMultiple={mockOnImportMultiple}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /export/i }))

    expect(screen.getByText("Test Character 1")).toBeInTheDocument()
    expect(screen.getByText("Test Character 2")).toBeInTheDocument()
    expect(screen.getByText("Lv.5 Human Fighter")).toBeInTheDocument()
    expect(screen.getByText("Lv.3 Elf Wizard")).toBeInTheDocument()
  })

  it("does not show export all button when there is only one character", () => {
    render(
      <ImportExport
        characters={[testCharacter1]}
        onImportCharacter={mockOnImportCharacter}
        onImportMultiple={mockOnImportMultiple}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /export/i }))

    expect(screen.queryByText("Export All Characters")).not.toBeInTheDocument()
    expect(screen.getByText("Test Character 1")).toBeInTheDocument()
  })
})

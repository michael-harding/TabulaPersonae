import { axe } from "vitest-axe"

vi.mock("@/lib/theme", () => ({
  theme: () => "system",
  setTheme: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock("@/lib/pdf-parser", () => ({
  parsePdfCharacterSheet: vi.fn(),
  mergeWithDefault: vi.fn(),
}))

import userEvent from "@testing-library/user-event"
import { cleanup, render, screen, waitFor, cleanupPortals } from "../test-utils"
import { HeaderMenu } from "@/components/header-menu"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character } from "@/lib/character-types"

const char1: Character = { ...createDefaultCharacter(), id: "id-1", name: "Gandalf" }
const char2: Character = { ...createDefaultCharacter(), id: "id-2", name: "Aragorn" }

const defaultProps = {
  characters: [char1, char2],
  onImportCharacter: vi.fn(),
  onImportMultiple: vi.fn(),
  onAllCharacters: vi.fn(),
}

async function openMenu(extraProps: Partial<typeof defaultProps & { currentCharacter?: Character }> = {}) {
  const user = userEvent.setup()
  render(<HeaderMenu {...defaultProps} {...extraProps} />)
  await user.click(screen.getByRole("button"))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  cleanupPortals()
})

afterEach(() => {
  cleanup()
  cleanupPortals()
})

describe("HeaderMenu export label", () => {
  it("shows 'Export All Characters' when no currentCharacter", async () => {
    await openMenu()
    await waitFor(() => expect(screen.getByText("Export All Characters")).toBeInTheDocument())
  })

  it("shows character name in export label when currentCharacter is provided", async () => {
    await openMenu({ currentCharacter: char1 })
    await waitFor(() => expect(screen.getByText("Export Gandalf")).toBeInTheDocument())
  })

  it("falls back to 'Export Character' when currentCharacter has no name", async () => {
    await openMenu({ currentCharacter: { ...char1, name: "" } })
    await waitFor(() => expect(screen.getByText("Export Character")).toBeInTheDocument())
  })
})

describe("HeaderMenu import modal", () => {
  it("opens the import modal when Import Character is clicked", async () => {
    const user = await openMenu()
    await waitFor(() => screen.getByText("Import Character"))
    await user.click(screen.getByText("Import Character"))
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())
    expect(screen.getByText("Import Characters")).toBeInTheDocument()
  })

  it("import modal contains JSON and PDF file options", async () => {
    const user = await openMenu()
    await waitFor(() => screen.getByText("Import Character"))
    await user.click(screen.getByText("Import Character"))
    await waitFor(() => screen.getByRole("dialog"))
    expect(screen.getByText(/Choose JSON File/i)).toBeInTheDocument()
    expect(screen.getByText(/Choose PDF File/i)).toBeInTheDocument()
  })
})

describe("HeaderMenu export download", () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake")
    globalThis.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("triggers a download when Export All is clicked (no currentCharacter)", async () => {
    const user = await openMenu()
    await waitFor(() => screen.getByText("Export All Characters"))
    await user.click(screen.getByText("Export All Characters"))
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it("triggers a download when Export [name] is clicked (with currentCharacter)", async () => {
    const user = await openMenu({ currentCharacter: char1 })
    await waitFor(() => screen.getByText("Export Gandalf"))
    await user.click(screen.getByText("Export Gandalf"))
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

describe("HeaderMenu navigation", () => {
  it("calls onAllCharacters when All Characters item is clicked", async () => {
    const user = await openMenu()
    await waitFor(() => screen.getByRole("menuitem", { name: "All Characters" }))
    await user.click(screen.getByRole("menuitem", { name: "All Characters" }))
    expect(defaultProps.onAllCharacters).toHaveBeenCalled()
  })
})

describe("HeaderMenu import reconciliation", () => {
  // armorClass: 15 doesn't match a default character's calculated AC, so a successful
  // reconcile flips useCalculatedArmorClass to false — a clear signal reconciliation ran,
  // as opposed to the raw imported data being passed straight through.
  async function openImportModal() {
    const user = await openMenu()
    await waitFor(() => screen.getByText("Import Character"))
    await user.click(screen.getByText("Import Character"))
    await waitFor(() => screen.getByRole("dialog"))
    return user
  }

  it("reconciles a single-character JSON import before calling onImportCharacter", async () => {
    const user = await openImportModal()
    const raw = { ...createDefaultCharacter(), id: "c1", armorClass: 15 }
    const file = new File([JSON.stringify(raw)], "char.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImportCharacter).toHaveBeenCalled())
    const imported = defaultProps.onImportCharacter.mock.calls[0][0]
    expect(imported.useCalculatedArmorClass).toBe(false)
    expect(imported.armorClass).toBe(15)
  })

  it("reconciles each character in a multi-character JSON import before calling onImportMultiple", async () => {
    const user = await openImportModal()
    const raw = [
      { ...createDefaultCharacter(), id: "c1", armorClass: 15 },
      { ...createDefaultCharacter(), id: "c2", armorClass: 15 },
    ]
    const file = new File([JSON.stringify(raw)], "chars.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImportMultiple).toHaveBeenCalled())
    const imported = defaultProps.onImportMultiple.mock.calls[0][0]
    expect(imported).toHaveLength(2)
    expect(imported[0].useCalculatedArmorClass).toBe(false)
    expect(imported[1].useCalculatedArmorClass).toBe(false)
  })

  it("reconciles a PDF import before calling onImportCharacter", async () => {
    const { parsePdfCharacterSheet, mergeWithDefault } = await import("@/lib/pdf-parser")
    vi.mocked(parsePdfCharacterSheet).mockResolvedValueOnce({} as any)
    vi.mocked(mergeWithDefault).mockReturnValueOnce({ ...createDefaultCharacter(), armorClass: 15 })

    const user = await openImportModal()
    const file = new File(["x"], "sheet.pdf", { type: "application/pdf" })
    const input = screen.getByLabelText(/Choose PDF File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImportCharacter).toHaveBeenCalled())
    const imported = defaultProps.onImportCharacter.mock.calls[0][0]
    expect(imported.useCalculatedArmorClass).toBe(false)
    expect(imported.armorClass).toBe(15)
  })
})

describe("HeaderMenu accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<HeaderMenu {...defaultProps} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

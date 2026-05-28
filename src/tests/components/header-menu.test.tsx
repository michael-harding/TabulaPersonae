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
import { cleanup, render, screen, waitFor } from "../test-utils"
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

function cleanupPortals() {
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.getAttribute("aria-hidden") === "true" || el.querySelector('[role="dialog"]') || el.querySelector('[role="menu"]')) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
  document.body.removeAttribute("aria-hidden")
  Array.from(document.body.children).forEach((child) => {
    (child as HTMLElement).removeAttribute("aria-hidden")
  })
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

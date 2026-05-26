vi.mock("@/lib/firebase-storage", () => ({
  subscribeToCharacter: vi.fn(() => vi.fn()),
}))

vi.mock("@/lib/sync-context", () => ({
  useSyncState: vi.fn(() => null),
}))

// theme.ts runs createEffect at module level and calls window.matchMedia (not in jsdom)
vi.mock("@/lib/theme", () => ({
  theme: () => "system",
  setTheme: vi.fn(),
}))

import { cleanup, render, screen, fireEvent, waitFor } from "../test-utils"
import { createDefaultCharacter } from "@/lib/character-types"
import CharacterSheet from "@/routes/CharacterSheet"

const testCharacter = { ...createDefaultCharacter(), id: "test-id", name: "Testy McTestface" }

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  ;(globalThis as any).mockStorageManager.getCharacters.mockResolvedValue([testCharacter])
})

afterEach(() => {
  cleanup()
})

async function renderAndLoad() {
  render(<CharacterSheet />)
  await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument())
}

describe("CharacterSheet tabs", () => {
  it("renders all five tab triggers", async () => {
    await renderAndLoad()
    expect(screen.getByRole("tab", { name: /combat/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /spells/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /features/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /inventory/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /character/i })).toBeInTheDocument()
  })

  it("selects Combat as the default tab", async () => {
    await renderAndLoad()
    expect(screen.getByRole("tab", { name: /combat/i })).toHaveAttribute("data-selected")
  })

  it("shows combat section content on the default tab", async () => {
    await renderAndLoad()
    expect(screen.getByText(/actions & attacks/i)).toBeInTheDocument()
    expect(screen.getByText(/skills & proficiencies/i)).toBeInTheDocument()
  })

  it("does not render non-combat sections before they are visited", async () => {
    await renderAndLoad()
    // Kobalte only mounts a tab's panel on first visit — inventory not yet rendered
    expect(screen.queryByText(/equipment & inventory/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/character information/i)).not.toBeInTheDocument()
  })

  it("switches to the Spells tab and shows spells content", async () => {
    await renderAndLoad()
    fireEvent.click(screen.getByRole("tab", { name: /spells/i }))
    // "Add Spell" button is unique to the SpellsSection
    expect(await screen.findByRole("button", { name: /add spell/i })).toBeInTheDocument()
  })

  it("switches to the Inventory tab and shows inventory content", async () => {
    await renderAndLoad()
    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }))
    expect(await screen.findByText(/equipment & inventory/i)).toBeInTheDocument()
  })

  it("switches to the Character tab and shows character info and notes", async () => {
    await renderAndLoad()
    fireEvent.click(screen.getByRole("tab", { name: /character/i }))
    expect(await screen.findByText(/character information/i)).toBeInTheDocument()
    expect(screen.getByText(/character background & notes/i)).toBeInTheDocument()
  })

  it("always shows the character name in the header", async () => {
    await renderAndLoad()
    expect(screen.getByRole("heading", { name: /testy mctestface/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: /spells/i }))
    expect(screen.getByRole("heading", { name: /testy mctestface/i })).toBeInTheDocument()
  })
})

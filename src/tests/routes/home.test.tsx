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

import { cleanup, render, screen, waitFor } from "../test-utils"
import { createDefaultCharacter } from "@/lib/character-types"
import Home from "@/routes/Home"

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
})

afterEach(() => {
  cleanup()
})

async function renderAndLoad(characters: ReturnType<typeof createDefaultCharacter>[]) {
  ;(globalThis as any).mockStorageManager.getCharacters.mockResolvedValue(characters)
  render(<Home />)
  await waitFor(() => expect(screen.getByText(/level/i)).toBeInTheDocument())
}

describe("Home character list", () => {
  it("computes AC live from equipped armor rather than the stale stored field", async () => {
    const character = {
      ...createDefaultCharacter(),
      id: "char-1",
      name: "Testy",
      armorClass: 99, // stale/unsaved value — should be ignored while useCalculatedArmorClass is true (default)
      abilityScores: { ...createDefaultCharacter().abilityScores, dexterity: 14 },
      equipment: [{
        id: "arm-1", name: "Chain Shirt", quantity: 1, weight: 20, description: "",
        equipped: true, type: "armor" as const,
        armorStats: { baseAC: 13, armorType: "light" as const },
      }],
    }
    await renderAndLoad([character])
    // 13 base + DEX +2 = 15, not the stale armorClass: 99
    expect(screen.getByText("AC: 15")).toBeInTheDocument()
  })

  it("shows the manually-entered armorClass when useCalculatedArmorClass is false", async () => {
    const character = { ...createDefaultCharacter(), id: "char-1", name: "Testy", armorClass: 17, useCalculatedArmorClass: false }
    await renderAndLoad([character])
    expect(screen.getByText("AC: 17")).toBeInTheDocument()
  })

  it("shows effective max HP including a temporary max HP bonus, not just the stored maximum", async () => {
    const character = {
      ...createDefaultCharacter(),
      id: "char-1",
      name: "Testy",
      hitPoints: { current: 10, maximum: 10, temporary: 0, temporaryMaximum: 5 },
    }
    await renderAndLoad([character])
    expect(screen.getByText("HP: 10/15")).toBeInTheDocument()
  })
})

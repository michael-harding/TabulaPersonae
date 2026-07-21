vi.mock("@/lib/firebase-storage", () => ({
  getPublicCharacterFromFirebase: vi.fn(),
}))

// theme.ts runs createEffect at module level and calls window.matchMedia (not in jsdom)
vi.mock("@/lib/theme", () => ({
  theme: () => "system",
  setTheme: vi.fn(),
}))

import { axe } from "vitest-axe"
import { cleanup, render, screen, waitFor } from "../test-utils"
import { createDefaultCharacter } from "@/lib/character-types"
import { getPublicCharacterFromFirebase } from "@/lib/firebase-storage"
import PublicCharacterSheet from "@/routes/PublicCharacterSheet"

const mockGetPublic = vi.mocked(getPublicCharacterFromFirebase)

const testCharacter = {
  ...createDefaultCharacter(),
  id: "public-char-id",
  name: "Gandalf",
  isPublic: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
})

afterEach(() => {
  cleanup()
})

async function renderAndLoad() {
  render(<PublicCharacterSheet />)
  await waitFor(() => expect(screen.queryByText(/loading character/i)).not.toBeInTheDocument())
}

describe("PublicCharacterSheet — loading state", () => {
  it("shows the loading spinner while the fetch is in flight", () => {
    mockGetPublic.mockImplementation(() => new Promise(() => {}))
    render(<PublicCharacterSheet />)
    expect(screen.getByText(/loading character/i)).toBeInTheDocument()
  })
})

describe("PublicCharacterSheet", () => {
  describe("not found / private", () => {
    it("shows the not-found message when getPublicCharacterFromFirebase returns null", async () => {
      mockGetPublic.mockResolvedValue(null)
      await renderAndLoad()
      expect(screen.getByText(/character not found or not shared publicly/i)).toBeInTheDocument()
    })

    it("shows a link back to the app on the not-found screen", async () => {
      mockGetPublic.mockResolvedValue(null)
      await renderAndLoad()
      expect(screen.getByRole("link", { name: /go to tabulapersonae/i })).toBeInTheDocument()
    })
  })

  describe("public character view", () => {
    beforeEach(() => {
      mockGetPublic.mockResolvedValue(testCharacter)
    })

    it("renders the character name", async () => {
      await renderAndLoad()
      expect(screen.getByText("Gandalf")).toBeInTheDocument()
    })

    it("renders a Read-only badge", async () => {
      await renderAndLoad()
      expect(screen.getByText("Read-only")).toBeInTheDocument()
    })

    it("renders the tab list", async () => {
      await renderAndLoad()
      expect(screen.getByRole("tablist")).toBeInTheDocument()
    })

    it("does not render the Configure tabs (gear) button", async () => {
      await renderAndLoad()
      expect(screen.queryByRole("button", { name: /configure tabs/i })).not.toBeInTheDocument()
    })

    it("does not render an Add Action button", async () => {
      await renderAndLoad()
      expect(screen.queryByRole("button", { name: /add action/i })).not.toBeInTheDocument()
    })

    it("does not render an Add Spell button", async () => {
      await renderAndLoad()
      expect(screen.queryByRole("button", { name: /add spell/i })).not.toBeInTheDocument()
    })

    it("does not render HP adjustment buttons", async () => {
      await renderAndLoad()
      expect(screen.queryByRole("button", { name: /increase hp/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /decrease hp/i })).not.toBeInTheDocument()
    })

    it("does not render the sheet settings card", async () => {
      await renderAndLoad()
      expect(screen.queryByText("Sheet Settings")).not.toBeInTheDocument()
    })

    it("has no accessibility violations", async () => {
      const { container } = render(<PublicCharacterSheet />)
      await waitFor(() => expect(screen.queryByText(/loading character/i)).not.toBeInTheDocument())
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})

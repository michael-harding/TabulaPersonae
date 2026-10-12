vi.mock("@/lib/theme", () => ({
  theme: () => "system",
  setTheme: vi.fn(),
}))

vi.mock("@/hooks/use-toast", async () => (await import("../mocks/toast")).toastModuleMock)

vi.mock("@/lib/pdf-parser", () => ({
  parsePdfCharacterSheet: vi.fn(),
  mergeWithDefault: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}))

import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import { useAuth } from "@/lib/auth-context"
import { createDefaultCharacter, type Character } from "@/lib/character-types"
import Home from "@/routes/Home"

import { cleanup, cleanupPortals, render, screen, waitFor, fireEvent, confirmClick } from "../test-utils"
import { createMockAuth, createTestUser } from "../mocks/auth"
import { mockNavigate } from "../mocks/router"
import { mockStorageManager } from "../mocks/storage-manager"
import { mockToast } from "../mocks/toast"

const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  cleanupPortals()
  mockUseAuth.mockReturnValue(createMockAuth({ user: () => createTestUser() }))
  mockStorageManager.getCharacters.mockResolvedValue([])
  mockStorageManager.saveCharacter.mockResolvedValue(true)
  mockStorageManager.deleteCharacter.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  cleanupPortals()
})

async function renderAndLoad(characters: ReturnType<typeof createDefaultCharacter>[]) {
  mockStorageManager.getCharacters.mockResolvedValue(characters)
  render(() => <Home />)
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

describe("Home page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(() => <Home />)
    await waitFor(() => expect(screen.getByText(/TabulaPersonae/i)).toBeInTheDocument())
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("deleting a character", () => {
    const character = () => ({ ...createDefaultCharacter(), id: "char-1", name: "Testy" })
    const deleteButton = () => screen.getByTestId("delete-character-button-char-1")

    it("does not delete on a single click — it asks to confirm instead", async () => {
      await renderAndLoad([character()])
      fireEvent.click(deleteButton(), { detail: 1 })
      expect(deleteButton()).toHaveTextContent("Confirm Delete")
      expect(mockStorageManager.deleteCharacter).not.toHaveBeenCalled()
      expect(screen.getByText("Testy")).toBeInTheDocument()
    })

    it("deletes after a deliberate second click", async () => {
      await renderAndLoad([character()])
      confirmClick(deleteButton())
      expect(mockStorageManager.deleteCharacter).toHaveBeenCalledWith("char-1")
      await waitFor(() => expect(screen.queryByText("Testy")).not.toBeInTheDocument())
    })
  })
})

describe("Home loading", () => {
  it("sends a signed-out visitor to the sign-in page without loading any characters", async () => {
    mockUseAuth.mockReturnValue(createMockAuth())
    render(() => <Home />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/auth"))
    expect(mockStorageManager.getCharacters).not.toHaveBeenCalled()
  })

  it("loads characters for a visitor who chose to continue without an account", async () => {
    mockUseAuth.mockReturnValue(createMockAuth({ skipAuth: () => true }))
    await renderAndLoad([{ ...createDefaultCharacter(), id: "char-1", name: "Testy" }])

    expect(screen.getByText("Testy")).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("shows the loading state and loads nothing while the sign-in state is still unknown", () => {
    mockUseAuth.mockReturnValue(createMockAuth({ loading: () => true }))
    render(() => <Home />)

    expect(screen.getByText("Loading your characters...")).toBeInTheDocument()
    expect(mockStorageManager.getCharacters).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("logs the failure and stops loading when the characters cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("storage unavailable")
    mockStorageManager.getCharacters.mockRejectedValue(failure)
    render(() => <Home />)

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith("Failed to load characters:", failure))
    await waitFor(() => expect(screen.queryByText("Loading your characters...")).not.toBeInTheDocument())
    consoleError.mockRestore()
  })

  it("links each character card to that character's sheet, naming an unnamed one", async () => {
    await renderAndLoad([{ ...createDefaultCharacter(), id: "char-1", name: "" }])

    expect(screen.getByRole("link", { name: /unnamed character/i })).toHaveAttribute("href", "/character/char-1")
  })
})

describe("Home creating a character", () => {
  const savedCharacter = (): Character => mockStorageManager.saveCharacter.mock.calls[0][0]

  it("offers to create the first character when there are none, then saves and opens it", async () => {
    render(() => <Home />)

    fireEvent.click(await screen.findByTestId("create-first-character-button"))

    expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce()
    expect(savedCharacter()).toMatchObject({ name: "", level: 1 })
    expect(mockNavigate).toHaveBeenCalledWith(`/character/${savedCharacter().id}`)
  })

  it("creates another character from the list without touching the existing ones", async () => {
    await renderAndLoad([{ ...createDefaultCharacter(), id: "char-1", name: "Testy" }])

    fireEvent.click(screen.getByTestId("create-new-character-button"))

    expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce()
    expect(savedCharacter().id).not.toBe("char-1")
    expect(mockNavigate).toHaveBeenCalledWith(`/character/${savedCharacter().id}`)
    expect(screen.getByText("Testy")).toBeInTheDocument()
  })

  it("tells the user when the new character could not be saved", async () => {
    mockStorageManager.saveCharacter.mockResolvedValue(false)
    render(() => <Home />)

    fireEvent.click(await screen.findByTestId("create-first-character-button"))

    await waitFor(() => expect(mockToast).toHaveBeenCalledExactlyOnceWith({
      title: "Character not saved",
      description: "The new character could not be saved.",
      variant: "destructive",
    }))
  })

  // Offline, a signed-in user's save stays pending until the server answers
  it("opens the new character without waiting for a save that has not finished", async () => {
    mockStorageManager.saveCharacter.mockReturnValue(new Promise<boolean>(() => {}))
    render(() => <Home />)

    fireEvent.click(await screen.findByTestId("create-first-character-button"))

    expect(mockNavigate).toHaveBeenCalledWith(`/character/${savedCharacter().id}`)
    expect(mockToast).not.toHaveBeenCalled()
  })
})

describe("Home importing from the menu", () => {
  async function importJson(content: unknown) {
    const user = userEvent.setup()
    render(() => <Home />)
    await user.click(await screen.findByTestId("header-menu-trigger"))
    await user.click(await screen.findByRole("menuitem", { name: /import character/i }))
    const file = new File([JSON.stringify(content)], "import.json", { type: "application/json" })
    await user.upload(await screen.findByLabelText(/choose json file/i), file)
  }

  it("saves an imported character under a new id and opens it", async () => {
    await importJson({ ...createDefaultCharacter(), id: "id-from-file", name: "Imported" })

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
    const saved: Character = mockStorageManager.saveCharacter.mock.calls[0][0]
    expect(saved.name).toBe("Imported")
    expect(saved.id).not.toBe("id-from-file")
    expect(mockNavigate).toHaveBeenCalledWith(`/character/${saved.id}`)
  })

  it("saves every character of a multi-character import under new ids and opens the first", async () => {
    await importJson([
      { ...createDefaultCharacter(), id: "file-1", name: "First" },
      { ...createDefaultCharacter(), id: "file-2", name: "Second" },
    ])

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledTimes(2))
    const saved: Character[] = mockStorageManager.saveCharacter.mock.calls.map(([character]) => character)
    expect(saved.map((c) => c.name)).toEqual(["First", "Second"])
    expect(saved.map((c) => c.id)).not.toContain("file-1")
    expect(saved[0].id).not.toBe(saved[1].id)
    expect(mockNavigate).toHaveBeenCalledWith(`/character/${saved[0].id}`)
  })

  it.each([
    {
      label: "an imported character",
      saves: [false],
      description: "First could not be saved.",
      content: { ...createDefaultCharacter(), id: "file-1", name: "First" },
    },
    {
      label: "any character of a multi-character import",
      saves: [true, false],
      description: "One or more of the imported characters could not be saved.",
      content: [{ ...createDefaultCharacter(), id: "file-1", name: "First" }, { ...createDefaultCharacter(), id: "file-2", name: "Second" }],
    },
  ])("tells the user when $label could not be saved", async ({ saves, description, content }) => {
    for (const saved of saves) mockStorageManager.saveCharacter.mockResolvedValueOnce(saved)

    await importJson(content)

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: "Import not saved", description, variant: "destructive" }))
  })
})

describe("Home deleting a character — failure", () => {
  it("tells the user and shows the character again when it could not be deleted", async () => {
    mockStorageManager.deleteCharacter.mockResolvedValue(false)
    await renderAndLoad([{ ...createDefaultCharacter(), id: "char-1", name: "Testy" }])

    confirmClick(screen.getByTestId("delete-character-button-char-1"))

    await waitFor(() => expect(mockToast).toHaveBeenCalledExactlyOnceWith({
      title: "Character not deleted",
      description: "Testy could not be deleted.",
      variant: "destructive",
    }))
    // Removed at once, then reloaded from storage, where it still exists
    expect(await screen.findByText("Testy")).toBeInTheDocument()
    expect(mockStorageManager.getCharacters).toHaveBeenCalledTimes(2)
  })

  it("leaves the character removed and says nothing when the delete succeeds", async () => {
    await renderAndLoad([{ ...createDefaultCharacter(), id: "char-1", name: "Testy" }])

    confirmClick(screen.getByTestId("delete-character-button-char-1"))

    await waitFor(() => expect(screen.queryByText("Testy")).not.toBeInTheDocument())
    expect(mockToast).not.toHaveBeenCalled()
    expect(mockStorageManager.getCharacters).toHaveBeenCalledOnce()
  })
})

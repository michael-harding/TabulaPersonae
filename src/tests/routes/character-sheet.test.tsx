vi.mock("@/lib/firebase-storage", () => ({
  subscribeToCharacter: vi.fn(() => vi.fn()),
}))

vi.mock("@/lib/sync-context", () => ({
  useSyncState: vi.fn(() => null),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/hooks/use-toast", async () => (await import("../mocks/toast")).toastModuleMock)

// theme.ts runs createEffect at module level and calls window.matchMedia (not in jsdom)
vi.mock("@/lib/theme", () => ({
  theme: () => "system",
  setTheme: vi.fn(),
}))

import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import { useAuth } from "@/lib/auth-context"
import { createDefaultCharacter, type Character } from "@/lib/character-types"
import { subscribeToCharacter, type CharacterSyncSnapshot } from "@/lib/firebase-storage"
import { useSyncState } from "@/lib/sync-context"
import { useTabConfig } from "@/lib/tab-config-context"
import { DEFAULT_TAB_CONFIG } from "@/lib/tab-config-types"
import CharacterSheet from "@/routes/CharacterSheet"

import { cleanup, cleanupPortals, render, screen, fireEvent, waitFor } from "../test-utils"
import { createMockAuth, createTestUser } from "../mocks/auth"
import { mockNavigate } from "../mocks/router"
import { mockStorageManager } from "../mocks/storage-manager"
import { mockToast } from "../mocks/toast"

const mockUseTabConfig = vi.mocked(useTabConfig)
const mockUseAuth = vi.mocked(useAuth)
const mockUseSyncState = vi.mocked(useSyncState)
const mockSubscribeToCharacter = vi.mocked(subscribeToCharacter)

const testUser = createTestUser({ uid: "test-user" })
const testCharacter = { ...createDefaultCharacter(), id: "test-id", name: "Testy McTestface" }

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  cleanupPortals()
  document.title = ""
  mockUseAuth.mockReturnValue(createMockAuth({ user: () => testUser }))
  mockUseSyncState.mockReturnValue(undefined)
  mockSubscribeToCharacter.mockReturnValue(vi.fn())
  mockStorageManager.getCharacters.mockResolvedValue([testCharacter])
  mockStorageManager.getCharacter.mockResolvedValue(null)
  mockStorageManager.saveCharacter.mockResolvedValue(true)
  // Restore default config before each test (vi.clearAllMocks resets mock state)
  mockUseTabConfig.mockReturnValue({
    tabConfig: () => DEFAULT_TAB_CONFIG,
    saveTabConfig: vi.fn().mockResolvedValue(undefined),
  })
})

afterEach(() => {
  cleanup()
  cleanupPortals()
})

async function renderAndLoad() {
  render(() => <CharacterSheet />)
  await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument())
}

describe("CharacterSheet tab settings integration", () => {
  it("renders a Configure tabs button in the tab bar area", async () => {
    await renderAndLoad()
    expect(screen.getByRole("button", { name: /configure tabs/i })).toBeInTheDocument()
  })

  it("renders only the tabs returned by tabConfig()", async () => {
    mockUseTabConfig.mockReturnValue({
      tabConfig: () => ({ tabs: [{ id: "custom-1", label: "My Custom Tab", modules: [] }] }),
      saveTabConfig: vi.fn(),
    })
    render(() => <CharacterSheet />)
    await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument())
    expect(screen.getByRole("tab", { name: /my custom tab/i })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /combat/i })).not.toBeInTheDocument()
  })

  it("renders an empty tab panel without crashing when a tab has no modules", async () => {
    mockUseTabConfig.mockReturnValue({
      tabConfig: () => ({ tabs: [{ id: "empty-tab", label: "Empty", modules: [] }] }),
      saveTabConfig: vi.fn(),
    })
    render(() => <CharacterSheet />)
    await waitFor(() => expect(screen.getByRole("tab", { name: /empty/i })).toBeInTheDocument())
  })
})

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
    // "Add Spell" button is unique to the SpellsModule
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

  it("has no accessibility violations", async () => {
    const { container } = render(() => <CharacterSheet />)
    await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument())
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe("CharacterSheet loading", () => {
  it("sends a signed-out visitor to the sign-in page without loading any character", async () => {
    mockUseAuth.mockReturnValue(createMockAuth())
    render(() => <CharacterSheet />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/auth"))
    expect(mockStorageManager.getCharacters).not.toHaveBeenCalled()
  })

  it("loads the sheet for a visitor who chose to continue without an account", async () => {
    mockUseAuth.mockReturnValue(createMockAuth({ skipAuth: () => true }))
    await renderAndLoad()

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockSubscribeToCharacter).not.toHaveBeenCalled()
  })

  it("shows the loading state and loads nothing while the sign-in state is still unknown", () => {
    mockUseAuth.mockReturnValue(createMockAuth({ loading: () => true }))
    render(() => <CharacterSheet />)

    expect(screen.getByText("Loading character...")).toBeInTheDocument()
    expect(mockStorageManager.getCharacters).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("falls back to loading the character by id when the character list does not include it", async () => {
    mockStorageManager.getCharacters.mockResolvedValue([])
    mockStorageManager.getCharacter.mockResolvedValue(testCharacter)
    await renderAndLoad()

    expect(mockStorageManager.getCharacter).toHaveBeenCalledWith("test-id")
    expect(screen.getByRole("heading", { name: /testy mctestface/i })).toBeInTheDocument()
  })

  it("goes to the not-found page when the character does not exist", async () => {
    mockStorageManager.getCharacters.mockResolvedValue([{ ...testCharacter, id: "someone-else" }])
    render(() => <CharacterSheet />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/404"))
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })

  it("logs the failure and stops loading when the characters cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("storage unavailable")
    mockStorageManager.getCharacters.mockRejectedValue(failure)
    render(() => <CharacterSheet />)

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith("Failed to load character:", failure))
    await waitFor(() => expect(screen.queryByText("Loading character...")).not.toBeInTheDocument())
    consoleError.mockRestore()
  })

  it("names the character in the page title, and falls back to the app name when it has none", async () => {
    await renderAndLoad()
    expect(document.title).toBe("Testy McTestface | TabulaPersonae")

    cleanup()
    mockStorageManager.getCharacters.mockResolvedValue([{ ...testCharacter, name: "" }])
    await renderAndLoad()
    expect(document.title).toBe("TabulaPersonae")
    expect(screen.getByRole("heading", { name: "Unnamed Character" })).toBeInTheDocument()
  })
})

describe("CharacterSheet saving", () => {
  const savedCharacter = (): Character => mockStorageManager.saveCharacter.mock.calls.at(-1)![0]

  async function renderWith(overrides: Partial<Character>) {
    mockStorageManager.getCharacters.mockResolvedValue([{ ...testCharacter, ...overrides }])
    await renderAndLoad()
  }

  it("saves a change made on the sheet and shows it straight away", async () => {
    await renderWith({ heroicInspiration: false })

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
    expect(savedCharacter()).toMatchObject({ id: "test-id", heroicInspiration: true })

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))
    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledTimes(2))
    expect(savedCharacter().heroicInspiration).toBe(false)
  })

  it("clears death saves on any save made while the character is at exactly 1 HP", async () => {
    await renderWith({
      hitPoints: { ...testCharacter.hitPoints, current: 1 },
      deathSaves: { successes: 2, failures: 1 },
    })

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
    expect(savedCharacter().deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it.each([0, 2])("keeps death saves as they are when the character is at %i HP", async (current) => {
    await renderWith({
      hitPoints: { ...testCharacter.hitPoints, current },
      deathSaves: { successes: 2, failures: 1 },
    })

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
    expect(savedCharacter().deathSaves).toEqual({ successes: 2, failures: 1 })
  })

  it("tells the user when the save fails", async () => {
    mockStorageManager.saveCharacter.mockResolvedValue(false)
    await renderWith({})

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))

    await waitFor(() => expect(mockToast).toHaveBeenCalledExactlyOnceWith({
      title: "Character not saved",
      description: "Your latest change could not be saved. It may be lost if you reload or leave this page.",
      variant: "destructive",
    }))
  })

  it("says nothing when the save succeeds", async () => {
    await renderWith({})

    fireEvent.click(screen.getByTestId("toggle-heroic-inspiration"))

    await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
    expect(mockToast).not.toHaveBeenCalled()
  })
})

describe("CharacterSheet header actions", () => {
  it("opens the tab settings page from the Configure tabs button", async () => {
    await renderAndLoad()
    fireEvent.click(screen.getByTestId("configure-tabs-button"))
    expect(mockNavigate).toHaveBeenCalledWith("/settings/tabs")
  })

  it("opens the rest dialog from the Take a Rest button", async () => {
    await renderAndLoad()
    fireEvent.click(screen.getByTestId("take-a-rest-button"))
    expect(await screen.findByTestId("rest-confirm-button")).toBeInTheDocument()
  })

  it("returns to the character list from the menu's All Characters item", async () => {
    const user = userEvent.setup()
    await renderAndLoad()
    await user.click(screen.getByTestId("header-menu-trigger"))
    await user.click(await screen.findByRole("menuitem", { name: "All Characters" }))
    expect(mockNavigate).toHaveBeenCalledWith("/")
  })

  describe("importing from the menu", () => {
    async function importJson(content: unknown) {
      const user = userEvent.setup()
      await renderAndLoad()
      await user.click(screen.getByTestId("header-menu-trigger"))
      await user.click(await screen.findByRole("menuitem", { name: /import character/i }))
      const file = new File([JSON.stringify(content)], "import.json", { type: "application/json" })
      await user.upload(await screen.findByLabelText(/choose json file/i), file)
    }

    const importFailed = (description: string) => ({ title: "Import not saved", description, variant: "destructive" })

    it("saves an imported character under a new id and opens it", async () => {
      await importJson({ ...createDefaultCharacter(), id: "id-from-file", name: "Imported" })

      await waitFor(() => expect(mockStorageManager.saveCharacter).toHaveBeenCalledOnce())
      const saved: Character = mockStorageManager.saveCharacter.mock.calls[0][0]
      expect(saved.name).toBe("Imported")
      expect(saved.id).not.toBe("id-from-file")
      expect(mockNavigate).toHaveBeenCalledWith(`/character/${saved.id}`)
      expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }))
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

    // Offline, a signed-in user's save stays pending until the server answers
    it("opens the imported character without waiting for a save that has not finished", async () => {
      mockStorageManager.saveCharacter.mockReturnValue(new Promise<boolean>(() => {}))

      await importJson({ ...createDefaultCharacter(), id: "id-from-file", name: "Imported" })

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/character\//)))
      expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }))
    })

    it("tells the user when the imported character could not be saved", async () => {
      mockStorageManager.saveCharacter.mockResolvedValue(false)

      await importJson({ ...createDefaultCharacter(), id: "id-from-file", name: "Imported" })

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(importFailed("Imported could not be saved.")))
    })

    it("tells the user when any character of a multi-character import could not be saved", async () => {
      mockStorageManager.saveCharacter.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      await importJson([
        { ...createDefaultCharacter(), id: "file-1", name: "First" },
        { ...createDefaultCharacter(), id: "file-2", name: "Second" },
      ])

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(importFailed("One or more of the imported characters could not be saved.")))
    })
  })
})

describe("CharacterSheet cloud sync status", () => {
  const setSyncState = vi.fn()
  // The listener CharacterSheet registers, so a test can deliver a sync snapshot to it
  let deliver: (snap: CharacterSyncSnapshot | null) => void = () => {}
  const unsubscribe = vi.fn()

  beforeEach(() => {
    setSyncState.mockReset()
    unsubscribe.mockReset()
    mockUseSyncState.mockReturnValue({ syncState: () => null, setSyncState })
    mockSubscribeToCharacter.mockImplementation((_id, _userId, callback) => {
      deliver = callback
      return unsubscribe
    })
  })

  it("subscribes to the open character as the signed-in user", async () => {
    await renderAndLoad()
    expect(mockSubscribeToCharacter).toHaveBeenCalledWith("test-id", "test-user", expect.any(Function))
  })

  it("publishes each sync snapshot, and ignores one for a document it may not read", async () => {
    await renderAndLoad()
    const updatedAt = new Date("2026-01-02T03:04:05.000Z")

    deliver({ hasPendingWrites: true, updatedAt })
    expect(setSyncState).toHaveBeenLastCalledWith({ hasPendingWrites: true, updatedAt })

    setSyncState.mockClear()
    deliver(null)
    expect(setSyncState).not.toHaveBeenCalled()
  })

  it("stops listening and clears the sync status when the sheet is closed", async () => {
    const { unmount } = render(() => <CharacterSheet />)
    await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument())
    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(setSyncState).toHaveBeenLastCalledWith(null)
  })
})

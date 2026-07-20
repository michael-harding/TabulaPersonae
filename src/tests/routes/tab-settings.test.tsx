vi.mock("@/lib/theme", () => ({ theme: () => "system", setTheme: vi.fn() }))

// solid-dnd uses browser layout/pointer APIs unavailable in jsdom
vi.mock("@thisbeyond/solid-dnd", () => ({
  DragDropProvider: ({ children }: any) => children,
  DragDropSensors: () => null,
  SortableProvider: ({ children }: any) => children,
  createSortable: () => ({
    ref: () => {},
    transform: { x: 0, y: 0 },
    dragActivators: {},
    isActiveDraggable: false,
    isActiveDroppable: false,
  }),
  closestCenter: () => null,
  maybeTransformStyle: () => ({}),
}))

// Override the global tab-config-context mock for this file so we can control
// the initial config and capture saveTabConfig calls.
const mockSaveTabConfig = vi.fn()
let currentConfig = {
  tabs: [
    { id: "tab-combat", label: "Combat", modules: ["actions" as const, "skills" as const] },
    { id: "tab-spells", label: "Spells", modules: ["spells" as const] },
  ],
}

vi.mock("@/lib/tab-config-context", () => ({
  useTabConfig: () => ({
    tabConfig: () => currentConfig,
    saveTabConfig: mockSaveTabConfig,
  }),
  TabConfigProvider: ({ children }: any) => children,
}))

import { cleanup, render, screen, fireEvent, waitFor } from "../test-utils"
import TabSettings from "@/routes/TabSettings"

beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  currentConfig = {
    tabs: [
      { id: "tab-combat", label: "Combat", modules: ["actions" as const, "skills" as const] },
      { id: "tab-spells", label: "Spells", modules: ["spells" as const] },
    ],
  }
  mockSaveTabConfig.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe("TabSettings page", () => {
  it("renders each tab as a collapsible section", () => {
    render(<TabSettings />)
    // One delete button per tab
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    expect(deleteButtons).toHaveLength(2)
    expect(screen.getByText("Combat")).toBeInTheDocument()
  })

  it("renders a heading and description", () => {
    render(<TabSettings />)
    expect(screen.getByRole("heading", { name: /tab settings/i })).toBeInTheDocument()
    expect(screen.getByText(/configure the tabs/i)).toBeInTheDocument()
  })

  it("expanding a tab shows its current modules and available modules", async () => {
    render(<TabSettings />)
    // Combat tab starts expanded (first tab); click chevron to confirm open state
    // The modules list section header should be visible
    expect(screen.getByText("Actions & Attacks")).toBeInTheDocument()
    expect(screen.getByText("Skills & Proficiencies")).toBeInTheDocument()
  })

  it("shows available modules to add inside an expanded tab", async () => {
    render(<TabSettings />)
    // Combat is expanded by default; Spells module is not in Combat → should appear as addable
    expect(screen.getByRole("button", { name: /^spells$/i })).toBeInTheDocument()
  })

  it("clicking an available module calls saveTabConfig with module added", async () => {
    render(<TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /^spells$/i }))
    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({
              id: "tab-combat",
              modules: expect.arrayContaining(["actions", "skills", "spells"]),
            }),
          ]),
        }),
      )
    })
  })

  it("clicking the remove button on a module calls saveTabConfig without that module", async () => {
    render(<TabSettings />)
    const removeButtons = screen.getAllByRole("button", { name: /remove actions & attacks/i })
    fireEvent.click(removeButtons[0])
    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({
              id: "tab-combat",
              modules: expect.not.arrayContaining(["actions"]),
            }),
          ]),
        }),
      )
    })
  })

  it("shows the Add Tab button", () => {
    render(<TabSettings />)
    expect(screen.getByRole("button", { name: /add tab/i })).toBeInTheDocument()
  })

  it("clicking Add Tab reveals a name input", async () => {
    render(<TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /add tab/i }))
    expect(await screen.findByPlaceholderText(/tab name/i)).toBeInTheDocument()
  })

  it("submitting the add tab form calls saveTabConfig with the new tab", async () => {
    render(<TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /add tab/i }))
    const input = await screen.findByPlaceholderText(/tab name/i)
    fireEvent.input(input, { target: { value: "My New Tab" } })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))
    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ label: "My New Tab", modules: [] }),
          ]),
        }),
      )
    })
  })

  it("submitting an empty tab name does not call saveTabConfig", async () => {
    render(<TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /add tab/i }))
    await screen.findByPlaceholderText(/tab name/i)
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })

  it("clicking delete on a tab calls saveTabConfig without that tab", async () => {
    render(<TabSettings />)
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    fireEvent.click(deleteButtons[0]) // delete Combat
    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.not.arrayContaining([
            expect.objectContaining({ id: "tab-combat" }),
          ]),
        }),
      )
    })
  })

  it("rename flow: clicking rename shows input, saving calls saveTabConfig with new label", async () => {
    render(<TabSettings />)
    const renameButtons = screen.getAllByRole("button", { name: /rename tab/i })
    fireEvent.click(renameButtons[0])
    const input = await screen.findByDisplayValue("Combat")
    fireEvent.input(input, { target: { value: "Offense" } })
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => {
      expect(mockSaveTabConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ id: "tab-combat", label: "Offense" }),
          ]),
        }),
      )
    })
  })

  it("delete button is enabled when multiple tabs exist", () => {
    render(<TabSettings />)
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    expect(deleteButtons.length).toBe(2)
    deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it("delete button is disabled when only one tab remains", () => {
    currentConfig = {
      tabs: [{ id: "tab-combat", label: "Combat", modules: ["actions" as const] }],
    }
    render(<TabSettings />)
    const deleteButton = screen.getByRole("button", { name: /delete tab/i })
    expect(deleteButton).toBeDisabled()
  })

  it("clicking the disabled delete button on the last tab does not call saveTabConfig", () => {
    currentConfig = {
      tabs: [{ id: "tab-combat", label: "Combat", modules: [] }],
    }
    render(<TabSettings />)
    const deleteButton = screen.getByRole("button", { name: /delete tab/i })
    expect(deleteButton).toBeDisabled()
    fireEvent.click(deleteButton)
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })
})

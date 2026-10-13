vi.mock("@/lib/theme", () => ({ theme: () => "system", setTheme: vi.fn() }))

// Each sortable list the page renders: the ids it holds and the drop handler of the
// DragDropProvider around it, so a test can deliver a drop to the right list (see `drop`).
const sortableLists = vi.hoisted(() => [] as { ids: () => (string | number)[]; onDragEnd: (event: DropEvent) => void }[])

// solid-dnd uses browser layout/pointer APIs unavailable in jsdom, so dragging is replaced by
// calling the handler a real drop would call.
vi.mock("@thisbeyond/solid-dnd", async () => {
  const { createContext, useContext, onCleanup } = await import("solid-js")
  // Holds the enclosing DragDropProvider's props; its handler is read when a drop is delivered
  const DropTarget = createContext<{ onDragEnd: (event: DropEvent) => void }>({ onDragEnd: () => {} })
  return {
  DragDropProvider: (props: ParentProps<{ onDragEnd: (event: DropEvent) => void }>) => (
    <DropTarget.Provider value={props}>{props.children}</DropTarget.Provider>
  ),
  DragDropSensors: () => null,
  SortableProvider: (props: ParentProps<{ ids: (string | number)[] }>) => {
    const target = useContext(DropTarget)
    const list = { ids: () => props.ids, onDragEnd: (event: DropEvent) => target.onDragEnd(event) }
    sortableLists.push(list)
    onCleanup(() => sortableLists.splice(sortableLists.indexOf(list), 1))
    return <>{props.children}</>
  },
  createSortable: () => ({
    ref: () => {},
    transform: { x: 0, y: 0 },
    dragActivators: {},
    isActiveDraggable: false,
    isActiveDroppable: false,
  }),
  closestCenter: () => null,
  maybeTransformStyle: () => ({}),
  }
})

// The part of solid-dnd's drop event that TabSettings reads
interface DropEvent {
  draggable: { id: string | number }
  // null: the item was released over nothing
  droppable: { id: string | number } | null
}

/** Drops `draggedId` onto `ontoId` (or onto nothing) in whichever sortable list holds it. */
function drop(draggedId: string, ontoId: string | null) {
  const list = sortableLists.find((candidate) => candidate.ids().includes(draggedId))
  if (!list) throw new Error(`No sortable list on the page contains "${draggedId}"`)
  // null: released over nothing
  list.onDragEnd({ draggable: { id: draggedId }, droppable: ontoId != null ? { id: ontoId } : null })
}

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
  TabConfigProvider: (props: ParentProps) => <>{props.children}</>,
}))

import { axe } from "vitest-axe"
import type { ParentProps } from "solid-js"

import TabSettings from "@/routes/TabSettings"

import { cleanup, render, screen, fireEvent, waitFor, confirmClick } from "../test-utils"
import { mockNavigate } from "../mocks/router"

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
    render(() => <TabSettings />)
    // One delete button per tab
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    expect(deleteButtons).toHaveLength(2)
    expect(screen.getByText("Combat")).toBeInTheDocument()
  })

  it("renders a heading and description", () => {
    render(() => <TabSettings />)
    expect(screen.getByRole("heading", { name: /tab settings/i })).toBeInTheDocument()
    expect(screen.getByText(/configure the tabs/i)).toBeInTheDocument()
  })

  it("expanding a tab shows its current modules and available modules", async () => {
    render(() => <TabSettings />)
    // Combat tab starts expanded (first tab); click chevron to confirm open state
    // The modules list section header should be visible
    expect(screen.getByText("Actions & Attacks")).toBeInTheDocument()
    expect(screen.getByText("Skills & Proficiencies")).toBeInTheDocument()
  })

  it("shows available modules to add inside an expanded tab", async () => {
    render(() => <TabSettings />)
    // Combat is expanded by default; Spells module is not in Combat → should appear as addable
    expect(screen.getByRole("button", { name: /^spells$/i })).toBeInTheDocument()
  })

  it("clicking an available module calls saveTabConfig with module added", async () => {
    render(() => <TabSettings />)
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
    render(() => <TabSettings />)
    const removeButtons = screen.getAllByRole("button", { name: /remove actions & attacks/i })
    confirmClick(removeButtons[0])
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
    render(() => <TabSettings />)
    expect(screen.getByRole("button", { name: /add tab/i })).toBeInTheDocument()
  })

  it("clicking Add Tab reveals a name input", async () => {
    render(() => <TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /add tab/i }))
    expect(await screen.findByPlaceholderText(/tab name/i)).toBeInTheDocument()
  })

  it("submitting the add tab form calls saveTabConfig with the new tab", async () => {
    render(() => <TabSettings />)
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
    render(() => <TabSettings />)
    fireEvent.click(screen.getByRole("button", { name: /add tab/i }))
    await screen.findByPlaceholderText(/tab name/i)
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })

  it("a single click on delete tab only arms it — nothing is saved", () => {
    render(() => <TabSettings />)
    const button = screen.getAllByRole("button", { name: /delete tab/i })[0]
    fireEvent.click(button, { detail: 1 })
    expect(button).toHaveTextContent("Confirm Delete")
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })

  it("clicking delete on a tab calls saveTabConfig without that tab", async () => {
    render(() => <TabSettings />)
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    confirmClick(deleteButtons[0]) // delete Combat
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
    render(() => <TabSettings />)
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
    render(() => <TabSettings />)
    const deleteButtons = screen.getAllByRole("button", { name: /delete tab/i })
    expect(deleteButtons.length).toBe(2)
    deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it("delete button is disabled when only one tab remains", () => {
    currentConfig = {
      tabs: [{ id: "tab-combat", label: "Combat", modules: ["actions" as const] }],
    }
    render(() => <TabSettings />)
    const deleteButton = screen.getByRole("button", { name: /delete tab/i })
    expect(deleteButton).toBeDisabled()
  })

  it("clicking the disabled delete button on the last tab does not call saveTabConfig", () => {
    currentConfig = {
      tabs: [{ id: "tab-combat", label: "Combat", modules: [] }],
    }
    render(() => <TabSettings />)
    const deleteButton = screen.getByRole("button", { name: /delete tab/i })
    expect(deleteButton).toBeDisabled()
    fireEvent.click(deleteButton)
    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })
})

describe("TabSettings page — reordering", () => {
  const combat = { id: "tab-combat", label: "Combat", modules: ["actions", "skills"] }
  const spells = { id: "tab-spells", label: "Spells", modules: ["spells"] }

  it("saves the tabs in their new order when one is dropped on another", () => {
    render(() => <TabSettings />)

    drop("tab-spells", "tab-combat")

    expect(mockSaveTabConfig).toHaveBeenCalledExactlyOnceWith({ tabs: [spells, combat] })
  })

  it.each([
    ["released over nothing", null],
    ["dropped back on itself", "tab-spells"],
    ["dropped on something that is not a tab", "not-a-tab"],
  ])("saves nothing when a tab is %s", (_label, ontoId) => {
    render(() => <TabSettings />)

    drop("tab-spells", ontoId)

    expect(mockSaveTabConfig).not.toHaveBeenCalled()
  })

  describe("modules within a tab", () => {
    function renderWithCombatExpanded() {
      render(() => <TabSettings />)
      if (!screen.queryByTestId("remove-module-actions")) fireEvent.click(screen.getByTestId("tab-toggle-tab-combat"))
      expect(screen.getByTestId("remove-module-actions")).toBeInTheDocument()
    }

    it("saves that tab's modules in their new order, leaving other tabs alone", () => {
      renderWithCombatExpanded()

      drop("skills", "actions")

      expect(mockSaveTabConfig).toHaveBeenCalledExactlyOnceWith({
        tabs: [{ ...combat, modules: ["skills", "actions"] }, spells],
      })
    })

    it.each([
      ["released over nothing", null],
      ["dropped back on itself", "skills"],
      ["dropped on a module of another tab", "spells"],
    ])("saves nothing when a module is %s", (_label, ontoId) => {
      renderWithCombatExpanded()

      drop("skills", ontoId)

      expect(mockSaveTabConfig).not.toHaveBeenCalled()
    })

    it("collapses and expands a tab from its toggle", () => {
      renderWithCombatExpanded()
      const toggle = () => screen.getByTestId("tab-toggle-tab-combat")
      expect(toggle()).toHaveAccessibleName("Collapse tab")

      fireEvent.click(toggle())
      expect(toggle()).toHaveAccessibleName("Expand tab")

      fireEvent.click(toggle())
      expect(toggle()).toHaveAccessibleName("Collapse tab")
    })
  })
})

describe("TabSettings page — leaving and cancelling", () => {
  it("goes back to the previous page from the Back button", () => {
    render(() => <TabSettings />)

    fireEvent.click(screen.getByTestId("back-button"))

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith(-1)
  })

  it("cancelling Add Tab saves nothing and forgets what was typed", () => {
    render(() => <TabSettings />)
    fireEvent.click(screen.getByTestId("add-tab-button"))
    fireEvent.input(screen.getByTestId("new-tab-name-input"), { target: { value: "Loot" } })

    fireEvent.click(screen.getByTestId("add-tab-cancel"))

    expect(mockSaveTabConfig).not.toHaveBeenCalled()
    expect(screen.queryByTestId("new-tab-name-input")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("add-tab-button"))
    expect(screen.getByTestId("new-tab-name-input")).toHaveValue("")
  })

  it("cancelling a rename saves nothing and restores the tab's name", () => {
    render(() => <TabSettings />)
    fireEvent.click(screen.getByTestId("tab-rename-tab-combat"))
    fireEvent.input(screen.getByTestId("tab-rename-input-tab-combat"), { target: { value: "Fighting" } })

    fireEvent.click(screen.getByTestId("tab-rename-cancel-tab-combat"))

    expect(mockSaveTabConfig).not.toHaveBeenCalled()
    expect(screen.getByText("Combat")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("tab-rename-tab-combat"))
    expect(screen.getByTestId("tab-rename-input-tab-combat")).toHaveValue("Combat")
  })
})

describe("TabSettings page — accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(() => <TabSettings />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

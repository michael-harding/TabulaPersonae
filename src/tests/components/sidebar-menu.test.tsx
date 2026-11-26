import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import { SidebarMenu } from "@/components/sidebar-menu"
import { DRAWER_TOGGLE } from "@/components/ui/drawer"
import { useAuth } from "@/lib/auth-context"
import { hasUnsyncedChanges } from "@/lib/firebase-storage"
import { createDefaultCharacter } from "@/lib/character-types"
import type { Character } from "@/lib/character-types"
import { setTheme } from "@/lib/theme"

import { cleanup, render, screen, waitFor, within, cleanupPortals, finishDrawerClosing, finishModalClosing, fireEvent } from "../test-utils"
import { createMockAuth, createTestUser } from "../mocks/auth"

const mockUseAuth = vi.mocked(useAuth)
const mockHasUnsyncedChanges = vi.mocked(hasUnsyncedChanges)

// A real signal behind the mocked theme, so a test can change the theme while the menu is open.
const themeControl = vi.hoisted(() => ({ set: (() => {}) as (theme: "light" | "dark" | "system") => void }))

vi.mock("@/lib/theme", async () => {
  const { createSignal } = await import("solid-js")
  const [theme, setThemeSignal] = createSignal<"light" | "dark" | "system">("system")
  themeControl.set = setThemeSignal
  return { theme, setTheme: vi.fn() }
})

// One toast mock for the whole file, so a test can assert on what the menu told the user.
const toast = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/lib/firebase-storage", () => ({
  hasUnsyncedChanges: vi.fn(),
}))

vi.mock("@/lib/pdf-parser", () => ({
  parsePdfCharacterSheet: vi.fn(),
  mergeWithDefault: vi.fn(),
}))

const char1: Character = { ...createDefaultCharacter(), id: "id-1", name: "Gandalf" }
const char2: Character = { ...createDefaultCharacter(), id: "id-2", name: "Aragorn" }

const defaultProps = {
  characters: [char1, char2],
  onImport: vi.fn<(characters: Character[]) => Promise<boolean>>(),
}

async function openMenu(extraProps: Partial<typeof defaultProps & { currentCharacter?: Character; onUpdateCharacter?: (c: Character) => void }> = {}) {
  const user = userEvent.setup()
  render(() => <SidebarMenu {...defaultProps} {...extraProps} />)
  await user.click(screen.getByRole("button", { name: "Open menu" }))
  return user
}

/**
 * Chooses a sidebar button that opens a modal. The modal waits for the sidebar to finish closing,
 * which jsdom never does on its own (see finishDrawerClosing).
 */
async function chooseFromSidebar(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("button", { name }))
  finishDrawerClosing(screen.getByTestId("sidebar-menu"))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(createMockAuth({ user: () => createTestUser({ email: "user@test.com" }) }))
  mockHasUnsyncedChanges.mockResolvedValue(false)
  defaultProps.onImport.mockResolvedValue(true)
  themeControl.set("system")
  cleanup()
  cleanupPortals()
})

afterEach(() => {
  cleanup()
  cleanupPortals()
})

describe("SidebarMenu export label", () => {
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

describe("SidebarMenu theme icon", () => {
  it.each(["light", "dark", "system"] as const)("shows the matching icon for the %s theme", async (theme) => {
    themeControl.set(theme)
    await openMenu()
    await waitFor(() => expect(screen.getByTestId(`theme-icon-${theme}`)).toBeInTheDocument())
  })

  it("follows a theme change while the menu is open", async () => {
    await openMenu()
    await waitFor(() => expect(screen.getByTestId("theme-icon-system")).toBeInTheDocument())
    themeControl.set("dark")
    expect(screen.getByTestId("theme-icon-dark")).toBeInTheDocument()
    expect(screen.queryByTestId("theme-icon-system")).not.toBeInTheDocument()
  })
})

describe("SidebarMenu import modal", () => {
  it("opens the import modal when Import Character is clicked", async () => {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())
    expect(screen.getByText("Import Characters")).toBeInTheDocument()
  })

  it("import modal contains JSON and PDF file options", async () => {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    await waitFor(() => screen.getByRole("dialog"))
    expect(screen.getByText(/Choose JSON File/i)).toBeInTheDocument()
    expect(screen.getByText(/Choose PDF File/i)).toBeInTheDocument()
  })
})

describe("SidebarMenu export download", () => {
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

describe("SidebarMenu navigation", () => {
  it("links to All Characters and Tab Settings", async () => {
    await openMenu()
    const nav = within(await screen.findByRole("navigation", { name: "Main" }))
    expect(nav.getByRole("link", { name: "All Characters" })).toHaveAttribute("href", "/")
    expect(nav.getByRole("link", { name: "Tab Settings" })).toHaveAttribute("href", "/settings/tabs")
  })

  it.each(["All Characters", "Tab Settings"])("closes the sidebar when %s is followed", async (name) => {
    const user = await openMenu()
    await user.click(await screen.findByRole("link", { name }))
    await waitFor(() => expect(screen.getByTestId("sidebar-menu")).not.toHaveAttribute("data-expanded"))
  })
})

describe("SidebarMenu import reconciliation", () => {
  // armorClass: 15 doesn't match a default character's calculated AC, so a successful
  // reconcile flips useCalculatedArmorClass to false — a clear signal reconciliation ran,
  // as opposed to the raw imported data being passed straight through.
  async function openImportModal() {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    await waitFor(() => screen.getByRole("dialog"))
    return user
  }

  it("reconciles a single-character JSON import before calling onImport", async () => {
    const user = await openImportModal()
    const raw = { ...createDefaultCharacter(), id: "c1", armorClass: 15 }
    const file = new File([JSON.stringify(raw)], "char.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    const [imported] = defaultProps.onImport.mock.calls[0][0]
    expect(imported.useCalculatedArmorClass).toBe(false)
    expect(imported.armorClass).toBe(15)
  })

  it("migrates before reconciling, so a legacy spellcasting ability is synthesized as a Feature in time for spell-DC reconciliation to see it", async () => {
    const user = await openImportModal()
    // With migration applied first, the synthesized "Spellcasting" Feature makes intelligence the
    // effective ability (mod 0), so a stored spellSaveDC of 10 (8 + prof 2 + mod 0) matches the
    // calculated value and correctly infers useCalculatedSpellSaveDC: true. Reconciling first (the
    // bug) would compute spellSaveDC against no ability at all (the "no spellcasting" default of 8),
    // never matching the stored 10, and wrongly leave it flagged custom.
    const raw = {
      ...createDefaultCharacter(),
      id: "c1",
      classFeatures: [],
      spellcastingAbility: "intelligence",
      spellSaveDC: 10,
      spellAttackBonus: 2,
      spellModifier: 0,
    }
    // Saved before the calculated-value flags: a legacy character
    delete raw.useCalculatedArmorClass
    const file = new File([JSON.stringify(raw)], "char.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    const [imported] = defaultProps.onImport.mock.calls[0][0]
    expect(imported.classFeatures?.some((f) => f.name === "Spellcasting")).toBe(true)
    expect(imported.useCalculatedSpellSaveDC).toBe(true)
  })

  it("reconciles each character in a multi-character JSON import before calling onImport", async () => {
    const user = await openImportModal()
    const raw = [
      { ...createDefaultCharacter(), id: "c1", armorClass: 15 },
      { ...createDefaultCharacter(), id: "c2", armorClass: 15 },
    ]
    const file = new File([JSON.stringify(raw)], "chars.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    const imported = defaultProps.onImport.mock.calls[0][0]
    expect(imported).toHaveLength(2)
    expect(imported[0].useCalculatedArmorClass).toBe(false)
    expect(imported[1].useCalculatedArmorClass).toBe(false)
  })

  it("drops characters with a null name from a multi-character JSON import", async () => {
    const user = await openImportModal()
    const raw = [
      { ...createDefaultCharacter(), id: "c1" },
      { ...createDefaultCharacter(), id: "c2", name: null },
    ]
    const file = new File([JSON.stringify(raw)], "chars.json", { type: "application/json" })
    const input = screen.getByLabelText(/Choose JSON File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    const imported = defaultProps.onImport.mock.calls[0][0]
    expect(imported.map((c: Character) => c.id)).toEqual(["c1"])
  })

  it("reconciles a PDF import before calling onImport", async () => {
    const { parsePdfCharacterSheet, mergeWithDefault } = await import("@/lib/pdf-parser")
    vi.mocked(parsePdfCharacterSheet).mockResolvedValueOnce({})
    vi.mocked(mergeWithDefault).mockReturnValueOnce({ ...createDefaultCharacter(), armorClass: 15 })

    const user = await openImportModal()
    const file = new File(["x"], "sheet.pdf", { type: "application/pdf" })
    const input = screen.getByLabelText(/Choose PDF File/i)
    await user.upload(input, file)
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    const [imported] = defaultProps.onImport.mock.calls[0][0]
    expect(imported.useCalculatedArmorClass).toBe(false)
    expect(imported.armorClass).toBe(15)
  })
})

describe("SidebarMenu export result", () => {
  // jsdom cannot download, so these capture what the menu hands the browser: the Blob given to
  // createObjectURL and the filename on the link it clicks.
  let blobs: Blob[] = []
  let filenames: string[] = []

  const readBlob = (blob: Blob) => new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
  const exportedJson = async () => JSON.parse(await readBlob(blobs[0]))

  beforeEach(() => {
    blobs = []
    filenames = []
    globalThis.URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      if (blob instanceof Blob) blobs.push(blob)
      return "blob:fake"
    })
    globalThis.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      filenames.push(this.download)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exports the open character alone, in a file named after it, and says so", async () => {
    const user = await openMenu({ currentCharacter: char1 })
    await user.click(await screen.findByText("Export Gandalf"))

    expect(filenames).toHaveLength(1)
    expect(filenames[0]).toMatch(/^Gandalf-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/)
    expect(await exportedJson()).toMatchObject({ id: "id-1", name: "Gandalf" })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake")
    expect(toast).toHaveBeenCalledWith({ title: "Export Successful", description: "Exported Gandalf successfully!" })
  })

  it("exports every character when none is open, and says how many", async () => {
    const user = await openMenu()
    await user.click(await screen.findByText("Export All Characters"))

    expect(filenames[0]).toMatch(/^all-characters-.*\.json$/)
    expect((await exportedJson()).map((c: Character) => c.name)).toEqual(["Gandalf", "Aragorn"])
    expect(toast).toHaveBeenCalledWith({ title: "Export Successful", description: "Exported 2 characters successfully!" })
  })

  it("refreshes a stale calculated field in the exported file", async () => {
    // Stored AC of 99 is stale: the default character's calculated AC is 10 and the toggle says calculated
    const stale: Character = { ...char1, armorClass: 99, useCalculatedArmorClass: true }
    const user = await openMenu({ currentCharacter: stale })
    await user.click(await screen.findByText("Export Gandalf"))

    expect((await exportedJson()).armorClass).toBe(10)
  })

  it("reports the failure, and logs it, when the file cannot be produced", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("blob URLs are blocked")
    globalThis.URL.createObjectURL = vi.fn(() => { throw failure })
    const user = await openMenu()
    await user.click(await screen.findByText("Export All Characters"))

    expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Export Failed", description: "Failed to export", variant: "destructive" })
    expect(consoleError).toHaveBeenCalledWith("Export error:", failure)
  })
})

describe("SidebarMenu import failures", () => {
  async function importJsonText(text: string) {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    await user.upload(await screen.findByLabelText(/Choose JSON File/i), new File([text], "import.json", { type: "application/json" }))
  }

  it.each([
    { label: "a file that is not JSON", text: "{not json", description: "Failed to parse character file" },
    { label: "an object that is not a character", text: JSON.stringify({ name: "No id" }), description: "Invalid character file format" },
    { label: "a bare value", text: "42", description: "Invalid character file format" },
    { label: "a list with no valid character in it", text: JSON.stringify([{ name: "No id" }, null, 7]), description: "No valid characters found in file" },
    { label: "an empty list", text: "[]", description: "No valid characters found in file" },
  ])("rejects $label, tells the user why, and imports nothing", async ({ text, description }) => {
    await importJsonText(text)

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Import Failed", description, variant: "destructive" }))
    expect(defaultProps.onImport).not.toHaveBeenCalled()
  })

  it("confirms a successful single import by name", async () => {
    await importJsonText(JSON.stringify({ ...createDefaultCharacter(), id: "c1", name: "Frodo" }))

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Import Successful", description: "Imported Frodo successfully!" }))
  })

  it("gives a character whose name is taken an ordinal, and confirms it under that name", async () => {
    await importJsonText(JSON.stringify({ ...createDefaultCharacter(), id: "c1", name: "Gandalf" }))

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Import Successful", description: "Imported Gandalf the Second successfully!" }))
    expect(defaultProps.onImport.mock.calls[0][0].map((c) => c.name)).toEqual(["Gandalf the Second"])
  })

  it("tells apart taken names in a multi-character import, from the list and from each other", async () => {
    await importJsonText(JSON.stringify([
      { ...createDefaultCharacter(), id: "c1", name: "Aragorn" },
      { ...createDefaultCharacter(), id: "c2", name: "Frodo" },
      { ...createDefaultCharacter(), id: "c3", name: "Frodo" },
    ]))

    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    expect(defaultProps.onImport.mock.calls[0][0].map((c) => c.name)).toEqual(["Aragorn the Second", "Frodo", "Frodo the Second"])
  })

  it("goes by the open character's current name rather than the one in the list", async () => {
    const user = await openMenu({ currentCharacter: { ...char1, name: "Gandalf the White" } })
    await chooseFromSidebar(user, "Import Character")
    await user.upload(await screen.findByLabelText(/Choose JSON File/i), new File([JSON.stringify([
      { ...createDefaultCharacter(), id: "c1", name: "Gandalf" },
      { ...createDefaultCharacter(), id: "c2", name: "Gandalf the White" },
    ])], "import.json", { type: "application/json" }))

    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalled())
    expect(defaultProps.onImport.mock.calls[0][0].map((c) => c.name)).toEqual(["Gandalf", "Gandalf the White the Second"])
  })

  it("gives a PDF character whose name is taken an ordinal, and confirms it under that name", async () => {
    const { parsePdfCharacterSheet, mergeWithDefault } = await import("@/lib/pdf-parser")
    vi.mocked(parsePdfCharacterSheet).mockResolvedValueOnce({})
    vi.mocked(mergeWithDefault).mockReturnValueOnce({ ...createDefaultCharacter(), name: "Aragorn" })
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    await user.upload(await screen.findByLabelText(/Choose PDF File/i), new File(["x"], "sheet.pdf", { type: "application/pdf" }))

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "PDF Import Successful", description: "Imported Aragorn the Second from PDF!" }))
  })

  it("confirms a successful multi-character import with the number actually imported", async () => {
    await importJsonText(JSON.stringify([
      { ...createDefaultCharacter(), id: "c1", name: "Frodo" },
      { ...createDefaultCharacter(), id: "c2", name: "Sam" },
      { name: "No id" },
    ]))

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Import Successful", description: "Imported 2 characters successfully!" }))
  })

  it("reports a PDF that cannot be parsed, logs the error, and lets the user try again", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("not a character sheet")
    const { parsePdfCharacterSheet } = await import("@/lib/pdf-parser")
    vi.mocked(parsePdfCharacterSheet).mockRejectedValueOnce(failure)
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")

    await user.upload(await screen.findByLabelText(/Choose PDF File/i), new File(["x"], "sheet.pdf", { type: "application/pdf" }))

    await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith({
      title: "PDF Import Failed",
      description: "Could not parse the PDF. Make sure it's a D&D Beyond character sheet.",
      variant: "destructive",
    }))
    expect(consoleError).toHaveBeenCalledWith("PDF import error:", failure)
    expect(defaultProps.onImport).not.toHaveBeenCalled()
    expect(screen.getByText(/Choose PDF File/i)).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

describe("SidebarMenu import confirmation", () => {
  const frodo = { ...createDefaultCharacter(), id: "c1", name: "Frodo" }
  const jsonImported = { title: "Import Successful", description: "Imported Frodo successfully!" }
  const pdfImported = { title: "PDF Import Successful", description: "Imported Frodo from PDF!" }

  // The save's result, settled by the test: offline, a signed-in user's save stays pending.
  function pendingSave() {
    let settle!: (saved: boolean) => void
    defaultProps.onImport.mockReturnValue(new Promise<boolean>((resolve) => { settle = resolve }))
    return { settle: (saved: boolean) => settle(saved) }
  }

  async function importFile(kind: "json" | "pdf") {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    if (kind === "json") {
      await user.upload(await screen.findByLabelText(/Choose JSON File/i), new File([JSON.stringify(frodo)], "import.json", { type: "application/json" }))
    } else {
      const { parsePdfCharacterSheet, mergeWithDefault } = await import("@/lib/pdf-parser")
      vi.mocked(parsePdfCharacterSheet).mockResolvedValueOnce({})
      vi.mocked(mergeWithDefault).mockReturnValueOnce(frodo)
      await user.upload(await screen.findByLabelText(/Choose PDF File/i), new File(["x"], "sheet.pdf", { type: "application/pdf" }))
    }
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalledOnce())
  }

  // Kobalte keeps a closed dialog in the DOM in jsdom; it is open only while data-expanded is set
  const importDialogClosed = () => waitFor(() => expect(screen.getByTestId("import-dialog")).not.toHaveAttribute("data-expanded"))

  describe.each([
    { kind: "json", confirmation: jsonImported },
    { kind: "pdf", confirmation: pdfImported },
  ] as const)("of a $kind file", ({ kind, confirmation }) => {
    it("closes the dialog without waiting for the save, and confirms only once it has succeeded", async () => {
      const save = pendingSave()

      await importFile(kind)

      await importDialogClosed()
      expect(toast).not.toHaveBeenCalled()

      save.settle(true)

      await waitFor(() => expect(toast).toHaveBeenCalledExactlyOnceWith(confirmation))
    })

    // The handler given as onImport tells the user about the failure itself (saveImportedCharacters)
    it("does not call the import successful, or unparseable, when it could not be saved", async () => {
      const save = pendingSave()
      await importFile(kind)

      save.settle(false)

      await importDialogClosed()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(toast).not.toHaveBeenCalled()
    })
  })
})

describe("SidebarMenu theme toggle", () => {
  it.each([
    { from: "dark", to: "light" },
    { from: "light", to: "dark" },
    { from: "system", to: "dark" },
  ] as const)("switches from $from to $to", async ({ from, to }) => {
    themeControl.set(from)
    const user = await openMenu()
    await user.click(await screen.findByRole("button", { name: "Toggle Theme" }))

    expect(setTheme).toHaveBeenCalledExactlyOnceWith(to)
  })
})

describe("SidebarMenu account", () => {
  // window.location.reload is non-configurable in jsdom by default — redefine once.
  const reload = vi.fn()
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload },
    configurable: true,
    writable: true,
  })

  beforeEach(() => {
    reload.mockReset()
    localStorage.clear()
  })

  function signedInWith(logout: () => Promise<void>) {
    mockUseAuth.mockReturnValue(createMockAuth({ user: () => createTestUser({ email: "user@test.com" }), logout }))
  }

  async function chooseSignOut() {
    const user = await openMenu()
    await chooseFromSidebar(user, "Sign Out")
    return user
  }

  it("names the signed-in account as the menu's first entry, and offers Sign Out instead of Back to Login", async () => {
    await openMenu()

    const menu = await screen.findByRole("dialog", { name: "Menu" })
    const account = within(menu).getByTestId("sidebar-menu-account")
    expect(account).toHaveTextContent("user@test.com")
    expect(account).toHaveAttribute("title", "user@test.com")
    // The first entry, ahead of every action
    expect(account.compareDocumentPosition(within(menu).getAllByRole("link")[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(await screen.findByRole("button", { name: "Sign Out" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Back to Login" })).not.toBeInTheDocument()
  })

  it("says Not Logged In for characters kept only on this device", async () => {
    mockUseAuth.mockReturnValue(createMockAuth({ user: () => null, skipAuth: () => true }))
    await openMenu()

    expect(within(await screen.findByRole("dialog", { name: "Menu" })).getByTestId("sidebar-menu-account")).toHaveTextContent("Not Logged In")
    expect(await screen.findByRole("button", { name: "Back to Login" })).toBeInTheDocument()
  })

  it("keeps the account out of the header itself, on every screen size", () => {
    render(() => <SidebarMenu {...defaultProps} />)
    expect(screen.queryByText("user@test.com")).not.toBeInTheDocument()
    expect(screen.queryByText("Not Logged In")).not.toBeInTheDocument()
  })

  it("shows the account as information, not as something to choose", async () => {
    await openMenu()

    const account = within(await screen.findByRole("dialog", { name: "Menu" })).getByTestId("sidebar-menu-account")
    expect(account.tagName).toBe("P")
    expect(screen.queryByRole("button", { name: /user@test\.com/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /user@test\.com/ })).not.toBeInTheDocument()
  })

  it("signs out and reloads straight away when everything is synced", async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    signedInWith(logout)

    await chooseSignOut()

    await waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByTestId("sign-out-dialog")).not.toBeInTheDocument()
  })

  it("drops Sign Out when the menu is reopened before it has finished closing, so a later close does not sign out", async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    signedInWith(logout)
    const user = await openMenu()

    await user.click(await screen.findByRole("button", { name: "Sign Out" }))
    // Reopened while it is still closing: its exit never finishes, so the sign-out is not started.
    // Clicked directly, since the closing drawer still holds the page's pointer-events: none.
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    expect(await screen.findByRole("dialog", { name: "Menu" })).toBeInTheDocument()

    // Closed again, unrelated to signing out
    await user.keyboard("{Escape}")
    finishDrawerClosing(screen.getByTestId("sidebar-menu"))
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument())
    // Past the microtask a queued action would run in
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Sign-out's first step is checking for unsynced changes
    expect(mockHasUnsyncedChanges).not.toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    expect(screen.queryByTestId("sign-out-dialog")).not.toBeInTheDocument()
  })

  describe("with changes the account has not received", () => {
    const logout = vi.fn()

    beforeEach(() => {
      logout.mockReset().mockResolvedValue(undefined)
      signedInWith(logout)
      mockHasUnsyncedChanges.mockResolvedValue(true)
    })

    it("warns that they will be lost instead of signing out", async () => {
      await chooseSignOut()

      const dialog = await screen.findByRole("dialog", { name: "Sign out and lose unsynced changes?" })
      expect(dialog).toHaveTextContent("Signing out removes all of your data from this device, so those changes will be lost.")
      expect(logout).not.toHaveBeenCalled()
      expect(reload).not.toHaveBeenCalled()
    })

    it("stays signed in when the user cancels", async () => {
      const user = await chooseSignOut()

      await user.click(await screen.findByTestId("sign-out-cancel"))

      // Kobalte keeps a closed dialog in the DOM in jsdom; it is open only while data-expanded is set
      await waitFor(() => expect(screen.getByTestId("sign-out-dialog")).not.toHaveAttribute("data-expanded"))
      expect(logout).not.toHaveBeenCalled()
      expect(reload).not.toHaveBeenCalled()
    })

    it("signs out and reloads when the user chooses to discard them", async () => {
      const user = await chooseSignOut()

      await user.click(await screen.findByTestId("sign-out-discard"))

      await waitFor(() => expect(reload).toHaveBeenCalledOnce())
      expect(logout).toHaveBeenCalledOnce()
    })

    it("has no accessibility violations", async () => {
      await chooseSignOut()

      // The dialog itself: jsdom never finishes the menu's closing animation, so the closed
      // menu is still in the document, where a real browser has removed it.
      const results = await axe(await screen.findByTestId("sign-out-dialog"))
      expect(results.violations).toHaveLength(0)
    })
  })

  it("also warns when characters created before signing in are still waiting to be uploaded", async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    signedInWith(logout)
    localStorage.setItem("dnd-characters", JSON.stringify([char1]))

    await chooseSignOut()

    expect(await screen.findByRole("dialog", { name: "Sign out and lose unsynced changes?" })).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  // Signing out removes it along with everything else, and the account never received it.
  it("also warns when a tab layout kept on the device has not been uploaded", async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    signedInWith(logout)
    localStorage.setItem("dnd-tab-config", "{}")

    await chooseSignOut()

    expect(await screen.findByRole("dialog", { name: "Sign out and lose unsynced changes?" })).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  describe("when the device's data cannot be removed", () => {
    const logout = vi.fn()

    beforeEach(() => {
      logout.mockReset().mockRejectedValue(new Error("another tab holds the cache"))
      signedInWith(logout)
    })

    it("says the user is still signed in and what to do, without reloading on its own", async () => {
      await chooseSignOut()

      const dialog = await screen.findByRole("dialog", { name: "Sign-out did not finish" })
      expect(dialog).toHaveTextContent("Your offline data could not be removed from this device, so you are still signed in.")
      expect(dialog).toHaveTextContent("Close any other TabulaPersonae tabs, reload this page, and sign out again.")
      expect(reload).not.toHaveBeenCalled()
    })

    it("reloads from the dialog's button", async () => {
      const user = await chooseSignOut()

      await user.click(await screen.findByTestId("sign-out-reload"))

      expect(reload).toHaveBeenCalledOnce()
    })

    // Firestore was shut down before its data could not be removed, so nothing can be read or
    // saved until the page reloads: the dialog must not leave the user on a page that looks usable.
    it("reloads when the dialog is dismissed without its button", async () => {
      const user = await chooseSignOut()
      await screen.findByRole("dialog", { name: "Sign-out did not finish" })

      await user.keyboard("{Escape}")

      await waitFor(() => expect(reload).toHaveBeenCalledOnce())
    })

    it("reports the same failure after the user chose to discard unsynced changes", async () => {
      mockHasUnsyncedChanges.mockResolvedValue(true)
      const user = await chooseSignOut()

      await user.click(await screen.findByTestId("sign-out-discard"))

      expect(await screen.findByRole("dialog", { name: "Sign-out did not finish" })).toBeInTheDocument()
      expect(reload).not.toHaveBeenCalled()
    })

    it("has no accessibility violations", async () => {
      await chooseSignOut()

      // The dialog itself: jsdom never finishes the menu's closing animation, so the closed
      // menu is still in the document, where a real browser has removed it.
      const results = await axe(await screen.findByTestId("sign-out-dialog"))
      expect(results.violations).toHaveLength(0)
    })
  })

  it("offers Back to Login instead of Sign Out without an account, and leaves local-only mode through it", async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue(createMockAuth({ skipAuth: () => true, logout }))
    localStorage.setItem("dnd-skip-auth", "true")
    const user = await openMenu()

    expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("button", { name: "Back to Login" }))

    await waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(localStorage.getItem("dnd-skip-auth")).toBeNull()
    expect(logout).toHaveBeenCalledOnce()
  })

  // e.g. Firebase failed to initialize, so there is no session to sign out of. A guest has no
  // account data on the device for a failed sign-out to leave behind.
  it("still leaves local-only mode through Back to Login when signing out fails", async () => {
    const logout = vi.fn().mockRejectedValue(new Error("Firebase is unavailable"))
    mockUseAuth.mockReturnValue(createMockAuth({ skipAuth: () => true, logout }))
    localStorage.setItem("dnd-skip-auth", "true")
    const user = await openMenu()

    await user.click(await screen.findByRole("button", { name: "Back to Login" }))

    await waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(localStorage.getItem("dnd-skip-auth")).toBeNull()
  })
})

describe("SidebarMenu accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(() => <SidebarMenu {...defaultProps} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe("SidebarMenu drawer", () => {
  it("opens a dialog named Menu from the menu button", async () => {
    await openMenu()
    expect(await screen.findByRole("dialog", { name: "Menu" })).toHaveAttribute("data-expanded")
    // Hidden from assistive tech behind the open dialog, so found by its test hook
    expect(screen.getByTestId("sidebar-menu-trigger")).toHaveAttribute("aria-expanded", "true")
  })

  // Small enough for the slim bar it sits in, with an invisible hit area that makes it a 44px target
  it("is a 32px menu button with a 44px hit area", () => {
    render(() => <SidebarMenu {...defaultProps} />)
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveClass("h-8", "w-8", "after:h-11", "after:w-11")
  })

  // The close button takes the title's place, beside the account
  it("names the dialog Menu for assistive tech only", async () => {
    await openMenu()
    const dialog = await screen.findByRole("dialog", { name: "Menu" })
    expect(within(dialog).getByText("Menu")).toHaveClass("sr-only")
  })

  it("shows the account in the header, beside the close button", async () => {
    await openMenu()
    const dialog = await screen.findByRole("dialog", { name: "Menu" })
    const account = within(dialog).getByTestId("sidebar-menu-account")
    expect(account.parentElement).toHaveClass("pl-16")
  })

  // So the close button, which opens over it, looks the same
  it("styles the menu button as the drawer's close button", () => {
    render(() => <SidebarMenu {...defaultProps} />)
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveClass(...DRAWER_TOGGLE.split(" "))
  })

  it("places the menu button with the classes it is given", () => {
    render(() => <SidebarMenu {...defaultProps} class="fixed left-4 top-3" />)
    const button = screen.getByRole("button", { name: "Open menu" })
    expect(button).toHaveClass("fixed", "left-4", "top-3", "h-8")
    // Its own relative would otherwise win over fixed in the stylesheet
    expect(button).not.toHaveClass("relative")
  })

  it("returns focus to the menu button when closed", async () => {
    const user = await openMenu()
    await screen.findByRole("dialog", { name: "Menu" })
    await user.keyboard("{Escape}")
    finishDrawerClosing(screen.getByTestId("sidebar-menu"))
    await waitFor(() => expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus())
  })

  it("returns focus to the menu button when the Import dialog it opened closes", async () => {
    const user = await openMenu()
    await chooseFromSidebar(user, "Import Character")
    const dialog = await screen.findByRole("dialog", { name: "Import Characters" })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    await user.keyboard("{Escape}")
    finishModalClosing(dialog)

    await waitFor(() => expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus())
  })

  it("has no accessibility violations while open", async () => {
    await openMenu({ currentCharacter: char1, onUpdateCharacter: vi.fn() })
    const results = await axe(await screen.findByRole("dialog", { name: "Menu" }))
    expect(results.violations).toHaveLength(0)
  })
})

describe("SidebarMenu character settings", () => {
  const onUpdateCharacter = vi.fn()

  it("shows the open character's sheet settings and sharing", async () => {
    await openMenu({ currentCharacter: char1, onUpdateCharacter })
    const menu = within(await screen.findByRole("dialog", { name: "Menu" }))
    expect(menu.getByRole("region", { name: "Sheet Settings" })).toBeInTheDocument()
    expect(menu.getByRole("region", { name: "Sheet Sharing" })).toBeInTheDocument()
  })

  it("saves a change through onUpdateCharacter", async () => {
    const user = await openMenu({ currentCharacter: char1, onUpdateCharacter })
    await user.click(await screen.findByRole("button", { name: "Purple theme color" }))
    expect(onUpdateCharacter).toHaveBeenCalledWith(expect.objectContaining({ id: "id-1", sheetColor: "#8b5cf6" }))
  })

  it("shows no settings without an open character", async () => {
    await openMenu()
    await screen.findByRole("dialog", { name: "Menu" })
    expect(screen.queryByRole("region", { name: "Sheet Settings" })).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Sheet Sharing" })).not.toBeInTheDocument()
  })

  it("shows no settings when the character cannot be saved from here", async () => {
    await openMenu({ currentCharacter: char1 })
    await screen.findByRole("dialog", { name: "Menu" })
    expect(screen.queryByRole("region", { name: "Sheet Settings" })).not.toBeInTheDocument()
  })

  it("leaves out sharing without a signed-in user", async () => {
    mockUseAuth.mockReturnValue(createMockAuth({ user: () => null, skipAuth: () => true }))
    await openMenu({ currentCharacter: char1, onUpdateCharacter })
    await screen.findByRole("dialog", { name: "Menu" })
    expect(screen.getByRole("region", { name: "Sheet Settings" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Sheet Sharing" })).not.toBeInTheDocument()
  })
})

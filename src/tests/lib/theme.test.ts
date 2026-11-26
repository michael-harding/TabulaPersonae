// theme.ts reads localStorage and starts its effect when the module is first evaluated, so each
// test sets up the browser state first and then loads a fresh copy of the module.
async function loadTheme(options: { stored?: string; prefersDark?: boolean } = {}) {
  if (options.stored != null) localStorage.setItem("theme", options.stored)
  // jsdom has no matchMedia; theme.ts only reads `matches` for the dark-scheme query
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: options.prefersDark ?? false, media: query })))
  // Solid warns that an effect created at module level is never disposed. That is how theme.ts is
  // meant to work (one effect for the life of the page), so the warning is expected here.
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.resetModules()
  return import("@/lib/theme")
}

const isDark = () => document.documentElement.classList.contains("dark")

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("theme", () => {
  it("defaults to the system theme when nothing is stored", async () => {
    const { theme } = await loadTheme()
    expect(theme()).toBe("system")
  })

  it.each(["light", "dark", "system"] as const)("starts from the stored %s theme", async (stored) => {
    const { theme } = await loadTheme({ stored })
    expect(theme()).toBe(stored)
  })

  it.each([
    { stored: "dark", prefersDark: false, dark: true },
    { stored: "light", prefersDark: true, dark: false },
    { stored: "system", prefersDark: true, dark: true },
    { stored: "system", prefersDark: false, dark: false },
  ])("applies dark=$dark for the $stored theme when the OS prefers dark=$prefersDark", async ({ stored, prefersDark, dark }) => {
    await loadTheme({ stored, prefersDark })
    expect(isDark()).toBe(dark)
  })

  it("asks the OS for its colour scheme preference", async () => {
    await loadTheme()
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)")
  })

  it("switches the dark class on and off as the theme changes", async () => {
    const { setTheme } = await loadTheme({ stored: "light" })
    expect(isDark()).toBe(false)

    setTheme("dark")
    expect(isDark()).toBe(true)

    setTheme("light")
    expect(isDark()).toBe(false)
  })

  // A sheet background picks light or dark for the open sheet (src/hooks/use-sheet-background.ts)
  it.each([
    { stored: "light", tone: "dark", dark: true },
    { stored: "dark", tone: "light", dark: false },
  ] as const)("shows the $tone tone of an open sheet's background over the stored $stored theme", async ({ stored, tone, dark }) => {
    const { setSheetTone } = await loadTheme({ stored })
    setSheetTone(tone)
    expect(isDark()).toBe(dark)
  })

  it("goes back to the player's theme once the sheet's tone is cleared, without storing the tone", async () => {
    const { setSheetTone, theme } = await loadTheme({ stored: "light" })
    setSheetTone("dark")
    expect(localStorage.getItem("theme")).toBe("light")
    setSheetTone(null)
    expect(isDark()).toBe(false)
    expect(theme()).toBe("light")
  })

  it("keeps the sheet's tone while the player changes theme, applying the change once it clears", async () => {
    const { setSheetTone, setTheme } = await loadTheme({ stored: "light" })
    setSheetTone("light")
    setTheme("dark")
    expect(isDark()).toBe(false)
    expect(localStorage.getItem("theme")).toBe("dark")
    setSheetTone(null)
    expect(isDark()).toBe(true)
  })

  it("stores the theme whenever it changes, so it survives a reload", async () => {
    const { setTheme } = await loadTheme()
    expect(localStorage.getItem("theme")).toBe("system")

    setTheme("dark")
    expect(localStorage.getItem("theme")).toBe("dark")
  })
})

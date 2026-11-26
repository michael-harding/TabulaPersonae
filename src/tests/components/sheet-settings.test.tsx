import { axe } from "vitest-axe"

import { SharingSection, SheetSettingsSection } from "@/components/sheet-settings"
import { useAuth } from "@/lib/auth-context"
import { createDefaultCharacter, type Character } from "@/lib/character-types"
import { SHEET_BACKGROUND_PRESETS } from "@/lib/sheet-background"
import { SHEET_COLOR_PRESETS } from "@/lib/sheet-color"

import { cleanup, render, screen, fireEvent } from "../test-utils"
import { createMockAuth, createTestUser } from "../mocks/auth"

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const signedIn = () => createMockAuth({ user: () => createTestUser() })
// Characters kept only on this device: skip-auth, without an account
const localOnly = () => createMockAuth({ skipAuth: () => true })

// Both sections, as the sidebar menu shows them
function SheetSettings(props: { character: Character; onUpdate: (c: Character) => void }) {
  return (
    <>
      <SheetSettingsSection character={props.character} onUpdate={props.onUpdate} />
      <SharingSection character={props.character} onUpdate={props.onUpdate} />
    </>
  )
}

const baseCharacter = createDefaultCharacter()
const char2014 = { ...baseCharacter, edition: "2014" as const }
const charWithColor = { ...baseCharacter, sheetColor: "#ef4444" }
const charWithCustomColor = { ...baseCharacter, sheetColor: "#123456" }
const charPublic = { ...baseCharacter, id: "char-abc", isPublic: true }
const charPrivate = { ...baseCharacter, id: "char-abc", isPublic: false }

describe("Sheet settings sections", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(signedIn())
  })

  describe("edition switch", () => {
    it("renders both edition labels", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByText("2014")).toBeInTheDocument()
      expect(screen.getByText("2024")).toBeInTheDocument()
    })

    it("calls onUpdate with edition '2014' when toggled from 2024", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2014" }))
    })

    it("calls onUpdate with edition '2024' when toggled from 2014", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={char2014} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /2014 2024/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ edition: "2024" }))
    })
  })

  describe("preset color swatches", () => {
    it("renders all 6 preset color buttons", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /green theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /purple theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /red theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /blue theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /orange theme color/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /gold theme color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor when a preset is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /purple theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#8b5cf6" }))
    })

    it("calls onUpdate with red hex when red preset is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /red theme color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#ef4444" }))
    })
  })

  describe("which colour is selected", () => {
    it("is exposed on the selected preset alone", () => {
      render(() => <SheetSettings character={charWithColor} onUpdate={vi.fn()} />)
      const pressed = screen.getAllByRole("button", { name: /theme color/i }).filter((button) => button.getAttribute("aria-pressed") === "true")
      expect(pressed).toHaveLength(1)
      expect(pressed[0]).toHaveAccessibleName(/red theme color/i)
    })

    it("is not claimed by any preset without a sheet colour", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      for (const button of screen.getAllByRole("button", { name: /theme color/i })) {
        expect(button).toHaveAttribute("aria-pressed", "false")
      }
    })

    it("is named on the custom input when a custom colour is set", () => {
      render(() => <SheetSettings character={charWithCustomColor} onUpdate={vi.fn()} />)
      expect(screen.getByLabelText(/custom theme color, selected/i)).toBeInTheDocument()
    })

    it("is not named on the custom input for a preset colour", () => {
      render(() => <SheetSettings character={charWithColor} onUpdate={vi.fn()} />)
      expect(screen.getByLabelText("Custom theme color")).toBeInTheDocument()
    })
  })

  describe("custom color picker", () => {
    it("calls onUpdate with the new color when the color input changes", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      const colorInput = screen.getByLabelText(/custom theme color/i)
      fireEvent.input(colorInput, { target: { value: "#abc123" } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: "#abc123" }))
    })
  })

  describe("reset button", () => {
    it("is not shown when no sheetColor is set", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /reset sheet color/i })).not.toBeInTheDocument()
    })

    it("is shown when a preset sheetColor is set", () => {
      render(() => <SheetSettings character={charWithColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("is shown when a custom sheetColor is set", () => {
      render(() => <SheetSettings character={charWithCustomColor} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /reset sheet color/i })).toBeInTheDocument()
    })

    it("calls onUpdate with sheetColor undefined when reset is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={charWithColor} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /reset sheet color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetColor: undefined }))
    })
  })

  // A preset is a pair of shades; its swatch is the one the current theme applies, so picking it
  // never shows one colour and gives the sheet another
  describe("preset swatch colours", () => {
    it.each(SHEET_COLOR_PRESETS)("shows the $name preset's own shade for each theme", (preset) => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      const swatch = screen.getByRole("button", { name: `${preset.name} theme color` }).firstElementChild as HTMLElement
      expect(swatch.style.getPropertyValue("--swatch-light")).toBe(preset.light)
      expect(swatch.style.getPropertyValue("--swatch-dark")).toBe(preset.dark)
      expect(swatch).toHaveClass("bg-[color:var(--swatch-light)]", "dark:bg-[color:var(--swatch-dark)]")
    })

    it("selects a preset stored in another case", () => {
      render(() => <SheetSettings character={{ ...baseCharacter, sheetColor: "#EF4444" }} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: "Red theme color" })).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByLabelText("Custom theme color")).toBeInTheDocument()
    })
  })

  describe("background color", () => {
    const charWithBackground = { ...baseCharacter, sheetBackground: "#f8f1e3" }
    const charWithCustomBackground = { ...baseCharacter, sheetBackground: "#336699" }

    it("offers each preset background, showing its own colour", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      for (const preset of SHEET_BACKGROUND_PRESETS) {
        const swatch = screen.getByRole("button", { name: `${preset.name} background color` }).firstElementChild as HTMLElement
        expect(swatch.style.getPropertyValue("--swatch-light")).toBe(preset.value)
        expect(swatch.style.getPropertyValue("--swatch-dark")).toBe(preset.value)
      }
    })

    it("stores the preset's value when one is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: "Dark brown background color" }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetBackground: "#180f08" }))
    })

    it("stores a picked colour as it is", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={onUpdate} />)
      fireEvent.input(screen.getByLabelText("Custom background color"), { target: { value: "#ff00ff" } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetBackground: "#ff00ff" }))
    })

    it("marks the selected preset alone", () => {
      render(() => <SheetSettings character={charWithBackground} onUpdate={vi.fn()} />)
      const pressed = screen.getAllByRole("button", { name: /background color/i }).filter((b) => b.getAttribute("aria-pressed") === "true")
      expect(pressed).toHaveLength(1)
      expect(pressed[0]).toHaveAccessibleName("Parchment background color")
    })

    it("names the custom input as selected for a custom background", () => {
      render(() => <SheetSettings character={charWithCustomBackground} onUpdate={vi.fn()} />)
      expect(screen.getByLabelText("Custom background color, selected")).toBeInTheDocument()
    })

    it("keeps the background and sheet colour apart", () => {
      render(() => <SheetSettings character={charWithBackground} onUpdate={vi.fn()} />)
      for (const button of screen.getAllByRole("button", { name: /theme color/i })) {
        expect(button).toHaveAttribute("aria-pressed", "false")
      }
      expect(screen.queryByRole("button", { name: /reset sheet color/i })).not.toBeInTheDocument()
    })

    it("offers a reset only once a background is set, which clears it", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /reset background color/i })).not.toBeInTheDocument()
      cleanup()
      render(() => <SheetSettings character={charWithBackground} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("button", { name: /reset background color/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sheetBackground: undefined }))
    })

    it("lets its swatches wrap onto more lines", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByTestId("sheet-background-swatches")).toHaveClass("flex-wrap")
    })

    it("has no accessibility violations with a background set", async () => {
      const { container } = render(() => <SheetSettings character={charWithCustomBackground} onUpdate={vi.fn()} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe("share toggle", () => {
    it("renders a 'Share publicly' label and Off/On switch", () => {
      render(() => <SheetSettings character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.getByText("Share publicly")).toBeInTheDocument()
      expect(screen.getByText("Off")).toBeInTheDocument()
      expect(screen.getByText("On")).toBeInTheDocument()
    })

    it("calls onUpdate with isPublic: true when Off→On toggle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={charPrivate} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /off on/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }))
    })

    it("calls onUpdate with isPublic: false when On→Off toggle is clicked", () => {
      const onUpdate = vi.fn()
      render(() => <SheetSettings character={charPublic} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByRole("checkbox", { name: /off on/i }))
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false }))
    })

    it("shows the share URL input when isPublic is true", () => {
      render(() => <SheetSettings character={charPublic} onUpdate={vi.fn()} />)
      const urlInput = screen.getByLabelText("Share URL")
      expect(urlInput).toBeInTheDocument()
      expect((urlInput as HTMLInputElement).value).toContain("/share/char-abc")
    })

    it("does not show the share URL when isPublic is false", () => {
      render(() => <SheetSettings character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.queryByLabelText("Share URL")).not.toBeInTheDocument()
    })

    it("shows a Copy link button when isPublic is true", () => {
      render(() => <SheetSettings character={charPublic} onUpdate={vi.fn()} />)
      expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument()
    })

    it("does not show the Copy link button when isPublic is false", () => {
      render(() => <SheetSettings character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.queryByRole("button", { name: /copy share link/i })).not.toBeInTheDocument()
    })
  })

  describe("without a signed-in user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(localOnly())
    })

    it("does not offer public sharing", () => {
      render(() => <SheetSettings character={charPrivate} onUpdate={vi.fn()} />)
      expect(screen.queryByText("Sheet Sharing")).not.toBeInTheDocument()
      expect(screen.queryByText("Share publicly")).not.toBeInTheDocument()
      expect(screen.queryByRole("checkbox", { name: /off on/i })).not.toBeInTheDocument()
    })

    it("does not show a share link even for a character marked public", () => {
      render(() => <SheetSettings character={charPublic} onUpdate={vi.fn()} />)
      expect(screen.queryByLabelText("Share URL")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /copy share link/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("img", { name: /qr code/i })).not.toBeInTheDocument()
    })

    it("still offers the other sheet settings", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByRole("checkbox", { name: /2014 2024/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /red theme color/i })).toBeInTheDocument()
    })

    it("has no accessibility violations", async () => {
      const { container } = render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe("headings", () => {
    it("names each section by its heading", () => {
      render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
      expect(screen.getByRole("region", { name: "Sheet Settings" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Sheet Sharing" })).toBeInTheDocument()
    })

    it("leaves out the sharing section, heading and all, without a signed-in user", () => {
      mockUseAuth.mockReturnValue(localOnly())
      const { container } = render(() => <SharingSection character={charPublic} onUpdate={vi.fn()} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  // The sidebar is narrower than the seven swatches in a row
  it("lets the colour swatches wrap onto more lines", () => {
    render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
    expect(screen.getByTestId("sheet-color-swatches")).toHaveClass("flex-wrap")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <SheetSettings character={baseCharacter} onUpdate={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

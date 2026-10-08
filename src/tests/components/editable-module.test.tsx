import { axe } from "vitest-axe"
import { render, screen, fireEvent } from "../test-utils"
import { EditableModule } from "@/components/editable-module"
import { ReadOnlyProvider } from "@/lib/read-only-context"

const icon = <span>icon</span>

function renderView(overrides: Record<string, any> = {}) {
  return render(
    <EditableModule
      icon={icon}
      title="Test Section"
      isEditing={false}
      onEdit={vi.fn()}
      onSave={vi.fn()}
      onSaveKeepEditing={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  )
}

describe("EditableModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("view mode (isEditing=false)", () => {
    it("renders the title", () => {
      renderView()
      expect(screen.getByText("Test Section")).toBeInTheDocument()
    })

    it("renders children", () => {
      render(
        <EditableModule icon={icon} title="S" isEditing={false} onEdit={vi.fn()} onSave={vi.fn()} onSaveKeepEditing={vi.fn()} onCancel={vi.fn()}>
          <span>child content</span>
        </EditableModule>
      )
      expect(screen.getByText("child content")).toBeInTheDocument()
    })

    it("renders only the Edit button", () => {
      renderView()
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument()
    })

    it("calls onEdit when the edit button is clicked", () => {
      const onEdit = vi.fn()
      renderView({ onEdit })
      fireEvent.click(screen.getByRole("button", { name: /edit/i }))
      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it("renders headerExtra when not editing", () => {
      renderView({ headerExtra: <span>extra content</span> })
      expect(screen.getByText("extra content")).toBeInTheDocument()
    })

    it("does not render headerExtra when editing", () => {
      render(
        <EditableModule
          icon={icon}
          title="S"
          isEditing={true}
          onEdit={vi.fn()}
          onSave={vi.fn()}
          onSaveKeepEditing={vi.fn()}
          onCancel={vi.fn()}
          headerExtra={<span>extra content</span>}
        />
      )
      expect(screen.queryByText("extra content")).not.toBeInTheDocument()
    })

  })

  describe("edit mode (isEditing=true)", () => {
    function renderEdit(overrides: Record<string, any> = {}) {
      return render(
        <EditableModule
          icon={icon}
          title="Test Section"
          isEditing={true}
          onEdit={vi.fn()}
          onSave={vi.fn()}
          onSaveKeepEditing={vi.fn()}
          onCancel={vi.fn()}
          {...overrides}
        />
      )
    }

    it("renders Save and Cancel buttons", () => {
      renderEdit()
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("does not render the Edit button", () => {
      renderEdit()
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    })

    it("calls onSave when Save button is clicked", () => {
      const onSave = vi.fn()
      renderEdit({ onSave })
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it("calls onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn()
      renderEdit({ onCancel })
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("applies contentClass to the card content", () => {
      const { container } = renderEdit({ contentClass: "my-custom-class" })
      expect(container.querySelector(".my-custom-class")).toBeInTheDocument()
    })

    it("calls onSaveKeepEditing (not onSave) on Ctrl+S", () => {
      const onSave = vi.fn()
      const onSaveKeepEditing = vi.fn()
      const { container } = renderEdit({ onSave, onSaveKeepEditing })
      fireEvent.keyDown(container.querySelector('[data-sem="card"]')!, { key: "s", ctrlKey: true })
      expect(onSaveKeepEditing).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })

    it("calls onSaveKeepEditing (not onSave) on Cmd+S", () => {
      const onSave = vi.fn()
      const onSaveKeepEditing = vi.fn()
      const { container } = renderEdit({ onSave, onSaveKeepEditing })
      fireEvent.keyDown(container.querySelector('[data-sem="card"]')!, { key: "s", metaKey: true })
      expect(onSaveKeepEditing).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })

    it("calls onSave (not onSaveKeepEditing) on Ctrl+Enter", () => {
      const onSave = vi.fn()
      const onSaveKeepEditing = vi.fn()
      const { container } = renderEdit({ onSave, onSaveKeepEditing })
      fireEvent.keyDown(container.querySelector('[data-sem="card"]')!, { key: "Enter", ctrlKey: true })
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSaveKeepEditing).not.toHaveBeenCalled()
    })

    it("does not save on plain 's' or 'Enter' without a modifier key", () => {
      const onSave = vi.fn()
      const onSaveKeepEditing = vi.fn()
      const { container } = renderEdit({ onSave, onSaveKeepEditing })
      const card = container.querySelector('[data-sem="card"]')!
      fireEvent.keyDown(card, { key: "s" })
      fireEvent.keyDown(card, { key: "Enter" })
      expect(onSave).not.toHaveBeenCalled()
      expect(onSaveKeepEditing).not.toHaveBeenCalled()
    })

    it("ignores Ctrl+S / Ctrl+Enter when not editing", () => {
      const onSave = vi.fn()
      const onSaveKeepEditing = vi.fn()
      const { container } = renderView({ onSave, onSaveKeepEditing })
      const card = container.querySelector('[data-sem="card"]')!
      fireEvent.keyDown(card, { key: "s", ctrlKey: true })
      fireEvent.keyDown(card, { key: "Enter", ctrlKey: true })
      expect(onSave).not.toHaveBeenCalled()
      expect(onSaveKeepEditing).not.toHaveBeenCalled()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EditableModule icon={icon} title="Test Section" isEditing={false} onEdit={vi.fn()} onSave={vi.fn()} onSaveKeepEditing={vi.fn()} onCancel={vi.fn()} />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  describe("readOnly mode", () => {
    function renderReadOnly(overrides: Record<string, any> = {}) {
      return render(
        <ReadOnlyProvider value={true}>
          <EditableModule
            icon={icon}
            title="Test Section"
            isEditing={false}
            onEdit={vi.fn()}
            onSave={vi.fn()}
            onSaveKeepEditing={vi.fn()}
            onCancel={vi.fn()}
            {...overrides}
          />
        </ReadOnlyProvider>
      )
    }

    it("does not render the Edit button", () => {
      renderReadOnly()
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("still renders the title", () => {
      renderReadOnly()
      expect(screen.getByText("Test Section")).toBeInTheDocument()
    })

    it("still renders children content", () => {
      render(
        <ReadOnlyProvider value={true}>
          <EditableModule icon={icon} title="S" isEditing={false} onEdit={vi.fn()} onSave={vi.fn()} onSaveKeepEditing={vi.fn()} onCancel={vi.fn()}>
            <span>display content</span>
          </EditableModule>
        </ReadOnlyProvider>
      )
      expect(screen.getByText("display content")).toBeInTheDocument()
    })
  })
})

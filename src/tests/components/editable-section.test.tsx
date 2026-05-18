import { render, screen, fireEvent } from "../test-utils"
import { EditableSection } from "@/components/editable-section"

const icon = <span>icon</span>

function renderView(overrides: Record<string, any> = {}) {
  return render(
    <EditableSection
      icon={icon}
      title="Test Section"
      isEditing={false}
      onEdit={vi.fn()}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  )
}

describe("EditableSection", () => {
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
        <EditableSection icon={icon} title="S" isEditing={false} onEdit={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()}>
          <span>child content</span>
        </EditableSection>
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
        <EditableSection
          icon={icon}
          title="S"
          isEditing={true}
          onEdit={vi.fn()}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          headerExtra={<span>extra content</span>}
        />
      )
      expect(screen.queryByText("extra content")).not.toBeInTheDocument()
    })

    it("shows editTitle instead of title when editing and editTitle is provided", () => {
      render(
        <EditableSection
          icon={icon}
          title="Section"
          editTitle="Editing Section"
          isEditing={true}
          onEdit={vi.fn()}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(screen.getByText("Editing Section")).toBeInTheDocument()
      expect(screen.queryByText("Section", { exact: true })).not.toBeInTheDocument()
    })
  })

  describe("edit mode (isEditing=true)", () => {
    function renderEdit(overrides: Record<string, any> = {}) {
      return render(
        <EditableSection
          icon={icon}
          title="Test Section"
          isEditing={true}
          onEdit={vi.fn()}
          onSave={vi.fn()}
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
  })
})

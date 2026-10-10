import { createSignal } from "solid-js"
import { axe } from "vitest-axe"

import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal"

import { render, screen, fireEvent, within, cleanupPortals } from "../../test-utils"

// Wrap Modal with an external trigger so Kobalte's Portal initializes correctly — matches the
// pattern used in src/tests/components/rest-modal.test.tsx for the same underlying primitive.
function ExampleModal(props: { onOpenChange?: (open: boolean) => void; onConfirm?: () => void }) {
  const [open, setOpen] = createSignal(false)
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    props.onOpenChange?.(next)
  }
  return (
    <Modal open={open()} onOpenChange={handleOpenChange}>
      <ModalTrigger>Open modal</ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Confirm action</ModalTitle>
          <ModalDescription>Are you sure you want to continue?</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <button
            type="button"
            onClick={() => {
              props.onConfirm?.()
              handleOpenChange(false)
            }}
          >
            Confirm
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

describe("Modal", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  const openModal = (props: { onOpenChange?: (open: boolean) => void; onConfirm?: () => void } = {}) => {
    render(<ExampleModal {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }))
    return screen.getByRole("dialog")
  }

  it("does not render dialog content until opened", () => {
    render(<ExampleModal />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the title and description when opened via its trigger", () => {
    const dialog = openModal()
    expect(within(dialog).getByText("Confirm action")).toBeInTheDocument()
    expect(within(dialog).getByText("Are you sure you want to continue?")).toBeInTheDocument()
  })

  it("labels the dialog via aria-labelledby/aria-describedby pointing at the title/description", () => {
    const dialog = openModal()
    const titleId = dialog.getAttribute("aria-labelledby")
    const descriptionId = dialog.getAttribute("aria-describedby")
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(titleId!)).toHaveTextContent("Confirm action")
    expect(document.getElementById(descriptionId!)).toHaveTextContent("Are you sure you want to continue?")
  })

  it("calls onOpenChange(false) and closes when the built-in close button is clicked", () => {
    const onOpenChange = vi.fn()
    const dialog = openModal({ onOpenChange })
    fireEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("gives the built-in close button a 44×44 touch target", () => {
    const dialog = openModal()
    expect(within(dialog).getByRole("button", { name: "Dismiss" })).toHaveClass("h-11", "w-11")
  })

  it("calls onOpenChange(false) when a footer action closes the modal", () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()
    const dialog = openModal({ onOpenChange, onConfirm })
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes on Escape key down", () => {
    const onOpenChange = vi.fn()
    const dialog = openModal({ onOpenChange })
    fireEvent.keyDown(dialog, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes when clicking outside the dialog content (backdrop)", async () => {
    const onOpenChange = vi.fn()
    openModal({ onOpenChange })
    // Kobalte registers its outside-pointerdown listener in a `setTimeout(0)` (to avoid
    // reacting to the same pointerdown that opened the dialog), so a real macrotask must
    // elapse before firing the outside pointerdown or it is dispatched to no listener at all.
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.pointerDown(document.body)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("has no accessibility violations when open", async () => {
    openModal()
    // The dialog (overlay + content) is portaled to document.body, outside the render container.
    const results = await axe(document.body)
    expect(results.violations).toHaveLength(0)
  })
})

import { axe } from "vitest-axe"

import { ConfirmButton, CONFIRM_GUARD_MS, CONFIRM_TIMEOUT_MS } from "@/components/ui/confirm-button"
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/ui/modal"

import { render, screen, fireEvent, cleanup, cleanupPortals } from "../../test-utils"

function renderButton(overrides: Partial<Parameters<typeof ConfirmButton>[0]> = {}) {
  const onConfirm = vi.fn()
  render(() => (
    <div>
      <ConfirmButton data-test="delete-thing" verb="Delete" subject="Sharpshooter" onConfirm={onConfirm} {...overrides}>
        <span data-test="idle-icon">icon</span>
      </ConfirmButton>
      <button type="button" data-test="elsewhere">elsewhere</button>
    </div>
  ))
  return { onConfirm, button: () => screen.getByTestId("delete-thing") }
}

describe("ConfirmButton", () => {
  let now = 1000
  beforeEach(() => {
    now = 1000
    vi.spyOn(performance, "now").mockImplementation(() => now)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    cleanup()
    cleanupPortals()
  })

  it("renders its idle content with the verb + subject as accessible name", () => {
    const { button } = renderButton()
    expect(button()).toHaveAccessibleName("Delete Sharpshooter")
    expect(screen.getByTestId("idle-icon")).toBeInTheDocument()
    expect(button()).not.toHaveAttribute("data-armed")
  })

  it("arms on the first click without confirming: red, 'Confirm <verb>' text", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    expect(onConfirm).not.toHaveBeenCalled()
    expect(button()).toHaveAttribute("data-armed")
    expect(button()).toHaveTextContent("Confirm Delete")
    expect(button()).toHaveAccessibleName("Confirm Delete Sharpshooter")
    expect(button()).toHaveClass("bg-destructive")
    expect(screen.queryByTestId("idle-icon")).not.toBeInTheDocument()
  })

  it("confirms on a deliberate second click and returns to idle", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    now += CONFIRM_GUARD_MS + 1
    fireEvent.click(button(), { detail: 1 })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(button()).not.toHaveAttribute("data-armed")
  })

  // Regression: `detail` is the OS's click count, which keeps rising for every click inside the
  // system double-click interval. With that interval set long (an accessibility setting) each
  // deliberate second click arrived as detail 2, 3, … and was swallowed until the button disarmed.
  it("confirms a deliberate second click that the OS still counts as part of a double click", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    now += CONFIRM_GUARD_MS + 1
    fireEvent.click(button(), { detail: 2 })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(button()).not.toHaveAttribute("data-armed")
  })

  it("ignores the second click of an accidental double click", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    now += 150
    fireEvent.click(button(), { detail: 2 })
    expect(onConfirm).not.toHaveBeenCalled()
    expect(button()).toHaveAttribute("data-armed")
  })

  it("ignores a second click that arrives within the guard window", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    now += CONFIRM_GUARD_MS - 1
    fireEvent.click(button(), { detail: 1 })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("allows keyboard confirmation (click detail 0) after the guard window", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 0 })
    now += CONFIRM_GUARD_MS + 1
    fireEvent.click(button(), { detail: 0 })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("disarms on Escape", () => {
    const { onConfirm, button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    fireEvent.keyDown(button(), { key: "Escape" })
    expect(button()).not.toHaveAttribute("data-armed")
    now += CONFIRM_GUARD_MS + 1
    fireEvent.click(button(), { detail: 1 })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  // Kobalte's Dialog closes on Escape through its own document-level keydown listener, which
  // stopPropagation from a delegated handler cannot reach.
  it("disarms on Escape without closing an enclosing modal; a second Escape closes it", async () => {
    const onOpenChange = vi.fn()
    render(() => (
      <Modal open onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit feature</ModalTitle>
            <ModalDescription>Level effects</ModalDescription>
          </ModalHeader>
          <ConfirmButton data-test="remove-effect" verb="Remove" onConfirm={vi.fn()}>x</ConfirmButton>
        </ModalContent>
      </Modal>
    ))
    const button = await screen.findByTestId("remove-effect")
    fireEvent.click(button, { detail: 1 })
    expect(button).toHaveAttribute("data-armed")
    fireEvent.keyDown(button, { key: "Escape" })
    expect(button).not.toHaveAttribute("data-armed")
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.keyDown(button, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // Holding Enter auto-repeats keydown, and each repeat would otherwise click the button again
  // with `detail` 0 — arming on the first and confirming on a later one, past the guard window.
  it("swallows auto-repeated Enter and Space so a held key cannot confirm", () => {
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 0 })
    expect(fireEvent.keyDown(button(), { key: "Enter", repeat: true })).toBe(false)
    expect(fireEvent.keyDown(button(), { key: " ", repeat: true })).toBe(false)
    expect(button()).toHaveAttribute("data-armed")
  })

  it("leaves a fresh Enter press alone so the keyboard can still confirm", () => {
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 0 })
    expect(fireEvent.keyDown(button(), { key: "Enter" })).toBe(true)
  })

  it("disarms on a pointerdown elsewhere", () => {
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    fireEvent.pointerDown(screen.getByTestId("elsewhere"))
    expect(button()).not.toHaveAttribute("data-armed")
  })

  it("stays armed on a pointerdown on itself", () => {
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    fireEvent.pointerDown(button())
    expect(button()).toHaveAttribute("data-armed")
  })

  it("disarms when focus leaves it", () => {
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    fireEvent.focusOut(button())
    expect(button()).not.toHaveAttribute("data-armed")
  })

  it("disarms on its own after the timeout", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    const { button } = renderButton()
    fireEvent.click(button(), { detail: 1 })
    vi.advanceTimersByTime(CONFIRM_TIMEOUT_MS)
    expect(button()).not.toHaveAttribute("data-armed")
  })

  it("passes every click to onClick (e.g. to stop propagation)", () => {
    const onClick = vi.fn()
    const { button } = renderButton({ onClick })
    fireEvent.click(button(), { detail: 1 })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does nothing while disabled", () => {
    const { onConfirm, button } = renderButton({ disabled: true })
    fireEvent.click(button(), { detail: 1 })
    expect(button()).not.toHaveAttribute("data-armed")
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("uses the verb alone as the name when there is no subject", () => {
    render(() => <ConfirmButton data-test="remove-thing" verb="Remove" onConfirm={vi.fn()}>x</ConfirmButton>)
    const button = screen.getByTestId("remove-thing")
    expect(button).toHaveAccessibleName("Remove")
    fireEvent.click(button, { detail: 1 })
    expect(button).toHaveAccessibleName("Confirm Remove")
  })

  it("has no accessibility violations idle or armed", async () => {
    const { button } = renderButton()
    expect((await axe(document.body)).violations).toHaveLength(0)
    fireEvent.click(button(), { detail: 1 })
    expect((await axe(document.body)).violations).toHaveLength(0)
  })
})

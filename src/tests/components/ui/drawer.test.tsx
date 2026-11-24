import { createSignal } from "solid-js"
import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

import { cleanup, cleanupPortals, finishDrawerClosing, render, screen, waitFor, within } from "../../test-utils"

function ExampleDrawer() {
  const [open, setOpen] = createSignal(false)
  return (
    <Drawer open={open()} onOpenChange={setOpen}>
      <DrawerTrigger data-test="example-trigger">Open drawer</DrawerTrigger>
      <DrawerContent data-test="example-drawer">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <a href="/first">First link</a>
        <button type="button">Last button</button>
      </DrawerContent>
    </Drawer>
  )
}

async function openDrawer() {
  const user = userEvent.setup()
  render(() => <ExampleDrawer />)
  await user.click(screen.getByRole("button", { name: "Open drawer" }))
  const drawer = await screen.findByRole("dialog", { name: "Menu" })
  return { user, drawer }
}

describe("Drawer", () => {
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  it("does not render its content until opened", () => {
    render(() => <ExampleDrawer />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens as a dialog named by its title, sliding in from the left", async () => {
    const { drawer } = await openDrawer()
    expect(drawer).toHaveClass("left-0", "inset-y-0", "data-[expanded]:slide-in-from-left")
  })

  it("scrolls its content when it is taller than the viewport", async () => {
    const { drawer } = await openDrawer()
    expect(drawer).toHaveClass("overflow-y-auto")
  })

  it("moves focus into the drawer when it opens", async () => {
    const { drawer } = await openDrawer()
    await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
  })

  it("keeps focus inside while open", async () => {
    const { user, drawer } = await openDrawer()
    await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
    for (let i = 0; i < 5; i++) {
      await user.tab()
      expect(drawer).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it("closes on Escape and returns focus to its trigger", async () => {
    const { user, drawer } = await openDrawer()
    await user.keyboard("{Escape}")
    expect(drawer).not.toHaveAttribute("data-expanded")
    finishDrawerClosing(drawer)
    await waitFor(() => expect(screen.getByTestId("example-trigger")).toHaveFocus())
  })

  // Kobalte names its close button "Dismiss"
  it("closes from its visible close button, a 44px target", async () => {
    const { user, drawer } = await openDrawer()
    const close = within(drawer).getByRole("button", { name: "Dismiss" })
    expect(close).toHaveClass("h-11", "w-11")
    await user.click(close)
    expect(drawer).not.toHaveAttribute("data-expanded")
  })

  it("hides the page behind it from assistive tech while open", async () => {
    await openDrawer()
    expect(screen.queryByRole("button", { name: "Open drawer" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations while open", async () => {
    const { drawer } = await openDrawer()
    const results = await axe(drawer)
    expect(results.violations).toHaveLength(0)
  })
})

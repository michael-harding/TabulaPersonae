import { createSignal } from "solid-js"
import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DRAWER_TOGGLE } from "@/components/ui/drawer"

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

  it("closes from its visible close button", async () => {
    const { user, drawer } = await openDrawer()
    await user.click(within(drawer).getByRole("button", { name: "Close" }))
    expect(drawer).not.toHaveAttribute("data-expanded")
  })

  // Where every page puts the menu button that opens it (MENU_BUTTON_FLOATING), and as large: a
  // second click in the same spot closes it. The e2e tests compare the two positions.
  it("has its close button at the top left, a 32px button with a 44px hit area", async () => {
    const { drawer } = await openDrawer()
    const close = within(drawer).getByRole("button", { name: "Close" })
    expect(close).toHaveClass("absolute", "left-4", "top-3", "h-8", "w-8", "after:h-11", "after:w-11")
    // Its own relative would otherwise win over absolute in the stylesheet
    expect(close).not.toHaveClass("relative")
  })

  // The app's global navigation control: its icon carries the meaning, so it is large and unboxed
  it("styles its open and close buttons with a large icon and no border", () => {
    const classes = DRAWER_TOGGLE.split(" ")
    expect(classes).toContain("[&_svg]:size-6")
    expect(classes).not.toContain("[&_svg]:size-4")
    expect(classes).not.toContain("border")
  })

  // All but relative, which its absolute position replaces
  it("gives its close button that style", async () => {
    const { drawer } = await openDrawer()
    const style = DRAWER_TOGGLE.split(" ").filter((c) => c !== "relative")
    expect(within(drawer).getByRole("button", { name: "Close" })).toHaveClass(...style)
  })

  it("puts the close button first in the tab order, as it is on screen", async () => {
    const { drawer } = await openDrawer()
    const close = within(drawer).getByRole("button", { name: "Close" })
    expect(close.compareDocumentPosition(within(drawer).getByRole("link", { name: "First link" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

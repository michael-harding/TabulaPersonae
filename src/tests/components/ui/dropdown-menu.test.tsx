import { createSignal } from "solid-js"
import { axe } from "vitest-axe"
import userEvent from "@testing-library/user-event"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

import { render, screen, waitFor, cleanup, cleanupPortals } from "../../test-utils"

function Harness(props: { onSelectA?: () => void; onSelectB?: () => void }) {
  const [open, setOpen] = createSignal(false)
  return (
    <DropdownMenu open={open()} onOpenChange={setOpen}>
      <DropdownMenuTrigger data-test="menu-trigger" aria-label="Open menu">
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent data-test="menu-content">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={props.onSelectA}>Item A</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem inset onSelect={props.onSelectB}>
            Item B
          </DropdownMenuItem>
          <DropdownMenuItem disabled onSelect={props.onSelectB}>
            Item C (disabled)
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

async function openMenu(props: { onSelectA?: () => void; onSelectB?: () => void } = {}) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  await user.click(screen.getByRole("button", { name: "Open menu" }))
  await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument())
  return user
}

describe("DropdownMenu", () => {
  beforeEach(() => {
    cleanup()
    cleanupPortals()
  })

  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  it("does not render menu content until the trigger is clicked", () => {
    render(<Harness />)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("opens the menu on trigger click", async () => {
    await openMenu()
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("renders all menu items when open", async () => {
    await openMenu()
    expect(screen.getByRole("menuitem", { name: "Item A" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Item B" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Item C (disabled)" })).toBeInTheDocument()
  })

  it("renders the label text", async () => {
    await openMenu()
    expect(screen.getByText("Actions")).toBeInTheDocument()
  })

  it("renders a separator between items", async () => {
    await openMenu()
    expect(screen.getByRole("separator")).toBeInTheDocument()
  })

  it("applies the inset class to an item marked inset", async () => {
    await openMenu()
    expect(screen.getByRole("menuitem", { name: "Item B" })).toHaveClass("pl-8")
  })

  it("does not apply the inset class to an item not marked inset", async () => {
    await openMenu()
    expect(screen.getByRole("menuitem", { name: "Item A" })).not.toHaveClass("pl-8")
  })

  it("calls the item's onSelect and closes the menu when an item is clicked", async () => {
    const onSelectA = vi.fn()
    const user = await openMenu({ onSelectA })
    await user.click(screen.getByRole("menuitem", { name: "Item A" }))
    expect(onSelectA).toHaveBeenCalledTimes(1)
    // jsdom never fires the transitionend Kobalte's menu content waits for before unmounting,
    // so the DOM node can briefly linger — aria-expanded on the trigger is the reliable,
    // environment-independent signal that the open state itself actually flipped (same pattern
    // used for Collapsible-based components elsewhere in this repo, e.g. features-module.test.tsx).
    await waitFor(() => expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false"))
  })

  it("marks a disabled item with aria-disabled and does not fire onSelect when clicked", async () => {
    const onSelectB = vi.fn()
    const user = await openMenu({ onSelectB })
    const disabledItem = screen.getByRole("menuitem", { name: "Item C (disabled)" })
    expect(disabledItem).toHaveAttribute("aria-disabled", "true")
    await user.click(disabledItem)
    expect(onSelectB).not.toHaveBeenCalled()
  })

  describe("accessibility", () => {
    it("has no accessibility violations when closed", async () => {
      const { container } = render(<Harness />)
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it("has no accessibility violations when open", async () => {
      const { container } = render(<Harness />)
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: "Open menu" }))
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument())
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})

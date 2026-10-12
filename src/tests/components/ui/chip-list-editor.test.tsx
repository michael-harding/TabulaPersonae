import userEvent from "@testing-library/user-event"
import { createSignal } from "solid-js"
import { axe } from "vitest-axe"

import { CheckableChip } from "@/components/ui/chip-button"
import { ChipListEditor } from "@/components/ui/chip-list-editor"

import { render, screen, fireEvent, waitFor, cleanup, cleanupPortals, expectTapTooltip } from "../../test-utils"

const DAMAGE_TYPES = ["Acid", "Cold", "Fire"]

function Harness(props: { initial?: string[]; options?: string[]; allowCustom?: boolean; editing?: boolean; grantedValues?: string[]; emptyText?: string; variant?: "secondary" | "outline" | "destructive" }) {
  const [values, setValues] = createSignal(props.initial ?? [])
  return (
    <ChipListEditor
      data-test="resistances"
      label="Damage Resistances"
      itemLabel="resistance"
      placeholder="e.g. Fire"
      options={props.options}
      allowCustom={props.allowCustom}
      editing={props.editing}
      variant={props.variant}
      grantedValues={props.grantedValues}
      grantedTooltip={(v) => `Granted by ${v} Ring`}
      emptyText={props.emptyText}
      values={values()}
      onChange={setValues}
    />
  )
}

// A value already in the list is marked with a ✓ in the menu, so match on the option text.
async function pick(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.click(screen.getByRole("button", { name: "Add resistance" }))
  await waitFor(() => expect(screen.getByRole("menuitem", { name: new RegExp(option) })).toBeInTheDocument())
  await user.click(screen.getByRole("menuitem", { name: new RegExp(option) }))
}

describe("ChipListEditor", () => {
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  describe("free text (no options)", () => {
    it("adds the typed value with the + Add chip and clears the input", () => {
      render(() => <Harness />)
      const input = screen.getByRole("textbox", { name: "New resistance" })
      fireEvent.input(input, { target: { value: "  Fire  " } })
      fireEvent.click(screen.getByRole("button", { name: "Add resistance" }))
      expect(screen.getByRole("button", { name: "Remove resistance Fire" })).toBeInTheDocument()
      expect(input).toHaveValue("")
    })

    it("adds on Enter without letting the key reach an enclosing form", () => {
      const onSubmit = vi.fn((e: Event) => e.preventDefault())
      render(() => <form onSubmit={onSubmit}><Harness /></form>)
      const input = screen.getByTestId("resistances-input")
      fireEvent.input(input, { target: { value: "Fire" } })
      const notPrevented = fireEvent.keyDown(input, { key: "Enter" })
      expect(notPrevented).toBe(false)
      expect(screen.getByTestId("resistances-remove-Fire")).toBeInTheDocument()
    })

    it("disables the + Add chip until something is typed", () => {
      render(() => <Harness />)
      const add = screen.getByTestId("resistances-add")
      expect(add).toBeDisabled()
      fireEvent.input(screen.getByTestId("resistances-input"), { target: { value: "Fire" } })
      expect(add).not.toBeDisabled()
    })

    it("does not add a value that is already in the list", () => {
      render(() => <Harness initial={["Fire"]} />)
      const input = screen.getByTestId("resistances-input")
      fireEvent.input(input, { target: { value: "Fire" } })
      fireEvent.keyDown(input, { key: "Enter" })
      expect(screen.getAllByText("Fire")).toHaveLength(1)
    })

    it("treats a value differing only by case as already in the list", () => {
      render(() => <Harness initial={["Fire"]} />)
      const input = screen.getByTestId("resistances-input")
      fireEvent.input(input, { target: { value: "fire" } })
      fireEvent.keyDown(input, { key: "Enter" })
      expect(screen.queryByText("fire")).not.toBeInTheDocument()
    })

    it("leaves Escape alone, for an enclosing modal to handle", () => {
      render(() => <Harness />)
      const onDocumentKeyDown = vi.fn()
      document.addEventListener("keydown", onDocumentKeyDown)
      fireEvent.keyDown(screen.getByTestId("resistances-input"), { key: "Escape" })
      expect(onDocumentKeyDown).toHaveBeenCalledTimes(1)
      document.removeEventListener("keydown", onDocumentKeyDown)
    })
  })

  describe("closed list (options)", () => {
    it("offers the options in a menu behind the + Add chip, with no text input", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} />)
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      await pick(user, "Cold")
      expect(screen.getByRole("button", { name: "Remove resistance Cold" })).toBeInTheDocument()
    })

    it("removes a value when it is picked again from the menu", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} initial={["Cold"]} />)
      await pick(user, "Cold")
      expect(screen.queryByRole("button", { name: "Remove resistance Cold" })).not.toBeInTheDocument()
    })

    it("keeps a value that is not among the options, still removable", () => {
      render(() => <Harness options={DAMAGE_TYPES} initial={["Homebrew"]} />)
      fireEvent.click(screen.getByRole("button", { name: "Remove resistance Homebrew" }))
      expect(screen.queryByText("Homebrew")).not.toBeInTheDocument()
    })
  })

  describe("closed list that allows custom values (options + allowCustom)", () => {
    const openCustom = async (user: ReturnType<typeof userEvent.setup>) => {
      await pick(user, "Custom…")
      return await screen.findByRole("textbox", { name: "New resistance" })
    }

    it("offers no Custom… entry unless custom values are allowed", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} />)
      await user.click(screen.getByRole("button", { name: "Add resistance" }))
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Fire" })).toBeInTheDocument())
      expect(screen.queryByRole("menuitem", { name: "Custom…" })).not.toBeInTheDocument()
    })

    it("swaps the menu's + Add chip for a focused text input, keeping a single + Add chip", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      const input = await openCustom(user)
      await waitFor(() => expect(input).toHaveFocus())
      const addChips = screen.getAllByRole("button", { name: "Add resistance" })
      expect(addChips).toHaveLength(1)
      expect(addChips[0]).not.toHaveAttribute("aria-haspopup")
    })

    it("adds the typed value verbatim, then returns to the menu chip and focuses it", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      await user.type(await openCustom(user), "Nonmagical Bludgeoning{Enter}")
      expect(screen.getByRole("button", { name: "Remove resistance Nonmagical Bludgeoning" })).toBeInTheDocument()
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      const menuChip = screen.getByRole("button", { name: "Add resistance" })
      expect(menuChip).toHaveAttribute("aria-haspopup")
      await waitFor(() => expect(menuChip).toHaveFocus())
    })

    it("adds the standard option when its name is typed in another case", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      await user.type(await openCustom(user), "fire{Enter}")
      expect(screen.getByRole("button", { name: "Remove resistance Fire" })).toBeInTheDocument()
      expect(screen.queryByText("fire")).not.toBeInTheDocument()
    })

    it("adds with the + Add chip beside the input as well as with Enter", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      await user.type(await openCustom(user), "Silvered")
      await user.click(screen.getByRole("button", { name: "Add resistance" }))
      expect(screen.getByRole("button", { name: "Remove resistance Silvered" })).toBeInTheDocument()
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("closes on Escape without adding, refocuses the menu chip, and keeps the key from an enclosing modal", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      const input = await openCustom(user)
      await user.type(input, "Silv")
      const onDocumentKeyDown = vi.fn()
      document.addEventListener("keydown", onDocumentKeyDown)
      fireEvent.keyDown(input, { key: "Escape" })
      document.removeEventListener("keydown", onDocumentKeyDown)
      expect(onDocumentKeyDown).not.toHaveBeenCalled()
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      expect(screen.queryByText("Silv")).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole("button", { name: "Add resistance" })).toHaveFocus())
      // Reopening starts from an empty input, not the abandoned text.
      expect(await openCustom(user)).toHaveValue("")
    })

    it("closes when focus leaves an empty input, but stays open while it holds text", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom />)
      const input = await openCustom(user)
      await user.type(input, "Silv")
      fireEvent.blur(input)
      expect(screen.getByRole("textbox")).toBeInTheDocument()
      await user.clear(input)
      fireEvent.blur(input)
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("ticks an option the list holds in a different case, and picking it removes that value", async () => {
      const user = userEvent.setup()
      render(() => <Harness options={DAMAGE_TYPES} allowCustom initial={["fire"]} />)
      await pick(user, "Fire")
      expect(screen.queryByRole("button", { name: /Remove resistance/ })).not.toBeInTheDocument()
    })

    it("has no accessibility violations with the custom input open", async () => {
      const user = userEvent.setup()
      const { container } = render(() => <Harness options={DAMAGE_TYPES} allowCustom initial={["Fire"]} />)
      await openCustom(user)
      expect((await axe(container)).violations).toHaveLength(0)
    })
  })

  it("uses the same + Add chip for both kinds of list", () => {
    const { unmount } = render(() => <Harness />)
    const freeText = screen.getByTestId("resistances-add").querySelector("span")!.className
    unmount()
    render(() => <Harness options={DAMAGE_TYPES} />)
    const closed = screen.getByTestId("resistances-add")
    expect(closed.querySelector("span")!.className).toBe(freeText)
    expect(closed).toHaveTextContent("Add")
    expect(closed).toHaveClass("min-h-11", "min-w-11")
  })

  it("removes a value on a single click of its chip", () => {
    render(() => <Harness initial={["Fire", "Cold"]} />)
    fireEvent.click(screen.getByTestId("resistances-remove-Fire"))
    expect(screen.queryByText("Fire")).not.toBeInTheDocument()
    expect(screen.getByText("Cold")).toBeInTheDocument()
  })

  it("gives remove chips the removable form of the chosen variant", () => {
    const { unmount } = render(() => <Harness initial={["Fire"]} />)
    expect(screen.getByTestId("resistances-remove-Fire").querySelector("span")).toHaveClass("bg-secondary", "group-hover:border-destructive")
    unmount()
    render(() => <Harness initial={["Fire"]} variant="outline" />)
    const pill = screen.getByTestId("resistances-remove-Fire").querySelector("span")!
    expect(pill).toHaveClass("text-foreground", "group-hover:border-destructive")
    expect(pill).not.toHaveClass("bg-secondary")
  })

  it("shows granted values as read-only chips with their source as a tooltip", async () => {
    render(() => <Harness initial={["Fire"]} grantedValues={["Cold"]} />)
    await expectTapTooltip(screen.getByText("Cold"), "Granted by Cold Ring")
    expect(screen.queryByTestId("resistances-remove-Cold")).not.toBeInTheDocument()
  })

  it("shows the empty text only when there are no own or granted values", () => {
    const { unmount } = render(() => <Harness emptyText="No resistances" />)
    expect(screen.getByText("No resistances")).toBeInTheDocument()
    unmount()
    render(() => <Harness emptyText="No resistances" grantedValues={["Cold"]} />)
    expect(screen.queryByText("No resistances")).not.toBeInTheDocument()
  })

  it("is display-only when not editing: plain chips, no add or remove controls", () => {
    render(() => <Harness initial={["Fire"]} options={DAMAGE_TYPES} editing={false} />)
    expect(screen.getByText("Fire")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("renders option labels and a custom chip when given", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(() => (
      <ChipListEditor
        data-test="skills"
        label="Skill Proficiencies"
        itemLabel="skill proficiency"
        options={["athletics", "stealth"]}
        optionLabel={(v) => v.toUpperCase()}
        values={["athletics", "stealth"]}
        onChange={onChange}
        renderChip={(v, remove) => (
          <CheckableChip data-test={`skills-${v}`} removeLabel={`Remove ${v}`} onRemove={remove} checkLabel="Exp" checkAriaLabel={`Expertise for ${v}`} checked={false} onCheckedChange={vi.fn()}>
            {v.toUpperCase()}
          </CheckableChip>
        )}
      />
    ))
    expect(screen.getByRole("checkbox", { name: "Expertise for athletics" })).toBeInTheDocument()
    // A custom chip removes its value through the callback it is handed.
    await user.click(screen.getByRole("button", { name: "Remove athletics" }))
    expect(onChange).toHaveBeenCalledWith(["stealth"])
    await user.click(screen.getByRole("button", { name: "Add skill proficiency" }))
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /STEALTH/ })).toBeInTheDocument())
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <Harness initial={["Fire"]} grantedValues={["Cold"]} />)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

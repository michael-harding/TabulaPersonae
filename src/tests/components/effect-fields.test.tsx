import { axe } from "vitest-axe"

import { DamageFields, GainFields } from "@/components/effect-fields"

import { render, screen, fireEvent } from "../test-utils"

describe("DamageFields", () => {
  const renderDamage = (value = {}, onChange = vi.fn()) => {
    const { container } = render(() => <DamageFields idPrefix="spell" value={value} onChange={onChange} placeholder="e.g. 8d6" />)
    return { onChange, container }
  }

  it("shows the given values and the entry's placeholder", () => {
    renderDamage({ damage: "1d10", damageType: "Fire", damageRecurring: true })
    expect(screen.getByLabelText("Damage")).toHaveValue("1d10")
    expect(screen.getByLabelText("Damage")).toHaveAttribute("placeholder", "e.g. 8d6")
    expect(screen.getByLabelText("Damage Type")).toHaveValue("Fire")
    expect(screen.getByRole("checkbox", { name: "Damage recurs each turn" })).toBeChecked()
  })

  it("reports each field's change as a patch", () => {
    const { onChange } = renderDamage()
    fireEvent.input(screen.getByLabelText("Damage"), { target: { value: "8d6" } })
    expect(onChange).toHaveBeenCalledWith({ damage: "8d6" })
    fireEvent.click(screen.getByRole("checkbox", { name: "Damage recurs each turn" }))
    expect(onChange).toHaveBeenCalledWith({ damageRecurring: true })
  })

  it("offers the damage types", () => {
    const { onChange } = renderDamage()
    fireEvent.focus(screen.getByLabelText("Damage Type"))
    fireEvent.click(screen.getByRole("option", { name: "Necrotic" }))
    expect(onChange).toHaveBeenCalledWith({ damageType: "Necrotic" })
  })

  it("prefixes ids and test hooks", () => {
    renderDamage()
    expect(screen.getByTestId("spell-damage")).toHaveAttribute("id", "spell-damage")
    expect(screen.getByTestId("spell-damage-recurring")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderDamage()
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

describe("GainFields", () => {
  const renderGain = (value = {}, onChange = vi.fn()) => {
    const { container } = render(() => <GainFields idPrefix="item" value={value} onChange={onChange} placeholder="e.g. 2d4+2" />)
    return { onChange, container }
  }

  it("shows the given values and the entry's placeholder", () => {
    renderGain({ gain: "2d4+2", gainType: "Healing" })
    expect(screen.getByLabelText("Gain")).toHaveValue("2d4+2")
    expect(screen.getByLabelText("Gain")).toHaveAttribute("placeholder", "e.g. 2d4+2")
    expect(screen.getByLabelText("Gain Type")).toHaveValue("Healing")
    expect(screen.getByRole("checkbox", { name: "Gain recurs each turn" })).not.toBeChecked()
  })

  it("reports each field's change as a patch", () => {
    const { onChange } = renderGain()
    fireEvent.input(screen.getByLabelText("Gain"), { target: { value: "1d10" } })
    expect(onChange).toHaveBeenCalledWith({ gain: "1d10" })
    fireEvent.click(screen.getByRole("checkbox", { name: "Gain recurs each turn" }))
    expect(onChange).toHaveBeenCalledWith({ gainRecurring: true })
  })

  it("offers Healing and Temp HP", () => {
    const { onChange } = renderGain()
    fireEvent.focus(screen.getByLabelText("Gain Type"))
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Healing", "Temp HP"])
    fireEvent.click(screen.getByRole("option", { name: "Temp HP" }))
    expect(onChange).toHaveBeenCalledWith({ gainType: "Temp HP" })
  })

  // Both groups sit in one form, so their checkboxes must not share a name
  it("names its checkbox differently from the damage one", () => {
    render(() => (
      <>
        <DamageFields idPrefix="x" value={{}} onChange={vi.fn()} placeholder="" />
        <GainFields idPrefix="x" value={{}} onChange={vi.fn()} placeholder="" />
      </>
    ))
    expect(screen.getByRole("checkbox", { name: "Damage recurs each turn" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Gain recurs each turn" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderGain()
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

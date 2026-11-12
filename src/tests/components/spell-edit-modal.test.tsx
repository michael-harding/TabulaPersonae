import { axe } from "vitest-axe"

import { SpellEditModal, spellFromForm, spellToForm, defaultSpellForm, type SpellFormData } from "@/components/spell-edit-modal"
import type { Spell } from "@/lib/character-types"

import { render, screen, fireEvent, cleanup, cleanupPortals } from "../test-utils"

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: "spell-1",
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "A mote of fire.",
    prepared: false,
    known: true,
    ...overrides,
  }
}

function makeForm(overrides: Partial<SpellFormData> = {}): SpellFormData {
  return { ...defaultSpellForm, name: "Fire Bolt", ...overrides }
}

describe("spellFromForm", () => {
  it("creates a new spell with a fresh id when there is no base", () => {
    const spell = spellFromForm(makeForm({ name: "  Fire Bolt  " }))
    expect(spell.id).toEqual(expect.any(String))
    expect(spell.name).toBe("Fire Bolt")
  })

  it("keeps the base's id and the fields the form doesn't show", () => {
    const base = makeSpell({ id: "keep-me" })
    const withExtra = { ...base, legacyField: "kept" } as Spell
    const spell = spellFromForm(makeForm({ name: "Ray of Frost" }), withExtra)
    expect(spell.id).toBe("keep-me")
    expect(spell.name).toBe("Ray of Frost")
    expect((spell as Spell & { legacyField: string }).legacyField).toBe("kept")
  })

  it("maps the damage, gain and highlights fields", () => {
    const spell = spellFromForm(makeForm({
      damage: "2d6", damageType: "Fire", damageRecurring: true,
      gain: "1d8", gainType: "Healing", gainRecurring: true,
      highlights: "  **Burns** each turn  ",
    }))
    expect(spell).toMatchObject({
      damage: "2d6", damageType: "Fire", damageRecurring: true,
      gain: "1d8", gainType: "Healing", gainRecurring: true,
      highlights: "**Burns** each turn",
    })
  })

  // Blank optional fields aren't stored, so a spell without them looks the same as one saved
  // before the fields existed.
  it("omits blank types, unset recurring flags and blank highlights", () => {
    const spell = spellFromForm(makeForm({ damageType: "", damageRecurring: false, gainType: "", gainRecurring: false, highlights: "   " }))
    expect(spell.damageType).toBeUndefined()
    expect(spell.damageRecurring).toBeUndefined()
    expect(spell.gainType).toBeUndefined()
    expect(spell.gainRecurring).toBeUndefined()
    expect(spell.highlights).toBeUndefined()
  })

  it("keeps a recurring flag only with an amount", () => {
    const spell = spellFromForm(makeForm({ damage: " ", damageRecurring: true, gain: "", gainRecurring: true }))
    expect(spell.damageRecurring).toBeUndefined()
    expect(spell.gainRecurring).toBeUndefined()
  })

  it("stores the per-level damage and gain, omitting blank ones", () => {
    expect(spellFromForm(makeForm({ damagePerLevel: " 1d6 ", gainPerLevel: "1d8" }))).toMatchObject({ damagePerLevel: "1d6", gainPerLevel: "1d8" })
    const blank = spellFromForm(makeForm({ damagePerLevel: "  ", gainPerLevel: "" }))
    expect(blank.damagePerLevel).toBeUndefined()
    expect(blank.gainPerLevel).toBeUndefined()
  })

  it("stores attackRoll only when set", () => {
    expect(spellFromForm(makeForm({ attackRoll: false })).attackRoll).toBeUndefined()
    expect(spellFromForm(makeForm({ attackRoll: true })).attackRoll).toBe(true)
  })

  it("stores freeCast only for an item-granted spell", () => {
    expect(spellFromForm(makeForm({ grantedBy: "", freeCast: true })).freeCast).toBeUndefined()
    expect(spellFromForm(makeForm({ grantedBy: "item-1", freeCast: true })).freeCast).toBe(true)
  })
})

describe("spellToForm", () => {
  it("round-trips through spellFromForm", () => {
    const spell = makeSpell({
      level: 3, damage: "8d6", damageType: "Fire", damageRecurring: true,
      gain: "2d4", gainType: "Temp HP", gainRecurring: true, highlights: "Big *boom*",
      concentration: true, ritual: false, attackRoll: true, attackSave: "DEX save", atHigherLevel: "+1d6",
      damagePerLevel: "1d6", gainPerLevel: "1d4",
    })
    expect(spellFromForm(spellToForm(spell), spell)).toEqual(expect.objectContaining({
      id: spell.id, level: 3, damage: "8d6", damageType: "Fire", damageRecurring: true,
      gain: "2d4", gainType: "Temp HP", gainRecurring: true, highlights: "Big *boom*",
      attackRoll: true, attackSave: "DEX save", damagePerLevel: "1d6", gainPerLevel: "1d4",
    }))
  })

  it("fills blanks for a spell saved before the new fields existed", () => {
    const form = spellToForm(makeSpell())
    expect(form).toMatchObject({ damageType: "", damageRecurring: false, gainType: "", gainRecurring: false, highlights: "", attackRoll: false, damagePerLevel: "", gainPerLevel: "" })
  })
})

describe("SpellEditModal", () => {
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  it("edits a spell, keeping its id", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={makeSpell({ id: "s1" })} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Edit Spell" })).toBeInTheDocument()
    fireEvent.input(screen.getByLabelText("Highlights"), { target: { value: "Ranged spell attack" } })
    fireEvent.input(screen.getByLabelText("Damage"), { target: { value: "1d10" } })
    fireEvent.click(screen.getByRole("checkbox", { name: "Damage recurs each turn" }))
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      id: "s1", highlights: "Ranged spell attack", damage: "1d10", damageRecurring: true,
    }))
  })

  it("edits the damage and gain added per higher slot level", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={makeSpell({ level: 3, damagePerLevel: "1d6" })} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.getByLabelText("Damage per Higher Level")).toHaveValue("1d6")
    fireEvent.input(screen.getByLabelText("Damage per Higher Level"), { target: { value: "2d6" } })
    fireEvent.input(screen.getByLabelText("Gain per Higher Level"), { target: { value: "1d8" } })
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ damagePerLevel: "2d6", gainPerLevel: "1d8" }))
  })

  it("keeps its actions in the sticky modal footer", () => {
    render(() => <SpellEditModal open spell={null} magicItems={[]} onSave={vi.fn()} onCancel={vi.fn()} />)
    const footer = screen.getByTestId("modal-footer")
    expect(footer).toContainElement(screen.getByTestId("spell-form-submit"))
    expect(footer).toContainElement(screen.getByTestId("spell-form-cancel"))
  })

  it("adds a spell when given none", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={null} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Add New Spell" })).toBeInTheDocument()
    fireEvent.input(screen.getByLabelText("Spell Name"), { target: { value: "Shield" } })
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Shield" }))
  })

  it("offers the six save abilities for Attack/Save", () => {
    render(() => <SpellEditModal open spell={makeSpell()} magicItems={[]} onSave={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.focus(screen.getByRole("combobox", { name: "Attack/Save" }))
    const options = screen.getAllByRole("option").map((o) => o.textContent)
    expect(options).toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA"])
  })

  it("saves a chosen save ability and the attack roll checkbox", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={makeSpell()} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.focus(screen.getByRole("combobox", { name: "Attack/Save" }))
    fireEvent.click(screen.getByRole("option", { name: "WIS" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Has attack roll" }))
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ attackSave: "WIS", attackRoll: true }))
  })

  it("keeps Attack/Save text saved before the abilities were offered", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={makeSpell({ attackSave: "Dex Save" })} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.getByRole("combobox", { name: "Attack/Save" })).toHaveValue("Dex Save")
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ attackSave: "Dex Save" }))
  })

  it("does not save a spell without a name", () => {
    const onSave = vi.fn()
    render(() => <SpellEditModal open spell={null} magicItems={[]} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByTestId("spell-form-submit"))
    expect(onSave).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    render(() => <SpellEditModal open spell={makeSpell()} magicItems={[]} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect((await axe(screen.getByRole("dialog"))).violations).toHaveLength(0)
  })
})

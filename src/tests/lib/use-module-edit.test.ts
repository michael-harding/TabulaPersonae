import { createRoot } from "solid-js"
import { createStore, reconcile } from "solid-js/store"

import { useModuleEdit } from "@/hooks/use-module-edit"
import { createDefaultCharacter, type Character } from "@/lib/character-types"

function setup(toDraft: (c: Character) => Partial<Character>, resolve?: (draft: Partial<Character>) => Partial<Character>) {
  const [character, setCharacter] = createStore<Character>({ ...createDefaultCharacter(), name: "Aria", level: 3 })
  const onUpdate = vi.fn((next: Character) => setCharacter(reconcile(next)))
  let dispose = () => {}
  const edit = createRoot((d) => {
    dispose = d
    return useModuleEdit({ character: () => character, toDraft, resolve, onUpdate })
  })
  return { character, setCharacter, onUpdate, edit, dispose }
}

const nameAndLevel = (c: Character) => ({ name: c.name, level: c.level })

describe("useModuleEdit", () => {
  it("saves a change made in the form", () => {
    const { edit, onUpdate, character, dispose } = setup(nameAndLevel)
    edit.start()
    edit.setDraft((prev) => ({ ...prev, level: 4 }))
    edit.save()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: "Aria", level: 4 }))
    expect(edit.isEditing()).toBe(false)
    expect(character.level).toBe(4)
    dispose()
  })

  // Several modules can edit the same fields at once, and some fields also change outside the form
  it("leaves a form field it did not change as it is now, not as it was when editing began", () => {
    const { edit, onUpdate, setCharacter, dispose } = setup(nameAndLevel)
    edit.start()
    setCharacter("name", "Changed elsewhere")
    edit.setDraft((prev) => ({ ...prev, level: 4 }))
    edit.save()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: "Changed elsewhere", level: 4 }))
    dispose()
  })

  it("saves only the keys of a nested object that were changed", () => {
    const { edit, onUpdate, setCharacter, dispose } = setup((c) => ({ hitPoints: { ...c.hitPoints } }))
    setCharacter("hitPoints", { current: 10, maximum: 44, temporary: 0 })
    edit.start()
    setCharacter("hitPoints", "current", 44)
    edit.setDraft((prev) => ({ ...prev, hitPoints: { ...prev.hitPoints!, temporary: 5 } }))
    edit.save()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      hitPoints: { current: 44, maximum: 44, temporary: 5 },
    }))
    dispose()
  })

  // Resolving fills in a calculated value or a default, which differs from the stored one
  it("saves a resolved value that differs from the stored one", () => {
    const { edit, onUpdate, dispose } = setup(nameAndLevel, (draft) => ({ ...draft, proficiencyBonus: 9 }))
    edit.start()
    edit.save()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ proficiencyBonus: 9 }))
    dispose()
  })

  it("compares a later save with the last one, so a change made elsewhere in between is kept", () => {
    const { edit, onUpdate, setCharacter, character, dispose } = setup(nameAndLevel)
    edit.start()
    edit.setDraft((prev) => ({ ...prev, level: 4 }))
    edit.commit()
    expect(edit.isEditing()).toBe(true)
    setCharacter("level", 7)
    edit.save()
    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(character.level).toBe(7)
    dispose()
  })

  it("discards the form's changes on cancel", () => {
    const { edit, onUpdate, dispose } = setup(nameAndLevel)
    edit.start()
    edit.setDraft((prev) => ({ ...prev, level: 4 }))
    edit.cancel()
    expect(onUpdate).not.toHaveBeenCalled()
    expect(edit.isEditing()).toBe(false)
    expect(edit.draft().level).toBe(3)
    dispose()
  })

  it("applies the draft to the character only while editing", () => {
    const { edit, dispose } = setup(nameAndLevel)
    edit.setDraft((prev) => ({ ...prev, level: 9 }))
    expect(edit.merged().level).toBe(3)
    edit.start()
    edit.setDraft((prev) => ({ ...prev, level: 9 }))
    expect(edit.merged().level).toBe(9)
    dispose()
  })

  // The sheet swaps characters in place
  it("starts the draft over when the character is swapped for another", () => {
    const { edit, setCharacter, dispose } = setup(nameAndLevel)
    edit.start()
    edit.setDraft((prev) => ({ ...prev, name: "Unsaved" }))
    setCharacter(reconcile({ ...createDefaultCharacter(), id: "other", name: "Bram", level: 5 }))
    expect(edit.draft()).toEqual({ name: "Bram", level: 5 })
    dispose()
  })
})

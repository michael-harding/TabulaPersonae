import { createEffect, createMemo, createSignal, on, untrack, type Accessor } from "solid-js"

import type { Character } from "@/lib/character-types"
import { applyChanges, pickFields } from "@/lib/changes"

export interface UseModuleEditArgs<D extends Partial<Character>> {
  character: Accessor<Character>
  /** The fields the module's edit form shows, as the form shows them (defaults filled in). */
  toDraft: (character: Character) => D
  /** What Save writes for the draft: calculated values resolved, values clamped. Defaults to the draft itself. */
  resolve?: (draft: D) => Partial<Character>
  onUpdate: (character: Character) => void
}

// A copy that stays as it is: a store's objects are live, and would show later changes.
// Character data is plain JSON (it is stored as JSON), so a JSON round trip copies all of it.
const snapshot = (fields: Partial<Character>): Partial<Character> => JSON.parse(JSON.stringify(fields)) as Partial<Character>

/**
 * The edit state of a module's form (see EditableModule). Several modules can be editing the
 * character at once, some of them the same fields, and it can change in other ways meanwhile (a
 * rest, controls that save at once). So Save does not write the whole draft back: it writes only
 * the values that differ from what was stored when editing began (or at the last save), field by
 * field and into nested objects, onto the character as it is now. Everything else is left alone.
 */
export function useModuleEdit<D extends Partial<Character>>(args: UseModuleEditArgs<D>) {
  const resolve = args.resolve ?? ((draft: D) => draft)
  const [isEditing, setIsEditing] = createSignal(false)
  const [draft, setDraft] = createSignal<D>(untrack(() => args.toDraft(args.character())))
  // The stored values of the draft's fields when editing began, or as last saved: what Save compares against
  let saved: Partial<Character> = {}

  /** The live character with the draft applied while editing, the live character otherwise. */
  const merged = createMemo((): Character => (isEditing() ? { ...args.character(), ...draft() } : args.character()))

  const reset = () => untrack(() => {
    const character = args.character()
    const next = args.toDraft(character)
    setDraft(() => next)
    saved = snapshot(pickFields(character, Object.keys(next) as (keyof Character)[]))
  })

  // The sheet swaps characters in place, so in-progress edits must not carry over to the next one.
  createEffect(on(() => args.character().id, reset, { defer: true }))

  /** Begins editing, from the character as it is now. */
  const start = () => { reset(); setIsEditing(true) }

  /** Saves the changes made in the form and stays in edit mode. */
  const commit = () => untrack(() => {
    const next = resolve(draft())
    args.onUpdate(applyChanges(args.character(), saved, next))
    saved = snapshot(next)
  })

  /** Saves the changes made in the form and leaves edit mode. */
  const save = () => { commit(); setIsEditing(false) }

  /** Leaves edit mode, discarding the changes made in the form since the last save. */
  const cancel = () => { setIsEditing(false); reset() }

  return { isEditing, draft, setDraft, merged, start, commit, save, cancel }
}

import { toast } from "@/hooks/use-toast"

import type { Character } from "./character-types"

interface FailureMessage {
  title: string
  description: string
}

/**
 * Tells the user when a storage write did not succeed. Storage functions resolve `false` on
 * failure instead of throwing, and log the cause themselves (see storage-manager.ts and
 * firebase-storage.ts), so each caller has to check the result for the user to hear about it.
 *
 * Do not await this before updating the screen or navigating. While a signed-in user is offline
 * Firestore keeps the write pending, and the promise settles only once the server has answered.
 */
export async function notifyIfFailed(result: Promise<boolean>, message: FailureMessage): Promise<boolean> {
  // unknown: a rejected promise can carry any value
  const succeeded = await result.catch((error: unknown) => {
    console.error(`${message.title}:`, error)
    return false
  })
  if (!succeeded) toast({ ...message, variant: "destructive" })
  return succeeded
}

interface ImportedCharacters {
  /** The characters as they are being saved, under their new ids. */
  imported: Character[]
  /** Whether every one of them was saved. Like notifyIfFailed, not to be awaited before navigating. */
  saved: Promise<boolean>
}

/**
 * Saves characters read from an import file as new characters, and tells the user if any of them
 * could not be saved. Each gets a new id, so importing never overwrites a character that already
 * has the id in the file.
 */
export function saveImportedCharacters(
  characters: Character[],
  saveCharacter: (character: Character) => Promise<boolean>,
): ImportedCharacters {
  const imported = characters.map((character) => ({ ...character, id: crypto.randomUUID() }))
  const allSaved = Promise.all(imported.map((character) => saveCharacter(character)))
    .then((results) => results.every(Boolean))
  const description = imported.length === 1
    ? `${imported[0].name || "The imported character"} could not be saved.`
    : "One or more of the imported characters could not be saved."
  return { imported, saved: notifyIfFailed(allSaved, { title: "Import not saved", description }) }
}

vi.mock("@/hooks/use-toast", async () => (await import("../mocks/toast")).toastModuleMock)

import { createDefaultCharacter, type Character } from "@/lib/character-types"
import { notifyIfFailed, saveImportedCharacters } from "@/lib/save-feedback"

import { mockToast } from "../mocks/toast"

const message = { title: "Character not saved", description: "Your latest change could not be saved." }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("notifyIfFailed", () => {
  it("says nothing and reports success when the write succeeded", async () => {
    expect(await notifyIfFailed(Promise.resolve(true), message)).toBe(true)
    expect(mockToast).not.toHaveBeenCalled()
  })

  it("shows the message as an error and reports failure when the write resolved false", async () => {
    expect(await notifyIfFailed(Promise.resolve(false), message)).toBe(false)
    expect(mockToast).toHaveBeenCalledExactlyOnceWith({ ...message, variant: "destructive" })
  })

  it("treats a rejected write as a failure, and logs what it was rejected with", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("write failed")

    expect(await notifyIfFailed(Promise.reject(failure), message)).toBe(false)

    expect(mockToast).toHaveBeenCalledExactlyOnceWith({ ...message, variant: "destructive" })
    expect(consoleError).toHaveBeenCalledWith("Character not saved:", failure)
    consoleError.mockRestore()
  })

  it("says nothing while the write is still pending, as it is for a signed-in user who is offline", async () => {
    let settled = false
    void notifyIfFailed(new Promise<boolean>(() => {}), message).then(() => { settled = true })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockToast).not.toHaveBeenCalled()
    expect(settled).toBe(false)
  })
})

describe("saveImportedCharacters", () => {
  const frodo: Character = { ...createDefaultCharacter(), id: "file-1", name: "Frodo" }
  const sam: Character = { ...createDefaultCharacter(), id: "file-2", name: "Sam" }
  const saveCharacter = vi.fn<(character: Character) => Promise<boolean>>()
  const notSaved = (description: string) => ({ title: "Import not saved", description, variant: "destructive" })

  beforeEach(() => {
    saveCharacter.mockReset().mockResolvedValue(true)
  })

  it("saves every character under a new id, and returns them as saved", async () => {
    const { imported, saved } = saveImportedCharacters([frodo, sam], saveCharacter)

    expect(await saved).toBe(true)
    expect(imported.map((character) => character.name)).toEqual(["Frodo", "Sam"])
    expect(new Set([...imported.map((character) => character.id), "file-1", "file-2"]).size).toBe(4)
    expect(saveCharacter.mock.calls).toEqual([[imported[0]], [imported[1]]])
    expect(mockToast).not.toHaveBeenCalled()
  })

  it("leaves the characters it was given untouched", () => {
    saveImportedCharacters([frodo], saveCharacter)

    expect(frodo.id).toBe("file-1")
  })

  // Offline, a signed-in user's save stays pending until the server answers
  it("hands back the characters without waiting for a save that has not finished", () => {
    saveCharacter.mockReturnValue(new Promise<boolean>(() => {}))

    const { imported } = saveImportedCharacters([frodo], saveCharacter)

    expect(imported).toHaveLength(1)
    expect(mockToast).not.toHaveBeenCalled()
  })

  it.each([
    { label: "names the character when it was the only one", characters: [frodo], description: "Frodo could not be saved." },
    { label: "falls back to a description when the only character has no name", characters: [{ ...frodo, name: "" }], description: "The imported character could not be saved." },
    { label: "does not say which when there were several", characters: [frodo, sam], description: "One or more of the imported characters could not be saved." },
  ])("tells the user when a save failed: $label", async ({ characters, description }) => {
    saveCharacter.mockResolvedValueOnce(false)

    const { saved } = saveImportedCharacters(characters, saveCharacter)

    expect(await saved).toBe(false)
    expect(mockToast).toHaveBeenCalledExactlyOnceWith(notSaved(description))
  })

  it("treats a rejected save as a failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    saveCharacter.mockRejectedValueOnce(new Error("write failed"))

    expect(await saveImportedCharacters([frodo], saveCharacter).saved).toBe(false)

    expect(mockToast).toHaveBeenCalledExactlyOnceWith(notSaved("Frodo could not be saved."))
    consoleError.mockRestore()
  })

  it("saves nothing and reports success for an empty import", async () => {
    const { imported, saved } = saveImportedCharacters([], saveCharacter)

    expect(imported).toEqual([])
    expect(await saved).toBe(true)
    expect(saveCharacter).not.toHaveBeenCalled()
  })
})

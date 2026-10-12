vi.mock("@/hooks/use-toast", async () => (await import("../mocks/toast")).toastModuleMock)

import { notifyIfFailed } from "@/lib/save-feedback"

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

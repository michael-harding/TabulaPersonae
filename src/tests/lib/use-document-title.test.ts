import { createRoot, createSignal } from "solid-js"

import { useDocumentTitle } from "@/hooks/use-document-title"

/** Mounts the hook in its own root; effects run once the root's setup function returns. */
function mount<T extends string | null | undefined>(initial: T) {
  const [name, setName] = createSignal<string | null | undefined>(initial)
  const dispose = createRoot((dispose) => {
    useDocumentTitle(name)
    return dispose
  })
  return { setName, dispose }
}

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = ""
  })

  it("names the character in the title and follows name changes", () => {
    const { setName, dispose } = mount("Aria")
    expect(document.title).toBe("Aria | TabulaPersonae")

    setName("Bran")
    expect(document.title).toBe("Bran | TabulaPersonae")
    dispose()
  })

  it("falls back to the app name when there is no name", () => {
    const { setName, dispose } = mount(undefined)
    expect(document.title).toBe("TabulaPersonae")

    setName("Aria")
    setName("")
    expect(document.title).toBe("TabulaPersonae")

    setName("Aria")
    setName(null)
    expect(document.title).toBe("TabulaPersonae")
    dispose()
  })

  it("restores the app name when the page unmounts", () => {
    const { dispose } = mount("Aria")
    expect(document.title).toBe("Aria | TabulaPersonae")

    dispose()
    expect(document.title).toBe("TabulaPersonae")
  })
})

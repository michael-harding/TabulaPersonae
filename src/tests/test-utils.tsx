import { render } from "@solidjs/testing-library"
import type { JSX } from "solid-js"

type RenderOptions = NonNullable<Parameters<typeof render>[1]>

const customRender = (ui: JSX.Element, options?: Omit<RenderOptions, "wrapper">) =>
  render(() => ui, options)

// Kobalte portals modal/menu/select content into body-level divs. In jsdom,
// CSS transitions never fire so portals can accumulate between tests. Identify
// portals by their contained ARIA role rather than by aria-hidden — the latter
// also matches the testing-library app container (which Kobalte marks
// aria-hidden while a modal is open) and would wrongly delete it.
export function cleanupPortals() {
  const portalSelectors = ['[role="dialog"]', '[role="menu"]', '[role="listbox"]', '[role="tooltip"]']
  Array.from(document.body.children).forEach((child) => {
    const el = child as HTMLElement
    if (portalSelectors.some((sel) => el.querySelector(sel))) {
      el.remove()
    }
  })
  document.body.removeAttribute("style")
  document.body.removeAttribute("aria-hidden")
  document.body.removeAttribute("data-scroll-locked")
  document.documentElement.removeAttribute("style")
  Array.from(document.body.children).forEach((child) => {
    ;(child as HTMLElement).removeAttribute("aria-hidden")
  })
}

export * from "@solidjs/testing-library"
export { customRender as render }

describe("test-utils", () => {
  it("should export testing utilities", () => {
    expect(customRender).toBeDefined()
  })
})

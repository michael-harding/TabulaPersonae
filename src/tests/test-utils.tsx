import { render } from "@solidjs/testing-library"
import type { JSX } from "solid-js"

type RenderOptions = NonNullable<Parameters<typeof render>[1]>

const customRender = (ui: JSX.Element, options?: Omit<RenderOptions, "wrapper">) =>
  render(() => ui, options)

export * from "@solidjs/testing-library"
export { customRender as render }

describe("test-utils", () => {
  it("should export testing utilities", () => {
    expect(customRender).toBeDefined()
  })
})

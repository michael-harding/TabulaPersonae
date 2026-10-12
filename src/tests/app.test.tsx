// setup.tsx replaces the router with a stub; the route table can only be tested against the real one.
vi.unmock("@solidjs/router")

// theme.ts starts a module-level effect that needs window.matchMedia (not in jsdom)
vi.mock("@/lib/theme", () => ({ theme: () => "system", setTheme: vi.fn() }))

vi.mock("@/components/layout", () => ({
  default: (props: ParentProps) => <main data-test="layout">{props.children}</main>,
}))

vi.mock("@/components/ui/toaster", () => ({ Toaster: () => <div data-test="toaster" /> }))

// Each page is replaced by a marker that also shows the route parameter it was given, so a test
// can tell which page a path reached and with what.
vi.mock("@/routes/Home", () => ({ default: () => <div data-test="page">home</div> }))
vi.mock("@/routes/Auth", () => ({ default: () => <div data-test="page">auth</div> }))
vi.mock("@/routes/CharacterSheet", async () => {
  const { useParams } = await import("@solidjs/router")
  return { default: () => <div data-test="page">character:{useParams().id}</div> }
})
vi.mock("@/routes/TabSettings", () => ({ default: () => <div data-test="page">tab-settings</div> }))
vi.mock("@/routes/PublicCharacterSheet", async () => {
  const { useParams } = await import("@solidjs/router")
  return { default: () => <div data-test="page">share:{useParams().id}</div> }
})
vi.mock("@/routes/Teapot", () => ({ default: () => <div data-test="page">teapot</div> }))
vi.mock("@/routes/TermsOfUse", () => ({ default: () => <div data-test="page">terms</div> }))
vi.mock("@/routes/PrivacyPolicy", () => ({ default: () => <div data-test="page">privacy</div> }))
vi.mock("@/routes/NotFound", () => ({ default: () => <div data-test="page">not-found</div> }))

import type { ParentProps } from "solid-js"

import App from "@/App"

import { cleanup, render, screen } from "./test-utils"

afterEach(() => {
  cleanup()
  window.history.pushState({}, "", "/")
})

describe("App routes", () => {
  it.each([
    ["/", "home"],
    ["/auth", "auth"],
    ["/character/char-1", "character:char-1"],
    ["/settings/tabs", "tab-settings"],
    ["/share/char-1", "share:char-1"],
    ["/418", "teapot"],
    ["/terms", "terms"],
    ["/privacy", "privacy"],
    ["/no-such-page", "not-found"],
    ["/character", "not-found"],
    ["/character/char-1/extra", "not-found"],
  ])("%s shows %s", async (path, page) => {
    window.history.pushState({}, "", path)

    render(() => <App />)

    expect(await screen.findByTestId("page")).toHaveTextContent(page)
  })

  it("renders every page inside the shared layout, with the toaster alongside it", async () => {
    window.history.pushState({}, "", "/")

    render(() => <App />)

    const page = await screen.findByTestId("page")
    expect(screen.getByTestId("layout")).toContainElement(page)
    expect(screen.getByTestId("toaster")).toBeInTheDocument()
    expect(screen.getByTestId("layout")).not.toContainElement(screen.getByTestId("toaster"))
  })
})

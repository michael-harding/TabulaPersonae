import { axe } from "vitest-axe"
import { render, screen, cleanupPortals } from "../test-utils"
import Layout from "@/components/layout"
import { useSyncState } from "@/lib/sync-context"

function SyncConsumer() {
  const ctx = useSyncState()
  return <div data-test="sync-consumer">{ctx ? `has-context:${JSON.stringify(ctx.syncState())}` : "no-context"}</div>
}

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupPortals()
  })

  it("renders children inside a main element", () => {
    render(
      <Layout>
        <div data-test="child-content">Character Sheet Content</div>
      </Layout>
    )
    const main = screen.getByRole("main")
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
    expect(main).toContainElement(screen.getByTestId("child-content"))
  })

  it("renders the footer copyright and license text", () => {
    render(<Layout>{null}</Layout>)
    expect(screen.getByText("© 2026 Michael Harding")).toBeInTheDocument()
    expect(screen.getByText("AGPLv3")).toBeInTheDocument()
  })

  it("renders a Source on GitHub link pointing at the repository", () => {
    render(<Layout>{null}</Layout>)
    const link = screen.getByTestId("source-link")
    expect(link).toHaveAttribute("href", "https://github.com/michael-harding/TabulaPersonae")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(link).toHaveTextContent("Source on GitHub")
  })

  it("wraps children in SyncContext so descendants can read/set sync state", () => {
    render(
      <Layout>
        <SyncConsumer />
      </Layout>
    )
    expect(screen.getByTestId("sync-consumer")).toHaveTextContent("has-context:null")
  })

  it("renders without crashing alongside the OfflineIndicator it mounts", () => {
    render(<Layout>{null}</Layout>)
    // OfflineIndicator only shows its pill while offline/syncing; jsdom reports online by
    // default, so the component mounts and renders nothing visible without throwing.
    expect(screen.queryByTestId("offline-indicator")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Layout>
        <div>Some page content</div>
      </Layout>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

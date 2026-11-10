import { axe } from "vitest-axe"

import { StatBadge, StatBadgeGroup } from "@/components/ui/stat-badge"

import { render, screen, fireEvent, waitFor, cleanup, cleanupPortals } from "../../test-utils"

describe("StatBadge", () => {
  afterEach(() => {
    cleanup()
    cleanupPortals()
  })

  it("shows its label above its value", () => {
    render(() => <StatBadge data-test="badge" label="Attack" value="+5" />)
    const [first, second] = screen.getByTestId("badge").children
    expect(first).toHaveTextContent("Attack")
    expect(second).toHaveTextContent("+5")
    expect(second).toHaveClass("font-semibold")
  })

  it("shows its value above its label with valueFirst", () => {
    render(() => <StatBadge data-test="badge" label="Fire" value="2d6" valueFirst />)
    const [first, second] = screen.getByTestId("badge").children
    expect(first).toHaveTextContent("2d6")
    expect(first).toHaveClass("font-semibold")
    expect(second).toHaveTextContent("Fire")
  })

  it.each([
    [undefined, "border-border"],
    ["neutral", "border-border"],
    ["damage", "border-red-500"],
    ["gain", "border-green-500"],
    ["tempHp", "border-blue-500"],
  ] as const)("takes its colours from the %s tone", (tone, border) => {
    render(() => <StatBadge data-test="badge" tone={tone} label="L" value="V" />)
    expect(screen.getByTestId("badge")).toHaveClass(border)
  })

  it("has no tooltip trigger without a tooltip", () => {
    render(() => <StatBadge data-test="badge" label="Attack" value="+5" />)
    expect(screen.queryByRole("group")).not.toBeInTheDocument()
  })

  it("becomes a named, focusable tooltip trigger with a tooltip", async () => {
    render(() => <StatBadge data-test="badge" label="Attack" value="+6" tooltip="+3 (Int) + 3 (Prof)" tooltipLabel="Attack +6" />)
    const trigger = screen.getByRole("group", { name: "Attack +6" })
    expect(trigger).toHaveAttribute("tabindex", "0")
    expect(trigger).toContainElement(screen.getByTestId("badge"))
    fireEvent.focus(trigger)
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("+3 (Int) + 3 (Prof)"))
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => (
      <StatBadgeGroup>
        <StatBadge data-test="a" label="Attack" value="+6" tooltip="+3 (Int) + 3 (Prof)" tooltipLabel="Attack +6" />
        <StatBadge data-test="b" tone="damage" label="Fire" value="2d6" valueFirst />
      </StatBadgeGroup>
    ))
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

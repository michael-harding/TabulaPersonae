import { render, screen, fireEvent } from "../../test-utils"
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

function TestTabs(props: { defaultValue?: string }) {
  return (
    <TabsRoot defaultValue={props.defaultValue ?? "first"}>
      <TabsList>
        <TabsTrigger value="first">First</TabsTrigger>
        <TabsTrigger value="second">Second</TabsTrigger>
        <TabsTrigger value="third">Third</TabsTrigger>
      </TabsList>
      <TabsContent value="first">First panel content</TabsContent>
      <TabsContent value="second">Second panel content</TabsContent>
      <TabsContent value="third">Third panel content</TabsContent>
    </TabsRoot>
  )
}

describe("Tabs", () => {
  it("renders all tab triggers", () => {
    render(<TestTabs />)
    expect(screen.getByRole("tab", { name: "First" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Second" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Third" })).toBeInTheDocument()
  })

  it("renders the tab list", () => {
    render(<TestTabs />)
    expect(screen.getByRole("tablist")).toBeInTheDocument()
  })

  it("shows the default tab panel content on load", () => {
    render(<TestTabs defaultValue="first" />)
    expect(screen.getByText("First panel content")).toBeInTheDocument()
    expect(screen.queryByText("Second panel content")).not.toBeInTheDocument()
    expect(screen.queryByText("Third panel content")).not.toBeInTheDocument()
  })

  it("shows content for the active tab after clicking a non-first tab", () => {
    render(<TestTabs defaultValue="first" />)
    fireEvent.click(screen.getByRole("tab", { name: "Second" }))
    expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute("data-selected")
    expect(screen.getByRole("tab", { name: "First" })).not.toHaveAttribute("data-selected")
  })

  it("shows the selected tab's panel content when a trigger is clicked", () => {
    render(<TestTabs defaultValue="first" />)
    fireEvent.click(screen.getByRole("tab", { name: "Second" }))
    // Kobalte keeps previously-visited panels mounted; check the new tab's content is present
    expect(screen.getByText("Second panel content")).toBeInTheDocument()
  })

  it("does not render unvisited tab panels", () => {
    render(<TestTabs defaultValue="first" />)
    expect(screen.queryByText("Second panel content")).not.toBeInTheDocument()
    expect(screen.queryByText("Third panel content")).not.toBeInTheDocument()
  })

  it("marks the default trigger as selected", () => {
    render(<TestTabs defaultValue="first" />)
    expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute("data-selected")
  })

  it("updates the selected trigger after a click", () => {
    render(<TestTabs defaultValue="first" />)
    fireEvent.click(screen.getByRole("tab", { name: "Third" }))
    expect(screen.getByRole("tab", { name: "Third" })).toHaveAttribute("data-selected")
    expect(screen.getByRole("tab", { name: "First" })).not.toHaveAttribute("data-selected")
  })
})

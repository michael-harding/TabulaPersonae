import { axe } from "vitest-axe"

import { PipTracker } from "@/components/ui/pip-tracker"

import { render, screen, fireEvent } from "../../test-utils"

describe("PipTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the correct number of buttons for total", () => {
    render(() => <PipTracker data-test="slots" total={4} used={0} onToggle={vi.fn()} />)
    expect(screen.getAllByRole("button")).toHaveLength(4)
  })

  it("renders used pips with the default used title", () => {
    render(() => <PipTracker data-test="slots" total={3} used={2} onToggle={vi.fn()} />)
    expect(screen.getAllByLabelText("Used slot (click to restore)")).toHaveLength(2)
  })

  it("renders available pips with the default available title", () => {
    render(() => <PipTracker data-test="slots" total={3} used={2} onToggle={vi.fn()} />)
    expect(screen.getAllByLabelText("Available slot (click to use)")).toHaveLength(1)
  })

  it("accepts custom usedTitle and availableTitle props", () => {
    render(() => (
      <PipTracker
        data-test="slots"
        total={2}
        used={1}
        onToggle={vi.fn()}
        usedTitle="Charge spent (click to restore)"
        availableTitle="Charge available (click to use)"
      />
    ))
    expect(screen.getByLabelText("Charge spent (click to restore)")).toBeInTheDocument()
    expect(screen.getByLabelText("Charge available (click to use)")).toBeInTheDocument()
  })

  it("calls onToggle with used + 1 when clicking an available pip", () => {
    const onToggle = vi.fn()
    render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByLabelText("Available slot (click to use)")[0])
    expect(onToggle).toHaveBeenCalledWith(2)
  })

  it("calls onToggle with used - 1 when clicking a used pip", () => {
    const onToggle = vi.fn()
    render(() => <PipTracker data-test="slots" total={3} used={2} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByLabelText("Used slot (click to restore)")[0])
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it("clamps at total when clicking the last available pip", () => {
    const onToggle = vi.fn()
    render(() => <PipTracker data-test="slots" total={3} used={2} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText("Available slot (click to use)"))
    expect(onToggle).toHaveBeenCalledWith(3)
  })

  it("calls onToggle with 0 when clicking the only used pip", () => {
    const onToggle = vi.fn()
    render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText("Used slot (click to restore)"))
    expect(onToggle).toHaveBeenCalledWith(0)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={vi.fn()} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  // TESTING.md §6: several trackers share a page, so each slot's hook comes from its tracker's
  it("names its slots after its own data-test, so two trackers on a page stay apart", () => {
    render(() => (
      <>
        <PipTracker data-test="death-save-successes" total={3} used={0} onToggle={vi.fn()} />
        <PipTracker data-test="death-save-failures" total={3} used={0} onToggle={vi.fn()} />
      </>
    ))
    expect(screen.getByTestId("death-save-successes")).toBeInTheDocument()
    for (const tracker of ["death-save-successes", "death-save-failures"]) {
      for (const slot of [0, 1, 2]) expect(screen.getByTestId(`${tracker}-slot-${slot}`)).toBeInTheDocument()
    }
  })

  // ACCESSIBILITY.md §9: colour must not be the only difference between used and available
  describe("icon", () => {
    const CustomIcon = (props: { class?: string; "aria-hidden"?: boolean | "true" | "false" }) => (
      <svg class={`custom-icon ${props.class ?? ""}`} aria-hidden={props["aria-hidden"]} />
    )
    const slot = (index: number) => screen.getByTestId(`slots-slot-${index}`)

    it("draws a sparkle on available pips and nothing on used ones by default", () => {
      render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={vi.fn()} />)
      expect(slot(0).querySelector("svg")).toBeNull()
      expect(slot(1).querySelector(".lucide-sparkle")).not.toBeNull()
      expect(slot(2).querySelector(".lucide-sparkle")).not.toBeNull()
    })

    it("draws the icon it is given on available pips", () => {
      render(() => <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} icon={CustomIcon} />)
      expect(slot(0).querySelector("svg")).toBeNull()
      expect(slot(1).querySelector(".custom-icon")).not.toBeNull()
      expect(slot(1).querySelector(".lucide-sparkle")).toBeNull()
    })

    it("draws no icon when told to, for a tracker that marks its states another way", () => {
      render(() => <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} icon={null} />)
      expect(slot(1).querySelector("svg")).toBeNull()
    })

    it("hides the icon from assistive tech, since the slot's own name says its state", () => {
      render(() => <PipTracker data-test="slots" total={1} used={0} onToggle={vi.fn()} icon={CustomIcon} />)
      expect(slot(0).querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    })

    it("draws the icon on read-only pips too", () => {
      render(() => <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} icon={CustomIcon} readOnly />)
      expect(slot(0).querySelector("svg")).toBeNull()
      expect(slot(1).querySelector(".custom-icon")).not.toBeNull()
    })

    it("still draws filledIcon on used pips", () => {
      render(() => (
        <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} icon={null} filledIcon={<svg class="filled-icon" aria-hidden="true" />} />
      ))
      expect(slot(0).querySelector(".filled-icon")).not.toBeNull()
      expect(slot(1).querySelector("svg")).toBeNull()
    })

    it("has no accessibility violations with an icon", async () => {
      const { container } = render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={vi.fn()} icon={CustomIcon} />)
      expect((await axe(container)).violations).toHaveLength(0)
    })
  })

  describe("readOnly mode", () => {
    it("renders no buttons when readOnly=true", () => {
      render(() => <PipTracker data-test="slots" total={4} used={1} onToggle={vi.fn()} readOnly />)
      expect(screen.queryAllByRole("button")).toHaveLength(0)
    })

    it("does not call onToggle when pips are clicked", () => {
      const onToggle = vi.fn()
      render(() => (
        <PipTracker data-test="slots" total={3} used={1} onToggle={onToggle} readOnly />
      ))
      screen.getAllByTestId(/^slots-slot-/).forEach((pip) =>
        fireEvent.click(pip)
      )
      expect(onToggle).not.toHaveBeenCalled()
    })

    // A read-only slot cannot be clicked, so its name says only what it shows
    it("names read-only slots by their state, without mentioning clicking", () => {
      render(() => <PipTracker data-test="slots" total={3} used={1} onToggle={vi.fn()} readOnly />)
      expect(screen.getAllByRole("img", { name: "Used slot" })).toHaveLength(1)
      expect(screen.getAllByRole("img", { name: "Available slot" })).toHaveLength(2)
      for (const slot of screen.getAllByRole("img")) expect(slot.getAttribute("aria-label")).not.toMatch(/click/i)
    })

    it("uses the read-only labels it is given", () => {
      render(() => (
        <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} readOnly
          usedTitle="Charge spent (click to restore)" availableTitle="Charge available (click to use)"
          usedLabel="Charge spent" availableLabel="Charge available" />
      ))
      expect(screen.getByRole("img", { name: "Charge spent" })).toBeInTheDocument()
      expect(screen.getByRole("img", { name: "Charge available" })).toBeInTheDocument()
    })

    it("keeps the clickable labels when not read-only", () => {
      render(() => <PipTracker data-test="slots" total={2} used={1} onToggle={vi.fn()} usedLabel="Used" availableLabel="Free" />)
      expect(screen.getByRole("button", { name: "Used slot (click to restore)" })).toBeInTheDocument()
    })

    it("renders the correct number of pip spans", () => {
      render(() => (
        <PipTracker data-test="slots" total={4} used={2} onToggle={vi.fn()} readOnly />
      ))
      expect(screen.getAllByTestId(/^slots-slot-/)).toHaveLength(4)
    })
  })
})

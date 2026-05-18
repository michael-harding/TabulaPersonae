import { render, screen, fireEvent } from "../../test-utils"
import { PipTracker } from "@/components/ui/pip-tracker"

describe("PipTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the correct number of buttons for total", () => {
    render(<PipTracker total={4} used={0} onToggle={vi.fn()} />)
    expect(screen.getAllByRole("button")).toHaveLength(4)
  })

  it("renders used pips with the default used title", () => {
    render(<PipTracker total={3} used={2} onToggle={vi.fn()} />)
    expect(screen.getAllByTitle("Used slot (click to restore)")).toHaveLength(2)
  })

  it("renders available pips with the default available title", () => {
    render(<PipTracker total={3} used={2} onToggle={vi.fn()} />)
    expect(screen.getAllByTitle("Available slot (click to use)")).toHaveLength(1)
  })

  it("accepts custom usedTitle and availableTitle props", () => {
    render(
      <PipTracker
        total={2}
        used={1}
        onToggle={vi.fn()}
        usedTitle="Charge spent (click to restore)"
        availableTitle="Charge available (click to use)"
      />
    )
    expect(screen.getByTitle("Charge spent (click to restore)")).toBeInTheDocument()
    expect(screen.getByTitle("Charge available (click to use)")).toBeInTheDocument()
  })

  it("calls onToggle with used + 1 when clicking an available pip", () => {
    const onToggle = vi.fn()
    render(<PipTracker total={3} used={1} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByTitle("Available slot (click to use)")[0])
    expect(onToggle).toHaveBeenCalledWith(2)
  })

  it("calls onToggle with used - 1 when clicking a used pip", () => {
    const onToggle = vi.fn()
    render(<PipTracker total={3} used={2} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByTitle("Used slot (click to restore)")[0])
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it("clamps at total when clicking the last available pip", () => {
    const onToggle = vi.fn()
    render(<PipTracker total={3} used={2} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle("Available slot (click to use)"))
    expect(onToggle).toHaveBeenCalledWith(3)
  })

  it("calls onToggle with 0 when clicking the only used pip", () => {
    const onToggle = vi.fn()
    render(<PipTracker total={3} used={1} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle("Used slot (click to restore)"))
    expect(onToggle).toHaveBeenCalledWith(0)
  })
})

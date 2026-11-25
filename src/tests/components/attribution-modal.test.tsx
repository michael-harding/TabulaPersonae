import { axe } from "vitest-axe"

import { AttributionModal } from "@/components/attribution-modal"

import { render, screen, fireEvent, within, cleanupPortals } from "../test-utils"

const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/legalcode"

describe("AttributionModal", () => {
  beforeEach(() => {
    cleanupPortals()
  })

  const openDialog = () => {
    render(() => <AttributionModal />)
    fireEvent.click(screen.getByRole("button", { name: "Attribution" }))
    return screen.getByRole("dialog", { name: "Attribution" })
  }

  it("shows only its trigger until opened", () => {
    render(() => <AttributionModal />)
    expect(screen.getByRole("button", { name: "Attribution" })).toHaveAttribute("aria-haspopup", "dialog")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens a dialog titled Attribution, described by its intro", () => {
    const dialog = openDialog()
    const descriptionId = dialog.getAttribute("aria-describedby")
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      "TabulaPersonae uses game rules material from these sources.",
    )
  })

  // The statements are the ones each SRD's legal page asks for, word for word (CC BY 4.0).
  it.each([
    {
      id: "attribution-srd-5-2-1",
      text:
        "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, " +
        "available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 " +
        `International License, available at ${CC_BY_4}.`,
      links: ["https://www.dndbeyond.com/srd", CC_BY_4],
    },
    {
      id: "attribution-srd-5-1",
      text:
        "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC " +
        "and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the " +
        `Creative Commons Attribution 4.0 International License available at ${CC_BY_4}.`,
      links: ["https://dnd.wizards.com/resources/systems-reference-document", CC_BY_4],
    },
  ])("gives the $id statement verbatim, its URLs linked to new tabs", ({ id, text, links }) => {
    const statement = within(openDialog()).getByTestId(id)
    expect(statement.textContent?.replace(/\s+/g, " ").trim()).toBe(text)
    const anchors = within(statement).getAllByRole("link")
    expect(anchors.map((a) => a.getAttribute("href"))).toEqual(links)
    for (const anchor of anchors) {
      // The full stop after it sits inside the link's box, outside its underline (see below)
      expect(anchor).toHaveTextContent(`${anchor.getAttribute("href")}.`)
      expect(anchor).toHaveAttribute("target", "_blank")
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer")
    }
  })

  it("names the edition of the rules each document covers", () => {
    const dialog = openDialog()
    expect(within(dialog).getByRole("heading", { name: "System Reference Document 5.2.1 (2024 rules)" })).toBeInTheDocument()
    expect(within(dialog).getByRole("heading", { name: "System Reference Document 5.1 (2014 rules)" })).toBeInTheDocument()
  })

  it("states that the app is not affiliated with Wizards of the Coast", () => {
    expect(within(openDialog()).getByText(/not affiliated with or endorsed by Wizards of the Coast/)).toBeInTheDocument()
  })

  // jsdom does no layout: the URLs are wider than a phone's line, so they must be able to break,
  // and tests/e2e/touch-targets.spec.ts checks the boxes that result.
  it("gives each link a 44px-tall box whose URL may break anywhere, underlining only the URL", () => {
    for (const link of within(openDialog()).getAllByRole("link")) {
      expect(link).toHaveClass("inline-block", "min-h-11", "py-3", "[overflow-wrap:anywhere]")
      expect(link).not.toHaveClass("underline")
      expect(within(link).getByText(link.getAttribute("href")!)).toHaveClass("underline")
    }
  })

  // The dialog stays mounted until its exit animation ends, which jsdom never fires, so this reads
  // the open state from the trigger (taken before opening: the modal hides the page behind it).
  it("closes from its close button", () => {
    render(() => <AttributionModal />)
    const trigger = screen.getByRole("button", { name: "Attribution" })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dismiss" }))
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("has no accessibility violations when open", async () => {
    openDialog()
    // The dialog is portaled to document.body, outside the render container
    const results = await axe(document.body)
    expect(results.violations).toHaveLength(0)
  })
})

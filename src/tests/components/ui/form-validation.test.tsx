import { axe } from "vitest-axe"
import { createSignal } from "solid-js"

import { FieldError, FormErrorSummary, RequiredLegend } from "@/components/ui/form-validation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requiredText, useFormValidation } from "@/hooks/use-form-validation"

import { render, screen, fireEvent } from "../../test-utils"

/** A two-field form wired up the way the standard says (see form-validation.tsx). */
function TestForm(props: { onSave: () => void }) {
  const [name, setName] = createSignal("")
  const [trigger, setTrigger] = createSignal("")
  const validation = useFormValidation(() => [
    requiredText("test-name", "Name", name()),
    requiredText("test-trigger", "Trigger", trigger()),
  ])
  return (
    <div>
      <RequiredLegend />
      <FormErrorSummary validation={validation} />
      <Label for="test-name" required>Name</Label>
      <Input id="test-name" data-test="test-name" required value={name()} onInput={(e) => setName(e.currentTarget.value)} {...validation.controlProps("test-name")} />
      <FieldError validation={validation} fieldId="test-name" />
      <Label for="test-trigger" required>Trigger</Label>
      <Input id="test-trigger" data-test="test-trigger" required value={trigger()} onInput={(e) => setTrigger(e.currentTarget.value)} {...validation.controlProps("test-trigger")} />
      <FieldError validation={validation} fieldId="test-trigger" />
      <button type="button" data-test="save" onClick={() => { if (validation.validate()) props.onSave() }}>Save</button>
    </div>
  )
}

function renderForm() {
  const onSave = vi.fn()
  const result = render(() => <TestForm onSave={onSave} />)
  return { onSave, ...result }
}

describe("form validation UI", () => {
  it("explains the required-field asterisk", () => {
    renderForm()
    expect(screen.getByTestId("required-legend")).toHaveTextContent("Fields marked * are required")
  })

  it("says every field is required when told they all are", () => {
    render(() => <RequiredLegend all />)
    expect(screen.getByTestId("required-legend")).toHaveTextContent("All fields are required")
  })

  it("shows no errors before the first submit attempt", () => {
    renderForm()
    expect(screen.queryByTestId("form-error-summary")).not.toBeInTheDocument()
    expect(screen.queryByTestId("field-error-test-name")).not.toBeInTheDocument()
    expect(screen.getByTestId("test-name")).not.toHaveAttribute("aria-invalid")
  })

  it("on a failed submit, lists every issue in a focused alert and does not save", () => {
    const { onSave } = renderForm()
    fireEvent.click(screen.getByTestId("save"))
    const summary = screen.getByTestId("form-error-summary")
    expect(summary).toHaveAttribute("role", "alert")
    expect(summary).toHaveFocus()
    expect(summary).toHaveTextContent("Name is required")
    expect(summary).toHaveTextContent("Trigger is required")
    expect(onSave).not.toHaveBeenCalled()
  })

  it("shows each message beside its field, linked to the field as its description", () => {
    renderForm()
    fireEvent.click(screen.getByTestId("save"))
    const field = screen.getByTestId("test-trigger")
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveAccessibleDescription("Trigger is required")
    expect(screen.getByTestId("field-error-test-trigger")).toHaveTextContent("Trigger is required")
  })

  it("moves focus to a field from its entry in the summary", () => {
    renderForm()
    fireEvent.click(screen.getByTestId("save"))
    fireEvent.click(screen.getByTestId("form-error-summary-test-trigger"))
    expect(screen.getByTestId("test-trigger")).toHaveFocus()
  })

  it("clears a field's message as soon as it is fixed, and saves once all are", () => {
    const { onSave } = renderForm()
    fireEvent.click(screen.getByTestId("save"))
    fireEvent.input(screen.getByTestId("test-name"), { target: { value: "Shield" } })
    expect(screen.queryByTestId("field-error-test-name")).not.toBeInTheDocument()
    expect(screen.getByTestId("test-name")).not.toHaveAttribute("aria-invalid")
    expect(screen.getByTestId("form-error-summary")).not.toHaveTextContent("Name is required")
    fireEvent.input(screen.getByTestId("test-trigger"), { target: { value: "When hit" } })
    expect(screen.queryByTestId("form-error-summary")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("save"))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("focuses the summary again on each further failed attempt", () => {
    renderForm()
    fireEvent.click(screen.getByTestId("save"))
    screen.getByTestId("test-name").focus()
    fireEvent.click(screen.getByTestId("save"))
    expect(screen.getByTestId("form-error-summary")).toHaveFocus()
  })

  it("makes a field's message the alert itself only when told to announce it", () => {
    const [value] = createSignal("")
    render(() => {
      const validation = useFormValidation(() => [requiredText("solo", "Tab name", value())])
      validation.validate()
      return (
        <>
          <FieldError validation={validation} fieldId="solo" announce />
          <FieldError validation={validation} fieldId="solo" />
        </>
      )
    })
    expect(screen.getAllByText("Tab name is required").map((el) => el.getAttribute("role"))).toEqual(["alert", null])
  })

  it("keeps the asterisk out of the label's accessible name", () => {
    renderForm()
    expect(screen.getByRole("textbox", { name: "Name" })).toBeRequired()
    expect(screen.getByTestId("required-mark-test-name")).toHaveAttribute("aria-hidden", "true")
  })

  it("has no accessibility violations before or after a failed submit", async () => {
    const { container } = renderForm()
    expect((await axe(container)).violations).toHaveLength(0)
    fireEvent.click(screen.getByTestId("save"))
    expect((await axe(container)).violations).toHaveLength(0)
  })
})

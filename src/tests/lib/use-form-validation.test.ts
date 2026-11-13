import { createRoot, createSignal } from "solid-js"

import { requiredText, useFormValidation } from "@/hooks/use-form-validation"

function setup(initial = { name: "", trigger: "" }) {
  const [data, setData] = createSignal(initial)
  let dispose = () => {}
  const validation = createRoot((d) => {
    dispose = d
    return useFormValidation(() => [
      requiredText("name", "Name", data().name),
      requiredText("trigger", "Trigger", data().trigger),
    ])
  })
  return { validation, setData, dispose }
}

describe("requiredText", () => {
  it.each([
    { label: "an empty value", value: "" },
    { label: "only whitespace", value: "   " },
    { label: "undefined", value: undefined },
  ])("reports $label as missing", ({ value }) => {
    expect(requiredText("name", "Name", value)).toEqual({ fieldId: "name", message: "Name is required" })
  })

  it("accepts any non-blank text", () => {
    expect(requiredText("name", "Name", " Shield ")).toBeUndefined()
  })
})

describe("useFormValidation", () => {
  it("shows nothing before the first submit attempt, even with failing checks", () => {
    const { validation, dispose } = setup()
    expect(validation.issues()).toEqual([])
    expect(validation.error("name")).toBeUndefined()
    expect(validation.controlProps("name")).toEqual({})
    dispose()
  })

  it("blocks a submit that fails a check and shows every issue in field order", () => {
    const { validation, dispose } = setup()
    expect(validation.validate()).toBe(false)
    expect(validation.issues()).toEqual([
      { fieldId: "name", message: "Name is required" },
      { fieldId: "trigger", message: "Trigger is required" },
    ])
    expect(validation.error("trigger")).toBe("Trigger is required")
    dispose()
  })

  it("allows a submit when every check passes", () => {
    const { validation, dispose } = setup({ name: "Shield", trigger: "When hit" })
    expect(validation.validate()).toBe(true)
    expect(validation.issues()).toEqual([])
    dispose()
  })

  it("updates the issues live after a failed attempt, clearing each as its field is fixed", () => {
    const { validation, setData, dispose } = setup()
    validation.validate()
    setData({ name: "Shield", trigger: "" })
    expect(validation.issues()).toEqual([{ fieldId: "trigger", message: "Trigger is required" }])
    setData({ name: "", trigger: "" })
    expect(validation.error("name")).toBe("Name is required")
    dispose()
  })

  it("marks a field in error invalid and describes it by its message, keeping its own description", () => {
    const { validation, dispose } = setup({ name: "Shield", trigger: "" })
    validation.validate()
    expect(validation.controlProps("trigger")).toEqual({ "aria-invalid": "true", "aria-describedby": "trigger-error" })
    expect(validation.controlProps("trigger", "trigger-hint")).toEqual({ "aria-invalid": "true", "aria-describedby": "trigger-hint trigger-error" })
    expect(validation.controlProps("name", "name-hint")).toEqual({ "aria-describedby": "name-hint" })
    expect(validation.errorId("trigger")).toBe("trigger-error")
    dispose()
  })

  it("counts every submit attempt", () => {
    const { validation, dispose } = setup()
    validation.validate()
    validation.validate()
    expect(validation.attempts()).toBe(2)
    dispose()
  })

  it("hides the issues again on reset until the next attempt", () => {
    const { validation, dispose } = setup()
    validation.validate()
    validation.reset()
    expect(validation.issues()).toEqual([])
    validation.validate()
    expect(validation.issues()).toHaveLength(2)
    dispose()
  })

  it("skips falsy entries, for checks that apply only sometimes", () => {
    let dispose = () => {}
    const validation = createRoot((d) => {
      dispose = d
      return useFormValidation(() => [false, null, undefined, requiredText("name", "Name", "")])
    })
    validation.validate()
    expect(validation.issues()).toEqual([{ fieldId: "name", message: "Name is required" }])
    dispose()
  })
})

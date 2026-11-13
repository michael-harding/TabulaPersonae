import { createMemo, createSignal, type Accessor } from "solid-js"

/** One failed check: the id of the control it belongs to, and the message to show for it. */
export interface ValidationIssue {
  fieldId: string
  message: string
}

/** The issue for a required text field left blank (whitespace counts as blank), if it is. */
export function requiredText(fieldId: string, label: string, value: string | undefined): ValidationIssue | undefined {
  return value?.trim() ? undefined : { fieldId, message: `${label} is required` }
}

export interface FormValidation {
  /** The issues to show, in field order: none until the first submit attempt, then live as the user edits. */
  issues: Accessor<ValidationIssue[]>
  /** The message to show beside a field, if it has one. */
  error: (fieldId: string) => string | undefined
  /** The id of a field's error message element (FieldError renders it with this id). */
  errorId: (fieldId: string) => string
  /**
   * Spread onto the control: marks it invalid and points aria-describedby at its error message.
   * Pass the control's own aria-describedby, if any, so it is kept.
   */
  controlProps: (fieldId: string, describedBy?: string) => { "aria-invalid"?: "true"; "aria-describedby"?: string }
  /** Counts submit attempts; FormErrorSummary moves focus to itself on each failed one. */
  attempts: Accessor<number>
  /** Call on submit, and save only when it returns true: every check passes. Otherwise the issues show. */
  validate: () => boolean
  /** Hides the issues again until the next submit attempt: for a form that is reloaded with new data. */
  reset: () => void
}

/**
 * The validation state of a form, implementing ACCESSIBILITY.md §11. `check` returns every issue
 * with the form as it is now, in the order the fields appear (falsy entries are skipped, so a list
 * of `requiredText(...)` calls works as is). Nothing is shown until the user first tries to submit:
 * from then on each message updates as they edit, and clears when the field is fixed. Pair it with
 * FormErrorSummary and FieldError (`@/components/ui/form-validation`) and a `required` Label.
 */
export function useFormValidation(check: () => (ValidationIssue | undefined | false | null)[]): FormValidation {
  const [attempts, setAttempts] = createSignal(0)
  const all = createMemo(() => check().filter((issue): issue is ValidationIssue => !!issue))
  const issues = createMemo(() => (attempts() > 0 ? all() : []))
  const errorId = (fieldId: string) => `${fieldId}-error`
  const error = (fieldId: string) => issues().find((issue) => issue.fieldId === fieldId)?.message

  return {
    issues,
    error,
    errorId,
    controlProps: (fieldId, describedBy) => {
      if (!error(fieldId)) return describedBy ? { "aria-describedby": describedBy } : {}
      return { "aria-invalid": "true", "aria-describedby": [describedBy, errorId(fieldId)].filter(Boolean).join(" ") }
    },
    attempts,
    validate: () => {
      setAttempts((n) => n + 1)
      return all().length === 0
    },
    reset: () => setAttempts(0),
  }
}

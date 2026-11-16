import { createEffect, For, on, Show } from "solid-js"
import CircleAlert from "lucide-solid/icons/circle-alert"

import type { FormValidation } from "@/hooks/use-form-validation"
import { cn } from "@/lib/utils"

// The UI half of the form validation standard (ACCESSIBILITY.md §11); the state lives in
// useFormValidation. A form with a required field shows RequiredLegend and FormErrorSummary at its
// top, marks each required field's Label `required` and its control `required`, spreads
// `validation.controlProps(id)` onto the control, and puts a FieldError right after it. The submit
// button stays enabled, and the form saves only when `validation.validate()` returns true: a
// disabled button would not say why. A form of a single field uses the lighter form described on
// FieldError.

/**
 * The legend explaining the asterisk that a `required` Label shows. With `all`, it says instead that
 * every field is required, for a form whose fields all are: their Labels then show no asterisk.
 */
export function RequiredLegend(props: { all?: boolean; class?: string }) {
  return (
    <p data-test="required-legend" class={cn("text-xs text-muted-foreground", props.class)}>
      <Show when={!props.all} fallback="All fields are required">
        Fields marked <span class="text-destructive-text">*</span> are required
      </Show>
    </p>
  )
}

/**
 * The list of everything to fix, shown above the form after a failed submit. It takes focus on each
 * failed attempt and is a live region (role="alert"), so a screen reader announces it at once; each
 * entry moves focus to its field. The field messages themselves are not live as well: they would
 * be announced a second time, on top of the summary.
 */
export function FormErrorSummary(props: { validation: FormValidation; class?: string }) {
  let ref: HTMLDivElement | undefined
  const issues = () => props.validation.issues()

  createEffect(on(() => props.validation.attempts(), () => {
    if (issues().length > 0) ref?.focus()
  }, { defer: true }))

  // Rendered only while there are issues: an empty role="alert" would still read as an error to
  // anything that looks for one. Screen readers announce an alert as it is inserted, and it takes
  // focus besides, so it does not need to be in place beforehand like a polite live region.
  return (
    <Show when={issues().length > 0}>
      <div
        ref={ref}
        role="alert"
        tabindex="-1"
        data-test="form-error-summary"
        class={cn(
          "rounded-md border border-destructive p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          props.class,
        )}
      >
        <p class="flex items-center gap-2 font-medium">
          <CircleAlert class="h-4 w-4 shrink-0 text-destructive-text" aria-hidden="true" />
          Please fix the following:
        </p>
        <ul class="mt-1 pl-6">
          <For each={issues()}>
            {(issue) => (
              <li>
                <button
                  type="button"
                  data-test={`form-error-summary-${issue.fieldId}`}
                  class="inline-flex min-h-11 items-center text-left text-destructive-text underline underline-offset-4"
                  onClick={() => document.getElementById(issue.fieldId)?.focus()}
                >
                  {issue.message}
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  )
}

/**
 * A field's error message, placed right after its control; the control points to it via `controlProps`.
 *
 * `announce` is for a form of a single field, which has no FormErrorSummary or RequiredLegend: the
 * message is then the alert itself, and on a failed submit focus stays in (or returns to) the field.
 */
export function FieldError(props: { validation: FormValidation; fieldId: string; announce?: boolean; class?: string }) {
  return (
    <Show when={props.validation.error(props.fieldId)}>
      {(message) => (
        <p
          role={props.announce ? "alert" : undefined}
          id={props.validation.errorId(props.fieldId)}
          data-test={`field-error-${props.fieldId}`}
          class={cn("mt-1 flex items-center gap-1.5 text-sm text-destructive-text", props.class)}
        >
          <CircleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
          {message()}
        </p>
      )}
    </Show>
  )
}

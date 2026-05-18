interface SwitchButtonProps {
  optionA: string
  optionB: string
  value: string
  onChange: (value: string) => void
  id?: string
}

const LABEL = "inline-flex items-center justify-center h-6 px-3 text-xs font-semibold tracking-wide transition-all rounded-full cursor-pointer"

export function SwitchButton(props: SwitchButtonProps) {
  const inputId = props.id ?? "switch-button"
  const isB = () => props.value === props.optionB

  return (
    <div class="inline-flex items-center rounded-full bg-muted p-0.5">
      <input
        class="sr-only"
        type="checkbox"
        id={inputId}
        checked={isB()}
        onChange={(e) => props.onChange(e.currentTarget.checked ? props.optionB : props.optionA)}
      />
      <label
        class={`${LABEL} ${!isB() ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        for={inputId}
      >
        {props.optionA}
      </label>
      <label
        class={`${LABEL} ${isB() ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        for={inputId}
      >
        {props.optionB}
      </label>
    </div>
  )
}

import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"
import Edit from "lucide-solid/icons/edit"
import Check from "lucide-solid/icons/check"
import X from "lucide-solid/icons/x"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { useReadOnly } from "@/lib/read-only-context"

interface EditableModuleProps extends ParentProps {
  icon: JSX.Element
  title: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onSaveKeepEditing: () => void
  onCancel: () => void
  headerExtra?: JSX.Element
  contentClass?: string
  "data-sem"?: string
  /** Page-unique; also prefixes the edit/save/cancel/content ids. */
  "data-test": string
}

export function EditableModule(props: EditableModuleProps) {
  const isReadOnly = useReadOnly()

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isEditing) return
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key.toLowerCase() === "s") {
      e.preventDefault()
      props.onSaveKeepEditing()
    } else if (e.key === "Enter") {
      e.preventDefault()
      props.onSave()
    }
  }

  return (
    <Card data-sem={props["data-sem"]} data-test={props["data-test"]} onKeyDown={handleKeyDown}>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            {props.icon}
            {props.title}
            {!props.isEditing && props.headerExtra}
          </div>
          <Show when={!isReadOnly}>
            {props.isEditing ? (
              <div class="flex gap-1">
                <Tooltip content="Cancel">
                  <Button data-test={`${props["data-test"]}-cancel`} variant="outline" size="sm" aria-label="Cancel" onClick={props.onCancel} class="hover:!border-red-500 hover:!text-red-500 hover:!bg-red-500/30">
                    <X class="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip content="Save changes">
                  <Button data-test={`${props["data-test"]}-save`} variant="outline" size="sm" aria-label="Save changes" onClick={props.onSave} class="border-green-500 text-green-500 hover:!bg-green-500/30 hover:!text-green-500">
                    <Check class="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip content="Edit">
                <Button data-test={`${props["data-test"]}-edit`} variant="outline" size="sm" aria-label="Edit" onClick={props.onEdit}>
                  <Edit class="h-4 w-4" aria-hidden="true" />
                </Button>
              </Tooltip>
            )}
          </Show>
        </CardTitle>
      </CardHeader>
      <CardContent data-test={`${props["data-test"]}-content`} class={props.contentClass}>
        {props.children}
      </CardContent>
    </Card>
  )
}

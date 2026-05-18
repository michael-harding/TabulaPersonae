import type { JSX, ParentProps } from "solid-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import Edit from "lucide-solid/icons/edit"
import Check from "lucide-solid/icons/check"
import X from "lucide-solid/icons/x"

interface EditableSectionProps extends ParentProps {
  icon: JSX.Element
  title: string
  editTitle?: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  headerExtra?: JSX.Element
  contentClass?: string
}

export function EditableSection(props: EditableSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            {props.icon}
            {props.isEditing ? (props.editTitle ?? props.title) : props.title}
            {!props.isEditing && props.headerExtra}
          </div>
          {props.isEditing ? (
            <div class="flex gap-1">
              <Tooltip content="Cancel">
                <Button variant="outline" size="sm" aria-label="Cancel" onClick={props.onCancel} class="hover:!border-red-500 hover:!text-red-500 hover:!bg-red-500/30">
                  <X class="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Save changes">
                <Button variant="outline" size="sm" aria-label="Save changes" onClick={props.onSave} class="border-green-500 text-green-500 hover:!bg-green-500/30 hover:!text-green-500">
                  <Check class="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          ) : (
            <Tooltip content="Edit">
              <Button variant="outline" size="sm" aria-label="Edit" onClick={props.onEdit}>
                <Edit class="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent class={props.contentClass}>
        {props.children}
      </CardContent>
    </Card>
  )
}

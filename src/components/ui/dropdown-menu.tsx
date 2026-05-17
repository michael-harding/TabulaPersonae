import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu"
import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

export const DropdownMenu = DropdownMenuPrimitive
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuSubTrigger = DropdownMenuPrimitive.SubTrigger

export function DropdownMenuContent(props: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95",
          local.class
        )}
        {...others}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem(props: ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  const [local, others] = splitProps(props, ["class", "inset"])
  return (
    <DropdownMenuPrimitive.Item
      class={cn(
        "menu-item relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        local.inset && "pl-8",
        local.class
      )}
      {...others}
    />
  )
}

export function DropdownMenuLabel(props: ComponentProps<"div"> & { inset?: boolean }) {
  const [local, others] = splitProps(props, ["class", "inset"])
  return (
    <div
      class={cn("px-2 py-1.5 text-sm font-semibold", local.inset && "pl-8", local.class)}
      {...others}
    />
  )
}

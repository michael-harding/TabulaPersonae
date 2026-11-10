import { createEffect, onCleanup, type Accessor } from "solid-js"

import { sheetColorAttributes } from "@/lib/sheet-color"

/**
 * Gives the page a character's sheet colour while the calling sheet is mounted. Set on <body>
 * rather than the sheet's own root, so the popups portaled to <body> (modals, menus, popovers,
 * tooltips) show the sheet colour too. Removed again when the colour is reset or the sheet unmounts.
 */
export function useSheetColor(hex: Accessor<string | undefined>) {
  createEffect(() => {
    const attrs = sheetColorAttributes(hex())
    if (attrs.style == null) return
    const body = document.body
    body.setAttribute("data-sheet-color", "")
    for (const [name, value] of Object.entries(attrs.style)) body.style.setProperty(name, value)
    onCleanup(() => {
      body.removeAttribute("data-sheet-color")
      for (const name of Object.keys(attrs.style!)) body.style.removeProperty(name)
    })
  })
}

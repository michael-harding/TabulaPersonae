import { createEffect, onCleanup, type Accessor } from "solid-js"

import { sheetBackground } from "@/lib/sheet-background"
import { setSheetTone } from "@/lib/theme"

/**
 * Gives the page a character's sheet background while the calling sheet is mounted: its surface
 * shades on <body>, so the popups portaled there show them too, and its tone as the page's light or
 * dark theme. Both are removed again when the background is reset or the sheet unmounts.
 */
export function useSheetBackground(hex: Accessor<string | undefined>) {
  createEffect(() => {
    const background = sheetBackground(hex())
    if (background == null) return
    const body = document.body
    for (const [name, value] of Object.entries(background.style)) body.style.setProperty(name, value)
    setSheetTone(background.tone)
    onCleanup(() => {
      for (const name of Object.keys(background.style)) body.style.removeProperty(name)
      setSheetTone(null)
    })
  })
}

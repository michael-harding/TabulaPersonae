import { createEffect, onCleanup, type Accessor } from "solid-js"

export const APP_TITLE = "TabulaPersonae"

/**
 * Names the character in the page title while the calling page is mounted, falling back to the
 * app name when there is no name. Restores the app name when the page unmounts, so navigating to
 * a route that doesn't set its own title (such as the character list) doesn't keep the old name.
 */
export function useDocumentTitle(name: Accessor<string | null | undefined>) {
  createEffect(() => {
    const value = name()
    document.title = value ? `${value} | ${APP_TITLE}` : APP_TITLE
  })
  onCleanup(() => {
    document.title = APP_TITLE
  })
}

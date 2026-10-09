import { createSignal, createEffect, on } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { useLocation } from '@solidjs/router'

import { SyncContext, type CharacterSyncState } from '@/lib/sync-context'

import { OfflineIndicator } from './offline-indicator'

export default function Layout(props: ParentProps) {
  const [syncState, setSyncState] = createSignal<CharacterSyncState>(null)
  const location = useLocation()
  let mainRef: HTMLElement | undefined

  // ACCESSIBILITY.md §7: move focus to <main> on route change so screen reader users are
  // notified of the new page. `on` receives `undefined` as the previous value on its first
  // run (initial mount), which we use to skip stealing focus from the page's natural initial
  // focus — only subsequent, real navigations move focus.
  createEffect(on(() => location.pathname, (_path, prevPath) => {
    if (prevPath != null) mainRef?.focus()
  }))

  return (
    <SyncContext.Provider value={{ syncState, setSyncState }}>
    <div data-sem="page-layout" class="flex min-h-dvh flex-col">
      <main ref={mainRef} tabIndex={-1} class="flex flex-1 flex-col focus:outline-none">{props.children}</main>
      <OfflineIndicator />
      <footer class="border-t bg-card px-6 py-3 text-center text-sm text-muted-foreground">
        <span>© 2026 Michael Harding</span>
        <span class="mx-2">·</span>
        <a
          data-test="source-link"
          href="https://github.com/michael-harding/TabulaPersonae"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-4 hover:underline"
        >
          Source on GitHub
        </a>
        <span class="mx-2">·</span>
        <span>AGPLv3</span>
      </footer>
    </div>
    </SyncContext.Provider>
  )
}

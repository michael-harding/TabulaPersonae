import { createSignal, createEffect, on } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { useLocation } from '@solidjs/router'

import { SyncContext, type CharacterSyncState } from '@/lib/sync-context'

import { AttributionModal } from './attribution-modal'
import { OfflineIndicator } from './offline-indicator'

const REPOSITORY_URL = 'https://github.com/michael-harding/TabulaPersonae'

export default function Layout(props: ParentProps) {
  const [syncState, setSyncState] = createSignal<CharacterSyncState>(null)
  const location = useLocation()
  let mainRef: HTMLElement | undefined

  // ACCESSIBILITY.md §7: move focus to <main> on route change so screen reader users are
  // notified of the new page. `on` receives `undefined` as the previous value on its first
  // run (initial mount), which we use to skip stealing focus from the page's natural initial
  // focus — only subsequent, real navigations move focus. `preventScroll` keeps the focus call
  // from scrolling <main> into view over the position the browser restores on history Back.
  createEffect(on(() => location.pathname, (_path, prevPath) => {
    if (prevPath != null) mainRef?.focus({ preventScroll: true })
  }))

  return (
    <SyncContext.Provider value={{ syncState, setSyncState }}>
    <div data-sem="page-layout" class="flex min-h-dvh flex-col">
      <main ref={mainRef} tabIndex={-1} class="flex flex-1 flex-col focus:outline-none">{props.children}</main>
      <OfflineIndicator />
      {/* Every item is 44px tall, so the links get full-size touch targets and, when the footer
          wraps on a narrow screen, each row is 44px tall and the links on different rows don't overlap. */}
      <footer class="flex flex-wrap items-center justify-center border-t bg-card px-6 text-center text-sm text-muted-foreground *:inline-flex *:min-h-11 *:items-center">
        <span>© 2026 Michael Harding</span>
        <span class="mx-2">·</span>
        <AttributionModal />
        <span class="mx-2">·</span>
        <span>AGPLv3</span>
        <span class="mx-2">·</span>
        <a
          data-test="source-link"
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-4 hover:underline"
        >
          GitHub
        </a>
        <span class="mx-2">·</span>
        <a
          data-test="release-link"
          href={`${REPOSITORY_URL}/releases/tag/v${__APP_VERSION__}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`v${__APP_VERSION__} release notes`}
          class="underline-offset-4 hover:underline"
        >
          v{__APP_VERSION__}
        </a>
      </footer>
    </div>
    </SyncContext.Provider>
  )
}

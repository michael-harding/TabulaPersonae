import { createSignal } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { SyncContext, type CharacterSyncState } from '@/lib/sync-context'
import { OfflineIndicator } from './offline-indicator'

export default function Layout(props: ParentProps) {
  const [syncState, setSyncState] = createSignal<CharacterSyncState>(null)
  return (
    <SyncContext.Provider value={{ syncState, setSyncState }}>
    <div class="flex min-h-dvh flex-col">
      <div class="flex flex-1 flex-col">{props.children}</div>
      <OfflineIndicator />
      <footer class="border-t bg-card px-6 py-3 text-center text-sm text-muted-foreground">
        <span>© 2026 Michael Harding</span>
        <span class="mx-2">·</span>
        <a
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

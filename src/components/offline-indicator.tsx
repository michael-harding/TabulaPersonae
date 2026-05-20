import { createSignal, createMemo, onCleanup, Match, Switch, Show } from 'solid-js'
import RefreshCw from 'lucide-solid/icons/refresh-cw'
import RefreshCwOff from 'lucide-solid/icons/refresh-cw-off'
import { useAuth } from '@/lib/auth-context'
import { createNetworkStatus, type SyncStatus } from '@/lib/network-status'
import { useSyncState } from '@/lib/sync-context'

export function formatAge(date: Date | null): string {
  if (!date) return 'Not yet synced'
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  return `${Math.floor(hr / 24)} days ago`
}

const LABEL: Record<SyncStatus, string> = {
  offline: 'Offline',
  syncing: 'Syncing…',
  synced: 'Synced',
  online: '',
}

const BG: Record<SyncStatus, string> = {
  offline: 'bg-yellow-500',
  syncing: 'bg-blue-500',
  synced: 'bg-green-500',
  online: '',
}

const TEXT_COLOR: Record<SyncStatus, string> = {
  offline: 'text-yellow-950',
  syncing: 'text-white',
  synced: 'text-white',
  online: '',
}

export function OfflineIndicator() {
  const { user } = useAuth()
  const { status } = createNetworkStatus()
  const syncCtx = useSyncState()
  const [expanded, setExpanded] = createSignal(false)

  const [tick, setTick] = createSignal(0)
  const timer = setInterval(() => setTick(t => t + 1), 30_000)
  onCleanup(() => clearInterval(timer))

  const subLabel = createMemo((): string | null => {
    tick()
    const state = syncCtx?.syncState() ?? null
    if (!state) return null
    return formatAge(state.updatedAt)
  })

  // Unauthenticated users use localStorage, which is inherently offline-capable
  // with no sync needed — indicator is only meaningful for Firebase-backed sessions
  return (
    <Show when={!!user() && status() !== 'online'}>
      <div
        class={`fixed bottom-6 right-6 z-50 flex h-11 w-auto cursor-pointer flex-row items-center justify-end overflow-hidden rounded-full shadow-lg transition-[max-width] duration-300 ${BG[status()]} ${expanded() ? 'max-w-xs' : 'max-w-[44px]'}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onClick={() => setExpanded(v => !v)}
      >
        <div class={`flex flex-col items-end pl-4 pr-2 transition-opacity duration-200 ${expanded() ? 'opacity-100' : 'opacity-0'}`}>
          <span class={`whitespace-nowrap text-xs font-semibold leading-tight ${TEXT_COLOR[status()]}`}>
            {LABEL[status()]}
          </span>
          <Show when={subLabel() && (status() === 'offline' || status() === 'synced')}>
            <span class={`whitespace-nowrap text-xs leading-tight opacity-80 ${TEXT_COLOR[status()]}`}>
              {subLabel()}
            </span>
          </Show>
        </div>

        <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center">
          <Switch>
            <Match when={status() === 'offline'}>
              <RefreshCwOff class={`h-5 w-5 ${TEXT_COLOR[status()]}`} />
            </Match>
            <Match when={status() === 'syncing'}>
              <RefreshCw class="h-5 w-5 animate-spin text-white" />
            </Match>
            <Match when={status() === 'synced'}>
              <RefreshCw class="h-5 w-5 text-white" />
            </Match>
          </Switch>
        </div>
      </div>
    </Show>
  )
}

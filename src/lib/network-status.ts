import { createSignal, onCleanup } from 'solid-js'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from './firebase'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced'

export function createNetworkStatus() {
  const [status, setStatus] = createSignal<SyncStatus>(
    navigator.onLine ? 'online' : 'offline'
  )
  const handleOffline = () => setStatus('offline')

  const handleOnline = async () => {
    setStatus('syncing')
    try {
      await waitForPendingWrites(db)
    } catch {
      // no pending writes or db unavailable — still mark synced
    }
    setStatus('synced')
    setTimeout(() => setStatus('online'), 5000)
  }

  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
  onCleanup(() => {
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('online', handleOnline)
  })

  return { status }
}

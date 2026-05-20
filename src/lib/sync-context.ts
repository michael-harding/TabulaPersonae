import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

export type CharacterSyncState = {
  hasPendingWrites: boolean
  updatedAt: Date | null
} | null // null = not on a character sheet page

export const SyncContext = createContext<{
  syncState: Accessor<CharacterSyncState>
  setSyncState: (s: CharacterSyncState) => void
} | undefined>(undefined)

export function useSyncState() {
  return useContext(SyncContext)
}

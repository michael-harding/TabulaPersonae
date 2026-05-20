vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  getDocs: vi.fn(),
  getDocsFromCache: vi.fn(),
  getDoc: vi.fn(),
  getDocFromCache: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: class MockTimestamp {
    seconds: number; nanoseconds: number
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds; this.nanoseconds = nanoseconds
    }
    toDate() { return new Date(this.seconds * 1000) }
    static now() { return new MockTimestamp(Date.now() / 1000, 0) }
  },
}))

import {
  getDocs,
  getDocsFromCache,
  getDoc,
  getDocFromCache,
  onSnapshot,
} from 'firebase/firestore'
import {
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  subscribeToCharacter,
} from '@/lib/firebase-storage'

const mockGetDocs = vi.mocked(getDocs)
const mockGetDocsFromCache = vi.mocked(getDocsFromCache)
const mockGetDoc = vi.mocked(getDoc)
const mockGetDocFromCache = vi.mocked(getDocFromCache)
const mockOnSnapshot = vi.mocked(onSnapshot)

const userId = 'user-123'
const charData = { name: 'Thorin', userId, updatedAt: null }

function makeQuerySnapshot(docs: { id: string; data: () => object }[]) {
  return {
    forEach: (cb: (doc: { id: string; data: () => object }) => void) => docs.forEach(cb),
  } as any
}

function makeDocSnap(exists: boolean, data?: object) {
  return {
    exists: () => exists,
    id: 'char-1',
    data: () => data ?? {},
  } as any
}

describe('getCharactersFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getDocs when online', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDocs.mockResolvedValue(makeQuerySnapshot([{ id: 'char-1', data: () => charData }]))

    const result = await getCharactersFromFirebase(userId)

    expect(mockGetDocs).toHaveBeenCalledOnce()
    expect(mockGetDocsFromCache).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('char-1')
  })

  it('calls getDocsFromCache when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockGetDocsFromCache.mockResolvedValue(makeQuerySnapshot([{ id: 'char-1', data: () => charData }]))

    const result = await getCharactersFromFirebase(userId)

    expect(mockGetDocsFromCache).toHaveBeenCalledOnce()
    expect(mockGetDocs).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })

  it('returns [] when offline and cache miss throws', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockGetDocsFromCache.mockRejectedValue(new Error('No cache'))

    const result = await getCharactersFromFirebase(userId)

    expect(result).toEqual([])
  })
})

describe('getCharacterFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getDoc when online', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(true, charData))

    const result = await getCharacterFromFirebase('char-1', userId)

    expect(mockGetDoc).toHaveBeenCalledOnce()
    expect(mockGetDocFromCache).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it('calls getDocFromCache when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockGetDocFromCache.mockResolvedValue(makeDocSnap(true, charData))

    const result = await getCharacterFromFirebase('char-1', userId)

    expect(mockGetDocFromCache).toHaveBeenCalledOnce()
    expect(mockGetDoc).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it('returns null when offline and cache miss throws', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockGetDocFromCache.mockRejectedValue(new Error('No cache'))

    const result = await getCharacterFromFirebase('char-1', userId)

    expect(result).toBeNull()
  })
})

// Helper: build a Firestore-like onSnapshot document snapshot
function makeFirestoreSnap(hasPendingWrites: boolean, updatedAtMs: number | null) {
  return {
    exists: () => true,
    id: 'char-1',
    data: () => ({
      userId,
      updatedAt: updatedAtMs !== null ? { seconds: updatedAtMs / 1000, nanoseconds: 0 } : null,
    }),
    metadata: { hasPendingWrites },
  }
}

describe('subscribeToCharacter', () => {
  const charId = 'char-1'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Make onSnapshot immediately call the callback with whatever snap we push
    mockOnSnapshot.mockImplementation((_ref, _opts, cb: any) => {
      // Store cb so tests can invoke it
      ;(mockOnSnapshot as any)._cb = cb
      return vi.fn()
    })
  })

  function fire(snap: ReturnType<typeof makeFirestoreSnap>) {
    ;(mockOnSnapshot as any)._cb(snap)
  }

  it('passes null updatedAt when first snapshot is pending and no prior localStorage entry', () => {
    const received: any[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeFirestoreSnap(true, Date.now() - 60_000))

    expect(received[0]?.updatedAt).toBeNull()
  })

  it('passes confirmed updatedAt when first snapshot has no pending writes', () => {
    const syncedAt = Date.now() - 120_000
    const received: any[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeFirestoreSnap(false, syncedAt))

    expect(received[0]?.updatedAt).toEqual(new Date(syncedAt))
  })

  it('keeps last confirmed updatedAt when a subsequent snapshot has pending writes', () => {
    const syncedAt = Date.now() - 120_000
    const received: any[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeFirestoreSnap(false, syncedAt))          // server confirms
    fire(makeFirestoreSnap(true, Date.now()))          // user makes offline change

    expect(received[1]?.updatedAt).toEqual(new Date(syncedAt))
  })

  it('seeds lastConfirmedAt from localStorage so offline reload shows prior sync time', () => {
    const priorSyncedAt = new Date(Date.now() - 300_000)
    localStorage.setItem(`dnd-last-synced-${charId}`, priorSyncedAt.toISOString())

    const received: any[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    // First snapshot already has pending writes (queued from a previous offline session)
    fire(makeFirestoreSnap(true, Date.now() - 60_000))

    expect(received[0]?.updatedAt).toEqual(priorSyncedAt)
  })

  it('persists confirmed updatedAt to localStorage', () => {
    const syncedAt = Date.now() - 90_000
    subscribeToCharacter(charId, userId, () => {})

    fire(makeFirestoreSnap(false, syncedAt))

    const stored = localStorage.getItem(`dnd-last-synced-${charId}`)
    expect(stored).toBe(new Date(syncedAt).toISOString())
  })
})

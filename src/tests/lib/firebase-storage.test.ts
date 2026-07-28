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
  getTabConfigFromFirebase,
  getPublicCharacterFromFirebase,
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

describe('getPublicCharacterFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getDoc when online and returns character when isPublic is true', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const publicCharData = { ...charData, isPublic: true }
    mockGetDoc.mockResolvedValue(makeDocSnap(true, publicCharData))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(mockGetDoc).toHaveBeenCalledOnce()
    expect(mockGetDocFromCache).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
    expect(result?.id).toBe('char-1')
    expect((result as any).name).toBe('Thorin')
  })

  it('calls getDocFromCache when offline and returns character when isPublic is true', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const publicCharData = { ...charData, isPublic: true }
    mockGetDocFromCache.mockResolvedValue(makeDocSnap(true, publicCharData))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(mockGetDocFromCache).toHaveBeenCalledOnce()
    expect(mockGetDoc).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it('returns null when offline and cache miss throws', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockGetDocFromCache.mockRejectedValue(new Error('No cache'))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(result).toBeNull()
  })

  it('returns null when document does not exist', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(false))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(result).toBeNull()
  })

  it('returns null when isPublic is false', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const privateCharData = { ...charData, isPublic: false }
    mockGetDoc.mockResolvedValue(makeDocSnap(true, privateCharData))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(result).toBeNull()
  })

  it('returns null and logs console.error when getDoc throws', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetDoc.mockRejectedValue(new Error('Network error'))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  describe('DEV localStorage seed', () => {
    const key = 'dnd-public-char-char-1'
    afterEach(() => { localStorage.removeItem(key) })

    it('returns null when seed character has isPublic: false', async () => {
      localStorage.setItem(key, JSON.stringify({ ...charData, isPublic: false }))
      const result = await getPublicCharacterFromFirebase('char-1')
      expect(result).toBeNull()
    })

    it('returns character when seed character has isPublic: true', async () => {
      localStorage.setItem(key, JSON.stringify({ ...charData, isPublic: true }))
      const result = await getPublicCharacterFromFirebase('char-1')
      expect(result).not.toBeNull()
      expect((result as any).name).toBe('Thorin')
    })
  })

  it('defaults useCalculatedArmorClass to false for a legacy document missing the key', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const publicCharData = { ...charData, isPublic: true }
    mockGetDoc.mockResolvedValue(makeDocSnap(true, publicCharData))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect((result as any).useCalculatedArmorClass).toBe(false)
  })
})

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

  it('defaults useCalculatedArmorClass to false for a legacy document missing the key', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDocs.mockResolvedValue(makeQuerySnapshot([{ id: 'char-1', data: () => charData }]))

    const result = await getCharactersFromFirebase(userId)

    expect(result[0].useCalculatedArmorClass).toBe(false)
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

  it('defaults useCalculatedArmorClass to false for a legacy document missing the key', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(true, charData))

    const result = await getCharacterFromFirebase('char-1', userId)

    expect((result as any).useCalculatedArmorClass).toBe(false)
  })
})

describe('getTabConfigFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null without console.error when offline and cache throws unavailable', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const cacheError = Object.assign(new Error('unavailable'), { code: 'unavailable' })
    mockGetDocFromCache.mockRejectedValue(cacheError)
    const errorSpy = vi.spyOn(console, 'error')

    const result = await getTabConfigFromFirebase('user-123')

    expect(result).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('logs console.error for unexpected errors', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockRejectedValue(new Error('Permission denied'))
    const errorSpy = vi.spyOn(console, 'error')

    const result = await getTabConfigFromFirebase('user-123')

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalledOnce()
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

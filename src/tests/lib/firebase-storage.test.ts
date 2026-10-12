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
  deleteField: () => '__delete__',
  FieldPath: class MockFieldPath {
    segments: string[]
    constructor(...segments: string[]) { this.segments = segments }
  },
  onSnapshot: vi.fn(),
  waitForPendingWrites: vi.fn(),
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
  addDoc,
  deleteDoc,
  getDocs,
  getDocsFromCache,
  getDoc,
  getDocFromCache,
  onSnapshot,
  setDoc,
  Timestamp,
  waitForPendingWrites,
  type DocumentReference,
  type DocumentSnapshot,
  type SnapshotListenOptions,
  type Unsubscribe,
} from 'firebase/firestore'

import {
  getCharactersFromFirebase,
  getCharacterFromFirebase,
  subscribeToCharacter,
  getTabConfigFromFirebase,
  getPublicCharacterFromFirebase,
  saveCharacterToFirebase,
  deleteCharacterFromFirebase,
  saveTabConfigToFirebase,
  hasUnsyncedChanges,
  type CharacterSyncSnapshot,
} from '@/lib/firebase-storage'
import { createDefaultCharacter } from '@/lib/character-types'

import { makeDocRef, makeDocSnap, makeListenerSnap, makeQuerySnapshot, makeRawListenerSnap } from '../mocks/firestore'

const mockGetDocs = vi.mocked(getDocs)
const mockGetDocsFromCache = vi.mocked(getDocsFromCache)
const mockGetDoc = vi.mocked(getDoc)
const mockGetDocFromCache = vi.mocked(getDocFromCache)
// onSnapshot is heavily overloaded; this is the one overload subscribeToCharacter calls
// (document reference + options + listener), so the mock is typed to it.
type DocumentListen = (ref: DocumentReference, options: SnapshotListenOptions, onNext: (snap: DocumentSnapshot) => void) => Unsubscribe
const mockOnSnapshot = vi.mocked<DocumentListen>(onSnapshot)
const mockSetDoc = vi.mocked(setDoc)
const mockAddDoc = vi.mocked(addDoc)
const mockDeleteDoc = vi.mocked(deleteDoc)
const mockWaitForPendingWrites = vi.mocked(waitForPendingWrites)

const userId = 'user-123'
const charData = { name: 'Thorin', userId, updatedAt: null }

describe('saveCharacterToFirebase', () => {
  beforeEach(() => {
    mockSetDoc.mockReset()
    mockGetDoc.mockReset()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  // Each test uses its own character id: the module remembers, per character, which fields the
  // document held when it was last read or written.
  const character = (id: string, extra: Record<string, unknown> = {}) =>
    ({ ...createDefaultCharacter(), id, ...extra })

  // `unknown`: a hand-built stand-in for Firestore's DocumentSnapshot, of which the code under
  // test only uses exists(), id and data().
  const docSnap = (id: string, data: Record<string, unknown>) =>
    ({ exists: () => true, id, data: () => data }) as unknown as Awaited<ReturnType<typeof getDoc>>

  const load = async (id: string, data: Record<string, unknown>) => {
    mockGetDoc.mockResolvedValue(docSnap(id, { userId, ...data }))
    await getCharacterFromFirebase(id, userId)
  }

  // The write as Firestore sees it: the document, and the names in its top-level field mask.
  const lastWrite = () => {
    const [, written, options] = mockSetDoc.mock.calls.at(-1)! as unknown as
      [unknown, Record<string, unknown>, { merge?: boolean; mergeFields: { segments: string[] }[] }]
    return { written, options, mask: options.mergeFields.map((field) => field.segments.join('|')) }
  }

  it('writes with a top-level field mask covering exactly the fields it sends, not a deep merge', async () => {
    await saveCharacterToFirebase(character('mask-1'), userId)
    const { written, options, mask } = lastWrite()
    expect(options.merge).toBeUndefined()
    expect([...mask].sort()).toEqual(Object.keys(written).sort())
    expect(mask).toEqual(expect.arrayContaining(['name', 'abilityScores', 'userId', 'updatedAt']))
  })

  it('names each field as a single path segment, so a key containing a dot is not split', async () => {
    await load('mask-2', { 'legacy.key': 1 })
    await saveCharacterToFirebase(character('mask-2'), userId)
    expect(lastWrite().mask).toContain('legacy.key')
  })

  it('deletes a field the document held when loaded and the character no longer has', async () => {
    await load('clear-1', { name: 'Thorin', sheetColor: '#ff0000' })
    await saveCharacterToFirebase(character('clear-1', { sheetColor: undefined }), userId)
    const { written, mask } = lastWrite()
    expect(written.sheetColor).toBe('__delete__')
    expect(mask).toContain('sheetColor')
  })

  it('leaves alone a field it has never seen, such as one another device added', async () => {
    await load('unseen-1', { name: 'Thorin' })
    // Another device sets isPublic after this client loaded; this client's copy has no such key.
    await saveCharacterToFirebase(character('unseen-1'), userId)
    const { written, mask } = lastWrite()
    expect(mask).not.toContain('isPublic')
    expect('isPublic' in written).toBe(false)
  })

  it('deletes nothing when the character was never loaded in this session', async () => {
    await saveCharacterToFirebase(character('cold-1', { sheetColor: undefined }), userId)
    const { written, mask } = lastWrite()
    expect(Object.values(written)).not.toContain('__delete__')
    expect(mask).not.toContain('sheetColor')
  })

  it('deletes a field cleared between two saves, and sends that delete only once', async () => {
    await saveCharacterToFirebase(character('twice-1', { sheetColor: '#ff0000' }), userId)
    await saveCharacterToFirebase(character('twice-1', { sheetColor: undefined }), userId)
    expect(lastWrite().written.sheetColor).toBe('__delete__')
    await saveCharacterToFirebase(character('twice-1', { sheetColor: undefined }), userId)
    expect(lastWrite().mask).not.toContain('sheetColor')
  })

  // Offline, a write stays pending until the server acknowledges it, so the next save cannot
  // wait for the previous one to settle before working out what has been cleared.
  it('deletes a field cleared while the save that added it is still pending', async () => {
    mockSetDoc.mockReturnValue(new Promise(() => {}))
    void saveCharacterToFirebase(character('pending-1', { sheetColor: '#ff0000' }), userId)
    void saveCharacterToFirebase(character('pending-1', { sheetColor: undefined }), userId)
    await Promise.resolve()
    expect(mockSetDoc).toHaveBeenCalledTimes(2)
    expect(lastWrite().written.sheetColor).toBe('__delete__')
  })

  it('still deletes a cleared field on the next save when the write that cleared it failed', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await load('failed-1', { name: 'Thorin', sheetColor: '#ff0000' })
    mockSetDoc.mockRejectedValueOnce(new Error('permission-denied'))
    expect(await saveCharacterToFirebase(character('failed-1', { sheetColor: undefined }), userId)).toBe(false)
    mockSetDoc.mockResolvedValue(undefined)
    await saveCharacterToFirebase(character('failed-1', { sheetColor: undefined }), userId)
    expect(lastWrite().written.sheetColor).toBe('__delete__')
    consoleError.mockRestore()
  })

  it('does not treat another user\'s document as loaded', async () => {
    mockGetDoc.mockResolvedValue(docSnap('foreign-1', { userId: 'someone-else', sheetColor: '#ff0000' }))
    expect(await getCharacterFromFirebase('foreign-1', userId)).toBeNull()
    await saveCharacterToFirebase(character('foreign-1', { sheetColor: undefined }), userId)
    expect(lastWrite().mask).not.toContain('sheetColor')
  })

  it('reports failure and logs when the write is rejected', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('permission-denied')
    mockSetDoc.mockRejectedValueOnce(failure)

    expect(await saveCharacterToFirebase(character('rejected-1'), userId)).toBe(false)
    expect(consoleError).toHaveBeenCalledWith('Failed to save character to Firebase:', failure)
    consoleError.mockRestore()
  })

  describe('a character that has no id yet', () => {
    beforeEach(() => {
      mockAddDoc.mockReset()
    })

    it('adds a new document owned by the user and gives the character the generated id', async () => {
      mockAddDoc.mockResolvedValue(makeDocRef('generated-1'))
      const newCharacter = character('', { name: 'Thorin' })

      expect(await saveCharacterToFirebase(newCharacter, userId)).toBe(true)

      expect(mockSetDoc).not.toHaveBeenCalled()
      expect(mockAddDoc).toHaveBeenCalledOnce()
      expect(mockAddDoc.mock.calls[0][1]).toMatchObject({ name: 'Thorin', userId, id: '' })
      expect(newCharacter.id).toBe('generated-1')
    })

    it('remembers the fields it added, so one cleared before the next save is deleted', async () => {
      mockAddDoc.mockResolvedValue(makeDocRef('generated-2'))
      mockSetDoc.mockResolvedValue(undefined)
      const newCharacter = character('', { sheetColor: '#ff0000' })
      await saveCharacterToFirebase(newCharacter, userId)

      await saveCharacterToFirebase({ ...newCharacter, sheetColor: undefined }, userId)

      expect(lastWrite().written.sheetColor).toBe('__delete__')
      expect(lastWrite().mask).toContain('sheetColor')
    })

    it('reports failure, logs, and leaves the character without an id when the add is rejected', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const failure = new Error('unavailable')
      mockAddDoc.mockRejectedValue(failure)
      const newCharacter = character('')

      expect(await saveCharacterToFirebase(newCharacter, userId)).toBe(false)
      expect(newCharacter.id).toBe('')
      expect(consoleError).toHaveBeenCalledWith('Failed to save character to Firebase:', failure)
      consoleError.mockRestore()
    })
  })
})

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
    expect(result?.name).toBe('Thorin')
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
      expect(result?.name).toBe('Thorin')
    })

    it('returns null without asking Firestore when the seed is "null" (simulated not-found)', async () => {
      localStorage.setItem(key, 'null')
      const result = await getPublicCharacterFromFirebase('char-1')
      expect(result).toBeNull()
      expect(mockGetDoc).not.toHaveBeenCalled()
    })

    it('ignores a seed that is not valid JSON and reads Firestore instead', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      localStorage.setItem(key, '{not json')
      mockGetDoc.mockResolvedValue(makeDocSnap(true, { ...charData, isPublic: true }))
      const result = await getPublicCharacterFromFirebase('char-1')
      expect(result?.name).toBe('Thorin')
    })
  })

  it('backfills useCalculatedArmorClass to true for a legacy document missing both the key and an armorClass value', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const publicCharData = { ...charData, isPublic: true }
    mockGetDoc.mockResolvedValue(makeDocSnap(true, publicCharData))

    const result = await getPublicCharacterFromFirebase('char-1')

    expect(result?.useCalculatedArmorClass).toBe(true)
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

  it('returns every character the query finds, each under its own document id', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDocs.mockResolvedValue(makeQuerySnapshot([
      { id: 'char-1', data: () => charData },
      { id: 'char-2', data: () => ({ ...charData, name: 'Gandalf' }) },
    ]))

    const result = await getCharactersFromFirebase(userId)

    expect(result.map((c) => [c.id, c.name])).toEqual([['char-1', 'Thorin'], ['char-2', 'Gandalf']])
  })

  it('returns [] and logs when the query is rejected', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('permission-denied')
    mockGetDocs.mockRejectedValue(failure)

    expect(await getCharactersFromFirebase(userId)).toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('Failed to get characters from Firebase:', failure)
    errorSpy.mockRestore()
  })

  it('backfills useCalculatedArmorClass to true for a legacy document missing both the key and an armorClass value', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDocs.mockResolvedValue(makeQuerySnapshot([{ id: 'char-1', data: () => charData }]))

    const result = await getCharactersFromFirebase(userId)

    expect(result[0].useCalculatedArmorClass).toBe(true)
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

  it('returns null when the document does not exist', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(false))

    expect(await getCharacterFromFirebase('char-1', userId)).toBeNull()
  })

  it('returns null for a document that belongs to another user', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(true, { ...charData, userId: 'someone-else' }))

    expect(await getCharacterFromFirebase('char-1', userId)).toBeNull()
  })

  it('returns null and logs when the read is rejected', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('permission-denied')
    mockGetDoc.mockRejectedValue(failure)

    expect(await getCharacterFromFirebase('char-1', userId)).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('Failed to get character from Firebase:', failure)
    errorSpy.mockRestore()
  })

  it('backfills useCalculatedArmorClass to true for a legacy document missing both the key and an armorClass value', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(true, charData))

    const result = await getCharacterFromFirebase('char-1', userId)

    expect(result?.useCalculatedArmorClass).toBe(true)
  })
})

describe('getTabConfigFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the stored tabConfig when it is valid', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const tabConfig = { tabs: [{ id: 'custom-1', label: 'Custom', modules: ['spells'] }] }
    mockGetDoc.mockResolvedValue(makeDocSnap(true, { tabConfig }))

    expect(await getTabConfigFromFirebase('user-123')).toEqual(tabConfig)
  })

  it('returns null when the stored tabConfig is malformed', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(true, { tabConfig: { notATabs: true } }))

    expect(await getTabConfigFromFirebase('user-123')).toBeNull()
  })

  it('returns null when the user has no settings document yet', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    mockGetDoc.mockResolvedValue(makeDocSnap(false))

    expect(await getTabConfigFromFirebase('user-123')).toBeNull()
  })

  it('reads the tabConfig from the cache when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const tabConfig = { tabs: [{ id: 'custom-1', label: 'Custom', modules: ['spells'] }] }
    mockGetDocFromCache.mockResolvedValue(makeDocSnap(true, { tabConfig }))

    expect(await getTabConfigFromFirebase('user-123')).toEqual(tabConfig)
    expect(mockGetDoc).not.toHaveBeenCalled()
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

describe('subscribeToCharacter', () => {
  const charId = 'char-1'
  let deliverSnapshot: (snap: DocumentSnapshot) => void = () => {}

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Capture the listener subscribeToCharacter registers so tests can deliver snapshots to it
    mockOnSnapshot.mockImplementation((_ref, _opts, onNext) => {
      deliverSnapshot = onNext
      return vi.fn()
    })
  })

  function fire(snap: DocumentSnapshot) {
    deliverSnapshot(snap)
  }

  it('passes null updatedAt when first snapshot is pending and no prior localStorage entry', () => {
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeListenerSnap(userId, true, Date.now() - 60_000))

    expect(received[0]?.updatedAt).toBeNull()
  })

  it('passes confirmed updatedAt when first snapshot has no pending writes', () => {
    const syncedAt = Date.now() - 120_000
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeListenerSnap(userId, false, syncedAt))

    expect(received[0]?.updatedAt).toEqual(new Date(syncedAt))
  })

  it('keeps last confirmed updatedAt when a subsequent snapshot has pending writes', () => {
    const syncedAt = Date.now() - 120_000
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeListenerSnap(userId, false, syncedAt))          // server confirms
    fire(makeListenerSnap(userId, true, Date.now()))          // user makes offline change

    expect(received[1]?.updatedAt).toEqual(new Date(syncedAt))
  })

  it('seeds lastConfirmedAt from localStorage so offline reload shows prior sync time', () => {
    const priorSyncedAt = new Date(Date.now() - 300_000)
    localStorage.setItem(`dnd-last-synced-${charId}`, priorSyncedAt.toISOString())

    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    // First snapshot already has pending writes (queued from a previous offline session)
    fire(makeListenerSnap(userId, true, Date.now() - 60_000))

    expect(received[0]?.updatedAt).toEqual(priorSyncedAt)
  })

  it('persists confirmed updatedAt to localStorage', () => {
    const syncedAt = Date.now() - 90_000
    subscribeToCharacter(charId, userId, () => {})

    fire(makeListenerSnap(userId, false, syncedAt))

    const stored = localStorage.getItem(`dnd-last-synced-${charId}`)
    expect(stored).toBe(new Date(syncedAt).toISOString())
  })

  it('reads an updatedAt stored as a Firestore Timestamp', () => {
    const syncedAt = new Date('2026-01-02T03:04:05.000Z')
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeRawListenerSnap(true, { userId, updatedAt: new Timestamp(syncedAt.getTime() / 1000, 0) }))

    expect(received[0]).toEqual({ hasPendingWrites: false, updatedAt: syncedAt })
  })

  it('reports no confirmed sync time, and stores none, for a document never stamped with one', () => {
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeListenerSnap(userId, false, null))

    expect(received[0]).toEqual({ hasPendingWrites: false, updatedAt: null })
    expect(localStorage.getItem(`dnd-last-synced-${charId}`)).toBeNull()
  })

  it('passes null when the document does not exist', () => {
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeRawListenerSnap(false, {}))

    expect(received).toEqual([null])
  })

  it('passes null, and stores no sync time, for a document that belongs to another user', () => {
    const received: (CharacterSyncSnapshot | null)[] = []
    subscribeToCharacter(charId, userId, (s) => received.push(s))

    fire(makeListenerSnap('someone-else', false, Date.now()))

    expect(received).toEqual([null])
    expect(localStorage.getItem(`dnd-last-synced-${charId}`)).toBeNull()
  })

  it('returns the function that stops the listener', () => {
    const unsubscribe = vi.fn()
    mockOnSnapshot.mockReturnValue(unsubscribe)

    expect(subscribeToCharacter(charId, userId, () => {})).toBe(unsubscribe)
  })
})

describe('deleteCharacterFromFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the character document and reports success', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)

    expect(await deleteCharacterFromFirebase('char-1')).toBe(true)
    expect(mockDeleteDoc).toHaveBeenCalledOnce()
  })

  it('reports failure and logs when the delete is rejected', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('permission-denied')
    mockDeleteDoc.mockRejectedValue(failure)

    expect(await deleteCharacterFromFirebase('char-1')).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith('Failed to delete character from Firebase:', failure)
    errorSpy.mockRestore()
  })
})

describe('saveTabConfigToFirebase', () => {
  const tabConfig = { tabs: [{ id: 'custom-1', label: 'Custom', modules: ['spells' as const] }] }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges the tabConfig into the user settings document, leaving other settings in place', async () => {
    mockSetDoc.mockResolvedValue(undefined)

    expect(await saveTabConfigToFirebase(tabConfig, userId)).toBe(true)
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), { tabConfig }, { merge: true })
  })

  it('reports failure and logs when the write is rejected', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('permission-denied')
    mockSetDoc.mockRejectedValue(failure)

    expect(await saveTabConfigToFirebase(tabConfig, userId)).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith('Failed to save tab config to Firebase:', failure)
    errorSpy.mockRestore()
  })
})

describe('hasUnsyncedChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is false when Firestore has nothing waiting to be sent', async () => {
    mockWaitForPendingWrites.mockResolvedValue(undefined)

    expect(await hasUnsyncedChanges()).toBe(false)
  })

  it('is false when writes already on their way are confirmed within the grace period', async () => {
    mockWaitForPendingWrites.mockReturnValue(new Promise((resolve) => setTimeout(resolve, 1000)))
    const result = hasUnsyncedChanges()

    await vi.advanceTimersByTimeAsync(1000)

    expect(await result).toBe(false)
  })

  it('is true when writes are still unconfirmed after the grace period', async () => {
    mockWaitForPendingWrites.mockReturnValue(new Promise(() => {}))
    let answer: boolean | undefined // undefined until the check has answered
    void hasUnsyncedChanges().then((value) => { answer = value })

    await vi.advanceTimersByTimeAsync(1499)
    expect(answer).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(answer).toBe(true)
  })

  it('answers almost at once when offline, where waiting longer could not help', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockWaitForPendingWrites.mockReturnValue(new Promise(() => {}))
    const result = hasUnsyncedChanges()

    await vi.advanceTimersByTimeAsync(100)

    expect(await result).toBe(true)
  })

  it('is true, and logs, when the check itself fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('client is terminated')
    mockWaitForPendingWrites.mockRejectedValue(failure)

    expect(await hasUnsyncedChanges()).toBe(true)
    expect(errorSpy).toHaveBeenCalledWith('Failed to check for unsynced changes:', failure)
    errorSpy.mockRestore()
  })

  it('leaves no timer running once it has answered', async () => {
    mockWaitForPendingWrites.mockResolvedValue(undefined)

    await hasUnsyncedChanges()

    expect(vi.getTimerCount()).toBe(0)
  })
})

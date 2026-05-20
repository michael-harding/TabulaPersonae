vi.mock('firebase/firestore', () => ({
  waitForPendingWrites: vi.fn(),
}))

// @/lib/firebase is mocked globally in setup.tsx as { auth: {}, db: {} }

vi.unmock('@/lib/network-status')

import { createRoot } from 'solid-js'
import { waitForPendingWrites } from 'firebase/firestore'
import { createNetworkStatus } from '@/lib/network-status'

const mockWaitForPendingWrites = vi.mocked(waitForPendingWrites)

function makeStatus() {
  let status!: ReturnType<typeof createNetworkStatus>
  let dispose!: () => void
  dispose = createRoot(d => {
    status = createNetworkStatus()
    return d
  })
  return { status, dispose }
}

describe('createNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockWaitForPendingWrites.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts online when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    const { status, dispose } = makeStatus()
    expect(status.status()).toBe('online')
    dispose()
  })

  it('starts offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const { status, dispose } = makeStatus()
    expect(status.status()).toBe('offline')
    dispose()
  })

  it('transitions to offline on window offline event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    const { status, dispose } = makeStatus()
    window.dispatchEvent(new Event('offline'))
    expect(status.status()).toBe('offline')
    dispose()
  })

  it('transitions to syncing immediately on window online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    mockWaitForPendingWrites.mockReturnValue(new Promise(() => {})) // never resolves
    const { status, dispose } = makeStatus()
    window.dispatchEvent(new Event('online'))
    expect(status.status()).toBe('syncing')
    dispose()
  })

  it('transitions to synced after waitForPendingWrites resolves', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    mockWaitForPendingWrites.mockResolvedValue(undefined)
    const { status, dispose } = makeStatus()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(status.status()).toBe('synced')
    dispose()
  })

  it('transitions to online after 5 s in synced state', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    mockWaitForPendingWrites.mockResolvedValue(undefined)
    const { status, dispose } = makeStatus()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(status.status()).toBe('synced')
    vi.advanceTimersByTime(5000)
    expect(status.status()).toBe('online')
    dispose()
  })

  it('still reaches synced when waitForPendingWrites rejects', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    mockWaitForPendingWrites.mockRejectedValue(new Error('unavailable'))
    const { status, dispose } = makeStatus()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(status.status()).toBe('synced')
    dispose()
  })

  it('removes event listeners on dispose', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    const { status, dispose } = makeStatus()
    dispose()
    // After dispose, events should no longer update status
    window.dispatchEvent(new Event('offline'))
    expect(status.status()).toBe('online')
  })
})

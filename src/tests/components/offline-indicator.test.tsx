vi.mock('@/lib/network-status', () => ({
  createNetworkStatus: vi.fn(),
}))

vi.mock('@/lib/sync-context', () => ({
  useSyncState: vi.fn(() => ({
    syncState: () => null,
    setSyncState: vi.fn(),
  })),
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: () => ({ uid: 'test-user' }),
    loading: () => false,
    skipAuth: () => false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
  })),
}))

import { axe } from "vitest-axe"
import { createSignal } from 'solid-js'

import { OfflineIndicator, formatAge } from '@/components/offline-indicator'
import { createNetworkStatus } from '@/lib/network-status'
import { useAuth } from '@/lib/auth-context'
import { useSyncState } from '@/lib/sync-context'

import { render, screen, fireEvent } from '../test-utils'

const mockCreateNetworkStatus = vi.mocked(createNetworkStatus)
const mockUseAuth = vi.mocked(useAuth)
const mockUseSyncState = vi.mocked(useSyncState)

function makeNetworkStatus(initialStatus: Parameters<typeof createSignal>[0]) {
  const [status, setStatus] = createSignal(initialStatus)
  return { status, setStatus }
}

describe('OfflineIndicator', () => {
  describe('formatAge helper', () => {
    it('returns "Not yet synced" for null', () => {
      expect(formatAge(null)).toBe('Not yet synced')
    })

    it('returns "Just now" for less than 60 seconds ago', () => {
      expect(formatAge(new Date(Date.now() - 30_000))).toBe('Just now')
    })

    it('returns "1 min ago" for 90 seconds ago', () => {
      expect(formatAge(new Date(Date.now() - 90_000))).toBe('1 min ago')
    })

    it('returns "2 min ago" for 150 seconds ago', () => {
      expect(formatAge(new Date(Date.now() - 150_000))).toBe('2 min ago')
    })

    it('returns "1 hr ago" for 90 minutes ago', () => {
      expect(formatAge(new Date(Date.now() - 90 * 60_000))).toBe('1 hr ago')
    })

    it('returns "1 days ago" for 25 hours ago', () => {
      expect(formatAge(new Date(Date.now() - 25 * 60 * 60_000))).toBe('1 days ago')
    })
  })

  describe('visibility', () => {
    it('renders nothing when status is online', () => {
      mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('online') as any)
      const { container } = render(<OfflineIndicator />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when user is unauthenticated even if offline', () => {
      mockUseAuth.mockReturnValueOnce({
        user: () => null,
        loading: () => false,
        skipAuth: () => false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        logout: vi.fn(),
        resetPassword: vi.fn(),
      } as any)
      mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('offline') as any)
      const { container } = render(<OfflineIndicator />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('offline state', () => {
    beforeEach(() => {
      mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('offline') as any)
    })

    it('renders with gold background', () => {
      render(<OfflineIndicator />)
      expect(screen.getByTestId('offline-indicator')).toHaveClass('bg-yellow-500')
    })

    it('renders collapsed by default', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      expect(pill.classList.contains('max-w-xs')).toBe(false)
    })

    it('contains only phrasing content (no block <div>) inside the button', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      expect(pill.tagName).toBe('BUTTON')
      expect(pill.querySelector('div')).toBeNull()
    })

    it('expands on mouseenter', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(pill.classList.contains('max-w-xs')).toBe(true)
    })

    it('collapses on mouseleave', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      fireEvent.mouseLeave(pill)
      expect(pill.classList.contains('max-w-xs')).toBe(false)
    })

    it('toggles expanded on click', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.click(pill)
      expect(pill.classList.contains('max-w-xs')).toBe(true)
      fireEvent.click(pill)
      expect(pill.classList.contains('max-w-xs')).toBe(false)
    })

    it('shows "Offline" label when expanded', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('shows "Not yet synced" when character has pending writes and has never been synced', () => {
      mockUseSyncState.mockReturnValueOnce({
        syncState: () => ({ hasPendingWrites: true, updatedAt: null }),
        setSyncState: vi.fn(),
      })
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('Not yet synced')).toBeInTheDocument()
    })

    it('shows formatted age when character has pending writes but was previously synced', () => {
      mockUseSyncState.mockReturnValueOnce({
        syncState: () => ({ hasPendingWrites: true, updatedAt: new Date(Date.now() - 90_000) }),
        setSyncState: vi.fn(),
      })
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('1 min ago')).toBeInTheDocument()
    })

    it('shows formatted age when character is synced', () => {
      mockUseSyncState.mockReturnValueOnce({
        syncState: () => ({ hasPendingWrites: false, updatedAt: new Date(Date.now() - 90_000) }),
        setSyncState: vi.fn(),
      })
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('1 min ago')).toBeInTheDocument()
    })
  })

  describe('syncing state', () => {
    beforeEach(() => {
      mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('syncing') as any)
    })

    it('renders with blue background', () => {
      render(<OfflineIndicator />)
      expect(screen.getByTestId('offline-indicator')).toHaveClass('bg-blue-500')
    })

    it('shows "Syncing…" label when expanded', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('Syncing…')).toBeInTheDocument()
    })

    it('renders the spinning icon', () => {
      render(<OfflineIndicator />)
      expect(screen.getByTestId('offline-indicator-spinner')).toHaveClass('animate-spin')
    })
  })

  describe('synced state', () => {
    beforeEach(() => {
      mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('synced') as any)
    })

    it('renders with green background', () => {
      render(<OfflineIndicator />)
      expect(screen.getByTestId('offline-indicator')).toHaveClass('bg-green-500')
    })

    it('shows "Synced" label when expanded', () => {
      render(<OfflineIndicator />)
      const pill = screen.getByTestId('offline-indicator')
      fireEvent.mouseEnter(pill)
      expect(screen.getByText('Synced')).toBeInTheDocument()
    })

    it('does not render spinning icon', () => {
      render(<OfflineIndicator />)
      expect(screen.queryByTestId('offline-indicator-spinner')).toBeNull()
    })
  })

  it("has no accessibility violations", async () => {
    mockCreateNetworkStatus.mockImplementation(() => makeNetworkStatus('online') as any)
    const { container } = render(<OfflineIndicator />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

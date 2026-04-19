import { renderHook, act } from '@testing-library/react-native'

// Capture the listener registered by useNetworkStatus
let netInfoListener: ((state: { isConnected: boolean | null }) => void) | null = null

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: (state: { isConnected: boolean | null }) => void) => {
    netInfoListener = cb
    return jest.fn() // unsubscribe
  }),
}))

import { useNetworkStatus } from '../useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    netInfoListener = null
  })

  it('defaults to connected = true', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isConnected).toBe(true)
  })

  it('updates to false when listener fires with isConnected = false', () => {
    const { result } = renderHook(() => useNetworkStatus())
    act(() => {
      netInfoListener?.({ isConnected: false })
    })
    expect(result.current.isConnected).toBe(false)
  })

  it('updates back to true when connection is restored', () => {
    const { result } = renderHook(() => useNetworkStatus())
    act(() => { netInfoListener?.({ isConnected: false }) })
    act(() => { netInfoListener?.({ isConnected: true }) })
    expect(result.current.isConnected).toBe(true)
  })

  it('treats null isConnected as true (unknown = assume connected)', () => {
    const { result } = renderHook(() => useNetworkStatus())
    act(() => { netInfoListener?.({ isConnected: null }) })
    expect(result.current.isConnected).toBe(true)
  })
})

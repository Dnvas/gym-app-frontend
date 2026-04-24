import { renderHook, act } from '@testing-library/react-native'
import { useAuth } from '../useAuth'

jest.mock('../../lib/supabase')

const {
  mockSupabaseResponse,
  resetMockQueue,
  mockFrom,
  mockChain,
  setupChain,
  mockAuth,
  mockUnsubscribe,
  setupAuth,
  triggerAuthStateChange,
} = jest.requireMock('../../lib/supabase') as typeof import('../../lib/__mocks__/supabase')

const MOCK_USER = { id: 'u-1', email: 'test@example.com' }
const MOCK_SESSION = { user: MOCK_USER }
const MOCK_PROFILE = { id: 'u-1', username: 'daniel', default_weight_unit: 'kg' as const, created_at: '', updated_at: '' }

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  setupAuth()
  mockFrom.mockReturnValue(mockChain)
})

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with loading=true before getSession resolves', () => {
    // getSession is async — state is still loading synchronously after mount
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets loading=false after getSession resolves with no session', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('hydrates user and session from an existing session on mount', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: MOCK_SESSION } })
    // profile fetch triggered after session found
    mockSupabaseResponse(MOCK_PROFILE)

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    expect(result.current.user).toEqual(MOCK_USER)
    expect(result.current.session).toEqual(MOCK_SESSION)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('fetches profile from supabase when session has a user', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: MOCK_SESSION } })
    mockSupabaseResponse(MOCK_PROFILE)

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(result.current.profile?.username).toBe('daniel')
  })
})

// ── signUp ────────────────────────────────────────────────────────────────────

describe('signUp', () => {
  it('calls supabase.auth.signUp with email, password, and username in metadata', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    await act(async () => {
      await result.current.signUp('test@example.com', 'secret123', 'daniel')
    })

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
      options: { data: { username: 'daniel' } },
    })
  })

  it('returns needsVerification=true when session is null (email confirmation required)', async () => {
    // Default mock already returns { data: { session: null }, error: null }
    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    let res: any
    await act(async () => {
      res = await result.current.signUp('test@example.com', 'secret123', 'daniel')
    })

    expect(res.success).toBe(true)
    expect(res.needsVerification).toBe(true)
  })

  it('returns needsVerification=false when session is immediately available', async () => {
    mockAuth.signUp.mockResolvedValueOnce({ data: { session: MOCK_SESSION }, error: null })
    mockSupabaseResponse(MOCK_PROFILE)

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    let res: any
    await act(async () => {
      res = await result.current.signUp('test@example.com', 'secret123', 'daniel')
    })

    expect(res.success).toBe(true)
    expect(res.needsVerification).toBe(false)
  })

  it('returns success=false and surfaces error message on registration failure', async () => {
    mockAuth.signUp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Email address is already registered' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    let res: any
    await act(async () => {
      res = await result.current.signUp('taken@example.com', 'secret123', 'daniel')
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('Email address is already registered')
    expect(res.needsVerification).toBe(false)
  })
})

// ── signIn ────────────────────────────────────────────────────────────────────

describe('signIn', () => {
  it('calls signInWithPassword with the provided email and password', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    await act(async () => {
      await result.current.signIn('test@example.com', 'secret123')
    })

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    })
  })

  it('returns success=true when credentials are correct', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    let res: any
    await act(async () => {
      res = await result.current.signIn('test@example.com', 'correct')
    })

    expect(res.success).toBe(true)
    expect(res.error).toBeNull()
  })

  it('returns success=false and error message on wrong password', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    let res: any
    await act(async () => {
      res = await result.current.signIn('test@example.com', 'wrongpassword')
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid login credentials')
  })
})

// ── Auth state change listener ────────────────────────────────────────────────

describe('onAuthStateChange', () => {
  it('clears user and profile when a SIGNED_OUT event fires', async () => {
    // Start authenticated
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: MOCK_SESSION } })
    mockSupabaseResponse(MOCK_PROFILE)

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    expect(result.current.user).toEqual(MOCK_USER)
    expect(result.current.profile).toEqual(MOCK_PROFILE)

    // Supabase fires logout event
    await act(async () => {
      triggerAuthStateChange('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('sets user and fetches profile when a SIGNED_IN event fires', async () => {
    mockSupabaseResponse(MOCK_PROFILE)

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    await act(async () => {
      triggerAuthStateChange('SIGNED_IN', MOCK_SESSION)
    })

    expect(result.current.user).toEqual(MOCK_USER)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────

describe('lifecycle', () => {
  it('registers the onAuthStateChange listener on mount', async () => {
    renderHook(() => useAuth())
    await act(async () => {})

    expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('calls subscription.unsubscribe() when the component unmounts', async () => {
    const { unmount } = renderHook(() => useAuth())
    await act(async () => {})

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})

import { renderHook, act } from '@testing-library/react-native'
import { useWorkoutHistory } from '../useWorkoutHistory'

jest.mock('../../lib/supabase')
jest.mock('../../contexts/AuthContext')

const { mockSupabaseResponse, resetMockQueue, mockFrom, mockChain, setupChain } =
  jest.requireMock('../../lib/supabase') as typeof import('../../lib/__mocks__/supabase')

import * as AuthContextModule from '../../contexts/AuthContext'
const mockUseAuthContext = AuthContextModule.useAuthContext as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  mockFrom.mockReturnValue(mockChain)
  mockUseAuthContext.mockReturnValue({ user: { id: 'user-123' } })
})

const makeWorkoutRow = (overrides = {}) => ({
  id: 'w-1',
  user_id: 'user-123',
  name: 'Push Day',
  started_at: '2026-04-18T10:00:00Z',
  completed_at: '2026-04-18T11:00:00Z',
  status: 'completed',
  notes: null,
  workout_exercises: [],
  ...overrides,
})

describe('fetchWorkoutSummaries', () => {
  it('queries by user_id and status=completed', async () => {
    mockSupabaseResponse([makeWorkoutRow()])

    const { result } = renderHook(() => useWorkoutHistory())
    await act(async () => {
      await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    const eqCalls = mockChain.eq.mock.calls
    expect(eqCalls.some((c: any[]) => c[0] === 'user_id' && c[1] === 'user-123')).toBe(true)
    expect(eqCalls.some((c: any[]) => c[0] === 'status' && c[1] === 'completed')).toBe(true)
  })

  it('computes duration_minutes from started_at and completed_at', async () => {
    // 10:00 → 11:30 = 90 minutes
    mockSupabaseResponse([
      makeWorkoutRow({
        started_at: '2026-04-18T10:00:00Z',
        completed_at: '2026-04-18T11:30:00Z',
      }),
    ])

    const { result } = renderHook(() => useWorkoutHistory())
    let summaries: any[] = []
    await act(async () => {
      summaries = await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    expect(summaries[0].duration_minutes).toBe(90)
  })

  it('sets duration_minutes to null when completed_at is null', async () => {
    mockSupabaseResponse([makeWorkoutRow({ completed_at: null })])

    const { result } = renderHook(() => useWorkoutHistory())
    let summaries: any[] = []
    await act(async () => {
      summaries = await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    expect(summaries[0].duration_minutes).toBeNull()
  })

  it('excludes warmup sets from total_sets count', async () => {
    mockSupabaseResponse([
      makeWorkoutRow({
        workout_exercises: [
          {
            id: 'we-1',
            sets: [
              { id: 's-1', weight_kg: 60, reps: 10, is_warmup: true },   // excluded
              { id: 's-2', weight_kg: 100, reps: 5, is_warmup: false },
              { id: 's-3', weight_kg: 100, reps: 5, is_warmup: false },
            ],
          },
        ],
      }),
    ])

    const { result } = renderHook(() => useWorkoutHistory())
    let summaries: any[] = []
    await act(async () => {
      summaries = await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    expect(summaries[0].total_sets).toBe(2)
  })

  it('marks calendar dates with dotColor #00D9C4', async () => {
    mockSupabaseResponse([makeWorkoutRow({ started_at: '2026-04-18T10:00:00Z' })])

    const { result } = renderHook(() => useWorkoutHistory())
    await act(async () => {
      await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    expect(result.current.markedDates['2026-04-18']).toEqual({
      marked: true,
      dotColor: '#00D9C4',
    })
  })

  it('returns empty array and sets error on query failure', async () => {
    mockSupabaseResponse(null, { message: 'DB error' })

    const { result } = renderHook(() => useWorkoutHistory())
    let summaries: any[] = []
    await act(async () => {
      summaries = await result.current.fetchWorkoutSummaries(new Date('2026-04-01'))
    })

    expect(summaries).toEqual([])
    expect(result.current.error).toBeTruthy()
  })
})

describe('fetchWorkoutDetail', () => {
  it('sorts exercises by order_index and sets by set_number', async () => {
    mockSupabaseResponse({
      id: 'w-1',
      name: 'Push',
      started_at: '2026-04-18T10:00:00Z',
      completed_at: '2026-04-18T11:00:00Z',
      status: 'completed',
      notes: null,
      workout_exercises: [
        {
          id: 'we-2',
          order_index: 1,
          is_substitution: false,
          exercise: { id: 'ex-2', name: 'OHP', primary_muscle_group: 'front_delt', equipment: 'barbell', is_compound: true },
          sets: [],
        },
        {
          id: 'we-1',
          order_index: 0,
          is_substitution: false,
          exercise: { id: 'ex-1', name: 'Bench', primary_muscle_group: 'chest', equipment: 'barbell', is_compound: true },
          sets: [
            { id: 's-2', set_number: 2, weight_kg: 100, reps: 5, rpe: null, is_warmup: false, is_failure: false, is_dropset: false },
            { id: 's-1', set_number: 1, weight_kg: 80, reps: 8, rpe: null, is_warmup: false, is_failure: false, is_dropset: false },
          ],
        },
      ],
    })

    const { result } = renderHook(() => useWorkoutHistory())
    let detail: any
    await act(async () => {
      detail = await result.current.fetchWorkoutDetail('w-1')
    })

    expect(detail.exercises[0].order_index).toBe(0)
    expect(detail.exercises[1].order_index).toBe(1)
    expect(detail.exercises[0].sets[0].set_number).toBe(1)
    expect(detail.exercises[0].sets[1].set_number).toBe(2)
  })
})

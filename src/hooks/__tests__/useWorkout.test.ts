import { renderHook, act } from '@testing-library/react-native'
import { useWorkout } from '../useWorkout'

jest.mock('../../lib/supabase')
jest.mock('../../contexts/AuthContext')

const { mockSupabaseResponse, resetMockQueue, mockFrom, mockChain, setupChain } =
  jest.requireMock('../../lib/supabase') as typeof import('../../lib/__mocks__/supabase')

import * as AuthContextModule from '../../contexts/AuthContext'
const mockUseAuthContext = AuthContextModule.useAuthContext as jest.Mock

const MOCK_USER = { id: 'user-123' }

const makeTemplate = (): any => ({
  id: 'tpl-1',
  name: 'Push Day',
  description: null,
  created_by: MOCK_USER.id,
  estimated_duration_minutes: 60,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  template_exercises: [
    {
      id: 'te-1',
      template_id: 'tpl-1',
      exercise_id: 'ex-1',
      order_index: 0,
      target_sets: 3,
      target_reps: 8,
      target_rpe: null,
      rest_seconds: 90,
      notes: null,
      created_at: '2026-01-01',
      exercise: { id: 'ex-1', name: 'Bench Press' },
    },
  ],
})

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  mockFrom.mockReturnValue(mockChain)
  mockUseAuthContext.mockReturnValue({ user: MOCK_USER })
})

describe('startWorkout', () => {
  it('creates workout then inserts exercises and returns workoutId', async () => {
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Push Day', status: 'in_progress' }
    const exercises = [{ id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: {} }]

    mockSupabaseResponse(workout)    // workouts insert → single()
    mockSupabaseResponse(exercises)  // workout_exercises insert → single() (select returns array)

    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.startWorkout(makeTemplate())
    })

    expect(res.success).toBe(true)
    expect(res.workoutId).toBe('w-1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'workouts')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'workout_exercises')
  })

  it('returns success: false when not authenticated', async () => {
    mockUseAuthContext.mockReturnValueOnce({ user: null })

    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.startWorkout(makeTemplate())
    })

    expect(res.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('surfaces workout insert error', async () => {
    mockSupabaseResponse(null, { message: 'Insert failed' })

    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.startWorkout(makeTemplate())
    })

    expect(res.success).toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('logSet', () => {
  it('returns error when no active workout', async () => {
    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.logSet('we-1', { set_number: 1, weight_kg: 100, reps: 5 })
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('No active workout')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('inserts set and returns it after workout is started', async () => {
    // Start workout first
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Push Day', status: 'in_progress' }
    const exercises = [{ id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: {} }]
    mockSupabaseResponse(workout)
    mockSupabaseResponse(exercises)

    const { result } = renderHook(() => useWorkout())
    await act(async () => {
      await result.current.startWorkout(makeTemplate())
    })

    // Now log a set
    const newSet = { id: 's-1', workout_exercise_id: 'we-1', set_number: 1, weight_kg: 100, reps: 5 }
    mockSupabaseResponse(newSet)

    let logRes: any
    await act(async () => {
      logRes = await result.current.logSet('we-1', { set_number: 1, weight_kg: 100, reps: 5 })
    })

    expect(logRes.success).toBe(true)
    expect(logRes.set.id).toBe('s-1')
    expect(mockFrom).toHaveBeenCalledWith('workout_sets')
  })
})

describe('swapExercise', () => {
  it('marks the exercise as is_substitution: true', async () => {
    const updated = { id: 'we-1', exercise_id: 'ex-2', is_substitution: true, exercise: {} }
    mockSupabaseResponse(updated)

    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.swapExercise('we-1', 'ex-2')
    })

    expect(res.success).toBe(true)
    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall.is_substitution).toBe(true)
    expect(updateCall.exercise_id).toBe('ex-2')
  })
})

describe('completeWorkout', () => {
  it('returns error when no active workout', async () => {
    const { result } = renderHook(() => useWorkout())
    let res: any
    await act(async () => {
      res = await result.current.completeWorkout()
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('No active workout')
  })

  it('sets status to completed after workout is started', async () => {
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Push Day', status: 'in_progress' }
    const exercises = [{ id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: {} }]
    mockSupabaseResponse(workout)
    mockSupabaseResponse(exercises)

    const { result } = renderHook(() => useWorkout())
    await act(async () => {
      await result.current.startWorkout(makeTemplate())
    })

    const completed = { ...workout, status: 'completed', completed_at: new Date().toISOString() }
    mockSupabaseResponse(completed)

    let res: any
    await act(async () => {
      res = await result.current.completeWorkout()
    })

    expect(res.success).toBe(true)
    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall.status).toBe('completed')
    expect(updateCall.completed_at).toBeTruthy()
  })

  it('includes notes string in the update payload', async () => {
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Push Day', status: 'in_progress' }
    const exercises = [{ id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: {} }]
    mockSupabaseResponse(workout)
    mockSupabaseResponse(exercises)

    const { result } = renderHook(() => useWorkout())
    await act(async () => { await result.current.startWorkout(makeTemplate()) })

    mockSupabaseResponse({ ...workout, status: 'completed', notes: 'Great session' })
    await act(async () => { await result.current.completeWorkout('Great session') })

    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall.notes).toBe('Great session')
  })

  it('stores null notes when called without notes argument', async () => {
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Push Day', status: 'in_progress' }
    const exercises = [{ id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: {} }]
    mockSupabaseResponse(workout)
    mockSupabaseResponse(exercises)

    const { result } = renderHook(() => useWorkout())
    await act(async () => { await result.current.startWorkout(makeTemplate()) })

    mockSupabaseResponse({ ...workout, status: 'completed', notes: null })
    await act(async () => { await result.current.completeWorkout() })

    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall.notes).toBeNull()
  })
})

describe('reorderExercise', () => {
  const makeTemplate2 = (): any => ({
    id: 'tpl-2',
    name: 'Full Body',
    description: null,
    created_by: MOCK_USER.id,
    estimated_duration_minutes: 60,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    template_exercises: [
      { id: 'te-1', template_id: 'tpl-2', exercise_id: 'ex-1', order_index: 0, target_sets: 3, target_reps: 8, target_rpe: null, rest_seconds: 90, notes: null, created_at: '2026-01-01', exercise: { id: 'ex-1', name: 'Bench Press' } },
      { id: 'te-2', template_id: 'tpl-2', exercise_id: 'ex-2', order_index: 1, target_sets: 3, target_reps: 8, target_rpe: null, rest_seconds: 90, notes: null, created_at: '2026-01-01', exercise: { id: 'ex-2', name: 'Squat' } },
    ],
  })

  const exercises2 = [
    { id: 'we-1', exercise_id: 'ex-1', order_index: 0, exercise: { id: 'ex-1', name: 'Bench Press' }, sets: [] },
    { id: 'we-2', exercise_id: 'ex-2', order_index: 1, exercise: { id: 'ex-2', name: 'Squat' }, sets: [] },
  ]

  async function startWith2Exercises(hook: any) {
    const workout = { id: 'w-1', user_id: MOCK_USER.id, name: 'Full Body', status: 'in_progress' }
    mockSupabaseResponse(workout)
    mockSupabaseResponse(exercises2)
    await act(async () => { await hook.current.startWorkout(makeTemplate2()) })
  }

  it('moves exercise from fromIndex to toIndex in local state', async () => {
    const { result } = renderHook(() => useWorkout())
    await startWith2Exercises(result)

    await act(async () => { await result.current.reorderExercise(1, 0) })

    expect(result.current.exercises[0].id).toBe('we-2')
    expect(result.current.exercises[1].id).toBe('we-1')
  })

  it('reindexes order_index values to match new positions', async () => {
    const { result } = renderHook(() => useWorkout())
    await startWith2Exercises(result)

    await act(async () => { await result.current.reorderExercise(1, 0) })

    expect(result.current.exercises[0].order_index).toBe(0)
    expect(result.current.exercises[1].order_index).toBe(1)
  })

  it('calls supabase update once per exercise', async () => {
    const { result } = renderHook(() => useWorkout())
    await startWith2Exercises(result)
    mockChain.update.mockClear()

    await act(async () => { await result.current.reorderExercise(1, 0) })

    expect(mockChain.update).toHaveBeenCalledTimes(2)
  })

  it('scopes each update to the correct exercise id', async () => {
    const { result } = renderHook(() => useWorkout())
    await startWith2Exercises(result)
    mockChain.eq.mockClear()

    await act(async () => { await result.current.reorderExercise(1, 0) })

    const eqIds = mockChain.eq.mock.calls.map((c: any[]) => c[1])
    expect(eqIds).toContain('we-1')
    expect(eqIds).toContain('we-2')
  })

  it('does not call supabase when no workout is active', async () => {
    const { result } = renderHook(() => useWorkout())
    // No startWorkout — workout is null

    await act(async () => { await result.current.reorderExercise(0, 1) })

    expect(mockFrom).not.toHaveBeenCalledWith('workout_exercises')
  })

  it('handles move from last index to second-to-last correctly', async () => {
    const { result } = renderHook(() => useWorkout())
    await startWith2Exercises(result)

    await act(async () => { await result.current.reorderExercise(0, 1) })

    expect(result.current.exercises[0].id).toBe('we-2')
    expect(result.current.exercises[1].id).toBe('we-1')
  })
})

describe('getPreviousSets', () => {
  it('returns empty array when no previous workout found', async () => {
    // single() returns error (no rows)
    mockSupabaseResponse(null, { code: 'PGRST116' })

    const { result } = renderHook(() => useWorkout())
    let sets: any[]
    await act(async () => {
      sets = await result.current.getPreviousSets('ex-1')
    })

    expect(sets!).toEqual([])
  })

  it('returns sets from most recent completed workout', async () => {
    const recentWorkout = {
      id: 'w-prev',
      workout_exercises: [{ id: 'we-prev', exercise_id: 'ex-1' }],
    }
    const prevSets = [
      { set_number: 1, weight_kg: 100, reps: 5 },
      { set_number: 2, weight_kg: 100, reps: 5 },
    ]

    mockSupabaseResponse(recentWorkout)  // workouts query → single()
    mockSupabaseResponse(prevSets)       // workout_sets query → thenable

    const { result } = renderHook(() => useWorkout())
    let sets: any[]
    await act(async () => {
      sets = await result.current.getPreviousSets('ex-1')
    })

    expect(sets!).toHaveLength(2)
    expect(sets![0].weight_kg).toBe(100)
  })
})

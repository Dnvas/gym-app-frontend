import { renderHook, act } from '@testing-library/react-native'
import { useAnalytics } from '../useAnalytics'

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

describe('fetchWeeklyVolume', () => {
  it('separates compound and isolation sets correctly', async () => {
    const rows = [
      { muscle_group: 'chest', is_compound: true, total_sets: 3, total_volume_kg: 900 },
      { muscle_group: 'chest', is_compound: false, total_sets: 2, total_volume_kg: 200 },
    ]
    mockSupabaseResponse(rows)   // current week
    mockSupabaseResponse([])     // prev week

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchWeeklyVolume()
    })

    const chest = data.muscle_groups.find((m: any) => m.muscle_group === 'chest')
    expect(chest.compound_sets).toBe(3)
    expect(chest.isolation_sets).toBe(2)
    expect(chest.total_sets).toBe(5)
  })

  it('calculates pct change vs previous week', async () => {
    mockSupabaseResponse([
      { muscle_group: 'chest', is_compound: true, total_sets: 6, total_volume_kg: 1800 },
    ])
    mockSupabaseResponse([
      { muscle_group: 'chest', is_compound: true, total_sets: 3, total_volume_kg: 900 },
    ])

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchWeeklyVolume()
    })

    // 6 vs 3 = +100%
    const chest = data.muscle_groups.find((m: any) => m.muscle_group === 'chest')
    expect(chest.change_vs_last_week).toBe(100)
  })

  it('omits change_vs_last_week when no previous data', async () => {
    mockSupabaseResponse([
      { muscle_group: 'chest', is_compound: true, total_sets: 4, total_volume_kg: 1200 },
    ])
    mockSupabaseResponse([])  // empty prev week

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchWeeklyVolume()
    })

    expect(data.totals.change_vs_last_week).toBeUndefined()
  })

  it('returns null when not authenticated', async () => {
    mockUseAuthContext.mockReturnValueOnce({ user: null })

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchWeeklyVolume()
    })

    expect(data).toBeNull()
  })
})

describe('fetchGroupedPRs', () => {
  it('places squat in big_three.squat', async () => {
    mockSupabaseResponse([
      {
        exercise_id: 'ex-1',
        exercise_name: 'Barbell Squat',
        pr_tier: 'big_three',
        primary_muscle_group: 'quadriceps',
        weight_kg: 140,
        reps: 5,
        estimated_1rm: 163,
        achieved_at: '2026-04-18',
        is_compound: true,
      },
    ])

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchGroupedPRs()
    })

    expect(data.big_three.squat).not.toBeNull()
    expect(data.big_three.squat.exercise_name).toBe('Barbell Squat')
  })

  it('places non-big-three compound in compounds array', async () => {
    mockSupabaseResponse([
      {
        exercise_id: 'ex-2',
        exercise_name: 'Overhead Press',
        pr_tier: 'compound',
        primary_muscle_group: 'front_delt',
        weight_kg: 80,
        reps: 5,
        estimated_1rm: 93,
        achieved_at: '2026-04-18',
        is_compound: true,
      },
    ])

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchGroupedPRs()
    })

    expect(data.compounds).toHaveLength(1)
    expect(data.compounds[0].exercise_name).toBe('Overhead Press')
  })

  it('places isolation exercises under isolation_by_muscle', async () => {
    mockSupabaseResponse([
      {
        exercise_id: 'ex-3',
        exercise_name: 'Barbell Curl',
        pr_tier: 'isolation',
        primary_muscle_group: 'biceps',
        weight_kg: 50,
        reps: 10,
        estimated_1rm: 57,
        achieved_at: '2026-04-18',
        is_compound: false,
      },
    ])

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchGroupedPRs()
    })

    expect(data.isolation_by_muscle['biceps']).toHaveLength(1)
  })
})

describe('fetchExerciseProgress', () => {
  it('keeps only the heaviest weight per day', async () => {
    // Two sets on the same day — different weights
    mockSupabaseResponse([
      {
        weight_kg: 100,
        reps: 5,
        completed_at: '2026-04-18T10:00:00Z',
        workout_exercise: { exercise: { name: 'Bench Press' }, workout: {} },
      },
      {
        weight_kg: 105,  // heavier — this should win
        reps: 3,
        completed_at: '2026-04-18T11:00:00Z',
        workout_exercise: { exercise: { name: 'Bench Press' }, workout: {} },
      },
    ])
    mockSupabaseResponse(null)  // PR query → no PR

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchExerciseProgress('ex-1')
    })

    expect(data.data_points).toHaveLength(1)
    expect(data.data_points[0].weight_kg).toBe(105)
  })

  it('groups progress data by date key', async () => {
    mockSupabaseResponse([
      {
        weight_kg: 100,
        reps: 5,
        completed_at: '2026-04-15T10:00:00Z',
        workout_exercise: { exercise: { name: 'Bench' }, workout: {} },
      },
      {
        weight_kg: 102,
        reps: 5,
        completed_at: '2026-04-18T10:00:00Z',
        workout_exercise: { exercise: { name: 'Bench' }, workout: {} },
      },
    ])
    mockSupabaseResponse(null)

    const { result } = renderHook(() => useAnalytics())
    let data: any
    await act(async () => {
      data = await result.current.fetchExerciseProgress('ex-1')
    })

    expect(data.data_points).toHaveLength(2)
    expect(data.data_points[0].date).toBe('2026-04-15')
    expect(data.data_points[1].date).toBe('2026-04-18')
  })
})

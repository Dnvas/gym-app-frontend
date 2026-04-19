import React from 'react'
import { waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import { createNavigationMock } from '../../../test-utils/mockNavigation'
import WorkoutSummaryScreen from '../WorkoutSummaryScreen'

jest.mock('../../../lib/supabase')

const { mockSupabaseResponse, resetMockQueue, setupChain, mockFrom, mockChain } =
  jest.requireMock('../../../lib/supabase') as typeof import('../../../lib/__mocks__/supabase')

const WORKOUT_ID = 'w-1'

function makeWorkout(overrides: Record<string, any> = {}) {
  return {
    id: WORKOUT_ID,
    name: 'Push Day',
    started_at: '2026-04-01T10:00:00.000Z',
    completed_at: '2026-04-01T11:00:00.000Z',
    notes: null,
    workout_exercises: [
      {
        id: 'we-1',
        exercise: { id: 'ex-1', name: 'Bench Press' },
        sets: [
          { id: 's-1', is_warmup: false, weight_kg: 100, reps: 5 },
          { id: 's-2', is_warmup: false, weight_kg: 100, reps: 5 },
        ],
      },
    ],
    ...overrides,
  }
}

function renderScreen() {
  const navigation = { ...createNavigationMock(), popToTop: jest.fn(), replace: jest.fn() }
  const route = { params: { workoutId: WORKOUT_ID } }
  const rendered = renderWithProviders(
    <WorkoutSummaryScreen navigation={navigation as any} route={route as any} />
  )
  return { ...rendered, navigation }
}

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  mockFrom.mockReturnValue(mockChain)
})

describe('WorkoutSummaryScreen notes', () => {
  it('renders notes card when workout has notes', async () => {
    mockSupabaseResponse(makeWorkout({ notes: 'Great session today' })) // workouts.single()
    mockSupabaseResponse([])                                             // personal_records

    const { getByText } = renderScreen()

    await waitFor(() => {
      expect(getByText('Great session today')).toBeTruthy()
    })
  })

  it('does not render notes card when notes is null', async () => {
    mockSupabaseResponse(makeWorkout({ notes: null }))
    mockSupabaseResponse([])

    const { queryByText } = renderScreen()

    await waitFor(() => {
      expect(queryByText('Notes')).toBeNull()
    })
  })

  it('does not render notes card when notes is empty string', async () => {
    mockSupabaseResponse(makeWorkout({ notes: '' }))
    mockSupabaseResponse([])

    const { queryByText } = renderScreen()

    await waitFor(() => {
      expect(queryByText('Notes')).toBeNull()
    })
  })

  it('includes notes in the select query', async () => {
    mockSupabaseResponse(makeWorkout())
    mockSupabaseResponse([])

    renderScreen()

    await waitFor(() => {
      const selectArg: string = mockChain.select.mock.calls[0][0]
      expect(selectArg).toContain('notes')
    })
  })

  it('displays notes text when notes is present', async () => {
    const notes = 'Felt strong on squats'
    mockSupabaseResponse(makeWorkout({ notes }))
    mockSupabaseResponse([])

    const { getByText } = renderScreen()

    await waitFor(() => {
      expect(getByText(notes)).toBeTruthy()
    })
  })
})

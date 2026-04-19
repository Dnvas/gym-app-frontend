import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import { createNavigationMock } from '../../../test-utils/mockNavigation'
import ActiveWorkoutScreen from '../ActiveWorkoutScreen'

// ── Module mocks ───────────────────────────────────────────────────────────────

jest.mock('../../../lib/supabase')
jest.mock('../../../contexts/WorkoutContext')
jest.mock('../../../contexts/AuthContext')

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require('react')
    useEffect(() => { cb() }, [])
  },
}))

// Stub heavy child components so the test doesn't need their full deps
jest.mock('../../../components/workout/SetInputCard', () => {
  const { View, Text } = require('react-native')
  return () => <View><Text>SetInputCard</Text></View>
})
jest.mock('../../../components/workout/RestTimer', () => () => null)
jest.mock('../../../components/workout/ExerciseSwapModal', () => () => null)

import * as WorkoutContextModule from '../../../contexts/WorkoutContext'
import * as AuthContextModule from '../../../contexts/AuthContext'

const mockUseWorkoutContext = WorkoutContextModule.useWorkoutContext as jest.Mock
const mockUseAuthContext = AuthContextModule.useAuthContext as jest.Mock

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_WORKOUT = {
  id: 'w-1',
  name: 'Push Day',
  started_at: new Date().toISOString(),
  status: 'in_progress',
}

function makeExercises(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `we-${i + 1}`,
    exercise_id: `ex-${i + 1}`,
    order_index: i,
    exercise: { id: `ex-${i + 1}`, name: `Exercise ${i + 1}`, primary_muscle_group: 'chest' },
    sets: [],
  }))
}

const mockReorderExercise = jest.fn()
const mockCompleteWorkout = jest.fn()
const mockGetWorkoutStats = jest.fn(() => ({
  totalSets: 3,
  totalVolume: 1500,
  completedExercises: 1,
}))

function setupContext(exerciseCount = 2) {
  mockUseWorkoutContext.mockReturnValue({
    workout: MOCK_WORKOUT,
    exercises: makeExercises(exerciseCount),
    resumeWorkout: jest.fn(),
    completeWorkout: mockCompleteWorkout,
    abandonWorkout: jest.fn(),
    getWorkoutStats: mockGetWorkoutStats,
    reorderExercise: mockReorderExercise,
  })
  mockUseAuthContext.mockReturnValue({ user: { id: 'user-1' } })
}

function renderScreen(exerciseCount = 2) {
  setupContext(exerciseCount)
  const navigation = {
    ...createNavigationMock(),
    replace: jest.fn(),
    popToTop: jest.fn(),
  }
  const route = { params: { workoutId: 'w-1' } }
  return {
    navigation,
    ...renderWithProviders(
      <ActiveWorkoutScreen navigation={navigation as any} route={route as any} />
    ),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('exercise reordering', () => {
  it('renders reorder chevrons when there are multiple exercises', () => {
    const { getByTestId } = renderScreen(2)
    expect(getByTestId('move-exercise-up')).toBeTruthy()
    expect(getByTestId('move-exercise-down')).toBeTruthy()
  })

  it('hides reorder chevrons when there is only one exercise', () => {
    const { queryByTestId } = renderScreen(1)
    expect(queryByTestId('move-exercise-up')).toBeNull()
    expect(queryByTestId('move-exercise-down')).toBeNull()
  })

  it('up chevron is disabled on the first exercise (index 0)', () => {
    const { getByTestId } = renderScreen(2)
    // First exercise is shown by default (currentExerciseIndex = 0)
    const upBtn = getByTestId('move-exercise-up')
    expect(upBtn.props.accessibilityState?.disabled ?? upBtn.props.disabled).toBeTruthy()
  })

  it('pressing up calls reorderExercise with correct indices', async () => {
    const { getByTestId, getAllByText } = renderScreen(2)

    // Navigate to second exercise so up is enabled
    fireEvent.press(getAllByText('Next')[0])

    await waitFor(() => {
      fireEvent.press(getByTestId('move-exercise-up'))
    })

    await waitFor(() => {
      expect(mockReorderExercise).toHaveBeenCalledWith(1, 0)
    })
  })
})

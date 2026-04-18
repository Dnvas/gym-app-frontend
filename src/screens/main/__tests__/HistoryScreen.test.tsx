import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import { createNavigationMock } from '../../../test-utils/mockNavigation'
import HistoryScreen from '../HistoryScreen'

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../../contexts/AuthContext')
jest.mock('../../../hooks/useWorkoutHistory')

// Calendar: render a minimal stub with testIDs so we can simulate presses
jest.mock('react-native-calendars', () => {
  const React = require('react')
  const { TouchableOpacity, Text } = require('react-native')
  return {
    Calendar: ({ onDayPress, markedDates }: any) => (
      <>
        <TouchableOpacity
          testID="calendar-day-2026-04-18"
          onPress={() => onDayPress({ dateString: '2026-04-18', day: 18, month: 4, year: 2026, timestamp: 0 })}
        >
          <Text>18</Text>
        </TouchableOpacity>
      </>
    ),
  }
})

import * as WorkoutHistoryModule from '../../../hooks/useWorkoutHistory'
const mockUseWorkoutHistory = WorkoutHistoryModule.useWorkoutHistory as jest.Mock

const mockFetchWorkoutSummaries = jest.fn().mockResolvedValue([])

const SUMMARIES = [
  {
    workout_id: 'w-1',
    user_id: 'u-1',
    name: 'Push Day',
    started_at: '2026-04-18T10:00:00Z',
    completed_at: '2026-04-18T11:00:00Z',
    status: 'completed',
    notes: null,
    duration_minutes: 60,
    exercise_count: 3,
    total_sets: 9,
    total_volume_kg: 2700,
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchWorkoutSummaries.mockResolvedValue(SUMMARIES)
  mockUseWorkoutHistory.mockReturnValue({
    summaries: SUMMARIES,
    markedDates: { '2026-04-18': { marked: true, dotColor: '#00D9C4' } },
    loading: false,
    error: null,
    fetchWorkoutSummaries: mockFetchWorkoutSummaries,
    fetchWorkoutDetail: jest.fn(),
  })
})

function renderHistory() {
  const navigation = createNavigationMock()
  const utils = renderWithProviders(<HistoryScreen navigation={navigation as any} />)
  return { navigation, ...utils }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HistoryScreen', () => {
  it('renders workout names from summaries', async () => {
    const { getByText } = renderHistory()
    await waitFor(() => expect(getByText('Push Day')).toBeTruthy())
  })

  it('filters list when a calendar day is pressed', async () => {
    // Add a second workout on a different day
    const summaries = [
      ...SUMMARIES,
      {
        workout_id: 'w-2',
        user_id: 'u-1',
        name: 'Pull Day',
        started_at: '2026-04-15T10:00:00Z',
        completed_at: '2026-04-15T11:00:00Z',
        status: 'completed',
        notes: null,
        duration_minutes: 55,
        exercise_count: 4,
        total_sets: 12,
        total_volume_kg: 3000,
      },
    ]

    mockUseWorkoutHistory.mockReturnValue({
      summaries,
      markedDates: {},
      loading: false,
      error: null,
      fetchWorkoutSummaries: mockFetchWorkoutSummaries,
      fetchWorkoutDetail: jest.fn(),
    })

    const { getByText, queryByText, getByTestId } = renderHistory()

    // Both visible initially
    await waitFor(() => {
      expect(getByText('Push Day')).toBeTruthy()
      expect(getByText('Pull Day')).toBeTruthy()
    })

    // Press a calendar day for 2026-04-18 — only Push Day should show
    fireEvent.press(getByTestId('calendar-day-2026-04-18'))

    await waitFor(() => {
      expect(getByText('Push Day')).toBeTruthy()
      expect(queryByText('Pull Day')).toBeNull()
    })
  })

  it('pressing the same day again clears the filter', async () => {
    const summaries = [
      ...SUMMARIES,
      {
        workout_id: 'w-2',
        user_id: 'u-1',
        name: 'Pull Day',
        started_at: '2026-04-15T10:00:00Z',
        completed_at: null,
        status: 'completed',
        notes: null,
        duration_minutes: null,
        exercise_count: 4,
        total_sets: 12,
        total_volume_kg: 3000,
      },
    ]

    mockUseWorkoutHistory.mockReturnValue({
      summaries,
      markedDates: {},
      loading: false,
      error: null,
      fetchWorkoutSummaries: mockFetchWorkoutSummaries,
      fetchWorkoutDetail: jest.fn(),
    })

    const { getByText, queryByText, getByTestId } = renderHistory()

    await waitFor(() => expect(getByText('Push Day')).toBeTruthy())

    // Press to filter
    fireEvent.press(getByTestId('calendar-day-2026-04-18'))
    await waitFor(() => expect(queryByText('Pull Day')).toBeNull())

    // Press again to clear
    fireEvent.press(getByTestId('calendar-day-2026-04-18'))
    await waitFor(() => expect(getByText('Pull Day')).toBeTruthy())
  })
})

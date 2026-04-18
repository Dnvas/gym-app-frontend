import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import ExercisePickerModal from '../ExercisePickerModal'

jest.mock('../../../lib/supabase')

const { mockSupabaseResponse, resetMockQueue, mockFrom, mockChain, setupChain } =
  jest.requireMock('../../../lib/supabase') as typeof import('../../../lib/__mocks__/supabase')

const EXERCISES = [
  {
    id: 'ex-1', name: 'Bench Press', primary_muscle_group: 'chest',
    secondary_muscle_groups: [], equipment: 'barbell', is_compound: true,
    description: null, created_by: null, created_at: '2026-01-01',
  },
  {
    id: 'ex-2', name: 'Barbell Curl', primary_muscle_group: 'biceps',
    secondary_muscle_groups: [], equipment: 'barbell', is_compound: false,
    description: null, created_by: null, created_at: '2026-01-01',
  },
  {
    id: 'ex-3', name: 'Overhead Press', primary_muscle_group: 'front_delt',
    secondary_muscle_groups: [], equipment: 'barbell', is_compound: true,
    description: null, created_by: null, created_at: '2026-01-01',
  },
]

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onSelect: jest.fn(),
  excludeExerciseIds: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  mockFrom.mockReturnValue(mockChain)
})

describe('ExercisePickerModal', () => {
  it('renders all exercises after load', async () => {
    mockSupabaseResponse(EXERCISES)
    const { getByText } = renderWithProviders(<ExercisePickerModal {...defaultProps} />)

    await waitFor(() => {
      expect(getByText('Bench Press')).toBeTruthy()
      expect(getByText('Barbell Curl')).toBeTruthy()
      expect(getByText('Overhead Press')).toBeTruthy()
    })
  })

  it('filters by search query', async () => {
    mockSupabaseResponse(EXERCISES)
    const { getByText, queryByText, getByPlaceholderText } = renderWithProviders(
      <ExercisePickerModal {...defaultProps} />
    )

    await waitFor(() => expect(getByText('Bench Press')).toBeTruthy())

    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'curl')

    await waitFor(() => {
      expect(getByText('Barbell Curl')).toBeTruthy()
      expect(queryByText('Bench Press')).toBeNull()
      expect(queryByText('Overhead Press')).toBeNull()
    })
  })

  it('filters by muscle group chip', async () => {
    mockSupabaseResponse(EXERCISES)
    const { getByText, queryByText, getAllByText } = renderWithProviders(
      <ExercisePickerModal {...defaultProps} />
    )

    await waitFor(() => expect(getByText('Bench Press')).toBeTruthy())

    // Press the "Chest" filter chip (first match — muscle label in rows also says Chest)
    fireEvent.press(getAllByText('Chest')[0])

    await waitFor(() => {
      expect(getByText('Bench Press')).toBeTruthy()
      expect(queryByText('Barbell Curl')).toBeNull()
      expect(queryByText('Overhead Press')).toBeNull()
    })
  })

  it('excludes exercises by id', async () => {
    mockSupabaseResponse(EXERCISES)
    const { queryByText } = renderWithProviders(
      <ExercisePickerModal {...defaultProps} excludeExerciseIds={['ex-1']} />
    )

    await waitFor(() => expect(queryByText('Barbell Curl')).toBeTruthy())
    expect(queryByText('Bench Press')).toBeNull()
  })

  it('calls onSelect and onClose when an exercise is tapped', async () => {
    mockSupabaseResponse(EXERCISES)
    const onSelect = jest.fn()
    const onClose = jest.fn()

    const { getByText } = renderWithProviders(
      <ExercisePickerModal {...defaultProps} onSelect={onSelect} onClose={onClose} />
    )

    await waitFor(() => expect(getByText('Bench Press')).toBeTruthy())

    fireEvent.press(getByText('Bench Press'))

    expect(onSelect).toHaveBeenCalledWith(EXERCISES[0])
    expect(onClose).toHaveBeenCalled()
  })
})

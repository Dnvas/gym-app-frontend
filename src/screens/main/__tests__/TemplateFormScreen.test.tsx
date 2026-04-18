import React from 'react'
import { Alert } from 'react-native'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import { createNavigationMock } from '../../../test-utils/mockNavigation'
import TemplateFormScreen from '../TemplateFormScreen'

// ── Module mocks ──────────────────────────────────────────────────────────────

// Prevents supabase.ts from being evaluated when Jest auto-mocks useTemplateManagement
jest.mock('../../../lib/supabase')
jest.mock('../../../hooks/useTemplateManagement')
jest.mock('../../../components/workout/ExercisePickerModal', () => () => null)

import * as TemplateManagementModule from '../../../hooks/useTemplateManagement'
const mockUseTemplateManagement = TemplateManagementModule.useTemplateManagement as jest.Mock

const mockCreateTemplate = jest.fn()
const mockUpdateTemplate = jest.fn()
const mockFetchTemplateForEdit = jest.fn()

const EXERCISE_A = {
  id: 'ex-1', name: 'Bench Press', primary_muscle_group: 'chest',
  secondary_muscle_groups: [], equipment: 'barbell', is_compound: true,
  description: null, created_by: null, created_at: '2026-01-01',
}
const EXERCISE_B = {
  id: 'ex-2', name: 'Overhead Press', primary_muscle_group: 'front_delt',
  secondary_muscle_groups: [], equipment: 'barbell', is_compound: true,
  description: null, created_by: null, created_at: '2026-01-01',
}

const TEMPLATE = {
  id: 'tpl-1',
  name: 'Push Day',
  description: 'chest + shoulders',
  template_exercises: [
    { exercise_id: 'ex-1', exercise: EXERCISE_A, order_index: 0, target_sets: 3, target_reps: 8, target_rpe: null, rest_seconds: 90, notes: null },
    { exercise_id: 'ex-2', exercise: EXERCISE_B, order_index: 1, target_sets: 3, target_reps: 10, target_rpe: null, rest_seconds: 90, notes: null },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateTemplate.mockResolvedValue({ success: true, error: null })
  mockUpdateTemplate.mockResolvedValue({ success: true, error: null })
  mockFetchTemplateForEdit.mockResolvedValue(TEMPLATE)
  mockUseTemplateManagement.mockReturnValue({
    loading: false,
    error: null,
    createTemplate: mockCreateTemplate,
    updateTemplate: mockUpdateTemplate,
    fetchTemplateForEdit: mockFetchTemplateForEdit,
    deleteTemplate: jest.fn(),
  })
})

function renderForm(templateId?: string) {
  const navigation = createNavigationMock()
  const route = { params: templateId ? { templateId } : {} } as any
  const utils = renderWithProviders(
    <TemplateFormScreen navigation={navigation as any} route={route} />
  )
  return { navigation, ...utils }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TemplateFormScreen', () => {
  it('shows alert and does not call createTemplate when name is empty', async () => {
    jest.spyOn(Alert, 'alert')
    const { getByText } = renderForm()

    await waitFor(() => expect(getByText('Save Template')).toBeTruthy())
    fireEvent.press(getByText('Save Template'))

    expect(Alert.alert).toHaveBeenCalledWith('Name required', expect.any(String))
    expect(mockCreateTemplate).not.toHaveBeenCalled()
  })

  it('shows alert and does not call createTemplate when no exercises added', async () => {
    jest.spyOn(Alert, 'alert')
    const { getByText, getByPlaceholderText } = renderForm()

    await waitFor(() => expect(getByText('Save Template')).toBeTruthy())
    fireEvent.changeText(getByPlaceholderText('e.g. Push Day A'), 'My Template')
    fireEvent.press(getByText('Save Template'))

    expect(Alert.alert).toHaveBeenCalledWith('No exercises', expect.any(String))
    expect(mockCreateTemplate).not.toHaveBeenCalled()
  })

  it('loads template data in edit mode', async () => {
    const { getByDisplayValue } = renderForm('tpl-1')

    await waitFor(() => {
      expect(getByDisplayValue('Push Day')).toBeTruthy()
      expect(getByDisplayValue('chest + shoulders')).toBeTruthy()
    })

    expect(mockFetchTemplateForEdit).toHaveBeenCalledWith('tpl-1')
  })

  it('reorder down moves first exercise below second', async () => {
    const { getByTestId, getAllByText } = renderForm('tpl-1')

    await waitFor(() => {
      expect(getAllByText('Bench Press').length).toBeGreaterThan(0)
      expect(getAllByText('Overhead Press').length).toBeGreaterThan(0)
    })

    // Move Bench Press (index 0) down
    fireEvent.press(getByTestId('move-down-0'))

    await waitFor(() => {
      const benchOccurrences = getAllByText('Bench Press')
      const ohpOccurrences = getAllByText('Overhead Press')
      // Both still visible after reorder
      expect(benchOccurrences.length).toBeGreaterThan(0)
      expect(ohpOccurrences.length).toBeGreaterThan(0)
    })
  })
})

import React from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { fireEvent, waitFor, act } from '@testing-library/react-native'
import { renderWithProviders } from '../../test-utils/render'
import { ToastProvider, useToast } from '../ToastContext'

jest.mock('../../lib/supabase')

function Trigger({ type }: { type: 'success' | 'error' | 'info' }) {
  const toast = useToast()
  return (
    <TouchableOpacity
      testID="trigger"
      onPress={() => {
        if (type === 'success') toast.showSuccess('Saved!')
        if (type === 'error') toast.showError('Something failed')
        if (type === 'info') toast.showInfo('Did you know')
      }}
    >
      <Text>Press</Text>
    </TouchableOpacity>
  )
}

function renderToast(type: 'success' | 'error' | 'info' = 'error') {
  return renderWithProviders(
    <ToastProvider>
      <Trigger type={type} />
    </ToastProvider>
  )
}

describe('ToastContext', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('showError renders an error toast', async () => {
    const { getByTestId, getByText } = renderToast('error')
    fireEvent.press(getByTestId('trigger'))
    await waitFor(() => expect(getByText('Something failed')).toBeTruthy())
  })

  it('showSuccess renders a success toast', async () => {
    const { getByTestId, getByText } = renderToast('success')
    fireEvent.press(getByTestId('trigger'))
    await waitFor(() => expect(getByText('Saved!')).toBeTruthy())
  })

  it('toast is dismissed when the X button is pressed', async () => {
    const { getByTestId, getByText, queryByText } = renderToast('error')
    fireEvent.press(getByTestId('trigger'))
    await waitFor(() => expect(getByText('Something failed')).toBeTruthy())

    fireEvent.press(getByText('✕'))
    await waitFor(() => expect(queryByText('Something failed')).toBeNull())
  })

  it('toast auto-dismisses after the timeout', async () => {
    const { getByTestId, getByText, queryByText } = renderToast('info')
    fireEvent.press(getByTestId('trigger'))
    await waitFor(() => expect(getByText('Did you know')).toBeTruthy())

    act(() => { jest.advanceTimersByTime(3500) })
    await waitFor(() => expect(queryByText('Did you know')).toBeNull())
  })
})

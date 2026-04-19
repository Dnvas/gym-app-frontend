import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../test-utils/render'
import { ErrorBoundary } from '../ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test explosion')
  return null
}

// Silence the expected console.error from componentDidCatch
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    const { Text } = require('react-native')
    const { getByText } = renderWithProviders(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    )
    expect(getByText('All good')).toBeTruthy()
  })

  it('shows fallback UI when a child throws', () => {
    const { getByText } = renderWithProviders(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(getByText('Something went wrong')).toBeTruthy()
    expect(getByText('Reload')).toBeTruthy()
  })

  it('Reload button is pressable and does not crash', () => {
    const { getByText } = renderWithProviders(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(getByText('Reload')).toBeTruthy()
    // Pressing reload resets hasError; Bomb throws again so fallback reappears — no crash
    fireEvent.press(getByText('Reload'))
    expect(getByText('Something went wrong')).toBeTruthy()
  })
})

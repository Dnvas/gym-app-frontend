// src/test-utils/render.tsx
// Minimal render wrapper for component tests.
// Provides SafeAreaProvider (required by SafeAreaView) and nothing else —
// navigation is passed as a prop mock, contexts are mocked at the module level.
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

function AllProviders({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

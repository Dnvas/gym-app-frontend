// src/test-utils/render.tsx
// Minimal render wrapper for component tests.
// Provides SafeAreaProvider + ToastProvider so screens that call useToast() work.
// Navigation is passed as a prop mock; other contexts are mocked at module level.
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ToastProvider } from '../contexts/ToastContext'

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// src/App.tsx
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './contexts/AuthContext'
import { WorkoutProvider } from './contexts/WorkoutContext'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { RootNavigator } from './navigation'

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkoutProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </WorkoutProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

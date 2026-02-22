// src/App.tsx
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './contexts/AuthContext'
import { WorkoutProvider } from './contexts/WorkoutContext'
import { RootNavigator } from './navigation'

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WorkoutProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </WorkoutProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

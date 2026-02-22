import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { useAuthContext } from '../contexts/AuthContext'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuthContext()

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
})

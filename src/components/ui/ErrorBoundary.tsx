import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../theme'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app ran into an unexpected error. Tap below to try again.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reload the app"
          >
            <Text style={styles.buttonText}>Reload</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 16,
  },
})

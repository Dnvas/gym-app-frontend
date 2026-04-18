const React = require('react')
const { View } = require('react-native')

const insets = { top: 0, right: 0, bottom: 0, left: 0 }
const frame = { width: 375, height: 812, x: 0, y: 0 }

function SafeAreaProvider({ children }) {
  return children
}

function SafeAreaView({ children, style }) {
  return React.createElement(View, { style }, children)
}

function useSafeAreaInsets() {
  return insets
}

function useSafeAreaFrame() {
  return frame
}

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics: { frame, insets },
}

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { colors } from '../../theme'

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus()
  const translateY = useRef(new Animated.Value(-60)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isConnected ? -60 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isConnected, translateY])

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={isConnected ? '' : 'No internet connection. Changes will not be saved.'}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>⚠</Text>
        <Text style={styles.text}>No internet connection. Changes won't be saved.</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    color: '#fff',
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
})

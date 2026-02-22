// src/components/workout/RestTimer.tsx
// Part of SEDP-40: Implement workout timer (rest timer between sets)
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface RestTimerProps {
  visible: boolean
  duration: number // in seconds
  onClose: () => void
  onSkip: () => void
}

export default function RestTimer({
  visible,
  duration,
  onClose,
  onSkip,
}: RestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(duration)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset timer when opened with new duration
  useEffect(() => {
    if (visible) {
      setRemainingSeconds(duration)
      setIsPaused(false)
    }
  }, [visible, duration])

  // Countdown logic
  useEffect(() => {
    if (!visible || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      return
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          // Timer complete
          Vibration.vibrate(Platform.OS === 'ios' ? [0, 500, 200, 500] : 1000)
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [visible, isPaused])

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function adjustTime(delta: number) {
    setRemainingSeconds(prev => Math.max(0, prev + delta))
  }

  // Calculate progress (inverse - starts full, empties as time passes)
  const progress = remainingSeconds / duration
  const progressDegrees = progress * 360

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rest Timer</Text>
            <TouchableOpacity onPress={onSkip} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            {/* Progress Ring Background */}
            <View style={styles.progressRing}>
              <View style={styles.progressRingInner}>
                <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
                <Text style={styles.timerLabel}>
                  {isPaused ? 'PAUSED' : 'remaining'}
                </Text>
              </View>
            </View>

            {/* Progress Arc - simplified visual */}
            <View style={styles.progressArc}>
              <View
                style={[
                  styles.progressFill,
                  {
                    transform: [{ rotate: `${progressDegrees - 90}deg` }],
                    opacity: progress > 0.5 ? 1 : 0.3,
                  },
                ]}
              />
            </View>
          </View>

          {/* Time Adjustment */}
          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustTime(-15)}
            >
              <Text style={styles.adjustButtonText}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={28}
                color="#1E3A5F"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustTime(15)}
            >
              <Text style={styles.adjustButtonText}>+15s</Text>
            </TouchableOpacity>
          </View>

          {/* Skip Button */}
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip Rest</Text>
          </TouchableOpacity>

          {/* Tip */}
          <Text style={styles.tip}>
            💡 Rest 2-3 min for heavy compounds, 60-90s for isolation exercises
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  timerContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#e8f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    alignItems: 'center',
  },
  progressArc: {
    position: 'absolute',
    width: 180,
    height: 180,
  },
  progressFill: {
    position: 'absolute',
    width: 8,
    height: 90,
    backgroundColor: '#00D9C4',
    top: 0,
    left: 86,
    borderRadius: 4,
    transformOrigin: 'bottom center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E3A5F',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  adjustButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
  },
  adjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    marginBottom: 16,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tip: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
})

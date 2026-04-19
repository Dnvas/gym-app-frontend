import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION = 3000

const BG: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.primary,
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(TOAST_DURATION - 440),
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss())
  }, [])

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: BG[toast.type] },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const insets = useSafeAreaInsets()

  const show = useCallback((message: string, type: ToastType) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    showSuccess: (m) => show(m, 'success'),
    showError: (m) => show(m, 'error'),
    showInfo: (m) => show(m, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        style={[styles.container, { top: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    flex: 1,
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  dismiss: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
})

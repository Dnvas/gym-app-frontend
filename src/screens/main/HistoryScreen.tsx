// src/screens/main/HistoryScreen.tsx
// SEDP-63: History screen with calendar view
// SEDP-64: Highlight workout days on calendar
// SEDP-65: Recent workouts list below calendar
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Calendar, DateData } from 'react-native-calendars'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { HistoryStackParamList } from '../../navigation/MainNavigator'
import { useWorkoutHistory, MarkedDates } from '../../hooks/useWorkoutHistory'
import { WorkoutSummary } from '../../types/workout'

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, 'HistoryMain'>
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

function formatWorkoutDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatWorkoutTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { summaries, markedDates, loading, fetchWorkoutSummaries } = useWorkoutHistory()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadMonth = useCallback(
    async (month: Date) => {
      await fetchWorkoutSummaries(month)
    },
    [fetchWorkoutSummaries]
  )

  useEffect(() => {
    loadMonth(currentMonth)
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadMonth(currentMonth)
    setRefreshing(false)
  }

  function onMonthChange(month: DateData) {
    const newMonth = new Date(month.year, month.month - 1, 1)
    setCurrentMonth(newMonth)
    setSelectedDate(null)
    loadMonth(newMonth)
  }

  function onDayPress(day: DateData) {
    setSelectedDate(prev => (prev === day.dateString ? null : day.dateString))
  }

  // Build marked dates with selected day highlight
  const calendarMarkedDates: MarkedDates = { ...markedDates }
  if (selectedDate) {
    calendarMarkedDates[selectedDate] = {
      ...(calendarMarkedDates[selectedDate] ?? {}),
      marked: calendarMarkedDates[selectedDate]?.marked ?? false,
      dotColor: '#00D9C4',
      selected: true,
    }
  }

  // Filter list to selected day, or show all for the month
  const displayedSummaries = selectedDate
    ? summaries.filter(w => w.started_at.startsWith(selectedDate))
    : summaries

  function renderWorkoutCard({ item }: { item: WorkoutSummary }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.workout_id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </View>

        <Text style={styles.cardDate}>
          {formatWorkoutDate(item.started_at)} · {formatWorkoutTime(item.started_at)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.statText}>{formatDuration(item.duration_minutes)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={14} color="#666" />
            <Text style={styles.statText}>
              {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.total_volume_kg.toLocaleString()} kg</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  function renderEmpty() {
    if (loading) return null
    return (
      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={40} color="#ccc" />
        <Text style={styles.emptyTitle}>
          {selectedDate ? 'No workouts on this day' : 'No workouts this month'}
        </Text>
        <Text style={styles.emptySubtext}>
          {selectedDate
            ? 'Select another day or swipe to a different month'
            : 'Complete a workout to see it here'}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <FlatList
        data={displayedSummaries}
        keyExtractor={item => item.workout_id}
        renderItem={renderWorkoutCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A5F" />
        }
        ListHeaderComponent={
          <>
            {/* Calendar — SEDP-63/64 */}
            <Calendar
              onMonthChange={onMonthChange}
              onDayPress={onDayPress}
              markedDates={calendarMarkedDates}
              markingType="dot"
              style={styles.calendar}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                todayTextColor: '#00D9C4',
                arrowColor: '#1E3A5F',
                selectedDayBackgroundColor: '#1E3A5F',
                selectedDayTextColor: '#ffffff',
                dotColor: '#00D9C4',
                selectedDotColor: '#00D9C4',
                dayTextColor: '#333',
                textDisabledColor: '#ccc',
                monthTextColor: '#1E3A5F',
                textMonthFontWeight: '700',
                textDayFontSize: 14,
                textMonthFontSize: 16,
              }}
            />

            {/* Section header — SEDP-65 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'This Month'}
              </Text>
              {loading && !refreshing && (
                <ActivityIndicator size="small" color="#1E3A5F" />
              )}
            </View>
          </>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  calendar: {
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A5F',
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
})

// src/screens/main/WorkoutDetailScreen.tsx
// SEDP-66: Workout Detail screen
// SEDP-67: Display all exercises and sets
// SEDP-68: Show duration, volume, notes
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { HistoryStackParamList } from '../../navigation/MainNavigator'
import { useWorkoutHistory, WorkoutDetail } from '../../hooks/useWorkoutHistory'
import { colors } from '../../theme'
import {
  formatMuscleGroup,
  getMuscleColor,
  formatDuration,
  formatLongDate,
  formatTime,
} from '../../utils/formatting'

type WorkoutDetailScreenProps = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, 'WorkoutDetail'>
  route: RouteProp<HistoryStackParamList, 'WorkoutDetail'>
}

export default function WorkoutDetailScreen({
  navigation,
  route,
}: WorkoutDetailScreenProps) {
  const { workoutId } = route.params
  const { fetchWorkoutDetail } = useWorkoutHistory()
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await fetchWorkoutDetail(workoutId)
      setWorkout(data)
      setLoading(false)
    }
    load()
  }, [workoutId])

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      </SafeAreaView>
    )
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Could not load workout</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {workout.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats card — SEDP-68 */}
        <View style={styles.statsCard}>
          <Text style={styles.dateText}>{formatLongDate(workout.started_at)}</Text>
          {workout.completed_at && (
            <Text style={styles.timeRangeText}>
              {formatTime(workout.started_at)} – {formatTime(workout.completed_at)}
            </Text>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={22} color="#1E3A5F" />
              <Text style={styles.statValue}>{formatDuration(workout.duration_minutes)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="fitness-outline" size={22} color="#1E3A5F" />
              <Text style={styles.statValue}>{workout.exercises.length}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={22} color="#1E3A5F" />
              <Text style={styles.statValue}>{workout.total_sets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={22} color="#1E3A5F" />
              <Text style={styles.statValue}>{workout.total_volume_kg.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Vol (kg)</Text>
            </View>
          </View>
        </View>

        {/* Notes — SEDP-68 (display only; FR-17 add-notes deferred) */}
        {workout.notes ? (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.notesLabel}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        ) : null}

        {/* Exercise breakdown — SEDP-66/67 */}
        <Text style={styles.sectionTitle}>Exercises</Text>

        {workout.exercises.map((ex, index) => {
          const workingSets = ex.sets.filter(s => !s.is_warmup)
          const warmupSets = ex.sets.filter(s => s.is_warmup)
          const muscleColor = getMuscleColor(ex.exercise.primary_muscle_group)

          return (
            <View key={ex.id} style={styles.exerciseCard}>
              {/* Exercise header */}
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIndex}>
                  <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View
                      style={[
                        styles.muscleBadge,
                        { backgroundColor: muscleColor + '20' },
                      ]}
                    >
                      <Text style={[styles.muscleBadgeText, { color: muscleColor }]}>
                        {formatMuscleGroup(ex.exercise.primary_muscle_group)}
                      </Text>
                    </View>
                    {ex.is_substitution && (
                      <View style={styles.subBadge}>
                        <Text style={styles.subBadgeText}>Substituted</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Set table — SEDP-67 */}
              {ex.sets.length > 0 ? (
                <View style={styles.setTable}>
                  {/* Table header */}
                  <View style={styles.setRow}>
                    <Text style={[styles.setCell, styles.setCellSet, styles.setHeaderText]}>SET</Text>
                    <Text style={[styles.setCell, styles.setCellWeight, styles.setHeaderText]}>KG</Text>
                    <Text style={[styles.setCell, styles.setCellReps, styles.setHeaderText]}>REPS</Text>
                    <Text style={[styles.setCell, styles.setCellRpe, styles.setHeaderText]}>RPE</Text>
                  </View>

                  {/* Warmup sets */}
                  {warmupSets.map(set => (
                    <View key={set.id} style={[styles.setRow, styles.setRowWarmup]}>
                      <Text style={[styles.setCell, styles.setCellSet, styles.setTextWarmup]}>
                        W
                      </Text>
                      <Text style={[styles.setCell, styles.setCellWeight, styles.setTextWarmup]}>
                        {set.weight_kg ?? '-'}
                      </Text>
                      <Text style={[styles.setCell, styles.setCellReps, styles.setTextWarmup]}>
                        {set.reps ?? '-'}
                      </Text>
                      <Text style={[styles.setCell, styles.setCellRpe, styles.setTextWarmup]}>
                        {set.rpe ?? '-'}
                      </Text>
                    </View>
                  ))}

                  {/* Working sets */}
                  {workingSets.map((set, setIdx) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text style={[styles.setCell, styles.setCellSet, styles.setTextWorking]}>
                        {setIdx + 1}
                        {set.is_dropset ? ' D' : ''}
                      </Text>
                      <Text style={[styles.setCell, styles.setCellWeight, styles.setTextWorking]}>
                        {set.weight_kg ?? '-'}
                      </Text>
                      <Text style={[styles.setCell, styles.setCellReps, styles.setTextWorking]}>
                        {set.reps ?? '-'}
                        {set.is_failure ? ' F' : ''}
                      </Text>
                      <Text style={[styles.setCell, styles.setCellRpe, styles.setTextWorking]}>
                        {set.rpe ?? '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSetsText}>No sets logged</Text>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Stats card
  statsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  timeRangeText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.muted,
  },
  // Notes card
  notesCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  // Exercise cards
  exerciseCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  exerciseIndexText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muscleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#fff3cd',
  },
  subBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#856404',
  },
  // Set table
  setTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  setRowWarmup: {
    backgroundColor: colors.borderLight,
  },
  setCell: {
    fontSize: 14,
  },
  setCellSet: {
    width: 36,
  },
  setCellWeight: {
    flex: 1,
  },
  setCellReps: {
    flex: 1,
  },
  setCellRpe: {
    width: 36,
    textAlign: 'right',
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  setTextWorking: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  setTextWarmup: {
    color: colors.text.muted,
  },
  noSetsText: {
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: 'italic',
    paddingTop: 4,
  },
})

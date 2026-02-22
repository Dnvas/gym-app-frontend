// src/screens/main/WorkoutSummaryScreen.tsx
// SEDP-50: Complete workout (update status)
// SEDP-51: Workout summary screen
// SEDP-52: Calculate and display session stats
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { HomeStackParamList } from '../../navigation/MainNavigator'

type WorkoutSummaryScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'WorkoutSummary'>
  route: RouteProp<HomeStackParamList, 'WorkoutSummary'>
}

interface WorkoutStats {
  name: string
  startedAt: string
  completedAt: string
  durationMinutes: number
  totalSets: number
  totalVolume: number
  exerciseCount: number
  exercises: {
    name: string
    sets: number
    bestSet: { weight: number; reps: number } | null
  }[]
  newPRs: {
    exerciseName: string
    weight: number
    reps: number
  }[]
}

export default function WorkoutSummaryScreen({
  navigation,
  route,
}: WorkoutSummaryScreenProps) {
  const { workoutId } = route.params
  const [stats, setStats] = useState<WorkoutStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkoutStats()
  }, [workoutId])

  async function fetchWorkoutStats() {
    try {
      // Fetch workout with exercises and sets
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises(
            *,
            exercise:exercises(*),
            sets:workout_sets(*)
          )
        `)
        .eq('id', workoutId)
        .single()

      if (workoutError) throw workoutError

      // Calculate stats
      const exercises = workout.workout_exercises ?? []
      
      let totalSets = 0
      let totalVolume = 0
      
      const exerciseStats = exercises.map((we: any) => {
        const workingSets = (we.sets ?? []).filter((s: any) => !s.is_warmup)
        totalSets += workingSets.length
        
        let bestSet = null
        let bestVolume = 0
        
        workingSets.forEach((s: any) => {
          const volume = (s.weight_kg ?? 0) * (s.reps ?? 0)
          totalVolume += volume
          if (volume > bestVolume) {
            bestVolume = volume
            bestSet = { weight: s.weight_kg, reps: s.reps }
          }
        })
        
        return {
          name: we.exercise?.name ?? 'Unknown',
          sets: workingSets.length,
          bestSet,
        }
      })

      // Calculate duration
      const startTime = new Date(workout.started_at).getTime()
      const endTime = new Date(workout.completed_at).getTime()
      const durationMinutes = Math.round((endTime - startTime) / 60000)

      // Fetch any new PRs (simplified - just check personal_records for today)
      const { data: prs } = await supabase
        .from('personal_records')
        .select(`
          weight_kg,
          reps,
          exercise:exercises(name)
        `)
        .gte('achieved_at', workout.started_at)
        .lte('achieved_at', workout.completed_at ?? new Date().toISOString())

      const newPRs = (prs ?? []).map((pr: any) => ({
        exerciseName: pr.exercise?.name ?? 'Unknown',
        weight: pr.weight_kg,
        reps: pr.reps,
      }))

      setStats({
        name: workout.name,
        startedAt: workout.started_at,
        completedAt: workout.completed_at,
        durationMinutes,
        totalSets,
        totalVolume: Math.round(totalVolume),
        exerciseCount: exercises.length,
        exercises: exerciseStats,
        newPRs,
      })
    } catch (error) {
      console.error('Error fetching workout stats:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function handleDone() {
    navigation.popToTop()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      </SafeAreaView>
    )
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Failed to load workout summary</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Workout Complete!</Text>
          <Text style={styles.workoutName}>{stats.name}</Text>
          <Text style={styles.timeRange}>
            {formatTime(stats.startedAt)} - {formatTime(stats.completedAt)}
          </Text>
        </View>

        {/* New PRs */}
        {stats.newPRs.length > 0 && (
          <View style={styles.prSection}>
            <View style={styles.prHeader}>
              <Ionicons name="trophy" size={24} color="#f59e0b" />
              <Text style={styles.prTitle}>New Personal Records!</Text>
            </View>
            {stats.newPRs.map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                <Text style={styles.prValue}>
                  {pr.weight}kg × {pr.reps} reps
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#1E3A5F" />
            <Text style={styles.statValue}>{formatDuration(stats.durationMinutes)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="layers-outline" size={24} color="#1E3A5F" />
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={24} color="#1E3A5F" />
            <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={24} color="#1E3A5F" />
            <Text style={styles.statValue}>{stats.exerciseCount}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Exercise Breakdown */}
        <View style={styles.exerciseSection}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          {stats.exercises.map((ex, index) => (
            <View key={index} style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseSets}>{ex.sets} sets</Text>
              </View>
              {ex.bestSet && (
                <View style={styles.bestSetBadge}>
                  <Text style={styles.bestSetText}>
                    Best: {ex.bestSet.weight}kg × {ex.bestSet.reps}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D9C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 18,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  timeRange: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  prSection: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
  },
  prExercise: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  prValue: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  statCard: {
    width: '50%',
    padding: 4,
  },
  statCardInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  exerciseSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  exerciseSets: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bestSetBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestSetText: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  doneButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})

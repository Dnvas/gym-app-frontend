// src/screens/main/TemplateDetailScreen.tsx
// SEDP-37: Template detail/preview screen
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { useWorkoutContext } from '../../contexts/WorkoutContext'
import { WorkoutTemplateWithExercises, TemplateExercise, Exercise } from '../../types/workout'
import { HomeStackParamList } from '../../navigation/MainNavigator'

type TemplateDetailScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'TemplateDetail'>
  route: RouteProp<HomeStackParamList, 'TemplateDetail'>
}

// Helper to format muscle group for display
function formatMuscleGroup(muscle: string): string {
  return muscle
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper to get muscle group color
function getMuscleColor(muscle: string): string {
  const colors: Record<string, string> = {
    chest: '#e74c3c',
    back: '#3498db',
    lats: '#3498db',
    front_delt: '#9b59b6',
    side_delt: '#9b59b6',
    rear_delt: '#9b59b6',
    biceps: '#e67e22',
    triceps: '#e67e22',
    forearms: '#e67e22',
    quadriceps: '#27ae60',
    hamstrings: '#27ae60',
    glutes: '#27ae60',
    calves: '#27ae60',
    core: '#f39c12',
    traps: '#1abc9c',
  }
  return colors[muscle] || '#666'
}

export default function TemplateDetailScreen({
  navigation,
  route,
}: TemplateDetailScreenProps) {
  const { templateId } = route.params
  const { startWorkout, isActive, loading: workoutLoading } = useWorkoutContext()
  
  const [template, setTemplate] = useState<WorkoutTemplateWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  async function fetchTemplate() {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          template_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', templateId)
        .single()

      if (error) throw error

      // Sort exercises by order_index
      if (data?.template_exercises) {
        data.template_exercises.sort((a: TemplateExercise, b: TemplateExercise) => 
          a.order_index - b.order_index
        )
      }

      setTemplate(data)
    } catch (error) {
      console.error('Error fetching template:', error)
      Alert.alert('Error', 'Failed to load template')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  async function handleStartWorkout() {
    if (!template) return

    if (isActive) {
      Alert.alert(
        'Workout in Progress',
        'You have an active workout. Would you like to continue it or start a new one?',
        [
          { text: 'Continue Current', style: 'cancel' },
          {
            text: 'Start New',
            style: 'destructive',
            onPress: () => doStartWorkout(),
          },
        ]
      )
      return
    }

    doStartWorkout()
  }

  async function doStartWorkout() {
    if (!template) return

    setStarting(true)
    const { success, error, workoutId } = await startWorkout(template)
    setStarting(false)

    if (success && workoutId) {
      navigation.replace('ActiveWorkout', { workoutId })
    } else {
      Alert.alert('Error', error || 'Failed to start workout')
    }
  }

  function renderExerciseItem({
    item,
    index,
  }: {
    item: TemplateExercise & { exercise: Exercise }
    index: number
  }) {
    const exercise = item.exercise

    return (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseIndex}>
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseContent}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.exerciseMeta}>
            <View
              style={[
                styles.muscleBadge,
                { backgroundColor: getMuscleColor(exercise.primary_muscle_group) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.muscleBadgeText,
                  { color: getMuscleColor(exercise.primary_muscle_group) },
                ]}
              >
                {formatMuscleGroup(exercise.primary_muscle_group)}
              </Text>
            </View>
            <Text style={styles.exerciseEquipment}>
              {exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1)}
            </Text>
          </View>
          <View style={styles.targetInfo}>
            <Text style={styles.targetText}>
              {item.target_sets} sets
              {item.target_reps && ` × ${item.target_reps} reps`}
              {item.target_rpe && ` @ RPE ${item.target_rpe}`}
            </Text>
            {item.rest_seconds && (
              <Text style={styles.restText}>
                {Math.floor(item.rest_seconds / 60)}:{(item.rest_seconds % 60).toString().padStart(2, '0')} rest
              </Text>
            )}
          </View>
          {item.notes && (
            <Text style={styles.exerciseNotes}>{item.notes}</Text>
          )}
        </View>
      </View>
    )
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

  if (!template) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Template not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const totalSets = template.template_exercises.reduce(
    (acc, te) => acc + te.target_sets,
    0
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{template.name}</Text>
          {template.created_by === null && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>Default Template</Text>
            </View>
          )}
        </View>
      </View>

      {/* Template Info */}
      <View style={styles.infoCard}>
        {template.description && (
          <Text style={styles.description}>{template.description}</Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={20} color="#1E3A5F" />
            <Text style={styles.statValue}>
              {template.template_exercises.length} exercises
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="layers-outline" size={20} color="#1E3A5F" />
            <Text style={styles.statValue}>{totalSets} sets</Text>
          </View>
          {template.estimated_duration_minutes && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#1E3A5F" />
              <Text style={styles.statValue}>
                ~{template.estimated_duration_minutes} min
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Exercise List */}
      <View style={styles.exercisesSection}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        <FlatList
          data={template.template_exercises}
          renderItem={renderExerciseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.exerciseList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Start Workout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, starting && styles.startButtonDisabled]}
          onPress={handleStartWorkout}
          disabled={starting || workoutLoading}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  systemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  systemBadgeText: {
    fontSize: 11,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  exercisesSection: {
    flex: 1,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  exerciseList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseIndexText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  muscleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseEquipment: {
    fontSize: 12,
    color: '#999',
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  restText: {
    fontSize: 12,
    color: '#999',
  },
  exerciseNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})

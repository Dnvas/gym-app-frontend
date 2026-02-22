// src/screens/main/ActiveWorkoutScreen.tsx
// SEDP-38: Active Workout screen layout
// SEDP-39: Display exercises from template
// SEDP-40: Workout timer
// SEDP-41: Create workout record in DB on start
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { useWorkoutContext } from '../../contexts/WorkoutContext'
import { WorkoutExercise, Exercise } from '../../types/workout'
import { HomeStackParamList } from '../../navigation/MainNavigator'
import SetInputCard from '../../components/workout/SetInputCard'
import RestTimer from '../../components/workout/RestTimer'
import ExerciseSwapModal from '../../components/workout/ExerciseSwapModal'

type ActiveWorkoutScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'ActiveWorkout'>
  route: RouteProp<HomeStackParamList, 'ActiveWorkout'>
}

export default function ActiveWorkoutScreen({
  navigation,
  route,
}: ActiveWorkoutScreenProps) {
  const { workoutId } = route.params
  const {
    workout,
    exercises,
    resumeWorkout,
    completeWorkout,
    abandonWorkout,
    getWorkoutStats,
  } = useWorkoutContext()

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restDuration, setRestDuration] = useState(90)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load workout on mount
  useEffect(() => {
    if (workoutId && !workout) {
      resumeWorkout(workoutId)
    }
  }, [workoutId])

  // Start elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Calculate elapsed from workout start time
  useEffect(() => {
    if (workout?.started_at) {
      const startTime = new Date(workout.started_at).getTime()
      const now = Date.now()
      setElapsedSeconds(Math.floor((now - startTime) / 1000))
    }
  }, [workout?.started_at])

  // Handle back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackPress()
        return true
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
      return () => subscription.remove()
    }, [])
  )


  function handleBackPress() {
    Alert.alert(
      'Leave Workout?',
      'Your progress will be saved. You can resume this workout later.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          onPress: () => navigation.goBack(),
        },
      ]
    )
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function handleSetComplete(restSeconds: number) {
    setRestDuration(restSeconds)
    setShowRestTimer(true)
  }

  function handleNextExercise() {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
    }
  }

  function handlePreviousExercise() {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1)
    }
  }

  async function handleFinishWorkout() {
    const stats = getWorkoutStats()
    
    if (stats.totalSets === 0) {
      Alert.alert(
        'No Sets Logged',
        'You haven\'t logged any sets yet. Do you want to abandon this workout?',
        [
          { text: 'Keep Going', style: 'cancel' },
          {
            text: 'Abandon',
            style: 'destructive',
            onPress: async () => {
              await abandonWorkout()
              navigation.popToTop()
            },
          },
        ]
      )
      return
    }

    setShowFinishModal(true)
  }

  async function confirmFinishWorkout() {
    const { success, error, workout: completedWorkout } = await completeWorkout()
    setShowFinishModal(false)

    if (success && completedWorkout) {
      navigation.replace('WorkoutSummary', { workoutId: completedWorkout.id })
    } else {
      Alert.alert('Error', error || 'Failed to complete workout')
    }
  }

  const currentExercise = exercises[currentExerciseIndex]
  const stats = getWorkoutStats()

  if (!workout || exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Loading workout...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color="#1E3A5F" />
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Exercise {currentExerciseIndex + 1} of {exercises.length}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalSets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Volume (kg)</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.completedExercises}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Current Exercise */}
      {currentExercise && (
        <SetInputCard
          workoutExercise={currentExercise}
          onSetComplete={handleSetComplete}
          onSwapPress={() => setShowSwapModal(true)}
        />
      )}

      {/* Exercise Navigation */}
      <View style={styles.exerciseNav}>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePreviousExercise}
          disabled={currentExerciseIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentExerciseIndex === 0 ? '#ccc' : '#1E3A5F'}
          />
          <Text
            style={[
              styles.navButtonText,
              currentExerciseIndex === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.exerciseDots}>
          {exercises.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentExerciseIndex && styles.dotActive,
                (exercises[index].sets?.filter(s => !s.is_warmup).length ?? 0) > 0 &&
                  styles.dotCompleted,
              ]}
              onPress={() => setCurrentExerciseIndex(index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentExerciseIndex === exercises.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={handleNextExercise}
          disabled={currentExerciseIndex === exercises.length - 1}
        >
          <Text
            style={[
              styles.navButtonText,
              currentExerciseIndex === exercises.length - 1 &&
                styles.navButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentExerciseIndex === exercises.length - 1 ? '#ccc' : '#1E3A5F'}
          />
        </TouchableOpacity>
      </View>

      {/* Rest Timer Modal */}
      <RestTimer
        visible={showRestTimer}
        duration={restDuration}
        onClose={() => setShowRestTimer(false)}
        onSkip={() => setShowRestTimer(false)}
      />

      {/* Exercise Swap Modal */}
      <ExerciseSwapModal
        visible={showSwapModal}
        currentExercise={currentExercise?.exercise}
        workoutExerciseId={currentExercise?.id}
        onClose={() => setShowSwapModal(false)}
      />

      {/* Finish Workout Modal */}
      <Modal
        visible={showFinishModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish Workout?</Text>
            <View style={styles.modalStats}>
              <Text style={styles.modalStatText}>
                {stats.totalSets} sets completed
              </Text>
              <Text style={styles.modalStatText}>
                {stats.totalVolume.toLocaleString()} kg total volume
              </Text>
              <Text style={styles.modalStatText}>
                {formatTime(elapsedSeconds)} duration
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={styles.modalCancelText}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmFinishWorkout}
              >
                <Text style={styles.modalConfirmText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  finishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00D9C4',
    borderRadius: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E3A5F',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  exerciseNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  exerciseDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    backgroundColor: '#1E3A5F',
    width: 20,
  },
  dotCompleted: {
    backgroundColor: '#00D9C4',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalStats: {
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  modalStatText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#00D9C4',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
})

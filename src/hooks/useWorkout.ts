// src/hooks/useWorkout.ts
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplateWithExercises,
  NewWorkoutSet,
  PreviousSetData,
  Exercise,
} from '../types/workout'
import { useAuthContext } from '../contexts/AuthContext'

interface UseWorkoutState {
  workout: Workout | null
  exercises: WorkoutExercise[]
  loading: boolean
  error: string | null
}

export function useWorkout() {
  const { user } = useAuthContext()
  const [state, setState] = useState<UseWorkoutState>({
    workout: null,
    exercises: [],
    loading: false,
    error: null,
  })

  // Start a new workout from a template
  const startWorkout = useCallback(
    async (template: WorkoutTemplateWithExercises) => {
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // 1. Create the workout record
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: user.id,
            template_id: template.id,
            name: template.name,
            status: 'in_progress',
          })
          .select()
          .single()

        if (workoutError) throw workoutError

        // 2. Create workout_exercises from template_exercises
        const workoutExercises = template.template_exercises.map((te, index) => ({
          workout_id: workout.id,
          exercise_id: te.exercise_id,
          order_index: te.order_index,
          template_exercise_id: te.id,
          is_substitution: false,
        }))

        const { data: exercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(workoutExercises)
          .select(`
            *,
            exercise:exercises(*)
          `)

        if (exercisesError) throw exercisesError

        // Add target sets info from template to each exercise
        const exercisesWithTargets = exercises.map(ex => {
          const templateEx = template.template_exercises.find(
            te => te.exercise_id === ex.exercise_id
          )
          return {
            ...ex,
            targetSets: templateEx?.target_sets ?? 3,
            targetReps: templateEx?.target_reps ?? null,
            targetRpe: templateEx?.target_rpe ?? null,
            restSeconds: templateEx?.rest_seconds ?? 90,
            sets: [] as WorkoutSet[],
          }
        })

        setState({
          workout,
          exercises: exercisesWithTargets,
          loading: false,
          error: null,
        })

        return { success: true, error: null, workoutId: workout.id }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start workout'
        setState(prev => ({ ...prev, loading: false, error: message }))
        return { success: false, error: message }
      }
    },
    [user]
  )

  // Resume an existing in-progress workout
  const resumeWorkout = useCallback(async (workoutId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch workout with exercises and sets
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single()

      if (workoutError) throw workoutError

      const { data: exercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercise:exercises(*),
          sets:workout_sets(*)
        `)
        .eq('workout_id', workoutId)
        .order('order_index')

      if (exercisesError) throw exercisesError

      setState({
        workout,
        exercises: exercises ?? [],
        loading: false,
        error: null,
      })

      return { success: true, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resume workout'
      setState(prev => ({ ...prev, loading: false, error: message }))
      return { success: false, error: message }
    }
  }, [])

  // Log a set
  const logSet = useCallback(
    async (workoutExerciseId: string, setData: Omit<NewWorkoutSet, 'workout_exercise_id'>) => {
      if (!state.workout) {
        return { success: false, error: 'No active workout' }
      }

      try {
        const { data: newSet, error } = await supabase
          .from('workout_sets')
          .insert({
            workout_exercise_id: workoutExerciseId,
            ...setData,
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setState(prev => ({
          ...prev,
          exercises: prev.exercises.map(ex =>
            ex.id === workoutExerciseId
              ? { ...ex, sets: [...(ex.sets ?? []), newSet] }
              : ex
          ),
        }))

        return { success: true, error: null, set: newSet }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to log set'
        return { success: false, error: message }
      }
    },
    [state.workout]
  )

  // Update an existing set
  const updateSet = useCallback(
    async (setId: string, updates: Partial<WorkoutSet>) => {
      try {
        const { data: updatedSet, error } = await supabase
          .from('workout_sets')
          .update(updates)
          .eq('id', setId)
          .select()
          .single()

        if (error) throw error

        // Update local state
        setState(prev => ({
          ...prev,
          exercises: prev.exercises.map(ex => ({
            ...ex,
            sets: ex.sets?.map(s => (s.id === setId ? updatedSet : s)),
          })),
        }))

        return { success: true, error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update set'
        return { success: false, error: message }
      }
    },
    []
  )

  // Delete a set
  const deleteSet = useCallback(async (setId: string, workoutExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId)

      if (error) throw error

      // Update local state
      setState(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === workoutExerciseId
            ? { ...ex, sets: ex.sets?.filter(s => s.id !== setId) }
            : ex
        ),
      }))

      return { success: true, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete set'
      return { success: false, error: message }
    }
  }, [])

  // Swap an exercise
  const swapExercise = useCallback(
    async (workoutExerciseId: string, newExerciseId: string) => {
      try {
        const { data, error } = await supabase
          .from('workout_exercises')
          .update({
            exercise_id: newExerciseId,
            is_substitution: true,
          })
          .eq('id', workoutExerciseId)
          .select(`
            *,
            exercise:exercises(*)
          `)
          .single()

        if (error) throw error

        // Update local state
        setState(prev => ({
          ...prev,
          exercises: prev.exercises.map(ex =>
            ex.id === workoutExerciseId ? { ...data, sets: [] } : ex
          ),
        }))

        return { success: true, error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to swap exercise'
        return { success: false, error: message }
      }
    },
    []
  )

  // Complete the workout
  const completeWorkout = useCallback(
    async (notes?: string) => {
      if (!state.workout) {
        return { success: false, error: 'No active workout' }
      }

      try {
        const { data, error } = await supabase
          .from('workouts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            notes: notes || null,
          })
          .eq('id', state.workout.id)
          .select()
          .single()

        if (error) throw error

        const completedWorkout = data

        // Clear state
        setState({
          workout: null,
          exercises: [],
          loading: false,
          error: null,
        })

        return { success: true, error: null, workout: completedWorkout }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to complete workout'
        return { success: false, error: message }
      }
    },
    [state.workout]
  )

  // Abandon the workout
  const abandonWorkout = useCallback(async () => {
    if (!state.workout) {
      return { success: false, error: 'No active workout' }
    }

    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString(),
        })
        .eq('id', state.workout.id)

      if (error) throw error

      // Clear state
      setState({
        workout: null,
        exercises: [],
        loading: false,
        error: null,
      })

      return { success: true, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to abandon workout'
      return { success: false, error: message }
    }
  }, [state.workout])

  // Get previous set data for an exercise (for pre-filling)
  const getPreviousSets = useCallback(
    async (exerciseId: string): Promise<PreviousSetData[]> => {
      if (!user) return []

      try {
        // Step 1: Find the most recent completed workout containing this exercise
        const { data: recentWorkout, error: workoutError } = await supabase
          .from('workouts')
          .select(`
            id,
            workout_exercises!inner(
              id,
              exercise_id
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('workout_exercises.exercise_id', exerciseId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()

        if (workoutError || !recentWorkout) {
          // No previous workout found - that's okay
          return []
        }

        // Step 2: Get the workout_exercise id for this exercise in that workout
        const workoutExercise = recentWorkout.workout_exercises.find(
          (we: any) => we.exercise_id === exerciseId
        )

        if (!workoutExercise) return []

        // Step 3: Fetch the sets for that workout_exercise
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('set_number, weight_kg, reps')
          .eq('workout_exercise_id', workoutExercise.id)
          .eq('is_warmup', false)
          .order('set_number', { ascending: true })

        if (setsError) throw setsError

        // Transform to PreviousSetData format
        return (sets ?? [])
          .filter(s => s.weight_kg && s.reps)
          .map(s => ({
            exercise_id: exerciseId,
            set_number: s.set_number,
            weight_kg: s.weight_kg,
            reps: s.reps,
          }))
      } catch (error) {
        console.error('Error fetching previous sets:', error)
        return []
      }
    },
    [user]
  )

  // Calculate workout stats
  const getWorkoutStats = useCallback(() => {
    const totalSets = state.exercises.reduce(
      (acc, ex) => acc + (ex.sets?.filter(s => !s.is_warmup).length ?? 0),
      0
    )
    const totalVolume = state.exercises.reduce(
      (acc, ex) =>
        acc +
        (ex.sets?.reduce(
          (setAcc, s) =>
            setAcc + (!s.is_warmup && s.weight_kg && s.reps ? s.weight_kg * s.reps : 0),
          0
        ) ?? 0),
      0
    )
    const exerciseCount = state.exercises.length
    const completedExercises = state.exercises.filter(
      ex => (ex.sets?.filter(s => !s.is_warmup).length ?? 0) > 0
    ).length

    return {
      totalSets,
      totalVolume: Math.round(totalVolume),
      exerciseCount,
      completedExercises,
    }
  }, [state.exercises])

  return {
    workout: state.workout,
    exercises: state.exercises,
    loading: state.loading,
    error: state.error,
    isActive: !!state.workout,
    startWorkout,
    resumeWorkout,
    logSet,
    updateSet,
    deleteSet,
    swapExercise,
    completeWorkout,
    abandonWorkout,
    getPreviousSets,
    getWorkoutStats,
  }
}

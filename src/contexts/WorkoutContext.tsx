// src/contexts/WorkoutContext.tsx
import React, { createContext, useContext, ReactNode } from 'react'
import { useWorkout } from '../hooks/useWorkout'
import {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplateWithExercises,
  NewWorkoutSet,
  PreviousSetData,
} from '../types/workout'

interface WorkoutContextType {
  workout: Workout | null
  exercises: WorkoutExercise[]
  loading: boolean
  error: string | null
  isActive: boolean
  startWorkout: (template: WorkoutTemplateWithExercises) => Promise<{ success: boolean; error: string | null; workoutId?: string }>
  resumeWorkout: (workoutId: string) => Promise<{ success: boolean; error: string | null }>
  logSet: (workoutExerciseId: string, setData: Omit<NewWorkoutSet, 'workout_exercise_id'>) => Promise<{ success: boolean; error: string | null; set?: WorkoutSet }>
  updateSet: (setId: string, updates: Partial<WorkoutSet>) => Promise<{ success: boolean; error: string | null }>
  deleteSet: (setId: string, workoutExerciseId: string) => Promise<{ success: boolean; error: string | null }>
  swapExercise: (workoutExerciseId: string, newExerciseId: string) => Promise<{ success: boolean; error: string | null }>
  completeWorkout: (notes?: string) => Promise<{ success: boolean; error: string | null; workout?: Workout }>
  abandonWorkout: () => Promise<{ success: boolean; error: string | null }>
  getPreviousSets: (exerciseId: string) => Promise<PreviousSetData[]>
  getWorkoutStats: () => { totalSets: number; totalVolume: number; exerciseCount: number; completedExercises: number }
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const workout = useWorkout()

  return (
    <WorkoutContext.Provider value={workout}>
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkoutContext() {
  const context = useContext(WorkoutContext)
  if (context === undefined) {
    throw new Error('useWorkoutContext must be used within a WorkoutProvider')
  }
  return context
}

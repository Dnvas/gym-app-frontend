// src/types/workout.ts

// Database ENUM types
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'front_delt'
  | 'side_delt'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'traps'
  | 'lats'

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'resistance_band'
  | 'other'

export type WorkoutStatus = 'in_progress' | 'completed' | 'abandoned'

// Exercise from the exercises table
export interface Exercise {
  id: string
  name: string
  description: string | null
  primary_muscle_group: MuscleGroup
  secondary_muscle_groups: MuscleGroup[]
  equipment: EquipmentType
  is_compound: boolean
  created_by: string | null
  created_at: string
}

// Workout template
export interface WorkoutTemplate {
  id: string
  name: string
  description: string | null
  created_by: string | null
  estimated_duration_minutes: number | null
  created_at: string
  updated_at: string
}

// Exercise within a template
export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  target_sets: number
  target_reps: number | null
  target_rpe: number | null
  rest_seconds: number
  notes: string | null
  created_at: string
  // Joined data
  exercise?: Exercise
}

// Template with its exercises (for detail view)
export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  template_exercises: (TemplateExercise & { exercise: Exercise })[]
}

// Active workout session
export interface Workout {
  id: string
  user_id: string
  template_id: string | null
  name: string
  started_at: string
  completed_at: string | null
  status: WorkoutStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Exercise within an active workout
export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  order_index: number
  template_exercise_id: string | null
  is_substitution: boolean
  notes: string | null
  created_at: string
  // Joined data
  exercise?: Exercise
  sets?: WorkoutSet[]
}

// Individual set
export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  rpe: number | null
  is_warmup: boolean
  is_failure: boolean
  is_dropset: boolean
  target_reps: number | null
  completed_at: string
  created_at: string
}

// Personal record
export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  weight_kg: number
  reps: number
  volume: number
  workout_set_id: string | null
  achieved_at: string
  created_at: string
  // Joined data
  exercise?: Exercise
}

// For creating a new set (without id and timestamps)
export interface NewWorkoutSet {
  workout_exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  rpe?: number | null
  is_warmup?: boolean
  is_failure?: boolean
  is_dropset?: boolean
  target_reps?: number | null
}

// Previous set data for pre-filling
export interface PreviousSetData {
  exercise_id: string
  weight_kg: number
  reps: number
  set_number: number
}

// Workout summary for history
export interface WorkoutSummary {
  workout_id: string
  user_id: string
  name: string
  started_at: string
  completed_at: string | null
  status: WorkoutStatus
  notes: string | null
  duration_minutes: number | null
  exercise_count: number
  total_sets: number
  total_volume_kg: number
}

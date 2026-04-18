// Row types for nested Supabase query responses.
// These are NOT auto-generated — they reflect the specific select() shapes used
// in hooks to eliminate `any` in the data pipeline.

// ── useWorkoutHistory ────────────────────────────────────────────────────────

export interface WorkoutSetRow {
  id: string
  weight_kg: number | null
  reps: number | null
  is_warmup: boolean
  is_failure: boolean
  is_dropset: boolean
  set_number: number
  rpe: number | null
}

export interface WorkoutExerciseRow {
  id: string
  exercise_id: string
  order_index: number
  exercise?: { name: string; primary_muscle_group: string }
  sets: WorkoutSetRow[]
}

export interface WorkoutWithExercisesRow {
  id: string
  user_id: string
  name: string
  started_at: string
  completed_at: string | null
  status: string
  notes: string | null
  workout_exercises: WorkoutExerciseRow[]
}

// ── useAnalytics: exercise_volume_by_muscle view ─────────────────────────────

export interface VolumeViewRow {
  muscle_group: string
  is_compound: boolean
  total_sets: number
  total_volume_kg: number
  workout_date: string
  user_id: string
}

// ── useAnalytics: workout_sets progress query ────────────────────────────────
// Supabase JS infers nested !inner joins as arrays even for to-one relations.

export interface ProgressSetRow {
  weight_kg: number | null
  reps: number | null
  completed_at: string
  workout_exercise: Array<{
    exercise_id: string
    exercise: Array<{ name: string }>
    workout: Array<{ user_id: string; status: string }>
  }>
}

// ── WorkoutSummaryScreen / useWorkout ────────────────────────────────────────

export interface PRRow {
  exercise_id: string
  weight_kg: number
  reps: number
  achieved_at: string
  exercise?: { name: string }
}

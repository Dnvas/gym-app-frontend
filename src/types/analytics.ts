// src/types/analytics.ts

import { MuscleGroup } from './workout'

// Volume data for a single muscle group
export interface MuscleVolumeData {
  muscle_group: MuscleGroup
  compound_sets: number
  isolation_sets: number
  compound_volume_kg: number
  isolation_volume_kg: number
  total_sets: number
  total_volume_kg: number
  change_vs_last_week?: number // percentage
}

// Weekly volume response
export interface WeeklyVolumeData {
  start_date: string
  end_date: string
  muscle_groups: MuscleVolumeData[]
  totals: {
    total_sets: number
    total_volume_kg: number
    compound_sets: number
    isolation_sets: number
    change_vs_last_week?: number
  }
}

// Progress data point for charts
export interface ProgressDataPoint {
  date: string
  weight_kg: number
  reps: number
  volume: number // weight × reps
}

// Progress response for an exercise
export interface ExerciseProgressData {
  exercise_id: string
  exercise_name: string
  data_points: ProgressDataPoint[]
  current_pr: {
    weight_kg: number
    reps: number
    date: string
  } | null
}

// PR tier classification
export type PRTier = 'big_three' | 'compound' | 'isolation'

// Single PR record with details
export interface PRRecord {
  id: string
  exercise_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  achieved_at: string
  is_manual: boolean
  notes: string | null
  primary_muscle_group: MuscleGroup
  equipment: string
  is_compound: boolean
  pr_tier: PRTier
  estimated_1rm: number
}

// Grouped PRs response
export interface GroupedPRsData {
  big_three: {
    squat: PRRecord | null
    bench: PRRecord | null
    deadlift: PRRecord | null
  }
  compounds: PRRecord[]
  isolation_by_muscle: {
    [key in MuscleGroup]?: PRRecord[]
  }
}

// For manual PR entry
export interface ManualPRInput {
  exercise_id: string
  weight_kg: number
  reps: number
  achieved_at?: string // defaults to now
  notes?: string
}

// Lightweight exercise type for PR entry dropdown
export interface ExerciseForPR {
  id: string
  name: string
  primary_muscle_group: MuscleGroup
  is_compound: boolean
}

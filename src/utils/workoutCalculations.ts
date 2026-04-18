// src/utils/workoutCalculations.ts
// Workout math utilities extracted from hooks and screens
import { TemplateExerciseFormData } from '../types/workout'

export function calcSetVolume(weight_kg: number | null, reps: number | null): number {
  return (weight_kg ?? 0) * (reps ?? 0)
}

interface SetLike {
  is_warmup: boolean
  weight_kg: number | null
  reps: number | null
}

interface ExerciseLike {
  sets?: SetLike[]
}

export function calcWorkoutStats(exercises: ExerciseLike[]): {
  totalSets: number
  totalVolumeKg: number
} {
  let totalSets = 0
  let totalVolumeKg = 0

  exercises.forEach(ex => {
    const workingSets = (ex.sets ?? []).filter(s => !s.is_warmup)
    totalSets += workingSets.length
    workingSets.forEach(s => {
      totalVolumeKg += calcSetVolume(s.weight_kg, s.reps)
    })
  })

  return { totalSets, totalVolumeKg: Math.round(totalVolumeKg) }
}

export function calcEstimatedDuration(exercises: TemplateExerciseFormData[]): number {
  const total = exercises.reduce(
    (acc, e) => acc + e.target_sets * (2 + e.rest_seconds / 60),
    0
  )
  return Math.round(total)
}

export function calcEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + 0.0333 * reps)
}

export function calcPctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

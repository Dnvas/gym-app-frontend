// src/hooks/useWorkoutHistory.ts
// SEDP-63/64/65/66: Workout history data fetching
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { WorkoutSummary } from '../types/workout'

export type MarkedDates = Record<string, { marked: boolean; dotColor: string; selected?: boolean }>

// Full workout detail type returned by fetchWorkoutDetail
export interface WorkoutDetail {
  id: string
  name: string
  started_at: string
  completed_at: string | null
  status: string
  notes: string | null
  duration_minutes: number | null
  total_sets: number
  total_volume_kg: number
  exercises: {
    id: string
    order_index: number
    is_substitution: boolean
    exercise: {
      id: string
      name: string
      primary_muscle_group: string
      equipment: string
      is_compound: boolean
    }
    sets: {
      id: string
      set_number: number
      weight_kg: number | null
      reps: number | null
      rpe: number | null
      is_warmup: boolean
      is_failure: boolean
      is_dropset: boolean
    }[]
  }[]
}

function getMonthBoundaries(month: Date): { start: string; end: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function useWorkoutHistory() {
  const { user } = useAuthContext()
  const [summaries, setSummaries] = useState<WorkoutSummary[]>([])
  const [markedDates, setMarkedDates] = useState<MarkedDates>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch completed workouts for a given month, compute stats client-side
  const fetchWorkoutSummaries = useCallback(
    async (month: Date): Promise<WorkoutSummary[]> => {
      if (!user) return []

      setLoading(true)
      setError(null)

      try {
        const { start, end } = getMonthBoundaries(month)

        const { data, error: queryError } = await supabase
          .from('workouts')
          .select(`
            id,
            user_id,
            name,
            started_at,
            completed_at,
            status,
            notes,
            workout_exercises(
              id,
              sets:workout_sets(id, weight_kg, reps, is_warmup)
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('started_at', start)
          .lte('started_at', end)
          .order('started_at', { ascending: false })

        if (queryError) throw queryError

        const computed: WorkoutSummary[] = (data ?? []).map((w: any) => {
          const exercises = w.workout_exercises ?? []
          let totalSets = 0
          let totalVolume = 0

          exercises.forEach((we: any) => {
            const workingSets = (we.sets ?? []).filter((s: any) => !s.is_warmup)
            totalSets += workingSets.length
            workingSets.forEach((s: any) => {
              totalVolume += (s.weight_kg ?? 0) * (s.reps ?? 0)
            })
          })

          const durationMinutes =
            w.completed_at && w.started_at
              ? Math.round(
                  (new Date(w.completed_at).getTime() - new Date(w.started_at).getTime()) / 60000
                )
              : null

          return {
            workout_id: w.id,
            user_id: w.user_id,
            name: w.name,
            started_at: w.started_at,
            completed_at: w.completed_at,
            status: w.status,
            notes: w.notes,
            duration_minutes: durationMinutes,
            exercise_count: exercises.length,
            total_sets: totalSets,
            total_volume_kg: Math.round(totalVolume),
          }
        })

        // Build marked dates map for the calendar (one dot per workout day)
        const marks: MarkedDates = {}
        computed.forEach((w) => {
          const dateKey = w.started_at.split('T')[0]
          marks[dateKey] = { marked: true, dotColor: '#00D9C4' }
        })

        setSummaries(computed)
        setMarkedDates(marks)
        return computed
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch history'
        setError(message)
        console.error('Error fetching workout history:', err)
        return []
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // Fetch full workout detail for the detail screen (reuses WorkoutSummaryScreen query pattern)
  const fetchWorkoutDetail = useCallback(
    async (workoutId: string): Promise<WorkoutDetail | null> => {
      if (!user) return null

      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
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

        if (queryError) throw queryError

        const exercises = (data.workout_exercises ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((we: any) => ({
            id: we.id,
            order_index: we.order_index,
            is_substitution: we.is_substitution,
            exercise: we.exercise,
            sets: (we.sets ?? []).sort((a: any, b: any) => a.set_number - b.set_number),
          }))

        let totalSets = 0
        let totalVolume = 0
        exercises.forEach((ex: any) => {
          const workingSets = ex.sets.filter((s: any) => !s.is_warmup)
          totalSets += workingSets.length
          workingSets.forEach((s: any) => {
            totalVolume += (s.weight_kg ?? 0) * (s.reps ?? 0)
          })
        })

        const durationMinutes =
          data.completed_at && data.started_at
            ? Math.round(
                (new Date(data.completed_at).getTime() - new Date(data.started_at).getTime()) /
                  60000
              )
            : null

        return {
          id: data.id,
          name: data.name,
          started_at: data.started_at,
          completed_at: data.completed_at,
          status: data.status,
          notes: data.notes,
          duration_minutes: durationMinutes,
          total_sets: totalSets,
          total_volume_kg: Math.round(totalVolume),
          exercises,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch workout detail'
        setError(message)
        console.error('Error fetching workout detail:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  return {
    summaries,
    markedDates,
    loading,
    error,
    fetchWorkoutSummaries,
    fetchWorkoutDetail,
  }
}

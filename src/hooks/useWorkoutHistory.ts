// src/hooks/useWorkoutHistory.ts
// SEDP-63/65/66: Workout history data fetching (stub - implemented in PR 2)
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { WorkoutSummary } from '../types/workout'

export type MarkedDates = Record<string, { marked: boolean; dotColor: string; selected?: boolean }>

export function useWorkoutHistory() {
  const { user } = useAuthContext()
  const [summaries, setSummaries] = useState<WorkoutSummary[]>([])
  const [markedDates, setMarkedDates] = useState<MarkedDates>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkoutSummaries = useCallback(
    async (_month: Date): Promise<WorkoutSummary[]> => {
      return []
    },
    [user]
  )

  const fetchWorkoutDetail = useCallback(
    async (_workoutId: string) => {
      return null
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

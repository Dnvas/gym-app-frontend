// src/hooks/useAnalytics.ts
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import {
  WeeklyVolumeData,
  MuscleVolumeData,
  ExerciseProgressData,
  ProgressDataPoint,
  GroupedPRsData,
  PRRecord,
  ManualPRInput,
  ExerciseForPR,
} from '../types/analytics'
import { MuscleGroup } from '../types/workout'
import { VolumeViewRow, ProgressSetRow } from '../types/supabase'
import { getWeekBoundaries, getMonthBoundaries, toDateKey } from '../utils/dateHelpers'
import { calcPctChange } from '../utils/workoutCalculations'

export interface HomeStats {
  thisWeekWorkouts: number
  thisWeekVolumeKg: number
  prsThisMonth: number
}

export interface ProfileStats {
  totalWorkouts: number
  totalVolumeKg: number
  prsAchieved: number
}

function formatDate(date: Date): string {
  return date.toISOString()
}

export function useAnalytics() {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch volume data for a specific week
  const fetchWeeklyVolume = useCallback(
    async (weekStartDate?: Date): Promise<WeeklyVolumeData | null> => {
      if (!user) return null

      setLoading(true)
      setError(null)

      try {
        const { start, end } = getWeekBoundaries(weekStartDate)
        const prevWeek = getWeekBoundaries(new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000))

        // Fetch current week data
        const { data: currentData, error: currentError } = await supabase
          .from('exercise_volume_by_muscle')
          .select('*')
          .eq('user_id', user.id)
          .gte('workout_date', formatDate(start))
          .lte('workout_date', formatDate(end))

        if (currentError) throw currentError

        // Fetch previous week data for comparison
        const { data: prevData, error: prevError } = await supabase
          .from('exercise_volume_by_muscle')
          .select('*')
          .eq('user_id', user.id)
          .gte('workout_date', formatDate(prevWeek.start))
          .lte('workout_date', formatDate(prevWeek.end))

        if (prevError) throw prevError

        // Aggregate by muscle group
        const muscleMap = new Map<MuscleGroup, MuscleVolumeData>()
        
        currentData?.forEach((row: VolumeViewRow) => {
          const muscle = row.muscle_group as MuscleGroup
          const existing = muscleMap.get(muscle) || {
            muscle_group: muscle,
            compound_sets: 0,
            isolation_sets: 0,
            compound_volume_kg: 0,
            isolation_volume_kg: 0,
            total_sets: 0,
            total_volume_kg: 0,
          }

          if (row.is_compound) {
            existing.compound_sets += row.total_sets
            existing.compound_volume_kg += row.total_volume_kg
          } else {
            existing.isolation_sets += row.total_sets
            existing.isolation_volume_kg += row.total_volume_kg
          }
          existing.total_sets = existing.compound_sets + existing.isolation_sets
          existing.total_volume_kg = existing.compound_volume_kg + existing.isolation_volume_kg

          muscleMap.set(muscle, existing)
        })

        // Calculate previous week totals per muscle for comparison
        const prevMuscleMap = new Map<MuscleGroup, number>()
        prevData?.forEach((row: VolumeViewRow) => {
          const muscle = row.muscle_group as MuscleGroup
          const existing = prevMuscleMap.get(muscle) || 0
          prevMuscleMap.set(muscle, existing + row.total_sets)
        })

        // Add change percentages
        muscleMap.forEach((data, muscle) => {
          const prevSets = prevMuscleMap.get(muscle) || 0
          const pct = calcPctChange(data.total_sets, prevSets)
          if (pct !== null) {
            data.change_vs_last_week = pct
          }
        })

        // Calculate totals
        const muscleGroups = Array.from(muscleMap.values()).sort(
          (a, b) => b.total_sets - a.total_sets
        )

        const totals = muscleGroups.reduce(
          (acc, mg) => ({
            total_sets: acc.total_sets + mg.total_sets,
            total_volume_kg: acc.total_volume_kg + mg.total_volume_kg,
            compound_sets: acc.compound_sets + mg.compound_sets,
            isolation_sets: acc.isolation_sets + mg.isolation_sets,
          }),
          { total_sets: 0, total_volume_kg: 0, compound_sets: 0, isolation_sets: 0 }
        )

        // Calculate total change vs last week
        const prevTotalSets = Array.from(prevMuscleMap.values()).reduce((a, b) => a + b, 0)
        const changeVsLastWeek = calcPctChange(totals.total_sets, prevTotalSets) ?? undefined

        return {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          muscle_groups: muscleGroups,
          totals: { ...totals, change_vs_last_week: changeVsLastWeek },
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch volume data'
        setError(message)
        console.error('Error fetching volume:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // Fetch progress data for a specific exercise
  const fetchExerciseProgress = useCallback(
    async (
      exerciseId: string,
      period: '1M' | '3M' | '6M' | 'ALL' = '3M'
    ): Promise<ExerciseProgressData | null> => {
      if (!user) return null

      setLoading(true)
      setError(null)

      try {
        // Calculate date range
        let startDate: Date | null = new Date()
        switch (period) {
          case '1M':
            startDate.setMonth(startDate.getMonth() - 1)
            break
          case '3M':
            startDate.setMonth(startDate.getMonth() - 3)
            break
          case '6M':
            startDate.setMonth(startDate.getMonth() - 6)
            break
          case 'ALL':
            startDate = null
            break
        }

        // Build query
        let query = supabase
          .from('workout_sets')
          .select(`
            weight_kg,
            reps,
            completed_at,
            workout_exercise:workout_exercises!inner(
              exercise_id,
              exercise:exercises(name),
              workout:workouts!inner(user_id, status)
            )
          `)
          .eq('workout_exercise.exercise_id', exerciseId)
          .eq('workout_exercise.workout.user_id', user.id)
          .eq('workout_exercise.workout.status', 'completed')
          .eq('is_warmup', false)
          .order('completed_at', { ascending: true })

        if (startDate) {
          query = query.gte('completed_at', formatDate(startDate))
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        // Group by date and get best set per day
        const dateMap = new Map<string, ProgressDataPoint>()
        let exerciseName = ''

        data?.forEach((row: ProgressSetRow) => {
          if (!row.weight_kg || !row.reps) return
          
          const we = Array.isArray(row.workout_exercise) ? row.workout_exercise[0] : row.workout_exercise
          const ex = we && (Array.isArray(we.exercise) ? we.exercise[0] : we.exercise)
          exerciseName = ex?.name || ''
          const dateKey = toDateKey(row.completed_at)
          const volume = row.weight_kg * row.reps
          
          const existing = dateMap.get(dateKey)
          // Keep the heaviest weight for each day
          if (!existing || row.weight_kg > existing.weight_kg) {
            dateMap.set(dateKey, {
              date: dateKey,
              weight_kg: row.weight_kg,
              reps: row.reps,
              volume,
            })
          }
        })

        const dataPoints = Array.from(dateMap.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        // Get current PR
        const { data: prData } = await supabase
          .from('personal_records')
          .select('weight_kg, reps, achieved_at')
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
          .single()

        return {
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          data_points: dataPoints,
          current_pr: prData
            ? {
                weight_kg: prData.weight_kg,
                reps: prData.reps,
                date: prData.achieved_at,
              }
            : null,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch progress data'
        setError(message)
        console.error('Error fetching progress:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // Fetch all PRs grouped by tier
  const fetchGroupedPRs = useCallback(async (): Promise<GroupedPRsData | null> => {
    if (!user) return null

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('pr_with_details')
        .select('*')
        .eq('user_id', user.id)
        .order('weight_kg', { ascending: false })

      if (queryError) throw queryError

      // Initialize result structure
      const result: GroupedPRsData = {
        big_three: {
          squat: null,
          bench: null,
          deadlift: null,
        },
        compounds: [],
        isolation_by_muscle: {},
      }

      // Categorize PRs
      data?.forEach((pr: PRRecord) => {
        const nameLower = pr.exercise_name.toLowerCase()

        if (pr.pr_tier === 'big_three') {
          if (nameLower.includes('squat')) {
            result.big_three.squat = pr
          } else if (nameLower.includes('bench press') && nameLower.includes('barbell')) {
            result.big_three.bench = pr
          } else if (nameLower.includes('deadlift')) {
            result.big_three.deadlift = pr
          }
        } else if (pr.pr_tier === 'compound') {
          result.compounds.push(pr)
        } else {
          // Isolation - group by muscle
          const muscle = pr.primary_muscle_group
          if (!result.isolation_by_muscle[muscle]) {
            result.isolation_by_muscle[muscle] = []
          }
          result.isolation_by_muscle[muscle]!.push(pr)
        }
      })

      // Sort compounds by estimated 1RM
      result.compounds.sort((a, b) => b.estimated_1rm - a.estimated_1rm)

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch PRs'
      setError(message)
      console.error('Error fetching PRs:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  // Add a manual PR
  const addManualPR = useCallback(
    async (input: ManualPRInput): Promise<{ success: boolean; error: string | null }> => {
      if (!user) return { success: false, error: 'Not authenticated' }

      setLoading(true)
      setError(null)

      try {
        const { error: insertError } = await supabase.from('personal_records').upsert(
          {
            user_id: user.id,
            exercise_id: input.exercise_id,
            weight_kg: input.weight_kg,
            reps: input.reps,
            achieved_at: input.achieved_at || new Date().toISOString(),
            is_manual: true,
            notes: input.notes || null,
            workout_set_id: null,
          },
          {
            onConflict: 'user_id,exercise_id',
          }
        )

        if (insertError) throw insertError

        return { success: true, error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add PR'
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const fetchHomeStats = useCallback(async (): Promise<HomeStats> => {
    const empty: HomeStats = { thisWeekWorkouts: 0, thisWeekVolumeKg: 0, prsThisMonth: 0 }
    if (!user) return empty

    try {
      const { start, end } = getWeekBoundaries()
      const { start: monthStart, end: monthEnd } = getMonthBoundaries(new Date())

      const [workoutsRes, volumeRes, prsRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', start.toISOString())
          .lte('completed_at', end.toISOString()),
        supabase
          .from('exercise_volume_by_muscle')
          .select('total_volume_kg')
          .eq('user_id', user.id)
          .gte('workout_date', start.toISOString())
          .lte('workout_date', end.toISOString()),
        supabase
          .from('personal_records')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('achieved_at', monthStart)
          .lte('achieved_at', monthEnd),
      ])

      const thisWeekVolumeKg = (volumeRes.data ?? []).reduce(
        (sum: number, row: { total_volume_kg: number }) => sum + (row.total_volume_kg ?? 0),
        0
      )

      return {
        thisWeekWorkouts: workoutsRes.count ?? 0,
        thisWeekVolumeKg: Math.round(thisWeekVolumeKg),
        prsThisMonth: prsRes.count ?? 0,
      }
    } catch {
      return empty
    }
  }, [user])

  const fetchProfileStats = useCallback(async (): Promise<ProfileStats> => {
    const empty: ProfileStats = { totalWorkouts: 0, totalVolumeKg: 0, prsAchieved: 0 }
    if (!user) return empty

    try {
      const [workoutsRes, prsRes, volumeRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('personal_records')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('exercise_volume_by_muscle')
          .select('total_volume_kg')
          .eq('user_id', user.id),
      ])

      const totalVolumeKg = (volumeRes.data ?? []).reduce(
        (sum: number, row: { total_volume_kg: number }) => sum + (row.total_volume_kg ?? 0),
        0
      )

      return {
        totalWorkouts: workoutsRes.count ?? 0,
        totalVolumeKg: Math.round(totalVolumeKg),
        prsAchieved: prsRes.count ?? 0,
      }
    } catch {
      return empty
    }
  }, [user])

  // Fetch exercises for PR entry dropdown
  const fetchExercisesForPR = useCallback(async (): Promise<ExerciseForPR[]> => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, primary_muscle_group, is_compound')
        .order('name')

      if (error) throw error
      return (data ?? []) as ExerciseForPR[]
    } catch (err) {
      console.error('Error fetching exercises:', err)
      return []
    }
  }, [])

  return {
    loading,
    error,
    fetchWeeklyVolume,
    fetchExerciseProgress,
    fetchGroupedPRs,
    addManualPR,
    fetchExercisesForPR,
    fetchHomeStats,
    fetchProfileStats,
  }
}

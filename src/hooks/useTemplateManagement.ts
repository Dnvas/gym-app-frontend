// src/hooks/useTemplateManagement.ts
// SEDP-69/72/73/74: Template CRUD operations
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { WorkoutTemplateWithExercises, TemplateExercise, TemplateExerciseFormData } from '../types/workout'
import { calcEstimatedDuration } from '../utils/workoutCalculations'

export function useTemplateManagement() {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SEDP-72: Save new template to workout_templates + template_exercises
  const createTemplate = useCallback(
    async (
      name: string,
      description: string | null,
      exercises: TemplateExerciseFormData[]
    ): Promise<{ success: boolean; error: string | null; templateId: string | null }> => {
      if (!user) return { success: false, error: 'Not authenticated', templateId: null }

      setLoading(true)
      setError(null)

      try {
        // Insert the template record
        const { data: template, error: templateError } = await supabase
          .from('workout_templates')
          .insert({
            name: name.trim(),
            description: description?.trim() || null,
            created_by: user.id,
            estimated_duration_minutes: calcEstimatedDuration(exercises),
          })
          .select('id')
          .single()

        if (templateError) throw templateError

        // Batch insert template_exercises
        if (exercises.length > 0) {
          const rows = exercises.map((e, i) => ({
            template_id: template.id,
            exercise_id: e.exercise_id,
            order_index: i,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            target_rpe: e.target_rpe,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
          }))

          const { error: exercisesError } = await supabase
            .from('template_exercises')
            .insert(rows)

          if (exercisesError) throw exercisesError
        }

        return { success: true, error: null, templateId: template.id }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create template'
        setError(message)
        return { success: false, error: message, templateId: null }
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // SEDP-73: Update existing template (replace exercises wholesale)
  const updateTemplate = useCallback(
    async (
      templateId: string,
      name: string,
      description: string | null,
      exercises: TemplateExerciseFormData[]
    ): Promise<{ success: boolean; error: string | null }> => {
      if (!user) return { success: false, error: 'Not authenticated' }

      setLoading(true)
      setError(null)

      try {
        // Update the template record (RLS also enforces created_by = user.id)
        const { error: templateError } = await supabase
          .from('workout_templates')
          .update({
            name: name.trim(),
            description: description?.trim() || null,
            estimated_duration_minutes: calcEstimatedDuration(exercises),
          })
          .eq('id', templateId)
          .eq('created_by', user.id)

        if (templateError) throw templateError

        // Replace exercises: delete existing rows then re-insert
        // (simpler and safer than diffing individual rows)
        const { error: deleteError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', templateId)

        if (deleteError) throw deleteError

        if (exercises.length > 0) {
          const rows = exercises.map((e, i) => ({
            template_id: templateId,
            exercise_id: e.exercise_id,
            order_index: i,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            target_rpe: e.target_rpe,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
          }))

          const { error: insertError } = await supabase
            .from('template_exercises')
            .insert(rows)

          if (insertError) throw insertError
        }

        return { success: true, error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update template'
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // SEDP-74: Delete template (no ON DELETE CASCADE in schema — children first)
  const deleteTemplate = useCallback(
    async (templateId: string): Promise<{ success: boolean; error: string | null }> => {
      if (!user) return { success: false, error: 'Not authenticated' }

      setLoading(true)
      setError(null)

      try {
        // Delete child rows first (schema has no cascade)
        const { error: childError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', templateId)

        if (childError) throw childError

        // Delete the template (RLS enforces created_by = user.id)
        const { error: templateError } = await supabase
          .from('workout_templates')
          .delete()
          .eq('id', templateId)
          .eq('created_by', user.id)

        if (templateError) throw templateError

        return { success: true, error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete template'
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  // Fetch a user-owned template with its exercises for the edit form
  const fetchTemplateForEdit = useCallback(
    async (templateId: string): Promise<WorkoutTemplateWithExercises | null> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('workout_templates')
          .select(`
            *,
            template_exercises(
              *,
              exercise:exercises(*)
            )
          `)
          .eq('id', templateId)
          .single()

        if (queryError) throw queryError

        // Sort by order_index
        if (data?.template_exercises) {
          data.template_exercises.sort(
            (a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index
          )
        }

        return data as WorkoutTemplateWithExercises
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load template'
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplateForEdit,
  }
}

-- ============================================================
-- StrengthFlow RLS Policies
-- Run this in the Supabase SQL editor to lock down all tables.
-- Idempotent: drops and recreates every policy safely.
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own"  ON public.profiles;

-- Users can only read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- The handle_new_user trigger runs as postgres (bypasses RLS), but this
-- prevents a rogue authenticated client from inserting a second profile.
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (id = auth.uid());


-- ── exercises ─────────────────────────────────────────────────────────────
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_select_all"    ON public.exercises;
DROP POLICY IF EXISTS "exercises_insert_own"    ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_own"    ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_own"    ON public.exercises;

-- All authenticated users can read system exercises (created_by IS NULL)
-- and their own custom exercises
CREATE POLICY "exercises_select_all" ON public.exercises
  FOR SELECT USING (
    created_by IS NULL OR created_by = auth.uid()
  );

-- Users can only create exercises attributed to themselves
CREATE POLICY "exercises_insert_own" ON public.exercises
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can only edit their own custom exercises
CREATE POLICY "exercises_update_own" ON public.exercises
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "exercises_delete_own" ON public.exercises
  FOR DELETE USING (created_by = auth.uid());


-- ── workout_templates ─────────────────────────────────────────────────────
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_visible" ON public.workout_templates;
DROP POLICY IF EXISTS "templates_insert_own"     ON public.workout_templates;
DROP POLICY IF EXISTS "templates_update_own"     ON public.workout_templates;
DROP POLICY IF EXISTS "templates_delete_own"     ON public.workout_templates;

-- System templates (created_by IS NULL) are readable by all authenticated users;
-- user templates are readable only by their owner
CREATE POLICY "templates_select_visible" ON public.workout_templates
  FOR SELECT USING (
    created_by IS NULL OR created_by = auth.uid()
  );

CREATE POLICY "templates_insert_own" ON public.workout_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "templates_update_own" ON public.workout_templates
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "templates_delete_own" ON public.workout_templates
  FOR DELETE USING (created_by = auth.uid());


-- ── template_exercises ────────────────────────────────────────────────────
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_exercises_select_visible" ON public.template_exercises;
DROP POLICY IF EXISTS "template_exercises_insert_own"     ON public.template_exercises;
DROP POLICY IF EXISTS "template_exercises_update_own"     ON public.template_exercises;
DROP POLICY IF EXISTS "template_exercises_delete_own"     ON public.template_exercises;

-- Readable if the parent template is a system template or owned by the user
CREATE POLICY "template_exercises_select_visible" ON public.template_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id
        AND (t.created_by IS NULL OR t.created_by = auth.uid())
    )
  );

-- Writable only if the parent template is owned by the user
CREATE POLICY "template_exercises_insert_own" ON public.template_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "template_exercises_update_own" ON public.template_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "template_exercises_delete_own" ON public.template_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  );


-- ── workouts ──────────────────────────────────────────────────────────────
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workouts_select_own"  ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_own"  ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_own"  ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_own"  ON public.workouts;

CREATE POLICY "workouts_select_own" ON public.workouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "workouts_insert_own" ON public.workouts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workouts_update_own" ON public.workouts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "workouts_delete_own" ON public.workouts
  FOR DELETE USING (user_id = auth.uid());


-- ── workout_exercises ─────────────────────────────────────────────────────
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_exercises_select_own"  ON public.workout_exercises;
DROP POLICY IF EXISTS "workout_exercises_insert_own"  ON public.workout_exercises;
DROP POLICY IF EXISTS "workout_exercises_update_own"  ON public.workout_exercises;
DROP POLICY IF EXISTS "workout_exercises_delete_own"  ON public.workout_exercises;

CREATE POLICY "workout_exercises_select_own" ON public.workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_insert_own" ON public.workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_update_own" ON public.workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_delete_own" ON public.workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );


-- ── workout_sets ──────────────────────────────────────────────────────────
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_sets_select_own"  ON public.workout_sets;
DROP POLICY IF EXISTS "workout_sets_insert_own"  ON public.workout_sets;
DROP POLICY IF EXISTS "workout_sets_update_own"  ON public.workout_sets;
DROP POLICY IF EXISTS "workout_sets_delete_own"  ON public.workout_sets;

CREATE POLICY "workout_sets_select_own" ON public.workout_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_insert_own" ON public.workout_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_update_own" ON public.workout_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_delete_own" ON public.workout_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
    )
  );


-- ── personal_records ──────────────────────────────────────────────────────
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prs_select_own"  ON public.personal_records;
DROP POLICY IF EXISTS "prs_insert_own"  ON public.personal_records;
DROP POLICY IF EXISTS "prs_update_own"  ON public.personal_records;
DROP POLICY IF EXISTS "prs_delete_own"  ON public.personal_records;

CREATE POLICY "prs_select_own" ON public.personal_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "prs_insert_own" ON public.personal_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "prs_update_own" ON public.personal_records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "prs_delete_own" ON public.personal_records
  FOR DELETE USING (user_id = auth.uid());

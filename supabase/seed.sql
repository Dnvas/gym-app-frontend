-- ============================================================
-- StrengthFlow Demo Seed
-- Run against your Supabase project via the SQL editor or psql.
-- Idempotent: cleans up existing demo data before re-inserting.
-- Demo credentials: demo@strengthflow.app / DemoFlow123!
-- ============================================================

DO $$
DECLARE
  demo_id   uuid := '00000000-0000-0000-0000-000000000001';

  -- exercise ids (resolved by name from system library)
  ex_bench        uuid;
  ex_squat        uuid;
  ex_deadlift     uuid;
  ex_ohp          uuid;
  ex_row          uuid;
  ex_rdl          uuid;
  ex_inc_db       uuid;
  ex_lat_pd       uuid;
  ex_cable_row    uuid;
  ex_db_press     uuid;
  ex_curl         uuid;
  ex_pushdown     uuid;
  ex_leg_press    uuid;
  ex_leg_curl     uuid;
  ex_lat_raise    uuid;
  ex_face_pull    uuid;
  ex_hip_thrust   uuid;
  ex_dips         uuid;

  -- template ids
  t_push_a   uuid := gen_random_uuid();
  t_push_b   uuid := gen_random_uuid();
  t_pull_a   uuid := gen_random_uuid();
  t_pull_b   uuid := gen_random_uuid();
  t_legs_a   uuid := gen_random_uuid();
  t_legs_b   uuid := gen_random_uuid();
  t_upper    uuid := gen_random_uuid();
  t_lower    uuid := gen_random_uuid();
  t_full     uuid := gen_random_uuid();
  t_deload   uuid := gen_random_uuid();

  -- workout ids (20 workouts over ~6 weeks, 3/week)
  w  uuid[];

  -- misc
  we_id  uuid;
  base_date timestamptz;
  i      int;
BEGIN

  -- ── 0. Clean up previous demo data ────────────────────────────────────────
  DELETE FROM public.personal_records WHERE user_id = demo_id;
  DELETE FROM public.workout_sets
    WHERE workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = demo_id
    );
  DELETE FROM public.workout_exercises
    WHERE workout_id IN (SELECT id FROM public.workouts WHERE user_id = demo_id);
  DELETE FROM public.workouts WHERE user_id = demo_id;
  DELETE FROM public.template_exercises
    WHERE template_id IN (
      SELECT id FROM public.workout_templates WHERE created_by = demo_id
    );
  DELETE FROM public.workout_templates WHERE created_by = demo_id;
  DELETE FROM public.profiles WHERE id = demo_id;
  DELETE FROM auth.users WHERE id = demo_id;

  -- ── 1. Demo auth user ──────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    demo_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo@strengthflow.app',
    crypt('DemoFlow123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false, '', '', '', ''
  );

  INSERT INTO public.profiles (id, username, default_weight_unit)
  VALUES (demo_id, 'DemoLifter', 'kg');

  -- ── 2. Resolve exercise IDs ────────────────────────────────────────────────
  SELECT id INTO ex_bench    FROM public.exercises WHERE name ILIKE '%barbell bench press%'    AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_squat    FROM public.exercises WHERE name ILIKE '%barbell back squat%'     AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_deadlift FROM public.exercises WHERE name ILIKE '%barbell deadlift%'       AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_ohp      FROM public.exercises WHERE name ILIKE '%overhead press%'         AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_row      FROM public.exercises WHERE name ILIKE '%barbell row%'            AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_rdl      FROM public.exercises WHERE name ILIKE '%romanian deadlift%'      AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_inc_db   FROM public.exercises WHERE name ILIKE '%incline dumbbell press%' AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_lat_pd   FROM public.exercises WHERE name ILIKE '%lat pulldown%'           AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_cable_row FROM public.exercises WHERE name ILIKE '%cable row%'             AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_db_press FROM public.exercises WHERE name ILIKE '%dumbbell shoulder press%' AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_curl     FROM public.exercises WHERE name ILIKE '%dumbbell curl%'          AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_pushdown FROM public.exercises WHERE name ILIKE '%tricep pushdown%'        AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_leg_press FROM public.exercises WHERE name ILIKE '%leg press%'             AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_leg_curl FROM public.exercises WHERE name ILIKE '%leg curl%'               AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_lat_raise FROM public.exercises WHERE name ILIKE '%lateral raise%'         AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_face_pull FROM public.exercises WHERE name ILIKE '%face pull%'             AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_hip_thrust FROM public.exercises WHERE name ILIKE '%hip thrust%'           AND created_by IS NULL LIMIT 1;
  SELECT id INTO ex_dips     FROM public.exercises WHERE name ILIKE '%dip%'                    AND created_by IS NULL LIMIT 1;

  -- ── 3. Workout Templates ───────────────────────────────────────────────────
  INSERT INTO public.workout_templates (id, name, description, created_by, estimated_duration_minutes)
  VALUES
    (t_push_a, 'Push A',     'Chest + shoulders + triceps (barbell focus)',    demo_id, 60),
    (t_push_b, 'Push B',     'Chest + shoulders + triceps (dumbbell focus)',   demo_id, 55),
    (t_pull_a, 'Pull A',     'Back + biceps (barbell focus)',                  demo_id, 60),
    (t_pull_b, 'Pull B',     'Back + biceps (cable/machine focus)',            demo_id, 55),
    (t_legs_a, 'Legs A',     'Quad-dominant lower body',                      demo_id, 65),
    (t_legs_b, 'Legs B',     'Posterior-chain lower body',                    demo_id, 60),
    (t_upper,  'Upper Body', 'Full upper body — press + pull superset',       demo_id, 70),
    (t_lower,  'Lower Body', 'Full lower body — squat + hinge + accessories', demo_id, 70),
    (t_full,   'Full Body',  'Three compound movements + isolation finish',   demo_id, 75),
    (t_deload, 'Deload',     'Light technique work — 50% intensity',          demo_id, 45);

  -- Template exercises
  -- Push A: Bench / OHP / Inc DB / Pushdown / Lateral Raise
  IF ex_bench     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_a, ex_bench,     0, 4, 6,  8, 180); END IF;
  IF ex_ohp       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_a, ex_ohp,       1, 3, 8,  8, 150); END IF;
  IF ex_inc_db    IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_a, ex_inc_db,    2, 3, 10, 7, 120); END IF;
  IF ex_pushdown  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_a, ex_pushdown,  3, 3, 12, 7,  90); END IF;
  IF ex_lat_raise IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_a, ex_lat_raise, 4, 3, 15, 7,  60); END IF;

  -- Push B: Inc DB / DB Press / Dips / Lateral Raise / Pushdown
  IF ex_inc_db    IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_b, ex_inc_db,    0, 4, 10, 8, 150); END IF;
  IF ex_db_press  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_b, ex_db_press,  1, 3, 10, 8, 150); END IF;
  IF ex_dips      IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_b, ex_dips,      2, 3, 12, 7, 120); END IF;
  IF ex_lat_raise IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_b, ex_lat_raise, 3, 4, 15, 7,  60); END IF;
  IF ex_pushdown  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_push_b, ex_pushdown,  4, 3, 15, 7,  90); END IF;

  -- Pull A: Barbell Row / Lat PD / Curl / Face Pull
  IF ex_row       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_a, ex_row,       0, 4, 6,  8, 180); END IF;
  IF ex_lat_pd    IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_a, ex_lat_pd,    1, 3, 10, 8, 150); END IF;
  IF ex_cable_row IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_a, ex_cable_row, 2, 3, 12, 7, 120); END IF;
  IF ex_curl      IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_a, ex_curl,      3, 3, 12, 7,  90); END IF;
  IF ex_face_pull IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_a, ex_face_pull, 4, 3, 15, 6,  60); END IF;

  -- Pull B: Lat PD / Cable Row / Curl / Face Pull
  IF ex_lat_pd    IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_b, ex_lat_pd,    0, 4, 10, 8, 150); END IF;
  IF ex_cable_row IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_b, ex_cable_row, 1, 4, 12, 8, 120); END IF;
  IF ex_row       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_b, ex_row,       2, 3, 10, 7, 150); END IF;
  IF ex_curl      IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_b, ex_curl,      3, 4, 12, 7,  90); END IF;
  IF ex_face_pull IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_pull_b, ex_face_pull, 4, 3, 15, 6,  60); END IF;

  -- Legs A: Squat / Leg Press / Leg Curl / Lat Raise (quad focus)
  IF ex_squat     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_a, ex_squat,     0, 4, 5,  8, 240); END IF;
  IF ex_leg_press IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_a, ex_leg_press, 1, 3, 10, 8, 150); END IF;
  IF ex_rdl       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_a, ex_rdl,       2, 3, 10, 7, 150); END IF;
  IF ex_leg_curl  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_a, ex_leg_curl,  3, 3, 12, 7,  90); END IF;

  -- Legs B: Deadlift / RDL / Hip Thrust / Leg Curl
  IF ex_deadlift  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_b, ex_deadlift,  0, 4, 4,  8, 240); END IF;
  IF ex_rdl       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_b, ex_rdl,       1, 3, 8,  7, 180); END IF;
  IF ex_hip_thrust IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_b, ex_hip_thrust,2, 3, 10, 7, 120); END IF;
  IF ex_leg_curl  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_legs_b, ex_leg_curl,  3, 3, 12, 7,  90); END IF;

  -- Upper: Bench / Row / OHP / Lat PD / Curl / Pushdown
  IF ex_bench     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_bench,      0, 4, 6,  8, 180); END IF;
  IF ex_row       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_row,        1, 4, 6,  8, 180); END IF;
  IF ex_ohp       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_ohp,        2, 3, 8,  7, 150); END IF;
  IF ex_lat_pd    IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_lat_pd,     3, 3, 10, 7, 120); END IF;
  IF ex_curl      IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_curl,       4, 3, 12, 7,  90); END IF;
  IF ex_pushdown  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_upper, ex_pushdown,   5, 3, 12, 7,  90); END IF;

  -- Lower: Squat / Deadlift / Leg Press / Leg Curl
  IF ex_squat     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_lower, ex_squat,      0, 4, 5,  8, 240); END IF;
  IF ex_deadlift  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_lower, ex_deadlift,   1, 3, 5,  8, 240); END IF;
  IF ex_leg_press IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_lower, ex_leg_press,  2, 3, 10, 7, 150); END IF;
  IF ex_leg_curl  IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_lower, ex_leg_curl,   3, 3, 12, 7,  90); END IF;

  -- Full Body: Squat / Bench / Row / Curl
  IF ex_squat     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_full,  ex_squat,      0, 3, 6,  7, 180); END IF;
  IF ex_bench     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_full,  ex_bench,      1, 3, 8,  7, 150); END IF;
  IF ex_row       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_full,  ex_row,        2, 3, 8,  7, 150); END IF;
  IF ex_curl      IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_full,  ex_curl,       3, 3, 12, 7,  90); END IF;

  -- Deload: Bench / Squat / Row (light)
  IF ex_bench     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_deload, ex_bench,     0, 3, 8,  6, 120); END IF;
  IF ex_squat     IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_deload, ex_squat,     1, 3, 8,  6, 120); END IF;
  IF ex_row       IS NOT NULL THEN INSERT INTO public.template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds) VALUES (t_deload, ex_row,       2, 3, 8,  6, 120); END IF;

  -- ── 4. Workouts ────────────────────────────────────────────────────────────
  -- 20 workouts spread over 6 weeks (Mon/Wed/Fri pattern with variety)
  -- base_date = 6 weeks ago (Monday)
  base_date := date_trunc('week', now() - interval '6 weeks') + interval '1 day'; -- Monday

  w := ARRAY[
    -- Week 1 (Mon/Wed/Fri)
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- Week 2
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- Week 3
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- Week 4
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- Week 5
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- Week 6 (current week — partial: Mon/Wed)
    gen_random_uuid(), gen_random_uuid(),
    -- Bonus: 3 extra workouts on Sat/Sun in various weeks
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  INSERT INTO public.workouts (id, user_id, template_id, name, started_at, completed_at, status) VALUES
    -- Week 1
    (w[1],  demo_id, t_push_a, 'Push A',     base_date + interval '0 days' + interval '8 hours',  base_date + interval '0 days'  + interval '9 hours 5 minutes',  'completed'),
    (w[2],  demo_id, t_pull_a, 'Pull A',     base_date + interval '2 days' + interval '8 hours',  base_date + interval '2 days'  + interval '9 hours 10 minutes', 'completed'),
    (w[3],  demo_id, t_legs_a, 'Legs A',     base_date + interval '4 days' + interval '8 hours',  base_date + interval '4 days'  + interval '9 hours 15 minutes', 'completed'),
    -- Week 2
    (w[4],  demo_id, t_push_b, 'Push B',     base_date + interval '7 days' + interval '18 hours', base_date + interval '7 days'  + interval '19 hours',           'completed'),
    (w[5],  demo_id, t_pull_b, 'Pull B',     base_date + interval '9 days' + interval '18 hours', base_date + interval '9 days'  + interval '19 hours 5 minutes', 'completed'),
    (w[6],  demo_id, t_legs_b, 'Legs B',     base_date + interval '11 days'+ interval '18 hours', base_date + interval '11 days' + interval '19 hours 10 minutes','completed'),
    -- Week 3
    (w[7],  demo_id, t_upper,  'Upper Body', base_date + interval '14 days'+ interval '7 hours',  base_date + interval '14 days' + interval '8 hours 15 minutes', 'completed'),
    (w[8],  demo_id, t_lower,  'Lower Body', base_date + interval '16 days'+ interval '7 hours',  base_date + interval '16 days' + interval '8 hours 20 minutes', 'completed'),
    (w[9],  demo_id, t_push_a, 'Push A',     base_date + interval '18 days'+ interval '7 hours',  base_date + interval '18 days' + interval '8 hours 10 minutes', 'completed'),
    -- Week 4
    (w[10], demo_id, t_pull_a, 'Pull A',     base_date + interval '21 days'+ interval '17 hours', base_date + interval '21 days' + interval '18 hours 5 minutes', 'completed'),
    (w[11], demo_id, t_legs_a, 'Legs A',     base_date + interval '23 days'+ interval '17 hours', base_date + interval '23 days' + interval '18 hours 15 minutes','completed'),
    (w[12], demo_id, t_push_b, 'Push B',     base_date + interval '25 days'+ interval '17 hours', base_date + interval '25 days' + interval '18 hours 10 minutes','completed'),
    -- Week 5
    (w[13], demo_id, t_pull_b, 'Pull B',     base_date + interval '28 days'+ interval '8 hours',  base_date + interval '28 days' + interval '9 hours',           'completed'),
    (w[14], demo_id, t_legs_b, 'Legs B',     base_date + interval '30 days'+ interval '8 hours',  base_date + interval '30 days' + interval '9 hours 10 minutes', 'completed'),
    (w[15], demo_id, t_full,   'Full Body',  base_date + interval '32 days'+ interval '8 hours',  base_date + interval '32 days' + interval '9 hours 20 minutes', 'completed'),
    -- Week 6 (current week)
    (w[16], demo_id, t_push_a, 'Push A',     base_date + interval '35 days'+ interval '7 hours',  base_date + interval '35 days' + interval '8 hours 5 minutes',  'completed'),
    (w[17], demo_id, t_upper,  'Upper Body', base_date + interval '37 days'+ interval '7 hours',  base_date + interval '37 days' + interval '8 hours 15 minutes', 'completed'),
    -- Bonus weekend sessions
    (w[18], demo_id, t_deload, 'Deload',     base_date + interval '5 days' + interval '10 hours', base_date + interval '5 days'  + interval '10 hours 45 minutes','completed'),
    (w[19], demo_id, t_full,   'Full Body',  base_date + interval '19 days'+ interval '10 hours', base_date + interval '19 days' + interval '11 hours 15 minutes','completed'),
    (w[20], demo_id, t_full,   'Full Body',  base_date + interval '33 days'+ interval '10 hours', base_date + interval '33 days' + interval '11 hours 20 minutes','completed');

  -- ── 5. Sets (helper: insert_sets) ─────────────────────────────────────────
  -- For each workout, insert workout_exercises + sets
  -- Progressive overload: weights increase ~2.5kg every 2 weeks on main lifts

  -- WORKOUT 1 — Push A (Week 1): Bench / OHP / Inc DB / Pushdown / Lat Raise
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[1], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 60,  5,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '3 minutes'),
      (we_id, 2, 80,  5,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '6 minutes'),
      (we_id, 3, 95,  6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '9 minutes'),
      (we_id, 4, 95,  6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '12 minutes'),
      (we_id, 5, 95,  5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '15 minutes'),
      (we_id, 6, 95,  5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '18 minutes');
  END IF;
  IF ex_ohp IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[1], ex_ohp, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 50,  8,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '25 minutes'),
      (we_id, 2, 50,  8,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '28 minutes'),
      (we_id, 3, 50,  7,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '31 minutes');
  END IF;
  IF ex_pushdown IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[1], ex_pushdown, 2) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 30, 12, 7,   false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '40 minutes'),
      (we_id, 2, 30, 12, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '42 minutes'),
      (we_id, 3, 30, 11, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[1]) + interval '44 minutes');
  END IF;

  -- WORKOUT 2 — Pull A (Week 1): Row / Lat PD / Cable Row / Curl / Face Pull
  IF ex_row IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[2], ex_row, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 60,  5,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '3 minutes'),
      (we_id, 2, 80,  6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '6 minutes'),
      (we_id, 3, 80,  6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '9 minutes'),
      (we_id, 4, 80,  5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '12 minutes'),
      (we_id, 5, 80,  5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '15 minutes');
  END IF;
  IF ex_lat_pd IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[2], ex_lat_pd, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 55, 10, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '25 minutes'),
      (we_id, 2, 55, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '28 minutes'),
      (we_id, 3, 55,  9, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '31 minutes');
  END IF;
  IF ex_curl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[2], ex_curl, 2) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 14, 12, 7,   false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '42 minutes'),
      (we_id, 2, 14, 12, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '44 minutes'),
      (we_id, 3, 14, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[2]) + interval '46 minutes');
  END IF;

  -- WORKOUT 3 — Legs A (Week 1): Squat / Leg Press / RDL / Leg Curl
  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[3], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 60,  5,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '3 minutes'),
      (we_id, 2, 100, 5,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '7 minutes'),
      (we_id, 3, 120, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '11 minutes'),
      (we_id, 4, 120, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '15 minutes'),
      (we_id, 5, 120, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '19 minutes'),
      (we_id, 6, 120, 4,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '23 minutes');
  END IF;
  IF ex_rdl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[3], ex_rdl, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 90, 10, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '38 minutes'),
      (we_id, 2, 90, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '41 minutes'),
      (we_id, 3, 90,  9, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[3]) + interval '44 minutes');
  END IF;

  -- WORKOUT 4 — Push B (Week 2): slightly heavier
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[4], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 97.5, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '9 minutes'),
      (we_id, 2, 97.5, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '12 minutes'),
      (we_id, 3, 97.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '15 minutes'),
      (we_id, 4, 97.5, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '18 minutes');
  END IF;
  IF ex_inc_db IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[4], ex_inc_db, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 32, 10, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '28 minutes'),
      (we_id, 2, 32, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '31 minutes'),
      (we_id, 3, 32,  9, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '34 minutes'),
      (we_id, 4, 32,  9, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[4]) + interval '37 minutes');
  END IF;

  -- WORKOUT 5 — Pull B (Week 2)
  IF ex_lat_pd IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[5], ex_lat_pd, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 57.5, 10, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '5 minutes'),
      (we_id, 2, 57.5, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '8 minutes'),
      (we_id, 3, 57.5,  9, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '11 minutes'),
      (we_id, 4, 57.5,  9, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '14 minutes');
  END IF;
  IF ex_curl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[5], ex_curl, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 15, 12, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '30 minutes'),
      (we_id, 2, 15, 12, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '32 minutes'),
      (we_id, 3, 15, 10, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '34 minutes'),
      (we_id, 4, 15, 10, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[5]) + interval '36 minutes');
  END IF;

  -- WORKOUT 6 — Legs B (Week 2): Deadlift first real appearance
  IF ex_deadlift IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[6], ex_deadlift, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 80,  4,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '3 minutes'),
      (we_id, 2, 120, 4,  NULL, true,  (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '7 minutes'),
      (we_id, 3, 150, 4,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '11 minutes'),
      (we_id, 4, 150, 4,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '15 minutes'),
      (we_id, 5, 150, 3,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '19 minutes'),
      (we_id, 6, 150, 3,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '23 minutes');
  END IF;
  IF ex_rdl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[6], ex_rdl, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 92.5, 8,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '35 minutes'),
      (we_id, 2, 92.5, 8,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '38 minutes'),
      (we_id, 3, 92.5, 7,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[6]) + interval '41 minutes');
  END IF;

  -- WORKOUTS 7–9 (Week 3) — Upper / Lower / Push A with further progress
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[7], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 100, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '9 minutes'),
      (we_id, 2, 100, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '12 minutes'),
      (we_id, 3, 100, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '15 minutes'),
      (we_id, 4, 100, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '18 minutes');
  END IF;
  IF ex_row IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[7], ex_row, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 82.5, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '28 minutes'),
      (we_id, 2, 82.5, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '31 minutes'),
      (we_id, 3, 82.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '34 minutes'),
      (we_id, 4, 82.5, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[7]) + interval '37 minutes');
  END IF;

  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[8], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 122.5, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '11 minutes'),
      (we_id, 2, 122.5, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '15 minutes'),
      (we_id, 3, 122.5, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '19 minutes'),
      (we_id, 4, 122.5, 4,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '23 minutes');
  END IF;
  IF ex_deadlift IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[8], ex_deadlift, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 152.5, 4,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '38 minutes'),
      (we_id, 2, 152.5, 4,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '42 minutes'),
      (we_id, 3, 152.5, 3,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[8]) + interval '46 minutes');
  END IF;

  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[9], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 102.5, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[9]) + interval '9 minutes'),
      (we_id, 2, 102.5, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[9]) + interval '12 minutes'),
      (we_id, 3, 102.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[9]) + interval '15 minutes'),
      (we_id, 4, 102.5, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[9]) + interval '18 minutes');
  END IF;

  -- WORKOUTS 10–12 (Week 4)
  IF ex_row IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[10], ex_row, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 85, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '6 minutes'),
      (we_id, 2, 85, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '9 minutes'),
      (we_id, 3, 85, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '12 minutes'),
      (we_id, 4, 85, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '15 minutes'),
      (we_id, 5, 85, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '18 minutes');
  END IF;
  IF ex_curl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[10], ex_curl, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 16, 12, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '32 minutes'),
      (we_id, 2, 16, 12, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '34 minutes'),
      (we_id, 3, 16, 10, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[10]) + interval '36 minutes');
  END IF;

  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[11], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 125, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[11]) + interval '11 minutes'),
      (we_id, 2, 125, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[11]) + interval '15 minutes'),
      (we_id, 3, 125, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[11]) + interval '19 minutes'),
      (we_id, 4, 125, 4,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[11]) + interval '23 minutes'),
      (we_id, 5, 125, 4,  9.5, false, (SELECT started_at FROM public.workouts WHERE id = w[11]) + interval '27 minutes');
  END IF;

  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[12], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 105, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[12]) + interval '9 minutes'),
      (we_id, 2, 105, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[12]) + interval '12 minutes'),
      (we_id, 3, 105, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[12]) + interval '15 minutes'),
      (we_id, 4, 105, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[12]) + interval '18 minutes');
  END IF;

  -- WORKOUTS 13–15 (Week 5)
  IF ex_lat_pd IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[13], ex_lat_pd, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 62.5, 10, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '5 minutes'),
      (we_id, 2, 62.5, 10, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '8 minutes'),
      (we_id, 3, 62.5,  9, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '11 minutes'),
      (we_id, 4, 62.5,  9, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '14 minutes');
  END IF;
  IF ex_curl IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[13], ex_curl, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 17, 12, 7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '30 minutes'),
      (we_id, 2, 17, 12, 8,   false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '32 minutes'),
      (we_id, 3, 17, 10, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '34 minutes'),
      (we_id, 4, 17, 10, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[13]) + interval '36 minutes');
  END IF;

  IF ex_deadlift IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[14], ex_deadlift, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 155, 4,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[14]) + interval '11 minutes'),
      (we_id, 2, 155, 4,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[14]) + interval '15 minutes'),
      (we_id, 3, 155, 3,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[14]) + interval '19 minutes'),
      (we_id, 4, 155, 3,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[14]) + interval '23 minutes');
  END IF;
  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[15], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 127.5, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '11 minutes'),
      (we_id, 2, 127.5, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '15 minutes'),
      (we_id, 3, 127.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '19 minutes');
  END IF;
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[15], ex_bench, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 107.5, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '30 minutes'),
      (we_id, 2, 107.5, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '33 minutes'),
      (we_id, 3, 107.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[15]) + interval '36 minutes');
  END IF;

  -- WORKOUTS 16–17 (Week 6 — current week)
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[16], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 110, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '9 minutes'),
      (we_id, 2, 110, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '12 minutes'),
      (we_id, 3, 110, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '15 minutes'),
      (we_id, 4, 110, 4,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '18 minutes');
  END IF;
  IF ex_ohp IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[16], ex_ohp, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 55, 8,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '28 minutes'),
      (we_id, 2, 55, 7,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '31 minutes'),
      (we_id, 3, 55, 7,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[16]) + interval '34 minutes');
  END IF;

  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[17], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 110, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '9 minutes'),
      (we_id, 2, 110, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '12 minutes'),
      (we_id, 3, 112.5, 4, 8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '15 minutes'),
      (we_id, 4, 112.5, 4, 9,   false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '18 minutes');
  END IF;
  IF ex_row IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[17], ex_row, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 87.5, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '28 minutes'),
      (we_id, 2, 87.5, 6,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '31 minutes'),
      (we_id, 3, 87.5, 5,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '34 minutes'),
      (we_id, 4, 87.5, 5,  9,   false, (SELECT started_at FROM public.workouts WHERE id = w[17]) + interval '37 minutes');
  END IF;

  -- WORKOUT 18 — Deload (Weekend week 1)
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[18], ex_bench, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 75, 8,  6,   false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '5 minutes'),
      (we_id, 2, 75, 8,  6.5, false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '7 minutes'),
      (we_id, 3, 75, 8,  7,   false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '9 minutes');
  END IF;
  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[18], ex_squat, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 90, 8,  6,   false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '18 minutes'),
      (we_id, 2, 90, 8,  6.5, false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '20 minutes'),
      (we_id, 3, 90, 8,  7,   false, (SELECT started_at FROM public.workouts WHERE id = w[18]) + interval '22 minutes');
  END IF;

  -- WORKOUT 19 — Full Body (Weekend week 3)
  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[19], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 122.5, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '10 minutes'),
      (we_id, 2, 122.5, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '14 minutes'),
      (we_id, 3, 122.5, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '18 minutes');
  END IF;
  IF ex_bench IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[19], ex_bench, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 100, 6,  7,   false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '30 minutes'),
      (we_id, 2, 100, 6,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '33 minutes'),
      (we_id, 3, 100, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[19]) + interval '36 minutes');
  END IF;

  -- WORKOUT 20 — Full Body (Weekend week 5)
  IF ex_squat IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[20], ex_squat, 0) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 130, 5,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '10 minutes'),
      (we_id, 2, 130, 5,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '14 minutes'),
      (we_id, 3, 130, 4,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '18 minutes');
  END IF;
  IF ex_deadlift IS NOT NULL THEN
    INSERT INTO public.workout_exercises (id, workout_id, exercise_id, order_index) VALUES (gen_random_uuid(), w[20], ex_deadlift, 1) RETURNING id INTO we_id;
    INSERT INTO public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, completed_at) VALUES
      (we_id, 1, 157.5, 4,  7.5, false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '30 minutes'),
      (we_id, 2, 157.5, 4,  8,   false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '34 minutes'),
      (we_id, 3, 157.5, 3,  8.5, false, (SELECT started_at FROM public.workouts WHERE id = w[20]) + interval '38 minutes');
  END IF;

  RAISE NOTICE 'Demo seed completed successfully for user %', demo_id;
END $$;

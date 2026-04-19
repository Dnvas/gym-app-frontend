# StrengthFlow — Demo Script

**Demo credentials:** `demo@strengthflow.app` / `DemoFlow123!`

Run `supabase/seed.sql` in the Supabase SQL editor before presenting.

---

## 1. Authentication

Open the app. On the Login screen enter the demo credentials and sign in. The HomeScreen loads showing a real stats card (workouts this week, week volume in kg, PRs this month).

---

## 2. Workout Templates

The templates list shows 10 user-created templates (Push A, Push B, Pull A/B, Legs A/B, Upper/Lower, Full Body, Deload) alongside any default system templates.

- Long-press **Push A** — the action sheet offers Edit and Delete, confirming ownership is enforced.
- Tap **Push A** to open the Template Detail screen. The exercise list, set targets, RPE, and rest times are all visible.

---

## 3. Starting a Workout

From the Template Detail screen, tap **Start Workout**.

1. The Active Workout screen opens with all Push A exercises pre-loaded.
2. Enter a working set on Bench Press — weight 110 kg, 5 reps, RPE 8.
3. The set is logged immediately. Tap the rest timer to start counting down.
4. Add a second set on the same exercise.
5. Tap **Finish Workout**.
6. The Workout Summary screen shows total volume, sets logged, and any new PRs with a trophy badge.

---

## 4. History

Tap the **History** tab.

- The calendar shows green dots on every day with a completed workout — six weeks of data.
- Tap any day to filter the workout list below to that date.
- Tap a workout card to open the Workout Detail screen showing every exercise, set, weight, and reps logged.
- Tap the day again to clear the filter.

---

## 5. Analytics

Tap the **Analytics** tab.

**Volume tab:**
- Bar chart shows muscle-group breakdown for the current week.
- Tap the left/right chevrons to browse previous weeks — bars vary as training volume changes.

**Progress tab:**
- Select **Barbell Bench Press** from the exercise picker.
- A line chart displays the progression over 6 weeks — weight increases are clearly visible.
- Switch the period selector between 1M, 3M, and ALL.

**PRs tab:**
- Big Three section shows Squat, Bench Press, and Deadlift PRs with estimated 1RM.
- Compound and isolation sections list remaining PRs grouped by muscle.

---

## 6. Template Editing

From the Home tab long-press **Push B** and tap **Edit**.

1. Rename the template.
2. Tap the reorder handles to drag Incline Dumbbell Press above DB Shoulder Press.
3. Tap **Save**. The template detail refreshes immediately with the new order.

---

## 7. Profile

Tap the **Profile** tab.

- The statistics card shows real numbers: total workouts completed, PRs achieved, and total volume lifted.
- Tap the pencil icon to edit username or weight unit preference.
- Tap **Sign Out** — a confirmation dialog appears before signing out.

---

## 8. Offline Behaviour

Turn off Wi-Fi or enable Airplane Mode.

- An amber banner slides in from the top: "No internet connection. Changes won't be saved."
- Turn Wi-Fi back on — the banner disappears with a smooth animation.

---

## 9. Error Handling

Any network failure (slow connection, Supabase outage) displays a non-blocking toast notification at the top of the screen rather than a blocking alert dialog, so the user can continue using the app.

If a catastrophic render crash occurs, the Error Boundary catches it and displays a friendly "Something went wrong" screen with a Reload button.

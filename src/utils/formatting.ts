// src/utils/formatting.ts
// Formatting utility functions extracted from multiple screens and components

export function formatMuscleGroup(muscle: string): string {
  return muscle
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#e74c3c',
  back: '#3498db',
  lats: '#3498db',
  front_delt: '#9b59b6',
  side_delt: '#9b59b6',
  rear_delt: '#9b59b6',
  biceps: '#e67e22',
  triceps: '#e67e22',
  forearms: '#e67e22',
  quadriceps: '#27ae60',
  hamstrings: '#27ae60',
  glutes: '#27ae60',
  calves: '#27ae60',
  core: '#f39c12',
  traps: '#1abc9c',
}

export function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? '#666'
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-'
  if (minutes === 0) return '0m'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatLongDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

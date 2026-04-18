// src/utils/formatting.ts
// Formatting utility functions extracted from multiple screens and components

import { colors } from '../theme/colors'

export function formatMuscleGroup(muscle: string): string {
  return muscle
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getMuscleColor(muscle: string): string {
  return (colors.muscles as Record<string, string>)[muscle] ?? colors.muscleDefault
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

// src/utils/dateHelpers.ts
// Date utility functions extracted from useAnalytics.ts and useWorkoutHistory.ts

export function getWeekBoundaries(startDate?: Date): { start: Date; end: Date } {
  const now = startDate || new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const start = new Date(now)
  start.setDate(now.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getMonthBoundaries(month: Date): { start: string; end: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function toDateKey(isoString: string): string {
  return isoString.split('T')[0]
}

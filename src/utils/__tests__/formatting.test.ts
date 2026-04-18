import {
  formatMuscleGroup,
  getMuscleColor,
  formatDuration,
  formatShortDate,
  formatLongDate,
  formatTime,
} from '../formatting'

describe('formatMuscleGroup', () => {
  it('capitalises a single word', () => {
    expect(formatMuscleGroup('chest')).toBe('Chest')
  })

  it('capitalises and joins underscore-separated words', () => {
    expect(formatMuscleGroup('front_delt')).toBe('Front Delt')
    expect(formatMuscleGroup('rear_delt')).toBe('Rear Delt')
  })

  it('handles multi-part names', () => {
    expect(formatMuscleGroup('quadriceps')).toBe('Quadriceps')
  })
})

describe('getMuscleColor', () => {
  it('returns correct colour for known muscles', () => {
    expect(getMuscleColor('chest')).toBe('#e74c3c')
    expect(getMuscleColor('back')).toBe('#3498db')
    expect(getMuscleColor('biceps')).toBe('#e67e22')
    expect(getMuscleColor('core')).toBe('#f39c12')
  })

  it('returns fallback #666 for unknown muscle', () => {
    expect(getMuscleColor('unknown_muscle')).toBe('#666')
    expect(getMuscleColor('')).toBe('#666')
  })

  it('lats gets same colour as back', () => {
    expect(getMuscleColor('lats')).toBe(getMuscleColor('back'))
  })
})

describe('formatDuration', () => {
  it('returns "-" for null', () => {
    expect(formatDuration(null)).toBe('-')
  })

  it('returns "0m" for 0 minutes', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('formats minutes only when < 60', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(1)).toBe('1m')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(65)).toBe('1h 5m')
    expect(formatDuration(120)).toBe('2h 0m')
    expect(formatDuration(90)).toBe('1h 30m')
  })
})

describe('formatShortDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatShortDate('2026-04-18T10:00:00Z')
    expect(result.length).toBeGreaterThan(0)
    // Should contain day digits
    expect(result).toMatch(/\d/)
  })
})

describe('formatLongDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatLongDate('2026-04-18T10:00:00Z')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toMatch(/\d{4}/)
  })
})

describe('formatTime', () => {
  it('returns a time string with colon separator', () => {
    const result = formatTime('2026-04-18T14:30:00Z')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

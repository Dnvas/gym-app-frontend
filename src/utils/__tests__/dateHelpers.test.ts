import { getWeekBoundaries, getMonthBoundaries, toDateKey } from '../dateHelpers'

describe('getWeekBoundaries', () => {
  it('returns Monday as start when given a Wednesday', () => {
    // Wednesday 2026-04-15
    const wednesday = new Date('2026-04-15T12:00:00Z')
    const { start, end } = getWeekBoundaries(wednesday)
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })

  it('returns start of same week when given a Monday', () => {
    const monday = new Date('2026-04-13T08:00:00Z')
    const { start } = getWeekBoundaries(monday)
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(monday.getDate())
  })

  it('handles Sunday by going back 6 days to Monday', () => {
    // Sunday 2026-04-19
    const sunday = new Date('2026-04-19T10:00:00Z')
    const { start, end } = getWeekBoundaries(sunday)
    expect(start.getDay()).toBe(1)
    // End should be the same Sunday
    expect(end.getDay()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })

  it('end date is 6 days after start date', () => {
    const date = new Date('2026-04-16T12:00:00Z') // Thursday
    const { start, end } = getWeekBoundaries(date)
    // start is 00:00 Monday, end is 23:59 Sunday — same calendar week
    expect(end.getDate() - start.getDate()).toBe(6)
  })

  it('uses current date when no argument provided', () => {
    const { start, end } = getWeekBoundaries()
    expect(start.getDay()).toBe(1)
    expect(end.getDay()).toBe(0)
  })
})

describe('getMonthBoundaries', () => {
  it('returns first day of month as start', () => {
    const march = new Date('2026-03-15')
    const { start } = getMonthBoundaries(march)
    expect(start).toContain('2026-03-01')
  })

  it('returns last day of month as end', () => {
    const feb = new Date('2026-02-10')
    const { end } = getMonthBoundaries(feb)
    expect(end).toContain('2026-02-28')
  })

  it('handles months with 31 days', () => {
    const jan = new Date('2026-01-15')
    const { end } = getMonthBoundaries(jan)
    expect(end).toContain('2026-01-31')
  })

  it('end is on the last day of the month', () => {
    const april = new Date('2026-04-01')
    const { end } = getMonthBoundaries(april)
    // Last day of April is 30; check the date portion of the ISO string
    expect(end.slice(0, 10)).toBe('2026-04-30')
  })
})

describe('toDateKey', () => {
  it('extracts YYYY-MM-DD from ISO string', () => {
    expect(toDateKey('2026-04-18T14:30:00.000Z')).toBe('2026-04-18')
  })

  it('handles already-truncated date strings', () => {
    expect(toDateKey('2026-01-05T00:00:00')).toBe('2026-01-05')
  })
})

import { colors } from '../colors'
import { MuscleGroup } from '../../types/workout'

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'lats', 'front_delt', 'side_delt', 'rear_delt',
  'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings',
  'glutes', 'calves', 'core', 'traps',
]

describe('colors', () => {
  it('core palette tokens are defined hex strings', () => {
    expect(colors.primary).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.accent).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.background).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.surface).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.border).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.error).toMatch(/^#[0-9a-fA-F]{3,6}$/)
  })

  it('text tokens are defined hex strings', () => {
    expect(colors.text.primary).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.text.secondary).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.text.muted).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(colors.text.inverse).toMatch(/^#[0-9a-fA-F]{3,6}$/)
  })

  it('every MuscleGroup has a muscle color entry', () => {
    // Compile-time check: colors.muscles is Record<MuscleGroup, string>
    // Runtime check: no entry is undefined or empty
    ALL_MUSCLE_GROUPS.forEach((muscle) => {
      const color = colors.muscles[muscle]
      expect(color).toBeDefined()
      expect(color).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    })
  })

  it('muscleDefault is a valid hex color', () => {
    expect(colors.muscleDefault).toMatch(/^#[0-9a-fA-F]{3,6}$/)
  })
})

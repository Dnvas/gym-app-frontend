import {
  calcSetVolume,
  calcWorkoutStats,
  calcEstimatedDuration,
  calcEpley1RM,
  calcPctChange,
} from '../workoutCalculations'
import { TemplateExerciseFormData } from '../../types/workout'

describe('calcSetVolume', () => {
  it('multiplies weight by reps', () => {
    expect(calcSetVolume(100, 5)).toBe(500)
  })

  it('returns 0 when weight is null', () => {
    expect(calcSetVolume(null, 10)).toBe(0)
  })

  it('returns 0 when reps is null', () => {
    expect(calcSetVolume(80, null)).toBe(0)
  })

  it('returns 0 when both are null', () => {
    expect(calcSetVolume(null, null)).toBe(0)
  })
})

describe('calcWorkoutStats', () => {
  it('counts only working (non-warmup) sets', () => {
    const exercises = [
      {
        sets: [
          { is_warmup: true, weight_kg: 60, reps: 10 },
          { is_warmup: false, weight_kg: 100, reps: 5 },
          { is_warmup: false, weight_kg: 100, reps: 5 },
        ],
      },
    ]
    const { totalSets } = calcWorkoutStats(exercises)
    expect(totalSets).toBe(2)
  })

  it('sums volume only from working sets', () => {
    const exercises = [
      {
        sets: [
          { is_warmup: true, weight_kg: 60, reps: 10 },  // 600 — excluded
          { is_warmup: false, weight_kg: 100, reps: 5 },  // 500
          { is_warmup: false, weight_kg: 105, reps: 3 },  // 315
        ],
      },
    ]
    const { totalVolumeKg } = calcWorkoutStats(exercises)
    expect(totalVolumeKg).toBe(815)
  })

  it('handles exercises with no sets', () => {
    const exercises = [{ sets: [] }, { sets: undefined }]
    const { totalSets, totalVolumeKg } = calcWorkoutStats(exercises)
    expect(totalSets).toBe(0)
    expect(totalVolumeKg).toBe(0)
  })

  it('handles null weight/reps gracefully', () => {
    const exercises = [
      {
        sets: [{ is_warmup: false, weight_kg: null, reps: null }],
      },
    ]
    const { totalSets, totalVolumeKg } = calcWorkoutStats(exercises)
    expect(totalSets).toBe(1)
    expect(totalVolumeKg).toBe(0)
  })
})

describe('calcEstimatedDuration', () => {
  it('calculates duration for a single exercise', () => {
    const exercises: TemplateExerciseFormData[] = [
      {
        tempId: 'a',
        exercise_id: '1',
        exercise: {} as any,
        order_index: 0,
        target_sets: 3,
        target_reps: 10,
        target_rpe: null,
        rest_seconds: 60, // 1 min rest
        notes: null,
      },
    ]
    // 3 × (2 + 1) = 9 minutes
    expect(calcEstimatedDuration(exercises)).toBe(9)
  })

  it('returns 0 for empty exercise list', () => {
    expect(calcEstimatedDuration([])).toBe(0)
  })
})

describe('calcEpley1RM', () => {
  it('returns weight unchanged when reps <= 1', () => {
    expect(calcEpley1RM(160, 1)).toBe(160)
    expect(calcEpley1RM(160, 0)).toBe(160)
  })

  it('calculates Epley formula for 100kg × 5', () => {
    // 100 × (1 + 0.0333 × 5) = 100 × 1.1665 = 116.65
    expect(calcEpley1RM(100, 5)).toBeCloseTo(116.65, 1)
  })

  it('calculates Epley formula for 80kg × 10', () => {
    // 80 × (1 + 0.0333 × 10) = 80 × 1.333 = 106.64
    expect(calcEpley1RM(80, 10)).toBeCloseTo(106.64, 1)
  })
})

describe('calcPctChange', () => {
  it('returns null when previous is 0', () => {
    expect(calcPctChange(50, 0)).toBeNull()
  })

  it('returns 0 when values are equal', () => {
    expect(calcPctChange(100, 100)).toBe(0)
  })

  it('returns positive percentage for increase', () => {
    expect(calcPctChange(120, 100)).toBe(20)
  })

  it('returns negative percentage for decrease', () => {
    expect(calcPctChange(80, 100)).toBe(-20)
  })

  it('rounds to nearest integer', () => {
    // (110 - 100) / 100 = 0.1 = 10%
    expect(calcPctChange(110, 100)).toBe(10)
    // (105 - 100) / 100 = 0.05 = 5%
    expect(calcPctChange(105, 100)).toBe(5)
  })
})

// src/components/analytics/ProgressTab.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAnalytics } from '../../hooks/useAnalytics'
import { ExerciseProgressData, ProgressDataPoint } from '../../types/analytics'
import { Exercise } from '../../types/workout'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_HEIGHT = 200
const Y_AXIS_WIDTH = 40
// card padding (16) × 2 sides + scroll padding (16) × 2 sides + y-axis width
const CHART_WIDTH = SCREEN_WIDTH - 64 - Y_AXIS_WIDTH

type PeriodType = '1M' | '3M' | '6M' | 'ALL'

export default function ProgressTab() {
  const { fetchExerciseProgress, loading } = useAnalytics()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [period, setPeriod] = useState<PeriodType>('3M')
  const [progressData, setProgressData] = useState<ExerciseProgressData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<ProgressDataPoint | null>(null)

  useEffect(() => {
    async function loadExercises() {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_compound', true)
        .order('name')

      if (data && data.length > 0) {
        setExercises(data)
        const defaultExercise =
          data.find(
            e =>
              e.name.toLowerCase().includes('bench press') ||
              e.name.toLowerCase().includes('squat')
          ) || data[0]
        setSelectedExercise(defaultExercise)
      }
    }
    loadExercises()
  }, [])

  useEffect(() => {
    if (selectedExercise) {
      loadProgress()
    }
  }, [selectedExercise, period])

  const loadProgress = useCallback(async () => {
    if (!selectedExercise) return
    setSelectedPoint(null)
    const data = await fetchExerciseProgress(selectedExercise.id, period)
    setProgressData(data)
  }, [selectedExercise, period, fetchExerciseProgress])

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function formatDateLong(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Returns up to 5 evenly spaced indices for X axis labels
  function getXLabelIndices(count: number): number[] {
    if (count === 0) return []
    if (count <= 5) return Array.from({ length: count }, (_, i) => i)
    const indices = new Set([0, count - 1])
    const step = (count - 1) / 4
    for (let i = 1; i <= 3; i++) indices.add(Math.round(step * i))
    return Array.from(indices).sort((a, b) => a - b)
  }

  function getChartData() {
    if (!progressData?.data_points.length) return null

    const points = progressData.data_points
    const weights = points.map(p => p.weight_kg)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)

    const range = Math.max(maxWeight - minWeight, 5)
    const padding = range * 0.15

    return {
      points,
      minWeight: Math.floor(minWeight - padding),
      maxWeight: Math.ceil(maxWeight + padding),
    }
  }

  function renderChart() {
    const chartData = getChartData()
    if (!chartData) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyChartText}>No data for this period</Text>
          <Text style={styles.emptyChartSubtext}>
            Complete more workouts to see your progress
          </Text>
        </View>
      )
    }

    const { points, minWeight, maxWeight } = chartData
    const weightRange = maxWeight - minWeight

    function getXY(index: number) {
      const x = points.length > 1 ? index * (CHART_WIDTH / (points.length - 1)) : CHART_WIDTH / 2
      const yPercent = weightRange > 0 ? (points[index].weight_kg - minWeight) / weightRange : 0.5
      // 10px top/bottom padding keeps dots away from grid edges
      const y = CHART_HEIGHT - yPercent * (CHART_HEIGHT - 20) - 10
      return { x, y }
    }

    const xLabelIndices = getXLabelIndices(points.length)

    return (
      <View>
        <View style={styles.chartContainer}>
          {/* Y-Axis Labels */}
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxWeight}kg</Text>
            <Text style={styles.axisLabel}>{Math.round((maxWeight + minWeight) / 2)}kg</Text>
            <Text style={styles.axisLabel}>{minWeight}kg</Text>
          </View>

          {/* Plot + X axis stacked vertically */}
          <View style={styles.chartAndXAxis}>
            {/* Plot area */}
            <View style={[styles.chartPlot, { height: CHART_HEIGHT }]}>
              {/* Horizontal grid lines */}
              <View style={[styles.gridLine, { top: 0 }]} />
              <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
              <View style={[styles.gridLine, { top: CHART_HEIGHT - 1 }]} />

              {/* Absolute layer: lines rendered first, dots on top */}
              <View style={StyleSheet.absoluteFillObject}>
                {/* Line segments — positioned at the midpoint between each pair of dots.
                    Default transform-origin is the element's center, so rotating around
                    the midpoint produces the correct line between the two points. */}
                {points.slice(0, -1).map((_, index) => {
                  const { x, y } = getXY(index)
                  const { x: nx, y: ny } = getXY(index + 1)
                  const dx = nx - x
                  const dy = ny - y
                  const length = Math.sqrt(dx * dx + dy * dy)
                  const angle = Math.atan2(dy, dx)
                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.lineSegment,
                        {
                          left: (x + nx) / 2 - length / 2,
                          top: (y + ny) / 2 - 1,
                          width: length,
                          transform: [{ rotate: `${angle}rad` }],
                        },
                      ]}
                    />
                  )
                })}

                {/* Data points — left: x-6, top: y-6 centers the 12×12 dot exactly on (x,y).
                    No margin offset in the style, avoiding the double-offset bug. */}
                {points.map((point, index) => {
                  const { x, y } = getXY(index)
                  const isSelected = selectedPoint?.date === point.date
                  return (
                    <TouchableOpacity
                      key={`dot-${index}`}
                      onPress={() => setSelectedPoint(isSelected ? null : point)}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                      style={[
                        styles.dataPoint,
                        { left: x - 6, top: y - 6 },
                        isSelected && styles.dataPointSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.dataPointInner,
                          isSelected && styles.dataPointInnerSelected,
                        ]}
                      />
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* X Axis date labels */}
            <View style={styles.xAxis}>
              {xLabelIndices.map(i => {
                const { x } = getXY(i)
                return (
                  <Text
                    key={`xlabel-${i}`}
                    style={[styles.xAxisLabel, { left: x - 25 }]}
                    numberOfLines={1}
                  >
                    {formatDate(points[i].date)}
                  </Text>
                )
              })}
            </View>
          </View>
        </View>

        {/* Tapped-point detail card */}
        {selectedPoint ? (
          <View style={styles.tooltipCard}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.tooltipDate}>{formatDateLong(selectedPoint.date)}</Text>
            <Text style={styles.tooltipSep}>·</Text>
            <Ionicons name="barbell-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.tooltipValue}>
              {selectedPoint.weight_kg}kg × {selectedPoint.reps} reps
            </Text>
          </View>
        ) : (
          <Text style={styles.tapHint}>Tap a point to see details</Text>
        )}
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Exercise Selector */}
      <TouchableOpacity
        style={styles.exerciseSelector}
        onPress={() => setShowExercisePicker(!showExercisePicker)}
      >
        <View>
          <Text style={styles.exerciseSelectorLabel}>Exercise</Text>
          <Text style={styles.exerciseSelectorValue}>
            {selectedExercise?.name || 'Select exercise'}
          </Text>
        </View>
        <Ionicons
          name={showExercisePicker ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Exercise Picker Dropdown */}
      {showExercisePicker && (
        <View style={styles.exercisePickerDropdown}>
          <ScrollView style={styles.exercisePickerScroll} nestedScrollEnabled>
            {exercises.map(exercise => (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.exercisePickerItem,
                  selectedExercise?.id === exercise.id && styles.exercisePickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedExercise(exercise)
                  setShowExercisePicker(false)
                }}
              >
                <Text
                  style={[
                    styles.exercisePickerItemText,
                    selectedExercise?.id === exercise.id &&
                      styles.exercisePickerItemTextSelected,
                  ]}
                >
                  {exercise.name}
                </Text>
                {selectedExercise?.id === exercise.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['1M', '3M', '6M', 'ALL'] as PeriodType[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weight Progression</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          renderChart()
        )}
      </View>

      {/* Current PR Card */}
      {progressData?.current_pr && (
        <View style={styles.prCard}>
          <View style={styles.prHeader}>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
            <Text style={styles.prTitle}>Personal Record</Text>
          </View>
          <View style={styles.prContent}>
            <View style={styles.prMainStat}>
              <Text style={styles.prWeight}>{progressData.current_pr.weight_kg}</Text>
              <Text style={styles.prUnit}>kg</Text>
            </View>
            <View style={styles.prDetails}>
              <Text style={styles.prReps}>× {progressData.current_pr.reps} reps</Text>
              <Text style={styles.prDate}>
                {new Date(progressData.current_pr.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Sessions */}
      {progressData?.data_points && progressData.data_points.length > 0 && (
        <View style={styles.recentCard}>
          <Text style={styles.recentTitle}>Recent Sessions</Text>
          {progressData.data_points
            .slice(-5)
            .reverse()
            .map(point => (
              <View key={point.date} style={styles.recentRow}>
                <Text style={styles.recentDate}>{formatDate(point.date)}</Text>
                <Text style={styles.recentValue}>
                  {point.weight_kg}kg × {point.reps}
                </Text>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  exerciseSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseSelectorLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  exerciseSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  exercisePickerDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    maxHeight: 250,
    overflow: 'hidden',
  },
  exercisePickerScroll: {
    padding: 8,
  },
  exercisePickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exercisePickerItemSelected: {
    backgroundColor: '#e8f4f8',
  },
  exercisePickerItemText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  exercisePickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  periodButtonTextActive: {
    color: colors.surface,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  loadingContainer: {
    height: CHART_HEIGHT + 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  // ── Chart layout ──────────────────────────────────────────────────────────
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.text.muted,
  },
  chartAndXAxis: {
    flex: 1,
  },
  chartPlot: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  // ── Line segments ─────────────────────────────────────────────────────────
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary,
  },
  // ── Data points ───────────────────────────────────────────────────────────
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointSelected: {
    borderColor: colors.accent,
    transform: [{ scale: 1.3 }],
  },
  dataPointInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dataPointInnerSelected: {
    backgroundColor: colors.accent,
  },
  // ── X axis labels ─────────────────────────────────────────────────────────
  xAxis: {
    height: 24,
    position: 'relative',
    marginTop: 4,
  },
  xAxisLabel: {
    position: 'absolute',
    width: 50,
    textAlign: 'center',
    fontSize: 10,
    color: colors.text.muted,
    top: 0,
  },
  // ── Tooltip / tap hint ────────────────────────────────────────────────────
  tooltipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  tooltipDate: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  tooltipSep: {
    fontSize: 13,
    color: colors.text.muted,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tapHint: {
    marginTop: 10,
    fontSize: 11,
    color: colors.text.faint,
    textAlign: 'center',
  },
  // ── PR card ───────────────────────────────────────────────────────────────
  prCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 12,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  prContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prMainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prWeight: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  prUnit: {
    fontSize: 18,
    color: colors.primary,
    marginLeft: 4,
  },
  prDetails: {
    marginLeft: 16,
  },
  prReps: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  prDate: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  // ── Recent sessions ───────────────────────────────────────────────────────
  recentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  recentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
})

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

const SCREEN_WIDTH = Dimensions.get('window').width

type PeriodType = '1M' | '3M' | '6M' | 'ALL'

export default function ProgressTab() {
  const { fetchExerciseProgress, loading } = useAnalytics()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [period, setPeriod] = useState<PeriodType>('3M')
  const [progressData, setProgressData] = useState<ExerciseProgressData | null>(null)

  // Fetch exercises on mount
  useEffect(() => {
    async function loadExercises() {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_compound', true) // Default to compound exercises
        .order('name')
      
      if (data && data.length > 0) {
        setExercises(data)
        // Default to first compound (likely Barbell Bench Press or similar)
        const defaultExercise = data.find(e => 
          e.name.toLowerCase().includes('bench press') ||
          e.name.toLowerCase().includes('squat')
        ) || data[0]
        setSelectedExercise(defaultExercise)
      }
    }
    loadExercises()
  }, [])

  // Fetch progress when exercise or period changes
  useEffect(() => {
    if (selectedExercise) {
      loadProgress()
    }
  }, [selectedExercise, period])

  const loadProgress = useCallback(async () => {
    if (!selectedExercise) return
    const data = await fetchExerciseProgress(selectedExercise.id, period)
    setProgressData(data)
  }, [selectedExercise, period, fetchExerciseProgress])

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function getChartData() {
    if (!progressData?.data_points.length) return null

    const points = progressData.data_points
    const weights = points.map(p => p.weight_kg)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    
    // Add 10% padding, minimum 5kg range
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
          <Ionicons name="analytics-outline" size={48} color="#ccc" />
          <Text style={styles.emptyChartText}>No data for this period</Text>
          <Text style={styles.emptyChartSubtext}>
            Complete more workouts to see your progress
          </Text>
        </View>
      )
    }

    const { points, minWeight, maxWeight } = chartData
    const weightRange = maxWeight - minWeight
    const chartWidth = SCREEN_WIDTH - 100 // More padding for y-axis labels
    const chartHeight = 180
    const pointSpacing = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth / 2

    return (
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{maxWeight}kg</Text>
          <Text style={styles.axisLabel}>{Math.round((maxWeight + minWeight) / 2)}kg</Text>
          <Text style={styles.axisLabel}>{minWeight}kg</Text>
        </View>

        {/* Chart Area */}
        <View style={[styles.chartArea, { height: chartHeight }]}>
          {/* Grid Lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
          <View style={[styles.gridLine, { top: chartHeight - 1 }]} />

          {/* Data Points and Lines */}
          <View style={styles.dataLayer}>
            {points.map((point, index) => {
              const x = points.length > 1 ? index * pointSpacing : chartWidth / 2
              const yPercent = (point.weight_kg - minWeight) / weightRange
              const y = chartHeight - (yPercent * (chartHeight - 20)) - 10 // Keep points within bounds

              return (
                <React.Fragment key={point.date}>
                  {/* Line to next point */}
                  {index < points.length - 1 && (() => {
                    const nextX = (index + 1) * pointSpacing
                    const nextYPercent = (points[index + 1].weight_kg - minWeight) / weightRange
                    const nextY = chartHeight - (nextYPercent * (chartHeight - 20)) - 10
                    const deltaX = nextX - x
                    const deltaY = nextY - y
                    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                    const angle = Math.atan2(deltaY, deltaX)
                    
                    return (
                      <View
                        style={[
                          styles.lineSegment,
                          {
                            left: x,
                            top: y,
                            width: length,
                            transform: [{ rotate: `${angle}rad` }],
                          },
                        ]}
                      />
                    )
                  })()}
                  {/* Data Point */}
                  <View
                    style={[
                      styles.dataPoint,
                      {
                        left: x - 6,
                        top: y - 6,
                      },
                    ]}
                  >
                    <View style={styles.dataPointInner} />
                  </View>
                </React.Fragment>
              )
            })}
          </View>
        </View>
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
          color="#1E3A5F"
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
                  <Ionicons name="checkmark" size={20} color="#1E3A5F" />
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

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weight Progression</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A5F" />
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
          {progressData.data_points.slice(-5).reverse().map(point => (
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseSelectorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  exerciseSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  exercisePickerDropdown: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  exercisePickerItemTextSelected: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    backgroundColor: '#1E3A5F',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 11,
    color: '#999',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dataLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#1E3A5F',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E3A5F',
  },
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
    color: '#1E3A5F',
  },
  prUnit: {
    fontSize: 18,
    color: '#1E3A5F',
    marginLeft: 4,
  },
  prDetails: {
    marginLeft: 16,
  },
  prReps: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  prDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentDate: {
    fontSize: 14,
    color: '#666',
  },
  recentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
})

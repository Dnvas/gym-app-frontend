// src/components/analytics/VolumeTab.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAnalytics } from '../../hooks/useAnalytics'
import { WeeklyVolumeData, MuscleVolumeData } from '../../types/analytics'
import { MuscleGroup } from '../../types/workout'
import { colors } from '../../theme'

// Muscle group display names and colors
const MUSCLE_CONFIG: Record<MuscleGroup, { label: string; color: string }> = {
  chest: { label: 'Chest', color: colors.error },
  back: { label: 'Back', color: '#3498db' },
  lats: { label: 'Lats', color: '#2980b9' },
  traps: { label: 'Traps', color: '#1abc9c' },
  front_delt: { label: 'Front Delts', color: '#9b59b6' },
  side_delt: { label: 'Side Delts', color: '#8e44ad' },
  rear_delt: { label: 'Rear Delts', color: '#713580' },
  biceps: { label: 'Biceps', color: '#e67e22' },
  triceps: { label: 'Triceps', color: '#d35400' },
  forearms: { label: 'Forearms', color: colors.warning },
  quadriceps: { label: 'Quads', color: colors.success },
  hamstrings: { label: 'Hamstrings', color: colors.success },
  glutes: { label: 'Glutes', color: '#16a085' },
  calves: { label: 'Calves', color: '#1abc9c' },
  core: { label: 'Core', color: '#f1c40f' },
}

type MetricType = 'sets' | 'volume'

export default function VolumeTab() {
  const { fetchWeeklyVolume, loading } = useAnalytics()
  const [data, setData] = useState<WeeklyVolumeData | null>(null)
  const [metric, setMetric] = useState<MetricType>('sets')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = last week, etc.
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() + weekOffset * 7)
    const result = await fetchWeeklyVolume(weekStart)
    setData(result)
  }, [fetchWeeklyVolume, weekOffset])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`
  }

  function getMaxValue(): number {
    if (!data?.muscle_groups.length) return 10
    if (metric === 'sets') {
      return Math.max(...data.muscle_groups.map(mg => mg.total_sets), 1)
    }
    return Math.max(...data.muscle_groups.map(mg => mg.total_volume_kg), 1)
  }

  function renderMuscleBar(muscleData: MuscleVolumeData) {
    const config = MUSCLE_CONFIG[muscleData.muscle_group]
    const maxValue = getMaxValue()
    
    const totalValue = metric === 'sets' ? muscleData.total_sets : muscleData.total_volume_kg
    const compoundValue = metric === 'sets' ? muscleData.compound_sets : muscleData.compound_volume_kg
    const isolationValue = metric === 'sets' ? muscleData.isolation_sets : muscleData.isolation_volume_kg
    
    const totalWidthPercent = (totalValue / maxValue) * 100
    const compoundWidthPercent = totalValue > 0 ? (compoundValue / totalValue) * 100 : 0

    return (
      <View key={muscleData.muscle_group} style={styles.muscleRow}>
        <View style={styles.muscleLabel}>
          <Text style={styles.muscleName}>{config.label}</Text>
          {muscleData.change_vs_last_week !== undefined && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={muscleData.change_vs_last_week >= 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={muscleData.change_vs_last_week >= 0 ? colors.success : colors.error}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: muscleData.change_vs_last_week >= 0 ? colors.success : colors.error },
                ]}
              >
                {muscleData.change_vs_last_week > 0 ? '+' : ''}
                {muscleData.change_vs_last_week}%
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.barContainer}>
          <View style={styles.barBackground}>
            {/* Compound portion (darker) */}
            <View
              style={[
                styles.barCompound,
                { 
                  width: `${(compoundValue / maxValue) * 100}%`, 
                  backgroundColor: config.color,
                },
              ]}
            />
            {/* Isolation portion (lighter) - positioned after compound */}
            <View
              style={[
                styles.barIsolation,
                {
                  width: `${(isolationValue / maxValue) * 100}%`,
                  backgroundColor: config.color,
                  opacity: 0.4,
                },
              ]}
            />
          </View>
        </View>
        
        <View style={styles.valueContainer}>
          <Text style={styles.totalValue}>
            {metric === 'sets' ? totalValue : `${(totalValue / 1000).toFixed(1)}k`}
          </Text>
          <Text style={styles.splitValue}>
            {compoundValue}/{isolationValue}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A5F" />
      }
    >
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => setWeekOffset(prev => prev - 1)}
        >
          <Ionicons name="chevron-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <View style={styles.weekInfo}>
          <Text style={styles.weekLabel}>
            {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : 'Week'}
          </Text>
          {data && (
            <Text style={styles.weekDates}>
              {formatDateRange(data.start_date, data.end_date)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.weekArrow, weekOffset >= 0 && styles.weekArrowDisabled]}
          onPress={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
          disabled={weekOffset >= 0}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={weekOffset >= 0 ? colors.text.faint : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Metric Toggle */}
      <View style={styles.metricToggle}>
        <TouchableOpacity
          style={[styles.metricButton, metric === 'sets' && styles.metricButtonActive]}
          onPress={() => setMetric('sets')}
        >
          <Text style={[styles.metricButtonText, metric === 'sets' && styles.metricButtonTextActive]}>
            Sets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricButton, metric === 'volume' && styles.metricButtonActive]}
          onPress={() => setMetric('volume')}
        >
          <Text style={[styles.metricButtonText, metric === 'volume' && styles.metricButtonTextActive]}>
            Volume (kg)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendCompound]} />
          <Text style={styles.legendText}>Compound</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendIsolation]} />
          <Text style={styles.legendText}>Isolation</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      )}

      {/* Volume Bars */}
      {!loading && data && (
        <View style={styles.barsContainer}>
          {data.muscle_groups.length > 0 ? (
            data.muscle_groups.map(renderMuscleBar)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No workouts this week</Text>
              <Text style={styles.emptySubtext}>
                Complete a workout to see your volume breakdown
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Totals Card */}
      {data && data.muscle_groups.length > 0 && (
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Sets</Text>
            <View style={styles.totalValueRow}>
              <Text style={styles.totalMainValue}>{data.totals.total_sets}</Text>
              <Text style={styles.totalSplitValue}>
                ({data.totals.compound_sets} compound / {data.totals.isolation_sets} isolation)
              </Text>
            </View>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Volume</Text>
            <View style={styles.totalValueRow}>
              <Text style={styles.totalMainValue}>
                {data.totals.total_volume_kg.toLocaleString()} kg
              </Text>
              {data.totals.change_vs_last_week !== undefined && (
                <View style={styles.totalChange}>
                  <Ionicons
                    name={data.totals.change_vs_last_week >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={data.totals.change_vs_last_week >= 0 ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      styles.totalChangeText,
                      {
                        color: data.totals.change_vs_last_week >= 0 ? colors.success : colors.error,
                      },
                    ]}
                  >
                    {data.totals.change_vs_last_week > 0 ? '+' : ''}
                    {data.totals.change_vs_last_week}% vs last week
                  </Text>
                </View>
              )}
            </View>
          </View>
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
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  weekArrow: {
    padding: 8,
  },
  weekArrowDisabled: {
    opacity: 0.5,
  },
  weekInfo: {
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weekDates: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  metricButtonActive: {
    backgroundColor: colors.primary,
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  metricButtonTextActive: {
    color: colors.surface,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendCompound: {
    backgroundColor: colors.primary,
  },
  legendIsolation: {
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  barsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  muscleLabel: {
    width: 90,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  barBackground: {
    height: 20,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barCompound: {
    height: '100%',
    borderRadius: 4,
  },
  barIsolation: {
    height: '100%',
  },
  valueContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  splitValue: {
    fontSize: 10,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalMainValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalSplitValue: {
    fontSize: 12,
    color: colors.text.muted,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  totalChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
})

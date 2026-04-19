// src/components/analytics/PRsTab.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useToast } from '../../contexts/ToastContext'
import { GroupedPRsData, PRRecord, ExerciseForPR } from '../../types/analytics'
import { MuscleGroup } from '../../types/workout'
import { colors } from '../../theme'

// Muscle group display config
const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  lats: 'Lats',
  traps: 'Traps',
  front_delt: 'Front Delts',
  side_delt: 'Side Delts',
  rear_delt: 'Rear Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
}

// Big 3 exercise names for pre-selection
const BIG_THREE_EXERCISES = {
  squat: 'Barbell Squat',
  bench: 'Barbell Bench Press',
  deadlift: 'Deadlift',
}

type BigThreeType = 'squat' | 'bench' | 'deadlift'

export default function PRsTab() {
  const { fetchGroupedPRs, addManualPR, fetchExercisesForPR, loading } = useAnalytics()
  const { showError } = useToast()
  const [prsData, setPrsData] = useState<GroupedPRsData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedMuscle, setExpandedMuscle] = useState<MuscleGroup | null>(null)
  
  // Manual PR form state
  const [exercises, setExercises] = useState<ExerciseForPR[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseForPR | null>(null)
  const [preSelectedType, setPreSelectedType] = useState<BigThreeType | null>(null)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  const loadPRs = useCallback(async () => {
    const data = await fetchGroupedPRs()
    setPrsData(data)
  }, [fetchGroupedPRs])

  useEffect(() => {
    loadPRs()
  }, [loadPRs])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadPRs()
    setRefreshing(false)
  }

  // Open modal for general PR entry
  async function openAddModal() {
    const exerciseList = await fetchExercisesForPR()
    setExercises(exerciseList)
    setSelectedExercise(null)
    setPreSelectedType(null)
    setWeight('')
    setReps('1')
    setShowAddModal(true)
  }

  // Open modal pre-selected for a Big 3 lift
  async function openAddModalForBigThree(type: BigThreeType) {
    const exerciseList = await fetchExercisesForPR()
    setExercises(exerciseList)
    
    // Find and pre-select the exercise
    const exerciseName = BIG_THREE_EXERCISES[type]
    const exercise = exerciseList.find(e => 
      e.name.toLowerCase() === exerciseName.toLowerCase()
    )
    
    setSelectedExercise(exercise || null)
    setPreSelectedType(type)
    setWeight('')
    setReps('1')
    setShowAddModal(true)
  }

  async function handleSubmitPR() {
    if (!selectedExercise || !weight || !reps) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    const weightNum = parseFloat(weight)
    const repsNum = parseInt(reps)

    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid weight')
      return
    }

    if (isNaN(repsNum) || repsNum <= 0) {
      Alert.alert('Error', 'Please enter valid reps')
      return
    }

    setSubmitting(true)
    const { success, error } = await addManualPR({
      exercise_id: selectedExercise.id,
      weight_kg: weightNum,
      reps: repsNum,
    })
    setSubmitting(false)

    if (success) {
      setShowAddModal(false)
      setSelectedExercise(null)
      setPreSelectedType(null)
      setWeight('')
      setReps('1')
      await loadPRs()
      Alert.alert('Success', 'PR added successfully!')
    } else {
      showError(typeof error === 'string' ? error : 'Failed to add PR')
    }
  }

  function renderBigThreeCard(
    title: string,
    type: BigThreeType,
    pr: PRRecord | null
  ) {
    // Only show e1RM if reps > 1 (for 1 rep, e1RM = weight, which is pointless)
    const showE1rm = pr && pr.reps > 1

    return (
      <View style={styles.bigThreeCard}>
        <Text style={styles.bigThreeTitle}>{title}</Text>
        {pr ? (
          <>
            <View style={styles.bigThreeMain}>
              <Text style={styles.bigThreeWeight}>{pr.weight_kg}</Text>
              <Text style={styles.bigThreeUnit}>kg</Text>
            </View>
            <Text style={styles.bigThreeReps}>× {pr.reps} rep{pr.reps > 1 ? 's' : ''}</Text>
            {showE1rm && (
              <View style={styles.bigThreeE1rm}>
                <Text style={styles.bigThreeE1rmLabel}>e1RM:</Text>
                <Text style={styles.bigThreeE1rmValue}>{pr.estimated_1rm}kg</Text>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.bigThreeEmpty} onPress={() => openAddModalForBigThree(type)}>
            <Ionicons name="add-circle-outline" size={32} color="#ccc" />
            <Text style={styles.bigThreeEmptyText}>Add PR</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  function renderCompoundPR(pr: PRRecord) {
    return (
      <View key={pr.id} style={styles.compoundRow}>
        <View style={styles.compoundInfo}>
          <Text style={styles.compoundName}>{pr.exercise_name}</Text>
        </View>
        <View style={styles.compoundStats}>
          <Text style={styles.compoundWeight}>{pr.weight_kg}kg × {pr.reps}</Text>
        </View>
      </View>
    )
  }

  function renderIsolationSection() {
    if (!prsData?.isolation_by_muscle) return null

    const muscles = Object.keys(prsData.isolation_by_muscle) as MuscleGroup[]
    if (muscles.length === 0) return null

    return (
      <View style={styles.isolationSection}>
        <Text style={styles.sectionTitle}>🎯 Isolation PRs</Text>
        <View style={styles.muscleChips}>
          {muscles.map(muscle => {
            const count = prsData.isolation_by_muscle[muscle]?.length ?? 0
            return (
              <TouchableOpacity
                key={muscle}
                style={[
                  styles.muscleChip,
                  expandedMuscle === muscle && styles.muscleChipActive,
                ]}
                onPress={() =>
                  setExpandedMuscle(expandedMuscle === muscle ? null : muscle)
                }
              >
                <Text
                  style={[
                    styles.muscleChipText,
                    expandedMuscle === muscle && styles.muscleChipTextActive,
                  ]}
                >
                  {MUSCLE_LABELS[muscle]} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {expandedMuscle && prsData.isolation_by_muscle[expandedMuscle] && (
          <View style={styles.isolationList}>
            {prsData.isolation_by_muscle[expandedMuscle]!.map(pr => (
              <View key={pr.id} style={styles.isolationRow}>
                <Text style={styles.isolationName}>{pr.exercise_name}</Text>
                <Text style={styles.isolationValue}>
                  {pr.weight_kg}kg × {pr.reps}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  // Get the title for the modal based on context
  function getModalTitle(): string {
    if (preSelectedType) {
      return `Add ${preSelectedType.charAt(0).toUpperCase() + preSelectedType.slice(1)} PR`
    }
    return 'Add PR'
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A5F" />
      }
    >
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      ) : (
        <>
          {/* Big Three Section */}
          <View style={styles.bigThreeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 The Big Three</Text>
              <TouchableOpacity onPress={openAddModal}>
                <Ionicons name="add-circle" size={28} color="#1E3A5F" />
              </TouchableOpacity>
            </View>
            <View style={styles.bigThreeGrid}>
              {renderBigThreeCard('SQUAT', 'squat', prsData?.big_three.squat ?? null)}
              {renderBigThreeCard('BENCH', 'bench', prsData?.big_three.bench ?? null)}
              {renderBigThreeCard('DEADLIFT', 'deadlift', prsData?.big_three.deadlift ?? null)}
            </View>
          </View>

          {/* Compound Lifts Section */}
          {prsData?.compounds && prsData.compounds.length > 0 && (
            <View style={styles.compoundSection}>
              <Text style={styles.sectionTitle}>💪 Compound Lifts</Text>
              <View style={styles.compoundList}>
                {prsData.compounds.slice(0, 10).map(renderCompoundPR)}
              </View>
            </View>
          )}

          {/* Isolation Section */}
          {renderIsolationSection()}

          {/* Empty State */}
          {!prsData?.big_three.squat &&
            !prsData?.big_three.bench &&
            !prsData?.big_three.deadlift &&
            (!prsData?.compounds || prsData.compounds.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No PRs Yet</Text>
                <Text style={styles.emptySubtext}>
                  Complete workouts or add your known maxes to start tracking PRs
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add Your First PR</Text>
                </TouchableOpacity>
              </View>
            )}
        </>
      )}

      {/* Add PR Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity onPress={handleSubmitPR} disabled={submitting}>
              <Text style={[styles.modalSave, submitting && styles.modalSaveDisabled]}>
                {submitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Exercise Selector - only show if not pre-selected for Big 3 */}
            {!preSelectedType ? (
              <>
                <Text style={styles.modalLabel}>Exercise</Text>
                <TouchableOpacity
                  style={styles.modalSelector}
                  onPress={() => setShowExercisePicker(!showExercisePicker)}
                >
                  <Text
                    style={[
                      styles.modalSelectorText,
                      !selectedExercise && styles.modalSelectorPlaceholder,
                    ]}
                  >
                    {selectedExercise?.name || 'Select exercise'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {showExercisePicker && (
                  <ScrollView style={styles.exercisePickerList} nestedScrollEnabled>
                    {exercises.map(ex => (
                      <TouchableOpacity
                        key={ex.id}
                        style={[
                          styles.exercisePickerItem,
                          selectedExercise?.id === ex.id && styles.exercisePickerItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedExercise(ex)
                          setShowExercisePicker(false)
                        }}
                      >
                        <Text style={styles.exercisePickerItemText}>{ex.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              // Show selected exercise as read-only for Big 3
              <View style={styles.preSelectedExercise}>
                <Text style={styles.modalLabel}>Exercise</Text>
                <View style={styles.preSelectedBox}>
                  <Text style={styles.preSelectedText}>{selectedExercise?.name}</Text>
                </View>
              </View>
            )}

            {/* Weight Input */}
            <Text style={styles.modalLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
              placeholderTextColor="#999"
            />

            {/* Reps Input */}
            <Text style={styles.modalLabel}>Reps</Text>
            <TextInput
              style={styles.modalInput}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="e.g. 1"
              placeholderTextColor="#999"
            />

            {/* Estimated 1RM Preview - only show for 2+ reps */}
            {weight && reps && parseInt(reps) > 1 && (
              <View style={styles.e1rmPreview}>
                <Text style={styles.e1rmPreviewLabel}>Estimated 1RM:</Text>
                <Text style={styles.e1rmPreviewValue}>
                  {(parseFloat(weight) * (1 + 0.0333 * parseInt(reps))).toFixed(1)} kg
                </Text>
              </View>
            )}

            <Text style={styles.modalHint}>
              PRs achieved during workouts are tracked automatically.
            </Text>
          </ScrollView>
        </View>
      </Modal>
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  bigThreeSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bigThreeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bigThreeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minHeight: 130,
  },
  bigThreeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bigThreeMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigThreeWeight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  bigThreeUnit: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 2,
  },
  bigThreeReps: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  bigThreeE1rm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bigThreeE1rmLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  bigThreeE1rmValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  bigThreeEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigThreeEmptyText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  compoundSection: {
    marginBottom: 20,
  },
  compoundList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  compoundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  compoundInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compoundName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  compoundStats: {
    alignItems: 'flex-end',
  },
  compoundWeight: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  isolationSection: {
    marginBottom: 20,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  muscleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  muscleChipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  muscleChipTextActive: {
    color: colors.surface,
    fontWeight: '500',
  },
  isolationList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  isolationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  isolationName: {
    fontSize: 14,
    color: colors.text.primary,
  },
  isolationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  modalSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSelectorText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  modalSelectorPlaceholder: {
    color: colors.text.muted,
  },
  exercisePickerList: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginTop: 8,
    maxHeight: 250,
  },
  exercisePickerItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  exercisePickerItemSelected: {
    backgroundColor: '#e8f4f8',
  },
  exercisePickerItemText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  preSelectedExercise: {
    marginBottom: 8,
  },
  preSelectedBox: {
    backgroundColor: '#e8f4f8',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  preSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  e1rmPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  e1rmPreviewLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  e1rmPreviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalHint: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 20,
    lineHeight: 18,
  },
})

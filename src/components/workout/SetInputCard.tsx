// src/components/workout/SetInputCard.tsx
// SEDP-42: Create Set Input component
// SEDP-43: Pre-fill previous session weights
// SEDP-44: Quick +/- buttons for weight/reps
// SEDP-45: Save set to workout_sets table
// SEDP-46: Mark set as completed (visual feedback)
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useWorkoutContext } from '../../contexts/WorkoutContext'
import { WorkoutExercise, WorkoutSet, PreviousSetData } from '../../types/workout'

interface SetInputCardProps {
  workoutExercise: WorkoutExercise & {
    targetSets?: number
    targetReps?: number | null
    targetRpe?: number | null
    restSeconds?: number
  }
  onSetComplete: (restSeconds: number) => void
  onSwapPress: () => void
}

interface SetRowData {
  setNumber: number
  weight: string
  reps: string
  isWarmup: boolean
  isCompleted: boolean
  setId?: string
  previousWeight?: number
  previousReps?: number
}

export default function SetInputCard({
  workoutExercise,
  onSetComplete,
  onSwapPress,
}: SetInputCardProps) {
  const { logSet, updateSet, deleteSet, getPreviousSets } = useWorkoutContext()
  
  const [sets, setSets] = useState<SetRowData[]>([])
  const [previousSets, setPreviousSets] = useState<PreviousSetData[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState<number | null>(null)

  const exercise = workoutExercise.exercise
  const targetSets = workoutExercise.targetSets ?? 3
  const targetReps = workoutExercise.targetReps
  const restSeconds = workoutExercise.restSeconds ?? 90
  const completedSets = workoutExercise.sets?.filter(s => !s.is_warmup) ?? []

  // Load previous sets and initialize set rows
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      // Fetch previous workout data for this exercise
      const prevSets = await getPreviousSets(workoutExercise.exercise_id)
      setPreviousSets(prevSets)

      // Initialize set rows from existing sets or create empty ones
      const existingSets = workoutExercise.sets ?? []
      const workingSets = existingSets.filter(s => !s.is_warmup)
      
      const initialSets: SetRowData[] = []
      
      for (let i = 1; i <= Math.max(targetSets, workingSets.length); i++) {
        const existingSet = workingSets.find(s => s.set_number === i)
        const prevSet = prevSets.find(p => p.set_number === i)
        
        if (existingSet) {
          initialSets.push({
            setNumber: i,
            weight: existingSet.weight_kg?.toString() ?? '',
            reps: existingSet.reps?.toString() ?? '',
            isWarmup: false,
            isCompleted: true,
            setId: existingSet.id,
            previousWeight: prevSet?.weight_kg,
            previousReps: prevSet?.reps,
          })
        } else {
          initialSets.push({
            setNumber: i,
            weight: prevSet?.weight_kg?.toString() ?? '',
            reps: prevSet?.reps?.toString() ?? targetReps?.toString() ?? '',
            isWarmup: false,
            isCompleted: false,
            previousWeight: prevSet?.weight_kg,
            previousReps: prevSet?.reps,
          })
        }
      }

      setSets(initialSets)
      setLoading(false)
    }

    loadData()
  }, [workoutExercise.id, workoutExercise.exercise_id])

  function adjustWeight(index: number, delta: number) {
    setSets(prev =>
      prev.map((set, i) =>
        i === index
          ? {
              ...set,
              weight: Math.max(0, parseFloat(set.weight || '0') + delta).toString(),
            }
          : set
      )
    )
  }

  function adjustReps(index: number, delta: number) {
    setSets(prev =>
      prev.map((set, i) =>
        i === index
          ? {
              ...set,
              reps: Math.max(0, parseInt(set.reps || '0') + delta).toString(),
            }
          : set
      )
    )
  }

  function updateSetValue(index: number, field: 'weight' | 'reps', value: string) {
    // Only allow valid number input
    const cleanValue = value.replace(/[^0-9.]/g, '')
    setSets(prev =>
      prev.map((set, i) =>
        i === index ? { ...set, [field]: cleanValue } : set
      )
    )
  }

  async function handleSaveSet(index: number) {
    const set = sets[index]
    const weight = parseFloat(set.weight)
    const reps = parseInt(set.reps)

    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
      return
    }

    setSavingSet(index)

    if (set.isCompleted && set.setId) {
      // Update existing set
      await updateSet(set.setId, {
        weight_kg: weight,
        reps: reps,
      })
    } else {
      // Create new set
      const { success, set: newSet } = await logSet(workoutExercise.id, {
        set_number: set.setNumber,
        weight_kg: weight,
        reps: reps,
        is_warmup: false,
        target_reps: targetReps ?? undefined,
      })

      if (success && newSet) {
        setSets(prev =>
          prev.map((s, i) =>
            i === index ? { ...s, isCompleted: true, setId: newSet.id } : s
          )
        )
        
        // Trigger rest timer
        onSetComplete(restSeconds)
      }
    }

    setSavingSet(null)
  }

  function addSet() {
    const nextSetNumber = sets.length + 1
    const prevSet = previousSets.find(p => p.set_number === nextSetNumber) ?? previousSets[previousSets.length - 1]
    
    setSets(prev => [
      ...prev,
      {
        setNumber: nextSetNumber,
        weight: prevSet?.weight_kg?.toString() ?? prev[prev.length - 1]?.weight ?? '',
        reps: prevSet?.reps?.toString() ?? targetReps?.toString() ?? '',
        isWarmup: false,
        isCompleted: false,
        previousWeight: prevSet?.weight_kg,
        previousReps: prevSet?.reps,
      },
    ])
  }

  async function handleDeleteSet(index: number) {
    const set = sets[index]
    
    if (set.isCompleted && set.setId) {
      await deleteSet(set.setId, workoutExercise.id)
    }

    // Remove from local state and renumber
    setSets(prev => {
      const newSets = prev.filter((_, i) => i !== index)
      return newSets.map((s, i) => ({ ...s, setNumber: i + 1 }))
    })
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Exercise Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName}>{exercise?.name}</Text>
          <Text style={styles.targetInfo}>
            Target: {targetSets} sets
            {targetReps && ` × ${targetReps} reps`}
          </Text>
        </View>
        <TouchableOpacity style={styles.swapButton} onPress={onSwapPress}>
          <Ionicons name="swap-horizontal" size={20} color="#1E3A5F" />
          <Text style={styles.swapButtonText}>Swap</Text>
        </TouchableOpacity>
      </View>

      {/* Previous Session Info */}
      {previousSets.length > 0 && (
        <View style={styles.previousInfo}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.previousText}>
            Last session: {previousSets.map(p => `${p.weight_kg}×${p.reps}`).join(', ')}
          </Text>
        </View>
      )}

      {/* Sets List */}
      <ScrollView style={styles.setsList} showsVerticalScrollIndicator={false}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.setColumn]}>SET</Text>
          <Text style={[styles.tableHeaderText, styles.prevColumn]}>PREV</Text>
          <Text style={[styles.tableHeaderText, styles.inputColumn]}>KG</Text>
          <Text style={[styles.tableHeaderText, styles.inputColumn]}>REPS</Text>
          <Text style={[styles.tableHeaderText, styles.actionColumn]}></Text>
        </View>

        {sets.map((set, index) => (
          <View
            key={index}
            style={[styles.setRow, set.isCompleted && styles.setRowCompleted]}
          >
            {/* Set Number */}
            <View style={styles.setColumn}>
              <View style={[styles.setNumber, set.isCompleted && styles.setNumberCompleted]}>
                {set.isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={styles.setNumberText}>{set.setNumber}</Text>
                )}
              </View>
            </View>

            {/* Previous */}
            <View style={styles.prevColumn}>
              {set.previousWeight && set.previousReps ? (
                <Text style={styles.prevText}>
                  {set.previousWeight}×{set.previousReps}
                </Text>
              ) : (
                <Text style={styles.prevTextEmpty}>-</Text>
              )}
            </View>

            {/* Weight Input */}
            <View style={styles.inputColumn}>
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustWeight(index, -2.5)}
                >
                  <Text style={styles.adjustButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, set.isCompleted && styles.inputCompleted]}
                  value={set.weight}
                  onChangeText={v => updateSetValue(index, 'weight', v)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustWeight(index, 2.5)}
                >
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reps Input */}
            <View style={styles.inputColumn}>
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(index, -1)}
                >
                  <Text style={styles.adjustButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, set.isCompleted && styles.inputCompleted]}
                  value={set.reps}
                  onChangeText={v => updateSetValue(index, 'reps', v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(index, 1)}
                >
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.actionColumn}>
              {savingSet === index ? (
                <ActivityIndicator size="small" color="#1E3A5F" />
              ) : set.isCompleted ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSet(index)}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc3545" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!set.weight || !set.reps) && styles.saveButtonDisabled,
                  ]}
                  onPress={() => handleSaveSet(index)}
                  disabled={!set.weight || !set.reps}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={!set.weight || !set.reps ? '#ccc' : '#fff'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Add Set Button */}
        <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
          <Ionicons name="add" size={20} color="#1E3A5F" />
          <Text style={styles.addSetButtonText}>Add Set</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  targetInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
  },
  swapButtonText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  previousInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  previousText: {
    fontSize: 13,
    color: '#666',
  },
  setsList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  setColumn: {
    width: 40,
    alignItems: 'center',
  },
  prevColumn: {
    width: 60,
    alignItems: 'center',
  },
  inputColumn: {
    flex: 1,
    alignItems: 'center',
  },
  actionColumn: {
    width: 44,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f9f9f9',
  },
  setRowCompleted: {
    backgroundColor: '#e8f8f5',
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberCompleted: {
    backgroundColor: '#00D9C4',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  prevText: {
    fontSize: 12,
    color: '#999',
  },
  prevTextEmpty: {
    fontSize: 12,
    color: '#ccc',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  adjustButton: {
    width: 24,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 18,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  input: {
    width: 56,
    height: 36,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputCompleted: {
    backgroundColor: '#fff',
    borderColor: '#00D9C4',
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addSetButtonText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
  },
})

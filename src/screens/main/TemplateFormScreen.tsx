// src/screens/main/TemplateFormScreen.tsx
// SEDP-69: Template form screen (create + edit)
// SEDP-71: Per-exercise config (sets/reps/RPE/rest)
// SEDP-72: Save new template
// SEDP-73: Load and update existing template
// SEDP-75: Reorder exercises with up/down buttons
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { HomeStackParamList } from '../../navigation/MainNavigator'
import { useTemplateManagement } from '../../hooks/useTemplateManagement'
import ExercisePickerModal from '../../components/workout/ExercisePickerModal'
import { Exercise, TemplateExerciseFormData } from '../../types/workout'
import { formatMuscleGroup } from '../../utils/formatting'
import { colors } from '../../theme'

type TemplateFormScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'TemplateForm'>
  route: RouteProp<HomeStackParamList, 'TemplateForm'>
}

function makeTempId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// ─── Exercise config card ───────────────────────────────────────────────────

interface ExerciseConfigCardProps {
  item: TemplateExerciseFormData
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onChangeField: (field: 'target_sets' | 'target_reps' | 'target_rpe' | 'rest_seconds', value: number | null) => void
}

function ExerciseConfigCard({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeField,
}: ExerciseConfigCardProps) {
  // Local string state lets the user type freely; values commit on blur
  const [setsText, setSetsText] = useState(String(item.target_sets))
  const [repsText, setRepsText] = useState(item.target_reps != null ? String(item.target_reps) : '')
  const [rpeText, setRpeText] = useState(item.target_rpe != null ? String(item.target_rpe) : '')
  const [restText, setRestText] = useState(String(item.rest_seconds))

  function commitSets(text: string) {
    const val = parseInt(text, 10)
    const clamped = isNaN(val) ? 3 : Math.min(20, Math.max(1, val))
    setSetsText(String(clamped))
    onChangeField('target_sets', clamped)
  }

  function commitReps(text: string) {
    if (text.trim() === '') {
      setRepsText('')
      onChangeField('target_reps', null)
      return
    }
    const val = parseInt(text, 10)
    if (isNaN(val)) {
      setRepsText('')
      onChangeField('target_reps', null)
    } else {
      const clamped = Math.min(200, Math.max(1, val))
      setRepsText(String(clamped))
      onChangeField('target_reps', clamped)
    }
  }

  function commitRpe(text: string) {
    if (text.trim() === '') {
      setRpeText('')
      onChangeField('target_rpe', null)
      return
    }
    const val = parseFloat(text)
    if (isNaN(val)) {
      setRpeText('')
      onChangeField('target_rpe', null)
    } else {
      const clamped = Math.min(10, Math.max(1, val))
      setRpeText(String(clamped))
      onChangeField('target_rpe', clamped)
    }
  }

  function commitRest(text: string) {
    const val = parseInt(text, 10)
    const clamped = isNaN(val) ? 90 : Math.min(600, Math.max(0, val))
    setRestText(String(clamped))
    onChangeField('rest_seconds', clamped)
  }

  return (
    <View style={styles.exerciseCard}>
      {/* Header row: index badge + name/muscle + reorder + remove */}
      <View style={styles.exerciseCardHeader}>
        <View style={styles.exerciseOrderBadge}>
          <Text style={styles.exerciseOrderText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseCardInfo}>
          <Text style={styles.exerciseCardName} numberOfLines={1}>
            {item.exercise.name}
          </Text>
          <View style={styles.muscleBadge}>
            <Text style={styles.muscleBadgeText}>
              {formatMuscleGroup(item.exercise.primary_muscle_group)}
            </Text>
          </View>
        </View>
        <View style={styles.exerciseCardActions}>
          <TouchableOpacity
            testID={`move-up-${index}`}
            onPress={onMoveUp}
            disabled={index === 0}
            hitSlop={6}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.text.faint : colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`move-down-${index}`}
            onPress={onMoveDown}
            disabled={index === total - 1}
            hitSlop={6}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-down" size={20} color={index === total - 1 ? colors.text.faint : colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} hitSlop={6} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Config fields: Sets | Reps | RPE | Rest */}
      <View style={styles.configRow}>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Sets</Text>
          <TextInput
            style={styles.configInput}
            value={setsText}
            onChangeText={setSetsText}
            onBlur={() => commitSets(setsText)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
        </View>
        <View style={styles.configDivider} />
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Reps</Text>
          <TextInput
            style={styles.configInput}
            value={repsText}
            onChangeText={setRepsText}
            onBlur={() => commitReps(repsText)}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="—"
            placeholderTextColor="#ccc"
            selectTextOnFocus
          />
        </View>
        <View style={styles.configDivider} />
        <View style={styles.configField}>
          <Text style={styles.configLabel}>RPE</Text>
          <TextInput
            style={styles.configInput}
            value={rpeText}
            onChangeText={setRpeText}
            onBlur={() => commitRpe(rpeText)}
            keyboardType="decimal-pad"
            maxLength={4}
            placeholder="—"
            placeholderTextColor="#ccc"
            selectTextOnFocus
          />
        </View>
        <View style={styles.configDivider} />
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Rest (s)</Text>
          <TextInput
            style={styles.configInput}
            value={restText}
            onChangeText={setRestText}
            onBlur={() => commitRest(restText)}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
        </View>
      </View>
    </View>
  )
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function TemplateFormScreen({
  navigation,
  route,
}: TemplateFormScreenProps) {
  const templateId = route.params?.templateId
  const isEditMode = !!templateId

  const { loading, createTemplate, updateTemplate, fetchTemplateForEdit } =
    useTemplateManagement()

  const [initLoading, setInitLoading] = useState(isEditMode)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<TemplateExerciseFormData[]>([])
  const [pickerVisible, setPickerVisible] = useState(false)

  // SEDP-73: Load existing template when editing
  useEffect(() => {
    if (!isEditMode) return
    ;(async () => {
      const template = await fetchTemplateForEdit(templateId!)
      if (template) {
        setName(template.name)
        setDescription(template.description ?? '')
        setExercises(
          template.template_exercises.map((te, i) => ({
            tempId: makeTempId(),
            exercise_id: te.exercise_id,
            exercise: te.exercise,
            order_index: i,
            target_sets: te.target_sets,
            target_reps: te.target_reps,
            target_rpe: te.target_rpe,
            rest_seconds: te.rest_seconds,
            notes: te.notes,
          }))
        )
      }
      setInitLoading(false)
    })()
  }, [])

  // SEDP-70: Add exercise from picker
  function handleAddExercise(exercise: Exercise) {
    setExercises(prev => [
      ...prev,
      {
        tempId: makeTempId(),
        exercise_id: exercise.id,
        exercise,
        order_index: prev.length,
        target_sets: 3,
        target_reps: null,
        target_rpe: null,
        rest_seconds: 90,
        notes: null,
      },
    ])
  }

  function handleRemoveExercise(tempId: string) {
    setExercises(prev =>
      prev.filter(e => e.tempId !== tempId).map((e, i) => ({ ...e, order_index: i }))
    )
  }

  // SEDP-75: Up/down reorder
  function handleMoveUp(index: number) {
    if (index === 0) return
    setExercises(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next.map((e, i) => ({ ...e, order_index: i }))
    })
  }

  function handleMoveDown(index: number) {
    setExercises(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next.map((e, i) => ({ ...e, order_index: i }))
    })
  }

  function updateExerciseField(
    tempId: string,
    field: 'target_sets' | 'target_reps' | 'target_rpe' | 'rest_seconds',
    value: number | null
  ) {
    setExercises(prev =>
      prev.map(e => (e.tempId === tempId ? { ...e, [field]: value } : e))
    )
  }

  // SEDP-72: Save new / SEDP-73: Update existing
  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a template name.')
      return
    }
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise before saving.')
      return
    }

    const desc = description.trim() || null

    if (isEditMode) {
      const result = await updateTemplate(templateId!, trimmedName, desc, exercises)
      if (result.success) {
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error ?? 'Failed to update template')
      }
    } else {
      const result = await createTemplate(trimmedName, desc, exercises)
      if (result.success) {
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error ?? 'Failed to create template')
      }
    }
  }

  if (initLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Template</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Template' : 'New Template'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Template details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Push Day A"
                placeholderTextColor="#bbb"
                maxLength={60}
                returnKeyType="next"
              />
              <View style={styles.fieldSeparator} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes about this template..."
                placeholderTextColor="#bbb"
                multiline
                maxLength={200}
              />
            </View>
          </View>

          {/* Exercise list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Exercises{exercises.length > 0 ? ` (${exercises.length})` : ''}
            </Text>

            {exercises.map((ex, index) => (
              <ExerciseConfigCard
                key={ex.tempId}
                item={ex}
                index={index}
                total={exercises.length}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onRemove={() => handleRemoveExercise(ex.tempId)}
                onChangeField={(field, value) => updateExerciseField(ex.tempId, field, value)}
              />
            ))}

            {/* Add exercise */}
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.6}
            >
              <Ionicons name="add-circle-outline" size={20} color="#1E3A5F" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Save footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Template' : 'Save Template'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
        excludeExerciseIds={exercises.map(e => e.exercise_id)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  // Details card
  detailsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  nameInput: {
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 4,
  },
  fieldSeparator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  descriptionInput: {
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 4,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  // Exercise cards
  exerciseCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  exerciseOrderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseOrderText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseCardInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  muscleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleBadgeText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  exerciseCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderBtn: {
    padding: 4,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  // Config row
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 8,
    padding: 10,
  },
  configField: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  configLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  configInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  configDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  // Add exercise button
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  addExerciseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
})

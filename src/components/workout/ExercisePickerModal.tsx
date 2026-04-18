// src/components/workout/ExercisePickerModal.tsx
// SEDP-70: Exercise search and add for template creation
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { Exercise, MuscleGroup } from '../../types/workout'
import { formatMuscleGroup } from '../../utils/formatting'

interface ExercisePickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  excludeExerciseIds?: string[] // already added to the template
}

const MUSCLE_GROUPS: { label: string; muscles: MuscleGroup[] }[] = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Back', muscles: ['back', 'lats', 'traps'] },
  { label: 'Shoulders', muscles: ['front_delt', 'side_delt', 'rear_delt'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
  { label: 'Core', muscles: ['core'] },
]

export default function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  excludeExerciseIds = [],
}: ExercisePickerModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      fetchExercises()
    }
  }, [visible])

  useEffect(() => {
    let filtered = exercises.filter(e => !excludeExerciseIds.includes(e.id))

    if (selectedFilter) {
      const group = MUSCLE_GROUPS.find(g => g.label === selectedFilter)
      if (group) {
        filtered = filtered.filter(e => group.muscles.includes(e.primary_muscle_group))
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        e =>
          e.name.toLowerCase().includes(query) ||
          e.primary_muscle_group.toLowerCase().includes(query) ||
          e.equipment.toLowerCase().includes(query)
      )
    }

    setFilteredExercises(filtered)
  }, [exercises, selectedFilter, searchQuery, excludeExerciseIds])

  async function fetchExercises() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      setExercises(data ?? [])
    } catch (err) {
      console.error('Error fetching exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(exercise: Exercise) {
    onSelect(exercise)
    // Reset search/filter for next open
    setSearchQuery('')
    setSelectedFilter(null)
    onClose()
  }

  function handleClose() {
    setSearchQuery('')
    setSelectedFilter(null)
    onClose()
  }

  function renderExerciseItem({ item }: { item: Exercise }) {
    return (
      <TouchableOpacity style={styles.exerciseItem} onPress={() => handleSelect(item)}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.exerciseMeta}>
            <View style={styles.muscleBadge}>
              <Text style={styles.muscleBadgeText}>
                {formatMuscleGroup(item.primary_muscle_group)}
              </Text>
            </View>
            <Text style={styles.equipmentText}>
              {item.equipment.charAt(0).toUpperCase() + item.equipment.slice(1)}
            </Text>
            {item.is_compound && (
              <View style={styles.compoundBadge}>
                <Text style={styles.compoundBadgeText}>Compound</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="add-circle-outline" size={22} color="#1E3A5F" />
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Exercise</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Muscle group filter chips */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={MUSCLE_GROUPS}
            keyExtractor={item => item.label}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === item.label && styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedFilter(selectedFilter === item.label ? null : item.label)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === item.label && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Exercise list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A5F" />
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.exerciseList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No exercises found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    marginTop: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseList: {
    padding: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  equipmentText: {
    fontSize: 12,
    color: '#999',
  },
  compoundBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compoundBadgeText: {
    fontSize: 10,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
})

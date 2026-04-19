// src/screens/main/HomeScreen.tsx
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useAuthContext } from '../../contexts/AuthContext'
import { useWorkoutContext } from '../../contexts/WorkoutContext'
import { useToast } from '../../contexts/ToastContext'
import { useTemplateManagement } from '../../hooks/useTemplateManagement'
import { supabase } from '../../lib/supabase'
import { HomeStackParamList } from '../../navigation/MainNavigator'
import { colors } from '../../theme'

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>
}

interface WorkoutTemplate {
  id: string
  name: string
  description: string | null
  estimated_duration_minutes: number | null
  created_by: string | null
  exercise_count?: number
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { profile } = useAuthContext()
  const { isActive, workout } = useWorkoutContext()
  const { deleteTemplate } = useTemplateManagement()
  const { showError } = useToast()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Refresh list each time this screen comes into focus (covers create/edit returns)
  useFocusEffect(
    useCallback(() => {
      fetchTemplates()
    }, [])
  )

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          description,
          estimated_duration_minutes,
          created_by,
          template_exercises(count)
        `)
        .order('name')

      if (error) throw error

      const templatesWithCount = data?.map(template => ({
        ...template,
        exercise_count: template.template_exercises?.[0]?.count ?? 0,
      })) ?? []

      setTemplates(templatesWithCount)
    } catch (error) {
      showError('Failed to load templates')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function onRefresh() {
    setRefreshing(true)
    fetchTemplates()
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  function handleTemplatePress(template: WorkoutTemplate) {
    navigation.navigate('TemplateDetail', { templateId: template.id })
  }

  // SEDP-74: Long-press shows manage options for user-owned templates
  function handleTemplateLongPress(template: WorkoutTemplate) {
    if (!template.created_by || template.created_by !== profile?.id) return

    Alert.alert(template.name, '', [
      {
        text: 'Edit',
        onPress: () => navigation.navigate('TemplateForm', { templateId: template.id }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(template),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function confirmDelete(template: WorkoutTemplate) {
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTemplate(template.id)
            if (result.success) {
              fetchTemplates()
            } else {
              showError(result.error ?? 'Failed to delete template')
            }
          },
        },
      ]
    )
  }

  function handleContinueWorkout() {
    if (workout) {
      navigation.navigate('ActiveWorkout', { workoutId: workout.id })
    }
  }

  function renderTemplateCard({ item }: { item: WorkoutTemplate }) {
    const isSystemTemplate = item.created_by === null

    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => handleTemplatePress(item)}
        onLongPress={() => handleTemplateLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.templateContent}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateName}>{item.name}</Text>
            {isSystemTemplate && (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.templateMeta}>
            {item.exercise_count} exercises
            {item.estimated_duration_minutes && ` • ~${item.estimated_duration_minutes} min`}
          </Text>
          {item.description && (
            <Text style={styles.templateDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {profile?.username ?? 'Lifter'}
          </Text>
          <Text style={styles.subtitle}>Ready to train?</Text>
        </View>
      </View>

      {/* Active Workout Banner */}
      {isActive && workout && (
        <TouchableOpacity
          style={styles.activeWorkoutBanner}
          onPress={handleContinueWorkout}
        >
          <View style={styles.activeWorkoutInfo}>
            <View style={styles.pulsingDot} />
            <View>
              <Text style={styles.activeWorkoutTitle}>Workout in Progress</Text>
              <Text style={styles.activeWorkoutName}>{workout.name}</Text>
            </View>
          </View>
          <View style={styles.continueButton}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>PRs This Month</Text>
        </View>
      </View>

      {/* Templates Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Templates</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A5F" />
          </View>
        ) : (
          <FlatList
            data={templates}
            renderItem={renderTemplateCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.templateList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1E3A5F"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No templates yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap + to create your first workout template
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB: create new template */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TemplateForm', {})}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Create new template"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 4,
  },
  activeWorkoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  activeWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  activeWorkoutTitle: {
    fontSize: 12,
    color: '#a0b4c8',
  },
  activeWorkoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
  section: {
    flex: 1,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  templateList: {
    paddingHorizontal: 20,
    paddingBottom: 88,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  templateContent: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  systemBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '500',
  },
  templateMeta: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  templateDescription: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
})

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface WorkoutTemplate {
  id: string
  name: string
  description: string | null
  estimated_duration_minutes: number | null
  created_by: string | null
  exercise_count?: number
}

export default function HomeScreen() {
  const { profile } = useAuthContext()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      // Fetch templates with exercise count
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

      // Transform data to include exercise count
      const templatesWithCount = data?.map(template => ({
        ...template,
        exercise_count: template.template_exercises?.[0]?.count ?? 0,
      })) ?? []

      setTemplates(templatesWithCount)
    } catch (error) {
      console.error('Error fetching templates:', error)
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

  function handleStartWorkout(template: WorkoutTemplate) {
    // TODO: Navigate to active workout screen
    console.log('Starting workout:', template.name)
  }

  function renderTemplateCard({ item }: { item: WorkoutTemplate }) {
    const isSystemTemplate = item.created_by === null

    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => handleStartWorkout(item)}
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
            keyExtractor={(item) => item.id}
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
                  Create your first workout template
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 5,
  },
  section: {
    flex: 1,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  templateList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: '#333',
  },
  systemBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  templateMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  templateDescription: {
    fontSize: 13,
    color: '#999',
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
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
})

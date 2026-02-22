import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthContext } from '../../contexts/AuthContext'

export default function ProfileScreen() {
  const { profile, user, signOut, updateProfile, loading } = useAuthContext()
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(
    profile?.default_weight_unit ?? 'kg'
  )
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty')
      return
    }

    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters')
      return
    }

    setIsSaving(true)
    const { success, error } = await updateProfile({
      username: username.trim(),
      default_weight_unit: weightUnit,
    })
    setIsSaving(false)

    if (success) {
      setIsEditing(false)
      Alert.alert('Success', 'Profile updated successfully')
    } else {
      Alert.alert('Error', error ?? 'Failed to update profile')
    }
  }

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color="#1E3A5F" />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.username ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Weight Unit</Text>
                <View style={styles.unitSelector}>
                  <TouchableOpacity
                    style={[
                      styles.unitOption,
                      weightUnit === 'kg' && styles.unitOptionSelected,
                    ]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        weightUnit === 'kg' && styles.unitOptionTextSelected,
                      ]}
                    >
                      Kilograms (kg)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitOption,
                      weightUnit === 'lbs' && styles.unitOptionSelected,
                    ]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        weightUnit === 'lbs' && styles.unitOptionTextSelected,
                      ]}
                    >
                      Pounds (lbs)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false)
                    setUsername(profile?.username ?? '')
                    setWeightUnit(profile?.default_weight_unit ?? 'kg')
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{profile?.username ?? 'Unknown'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Weight: {profile?.default_weight_unit?.toUpperCase() ?? 'KG'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>PRs Achieved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0 kg</Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>StrengthFlow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  editButton: {
    padding: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  editForm: {
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  unitOption: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  unitOptionSelected: {
    borderColor: '#1E3A5F',
    backgroundColor: '#e8f4f8',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#666',
  },
  unitOptionTextSelected: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  signOutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 40,
  },
})

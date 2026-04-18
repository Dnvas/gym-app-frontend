// src/screens/main/AnalyticsScreen.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import VolumeTab from '../../components/analytics/VolumeTab'
import ProgressTab from '../../components/analytics/ProgressTab'
import PRsTab from '../../components/analytics/PRsTab'
import { colors } from '../../theme'

type TabType = 'volume' | 'progress' | 'prs'

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('volume')

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'volume' && styles.tabActive]}
          onPress={() => setActiveTab('volume')}
        >
          <Text style={[styles.tabText, activeTab === 'volume' && styles.tabTextActive]}>
            Volume
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
            Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prs' && styles.tabActive]}
          onPress={() => setActiveTab('prs')}
        >
          <Text style={[styles.tabText, activeTab === 'prs' && styles.tabTextActive]}>
            PRs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'volume' && <VolumeTab />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'prs' && <PRsTab />}
      </View>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.surface,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
})
